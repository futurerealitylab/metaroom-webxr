//const WebSocket = require('ws');
//const argparse = require('argparse');

// TODO: add ping pong heartbeart to keep connections alive
// TODO: finish automatic reconnection
// TODO: max retries + timeout
// TODO: abstract out into a class for easy use in client side code
// TODO: and register callbacks with above class


class Client 
{
    constructor(heartbeat = 30000) {
        this.callbacks = {};
        this.heartbeatTick = heartbeat;
    }

    backoff(t) {
        if (t == 0) {
            t = 1;
        } else {
            t *= 2
        }

        return t;
    }

    registerEventHandler(eventName, callback) {
        if (eventName in this.callbacks) {
            return false;
        }

        this.callbacks[eventName] = callback;
        return true;
    }

    // TODO: verify this is working
    heartbeat() {
        clearTimeout(this.pingTimeout);

        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        this.pingTimeout = setTimeout(() => {
        // this.close(); // i.e. revisit this...
        }, this.heartbeatTick + 1000);
    }

    connect(ip, port) {
        try {

            console.log('ws://' + ip + ':' + port);
            let ws = new WebSocket('ws://' + ip + ':' + port);

            //ws.on('ping', this.heartbeat);

            let reconnectInterval = null;
            let t = 0;
        
            // function reconnect

            ws.onopen = () => {

                this.heartbeat();
                // reset t, clean up later
                t = 0;
                console.log('websocket is connected ...');
                if (ws.readyState == WebSocket.OPEN) {
                    
                } else {
                    // setTimeout((ws) => {if (ws.readyState == WebSocket.OPEN) {
                    // }, 10);
                }
                // ws.send('connected');
            };
        
            ws.onmessage = (ev) => {
                try {
                    //console.log(ev);
                    let json = JSON.parse(ev.data);
        
                    // json = JSON.parse(ev.toString());
                    // console.log(json);
                    // TODO:
                    // execute registered callback
                    // if (!(json["type"] in this.callbacks)) {
                    //     console.log("no handler registered for type [" + json["type"] + "]");
                    //     return;
                    // }

                    switch(json["type"]) {
                        case "join":
                            console.log(json);
                            break;
                        case "leave":
                            console.log(json);
                            break;
                        case "tick":
                            console.log(json);
                            break;
                        case "lock":
                            console.log(json);
                            break;
                        case "release":
                            console.log(json);
                            break;
                        case "activate":
                            console.log(json);
                            break;
                        case "deactivate":
                            console.log(json);
                            break;
                        case "clear":
                            console.log("delete lief");
                            break;
                    }
                } catch(err) {
                    // console.log("bad json:", json);
                    console.log(err);
                }
                //console.log(JSON.parse(ev));
            };
        
            //const payload = {'translation': [0.0, 1.0, 0.0], 'orientation': [0.0, 0.0, 0.0, 1.0]};
            //const payload = {'type': 'object', 'uid': 1};
            // const payload = {'type': 'restart', 'uid': 1};
        
            // const interval = setInterval(() => ws.send(JSON.stringify(payload)), args.interval);
        
            ws.onclose = (event) => {
                switch (event.code) {
                    // CLOSE_NORMAL
                    case 1000:
                        console.log("WebSocket: closed");
                        break;
                    // Abnormal closure
                    default:
                        // console.log(event);
                        // reconnect(event);
                        console.log('reconnecting...');
                        ws = null;
                        reconnectInterval = setTimeout(() => {
                            try {
                                this.connect(ip, port);
                            } catch(err) {
                                console.log(err);
                                // console.log('.');
                                // clearInterval(reconnectInterval);
                                // reconnectInterval = setTimeout(reconnect, t);
                            }
            }, t);
                        break;
                    }
                // console.log("disconnected");
                // clearInterval(interval);
                clearTimeout(this.pingTimeout);
            };
        
            ws.onerror = (e) => {
                switch (e.code) {
                    case 'ECONNREFUSED':
                        // reconnect(e);
                        break;
                    default:
                        // this.onerror(e);
                        break;
                }
            };
        
        } catch (err) {
            console.log("Couldn't load websocket", err);
        }
    }
};


//client = new Client();
//client.connect("10.19.35.28", 11235);



//connect();