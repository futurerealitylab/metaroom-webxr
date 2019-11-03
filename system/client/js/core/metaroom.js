"use strict";

function Metaroom() {
    this.worldIdx = 0;
    this.worlds = [];
}
Metaroom.BACKEND_TYPE = {
    WEBXR: 0,
    WEBVR: 1,
};
Metaroom.TYPE_TO_NAME = {
    [Metaroom.BACKEND_TYPE.WEBXR] : "WebXR",
    [Metaroom.BACKEND_TYPE.WEBVR] : "WebVR",
};

Metaroom.prototype = {
    registerWorld : function(world, idx) {
        if (idx) {
            this.worlds[idx] = world;
        } else {
            this.worlds.push(world);
        }
    }
};

// NGV220 says: we need to document the API boundary of the Metaroom, Metaroom_*, and
// MetaroomBackend (currently 'wrangler').  The passing back-and-forth of worlds, funcs,
// et al is difficult to follow.

function Metaroom_WebXR() {
    //this.type = METAROOM_TYPES.WEBXR;
    //this.wrangler = new XRCanvasWrangler(); 

    //this.worldIdx = 0;
    //this.MR.worlds = [];

    Metaroom.call(this);

    // TODO(KTR): temp still make the global var wrangler, but
    // considering making the wrangler a component of the full MetaRoom struct,
    // and separating the animation handling from the canvas wrangling
    window.wrangler = this.wrangler;
    window.MR = this;
}
// Metaroom_WebXR.prototype = Object.create(
//     Metaroom.prototype,
//     {
//         type : {value : Metaroom.BACKEND_TYPE.WEBXR},
//         wrangler : {value : new XRCanvasWrangler()},
//     }
// );

// Metaroom impl using WebVR backend.  See `js/webxr-wrangler.js` for
// details. 
function Metaroom_WebVR() {
    Metaroom.call(this);
    window.wrangler = this.wrangler;
    window.MR = this;
}
Metaroom_WebVR.prototype = Object.create(
    Metaroom.prototype,
    {
        type : {value : Metaroom.BACKEND_TYPE.WEBVR},
        wrangler : {value : new VRCanvasWrangler()},
    }
    );

Metaroom.create = function(type = Metaroom.BACKEND_TYPE.WEBXR) {
    this.type = type;
    switch (type) {
        case Metaroom.BACKEND_TYPE.WEBXR: {
        // return new Metaroom_WebXR();
        console.error("WebXR not yet implemented");
        break;
    } case Metaroom.BACKEND_TYPE.WEBVR: {
        return new Metaroom_WebVR();
        break;
    } default: {
        console.error("ERROR: unsupported type");
        break;
    }
}
}   

// Argument defaults
let type = Metaroom.BACKEND_TYPE.WEBVR;

// Parse URL arguments
var urlParams = new URLSearchParams(window.location.search);

// (1) useShim - when present and set to '1', applies the WebXR version
//     shim.  This will become unnecessary once the WebXR becomes stable. 
// if (urlParams.has('useShim') && urlParams.get('useShim') == '1') {
//     const shim = new WebXRVersionShim();
// }
// (2) mrBackend - specify the Metaroom backend type.  Valid options are
//     '0' for WebXR and '1' for WebVR (default).
if (urlParams.has('mrBackend')) {
    type = parseInt(urlParams.get('mrBackend'))
}

window.MR = Metaroom.create(type);


// console.log(
//   "wss://127.0.0.1:3001"
// );

const SOCKET_STATE_MAP = {
    [WebSocket.CLOSED]     : "CLOSED",
    [WebSocket.CLOSING]    : "CLOSING",
    [WebSocket.CONNECTING] : "CONNECTING",
    [WebSocket.OPEN]       : "OPEN",
};

{
    const IP_ELEMENT   = document.getElementById("server-ip");
    window.IP          = (IP_ELEMENT && IP_ELEMENT.getAttribute("value")) || "localhost";
    const PORT_ELEMENT = document.getElementById("server-comm-port");
    window.PORT        = (PORT_ELEMENT && PORT_ELEMENT.getAttribute("value")) || "3001";
}

