"use strict";

import {MetaroomXRBackend} from "./webxr_backend.js";
import {ServerPublishSubscribe} from "./server_publish_subscribe.js";
import {ViewpointController} from "./../lib/viewpoint_controller.js";
import {Client} from "./client.js";

// the "base" type
export function Metaroom() {
    this.worldIdx = 0;
    this.worlds = [];
}
// enums
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


// WebXR backend
function Metaroom_WebXR() {
    Metaroom.call(this);
    window.wrangler = this.wrangler;
    window.MR = this;
}
Metaroom_WebXR.prototype = Object.create(
    Metaroom.prototype,
    {
        type     : {value : Metaroom.BACKEND_TYPE.WEBXR},
        wrangler : {value : new MetaroomXRBackend()},
    }
);

// WebVR backend
function Metaroom_WebVR() {
    Metaroom.call(this);
    window.wrangler = this.wrangler;
    window.MR = this;
}
Metaroom_WebVR.prototype = Object.create(
    Metaroom.prototype,
    {
        type     : {value : Metaroom.BACKEND_TYPE.WEBVR},
        wrangler : {value : new VRCanvasWrangler()},
    }
);

Metaroom.create = function(type = Metaroom.BACKEND_TYPE.WEBXR) {
    this.type = type;
    switch (type) {
        case Metaroom.BACKEND_TYPE.WEBXR: {
        return new Metaroom_WebXR();
        break;
    } case Metaroom.BACKEND_TYPE.WEBVR: {
        return new Metaroom_WebVR();
        break;
    } default: {
        console.error("ERROR: unsupported backend type");
        break;
    }
}
}

// Argument defaults
let type = Metaroom.BACKEND_TYPE.WEBXR;

// Parse URL arguments
var urlParams = new URLSearchParams(window.location.search);


// mrBackend - specify the Metaroom backend type.  Valid options are
// '0' for WebXR (default) and '1' for WebVR.
if (urlParams.has('mrBackend')) {
    type = parseInt(urlParams.get('mrBackend'))
}

window.MR = Metaroom.create(type);

MR.init = MR.wrangler.init.bind(MR.wrangler);


export const SOCKET_STATE_MAP = {
    [WebSocket.CLOSED]     : "CLOSED",
    [WebSocket.CLOSING]    : "CLOSING",
    [WebSocket.CONNECTING] : "CONNECTING",
    [WebSocket.OPEN]       : "OPEN",
};

{
    //const IP_ELEMENT   = document.getElementById("server-ip");
    //window.IP          = (IP_ELEMENT && IP_ELEMENT.getAttribute("value")) || "localhost";
    window.IP          = window.location.hostname;

    const PORT_ELEMENT = document.getElementById("server-comm-port");
    window.PORT        = (PORT_ELEMENT && PORT_ELEMENT.getAttribute("value")) || "3001";

    const IP_SYNC      = document.getElementById("server-sync-ip");
    window.IP_SYNC     = (IP_SYNC && IP_SYNC.getAttribute("value")) || "localhost";

    const PORT_SYNC_ELEMENT = document.getElementById("server-sync-port");
    window.PORT_SYNC   = (PORT_SYNC_ELEMENT && PORT_SYNC_ELEMENT.getAttribute("value")) || "11235";
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


    MR.server.sock.addEventListener('open', () => {
        console.log("connected to server");
        MR.server.subs.publish('open', null);
    });


    MR.server.sock.addEventListener('message', (ev) => {
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




MR.UserType = {"browser":0, "vr":1, "spectator":2};
Object.freeze(MR.UserType);

//TODO: We should do this more cleanly.
MR.VRIsActive = () => {
    return false;
}

MR.syncClient = new Client();
// MR.syncClient.connect(window.IP_SYNC, window.PORT_SYNC);
MR.avatars = {};
MR.playerid = -1;
MR.playerType = MR.UserType.browser;
MR.EventBus = new EventBus();

MR.objs = [];

window.onbeforeunload = function() {
    websocket.onclose = function () {}; // disable onclose handler first
    websocket.close();
};

MR.viewpointController = new ViewpointController();
