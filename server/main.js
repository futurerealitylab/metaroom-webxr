// file: main.js
// author: Nicholas G Vitovitch <ngv220@nyu.edu>
//
// A minimal static webpage demonstrating a shared VR environment
// using WebXR.
//
// NOTE: WebXR !!!REQUIRES!!! a secure context in order to run (i.e. URL must
// begin with https:// or localhost), otherwise `navigator.xr` is undefined!


const https     = require('https');
const fs        = require('fs');
const express   = require('express');
const WebSocket = require('ws');
const argparse  = require('argparse');



const parser = new argparse.ArgumentParser({
  version : '0.0.1',
  addHelp : true,
  description: 'metaroom server'
});

parser.addArgument(
	['--host' ],
	{
		help: 'hostname',
		defaultValue: '127.0.0.1'
	}
);
parser.addArgument(
	[ '-p', '--port' ],
	{
	help: 'port to listen on',
	defaultValue: 3000
	}
);
parser.addArgument(
  [ '-i', '--interval' ],
  {
    help: 'interval to broadcast to clients',
    defaultValue: 2000
  }
);

const args     = parser.parseArgs();
const host     = args.host;
const port     = parseInt(args.port);
let   interval = args.interval;

const options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.cert'),
  requestCert: false,
  rejectUnauthorized: false
};

let app = express();
let frontend = express.static('../client');

app.use(frontend);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



let server = https.createServer(options, app);

// temp
app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

server.listen(port, () => {
  console.log('MetaRoom server listening on port ' + server.address().port);
});

const timeStart = Date.now();

try {
	console.log('wss://' + args.host + ':' + (port + 1));
	const wss = new WebSocket.Server({ port: (port + 1)});

	function exitHandler(options, exitCode) {
	    if (options.cleanup) {
	    	console.log('clean');
	    	try {
	    		wss.close();
	    	} catch (err) {
	    		console.error(err);
	    	}
	    }
	    if (exitCode || exitCode === 0) {
	    	try {
	    		wss.close();
	    	} catch (err) {
	    		console.error(err);
	    	}
	    	console.log(exitCode);
	    }
	    if (options.exit) {
	    	try {
	    		wss.close();
	    	} catch (err) {
	    		console.error(err);
	    	}
	    	process.exit();
	    }
	}
	//do something when app is closing
	process.on('exit', exitHandler.bind(null,{cleanup:true}));

	//catches ctrl+c event
	process.on('SIGINT', exitHandler.bind(null, {exit:true}));

	// catches "kill pid" (for example: nodemon restart)
	process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
	process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

	//catches uncaught exceptions
	process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

	let websocketMap = new Map();
	let userMap      = new Map();
	let wsIndex      = 0;

	wss.on('connection', function(ws) {

		let timerID = null;

		ws.index = wsIndex++;
		websocketMap.set(ws.index, ws);

		console.log("connection: ", ws.index);

		ws.on('message', (data) => {
			console.log('message received', ws.index, data);

			userMap[ws.index] = "hooray";//data;
		});

		ws.on('close', () => {
			websocketMap.delete(ws.index);
			console.log("close: websocketMap.keys():", Array.from(websocketMap.keys()));
			clearInterval(timerID);
		});

		setInterval(() => {
			console.log("tick:", ws.index, (Date.now() - timeStart) / 1000.0);
			for (let [key, value] of websocketMap) {
				//if (key != ws.index) { // TODO re-enable check later since I'm testing whether messages are received
					value.send(JSON.stringify(userMap));
				//}
			}
		}, interval)

	});

	wss.on('close', function() {
		console.log("closing");
	})

} catch (err) {
	console.error("couldn't load websocket", err);
}


// app.post('/world_transition', (req, res) => {

// 	console.log("world transition");
// 	res.set('Content-Type', 'application/json');
// 	//res.set('Content-Type', 'text/plain');
// 	res.send({wee:"WEE"});
// });

// fetch("/world_transition", {
//     method: "POST",
//     body: JSON.stringify(data)
// }).then(res => res.json()).then(parsed => {
//     console.log(parsed);
// });

// try {
// 	console.log('ws://' + args.host + )
// }


