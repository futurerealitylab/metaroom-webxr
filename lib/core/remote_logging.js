"use strict";

const consoleOriginal      = console.log;
const consoleErrorOriginal = console.error;

export class BasicRemoteXRLogger {

    static makeLoggerCurrent(logger) {
        this.logger = logger;
    }

    constructor(args) {
        this.remoteMsgBuffer = [];
        this.redirectSendInterval = 1000;

        this.redirectTimePrev = 0;

        this.logger = null;
    }

    consoleProxy(msg, status = {}) {
        if (MR.server.sock.readyState !== WebSocket.OPEN) {
            status.message = "ERR_SERVER_UNAVAILABLE";
            console.error("Server is unavailable");

            return false;
        }

        this.remoteMsgBuffer.push(msg);
    };
    consoleErrorProxy(msg, status = {}) {
        if (MR.server.sock.readyState !== WebSocket.OPEN) {
            status.message = "ERR_SERVER_UNAVAILABLE";
            console.error("Server is unavailable");

            return false;
        }

        this.remoteMsgBuffer.push(msg);
    };

    redirectConsole(sendInterval = 1000) {
        if (!MR.VRIsActive()) {
            return;
        }

        this.redirectSendInterval = Math.max(0, sendInterval);

        console.log   = this.consoleProxy;
        console.error = this.consoleErrorProxy;
    };

    flushAndRestoreConsole() {
        if (!MR.VRIsActive()) {
            return;
        }

        console.log   = consoleOriginal;
        console.error = consoleErrorOriginal;

        const tNow = Date.now();
        if ((tNow - this.redirectTimePrev) > this.redirectSendInterval) {
            MR.server.sock.send(JSON.stringify({
                "MR_Message" : "Log", "msg" : remoteMsgBuffer, "id" : MR.playerid
            }));

            this.remoteMsgBuffer = [];
            this.redirectTimePrev = tNow;
        }
    };
}

