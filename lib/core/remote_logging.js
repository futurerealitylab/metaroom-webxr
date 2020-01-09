"use strict"

window.consoleProxy = function(msg, status = {}) {
    if (MR.server.sock.readyState !== WebSocket.OPEN) {
        status.message = "ERR_SERVER_UNAVAILABLE";
        console.error("Server is unavailable");

        return false;
    }

    //window.remoteMsgBuffer.push({msg : msg, count : window.redirectCount});
    window.remoteMsgBuffer.push(msg);
};
window.consoleErrorProxy = function(msg, status = {}) {
    if (MR.server.sock.readyState !== WebSocket.OPEN) {
        status.message = "ERR_SERVER_UNAVAILABLE";
        console.error("Server is unavailable");

        return false;
    }

    //window.remoteMsgBuffer.push({msg : msg, count : window.redirectCount});
    window.remoteMsgBuffer.push(msg);
};
window.consoleOriginal = console.log;
window.consoleErrorOriginal = console.error;
window.redirectConsole = function(sendInterval) {
    if (!MR.VRIsActive()) {
        return;
    }

    window.redirectSendInterval = Math.max(0, sendInterval);

    console.log = window.consoleProxy;
    console.error = window.consoleErrorProxy;
};
window.redirectSendInterval = 1000;
window.redirectTimePrev = Date.now();
window.flushAndRestoreConsole = function() {
    if (!MR.VRIsActive()) {
        return;
    }

    console.log = window.consoleOriginal;
    console.error = window.consoleErrorOriginal;

    const tNow = Date.now();
    if ((tNow - window.redirectTimePrev) > window.redirectSendInterval) {
        MR.server.sock.send(JSON.stringify({"MR_Message" : "Log", "msg" : window.remoteMsgBuffer, "id" : MR.playerid}));
        window.remoteMsgBuffer = [];
        window.redirectTimePrev = tNow;
    }

    window.redirectCount += 1;
};