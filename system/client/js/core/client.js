// TODO: add ping pong heartbeart to keep connections alive
// TODO: finish automatic reconnection
// TODO: max retries + timeout

class Client 
{

    constructor(heartbeat = 30000) {
        this.callbacks = {};
        // system-specific callbacks that should not be reset upon
        // world transitions
        this.systemCallbacks = {};
        this.heartbeatTick = heartbeat;
        this.ws = null;
    }

    backoff(t) {
        if (t == 0) {
            t = 1;
        } else {
            t *= 2
        }

        return t;
    }

    // distinguish between world-specific
    // and system-specific callbacks,
    // since each world may have different requirements,
    // whereas the system callbacks are for the back-end to use
    // -- also, the user can define what to do immediately
    // after the system has acted upon the event
    registerEventHandler(eventName, callback) {
        // proposal: I'd find it useful
        // to be able to replace a callback programmatically
        // if (eventName in this.callbacks) {
        //     return false;
        // }

        this.callbacks[eventName] = callback;
        return true;
    }

    registerSystemEventHandler(eventName, callback) {
        // proposal: I'd find it useful
        // to be able to replace a callback programmatically
        // if (eventName in this.systemCallbacks) {
        //     return false;
        // }
        
        this.systemCallbacks[eventName] = callback;
        return true;
    }

    // call upon world transition
    deregisterEventHandlers() {
        this.callbacks = {};
    }
    // call upon a system reset
    deregisterSystemEventHandlers() {
        this.systemCallbacks = {};
    }

    // useful for one-time events,
    // removes the callback after only one use
    registerEventHandlerOneShot(eventName, callback) {
        this.callbacks[eventName] = (args) => {
            delete this.callbacks[eventName];
            return callback(args);
        }
    }
    registerSystemEventHandlerOneShot(eventName, callback) {
        this.systemCallbacks[eventName] = (args) => {
            delete this.systemCallbacks[eventName];
            return callback(args);
        }
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

    // expected as a js object
    // TODO:
    // add guaranteed delivery
    send(message) {
       this.ws.send(JSON.stringify(message));
    }

    connect(ip, port) {
        try {

            console.log('ws://' + ip + ':' + port);
            this.ws = new WebSocket('ws://' + ip + ':' + port);
            console.log('connected');
            //ws.on('ping', this.heartbeat);

            let reconnectTimeout = null;
            let t = 0;
        
            // function reconnect

            this.ws.onopen = () => {

                this.heartbeat();
                // reset t, clean up later
                t = 0;
                console.log('websocket is connected ...');
                if (this.ws.readyState == WebSocket.OPEN) {
                    // TODO:
                    // send message with client side config if needed
                } else {
                    // setTimeout((ws) => {if (ws.readyState == WebSocket.OPEN) {
                    // }, 10);
                }
                // ws.send('connected');
            };
        
            this.ws.onmessage = (ev) => {
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
                    let msgIsSupported = false;
                    const msgType = json["type"];
                    
                    // first the backend acts upon the event
                    // and sets-up anything that the user-specific
                    // callbacks need
                    if (msgType in this.systemCallbacks) {
                        this.systemCallbacks[msgType](json);
                        msgIsSupported = true;
                    }
                    if (msgType in this.callbacks) {
                        this.callbacks[msgType](json);
                        msgIsSupported = true;
                    }
                    if (!msgIsSupported) {
                        console.warn("message of type %s is not supported yet", msgType);
                    }
                    
                    // switch(json["type"]) {
                    //     case "join":
                    //         console.log(json);
                    //         this.callbacks["join"](json);
                    //         break;
                    //     case "initi":
                    //     case "leave":
                    //         console.log(json);
                    //         break;
                    //     case "tick":
                    //         //console.log(json);
                    //         break;
                    //     case "lock":
                    //         console.log(json);
                    //         break;
                    //     case "release":
                    //         console.log(json);
                    //         break;
                    //     case "activate":
                    //         console.log(json);
                    //         break;
                    //     case "deactivate":
                    //         console.log(json);
                    //         break;
                    //     case "clear":
                    //         console.log("delete lief");
                    //         break;
                    // }
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
        
            this.ws.onclose = (event) => {
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
                        // /*
                        // this.ws = null;
                        /*
                        reconnectTimeout = setTimeout(() => {
                            try {
                                // t = this.backoff(t);
                                this.connect(ip, port);
                                clearTimeout(reconnectTimeout);
                            } catch(err) {
                                console.log(err);
                                // console.log('.');
                                // clearInterval(reconnectTimeout);
                                // reconnectTimeout = setTimeout(reconnect, t);
                            }
                            
                        }, t);
                        */
                        break;
                        // */
                    }
                console.log("disconnected");
                // clearInterval(interval);
                clearTimeout(this.pingTimeout);
            };
        
            this.ws.onerror = (e) => {
                switch (e.code) {
                    case 'ECONNREFUSED':
                        console.log(e);
                        // reconnect(e);
                        this.ws.close();
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