MR.server = {};
MR.server.onOpen = null;
MR.initServer = () => {
    console.log("initializing server");


    MR.server.sock = {
        addEventListener : () => {},
        send : () => {},
        readyState : WebSocket.CLOSED
    };
    try {
        MR.server.sock = new WebSocket(  
            "ws://" + window.IP + ":" + window.PORT
            );
    } catch (err) {
        console.log(err);
    }

    MR.server.sock.onerror = () => {
        console.log("Socket state:", SOCKET_STATE_MAP[MR.server.sock.readyState]);
    };


    // if (MR.server.sock.readyState !== WebSocket.CLOSED) {
        MR.server.sock.addEventListener('open', () => {
            console.log("connected to server");
            MR.server.subs.publish('open', null);
        });


        MR.server.sock.addEventListener('message', (ev) => {
      //console.log("received message from server");

      const data = JSON.parse(ev.data);
      if (data.MR_Message) {
        MR.server.subs.publish(data.MR_Message, data);
        MR.server.subsLocal.publish(data.MR_Message, data);
      }
  });

        MR.server.sock.addEventListener('close', (ev) => {
            console.log("socket closed");
        });  
    }




    class ServerPublishSubscribe {
        constructor() {
            this.subscribers = {};
            this.subscribersOneShot = {};
        }
        subscribe(channel, subscriber, data) {
            this.subscribers[channel] = this.subscribers[channel] || new Map();
            this.subscribers[channel].set(subscriber, {sub: subscriber, data: data});
        }
        unsubscribeAll(subscriber) {
            for (let prop in this.subscribers) {
                if (Object.prototype.hasOwnProperty.call(this.subscribers, prop)) {
                    const setObj = this.subscribers[prop].delete(subscriber);
                }
            }
            
        }
        subscribeOneShot(channel, subscriber, data) {
            this.subscribersOneShot[channel] = this.subscribersOneShot[channel] || new Map();
            this.subscribersOneShot[channel].set(subscriber, {sub: subscriber, data: data});    
        }
        publish (channel, ...args) {
            (this.subscribers[channel] || new Map()).forEach((value, key) => value.sub(value.data, ...args));
            (this.subscribersOneShot[channel] || new Map()).forEach((value, key) => value.sub(value.data, ...args));
            this.subscribersOneShot = {};
        }
    }
    MR.server.subs = new ServerPublishSubscribe();
    MR.server.subsLocal = new ServerPublishSubscribe();
    MR.server.echo = (message) => {   
        MR.server.sock.send(JSON.stringify({
            "MR_Message" : "Echo",
            "data": {
                "message" : message || ""
            }
        }));
    };

    MR.server.uid = 0;
    MR.uid = () => {
        return MR.server.uid;
    }



    MR.getCanvas = () => MR.wrangler._canvas;
    MR.time = () => MR.wrangler.time;
    MR.timeMS = () => MR.wrangler.timeMS;

    MR.getMessagePublishSubscriber = () => { 
        return MR.server.subsLocal; 
    }

    MR.dynamicImport = function(path) {
        return import(path + "?generation=" + MR.wrangler.reloadGeneration);
    };


    MR._keydown = null;
    MR._keyup = null;

//code.iamkate.com
function Queue(){var a=[],b=0;this.getLength=function(){return a.length-b};this.isEmpty=function(){return 0==a.length};this.enqueue=function(b){a.push(b)};this.dequeue=function(){if(0!=a.length){var c=a[b];2*++b>=a.length&&(a=a.slice(b),b=0);return c}};this.peek=function(){return 0<a.length?a[b]:void 0}};

MR._keyQueue = new Queue();


MR.input = {
    keyPrev : null,
    keyCurr : null,
    isInit  : false
};

window.Input = {};
window.Input.INPUT_TYPE_KEYDOWN = "keydown";
window.Input.INPUT_TYPE_KEYUP   = "keyup";

