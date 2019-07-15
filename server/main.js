// file: main.js
// author: Nicholas G Vitovitch <ngv220@nyu.edu>
//
// A minimal static webpage demonstrating a shared VR environment
// using WebXR.
//
// NOTE: WebXR !!!REQUIRES!!! a secure context in order to run (i.e. URL must
// begin with https:// or localhost), otherwise `navigator.xr` is undefined!


var https = require('https');
var fs = require('fs');
var express = require('express');

var options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.cert'),
  requestCert: false,
  rejectUnauthorized: false
};

var app = express();
var frontend = express.static('../frontend');

app.use(frontend);

var port = 3000;//process.env.PORT || 443;
var server = https.createServer(options, app);

server.listen(port, function() {
  console.log('Express server listening on port ' + server.address().port);
});