window.Input.initKeyEvents = function(keypoll) {

    MR._keypoll = keypoll;

    MR.input.keyPrev = new Uint8Array(512);
    MR.input.keyCurr = new Uint8Array(512);

    for (let i = 0; i < 512; i += 1) {
        MR.input.keyPrev[i] = 0;
    }
    for (let i = 0; i < 512; i += 1) {
        MR.input.keyCurr[i] = 0;
    }

    if (!MR.input.isInit) {
        document.addEventListener("keydown", (e) => {
            if (e.target != document.body) { return; }

            MR._keyQueue.enqueue(e);

            if (MR._keydown) {
                MR._keydown(e);
            }
        }, false);
        document.addEventListener("keyup", (e) => {
            if (e.target != document.body) { return; }

            MR._keyQueue.enqueue(e);

            if (MR._keyup) {
                MR._keyup(e);
            }
        }, false);

        MR.input.isInit = true;
    }
};


window.Input.updateKeyState = function() {
    const keyPrev    = MR.input.keyPrev;
    const keyPrevLen = MR.input.keyPrev.length;
    const keyCurr    = MR.input.keyCurr;

    for (let i = 0; i < keyPrevLen; i += 1) {
        keyPrev[i] = keyCurr[i];
    }

    const Q = MR._keyQueue;
    const currState = MR.input.keyCurr;
    while (!Q.isEmpty()) {
        const e = Q.dequeue();
        const keyCode = e.keyCode;
        switch (e.type) {
            case Input.INPUT_TYPE_KEYDOWN: {
                keyCurr[keyCode] = 1;
                break;
            }
            case Input.INPUT_TYPE_KEYUP: {
                keyCurr[keyCode] = 0;
                break;
            }
            default: {

            }
        }
    }
};

window.Input.keyWentDown = function(code) {
    return !MR.input.keyPrev[code] && MR.input.keyCurr[code];
};
window.Input.keyWentDownNum = function(code) {
    return (~MR.input.keyPrev[code]) & MR.input.keyCurr[code];
};

window.Input.keyIsDown = function(code) {
    return MR.input.keyCurr[code];
};
window.Input.keyIsDownNum = function(code) {
    return MR.input.keyCurr[code];
};
window.Input.keyIsUp = function(code) {
    return !MR.input.keyCurr[code];
};
window.Input.keyIsUpNum = function(code) {
    return ~MR.input.keyCurr[code];
};

window.Input.keyWentUp = function(code) {
    return MR.input.keyPrev[code] && !MR.input.keyCurr[code];
};
window.Input.keyWentUpNum = function(code) {
    return MR.input.keyPrev[code] & (~MR.input.keyCurr[code]);
};

window.Input.registerKeyDownHandler = function(handler) {
    MR._keydown = handler;
}
window.Input.registerKeyUpHandler = function(handler) {
    MR._keyup = handler;
}
window.Input.deregisterKeyHandlers = function() {
    MR._keydown = null;
    MR._keyup   = null;
}

window.Input.KEY_LEFT  = 37;
window.Input.KEY_UP    = 38;
window.Input.KEY_RIGHT = 39;
window.Input.KEY_DOWN  = 40;
window.Input.KEY_SHIFT = 16; // shift
window.Input.KEY_ZERO  = 48; // 0
window.Input.KEY_CONTROL = 17; // control
window.Input.KEY_A = 65;
window.Input.KEY_W = 87
window.Input.KEY_D = 68;
window.Input.KEY_S = 83;

// TODO VR controls (?)
window.Input.OCQ_SOMETHING = 0;

window.Input.OCQ_input_ = {};
Input.OCQ_input_.controllerStatePrev = [];
Input.OCQ_input_.controllerStateCurr = [];
Input.OCQ_input_.controllerStateLeft = {};
Input.OCQ_input_.controllerStateRight = {};

window.Input.initControllerEvents = function() {
	window.addEventListener('gamepadconnected', function(e) {
		console.log('Gamepad ' + e.gamepad.index + ' disconnected.');
	});

	window.addEventListener('gamepaddisconnected', function(e) {
		console.log('Gamepad ' + e.gamepad.index + ' disconnected.');
	});
	// TODO
}

window.Input.updateControllerState = function() {
	// TODO
}



