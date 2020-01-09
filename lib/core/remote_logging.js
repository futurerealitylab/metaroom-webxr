"use strict";

const consoleOriginal      = console.log;
const consoleErrorOriginal = console.error;

export class BasicRemoteXRLogger {

    static makeLoggerCurrent(logger) {
        BasicRemoteXRLogger.logger = logger;
    }

    constructor() {
        this.remoteMsgBuffer = [];
        this.redirectSendInterval = 1000;

        this.redirectTimePrev = 0;

        this.logger = null;
    }

    consoleProxy(self, msg, status = {}) {
        if (MR.server.sock.readyState !== WebSocket.OPEN) {
            status.message = "ERR_SERVER_UNAVAILABLE";
            console.error("Server is unavailable");

            return false;
        }

        self.remoteMsgBuffer.push(msg);
    };
    consoleErrorProxy(self, msg, status = {}) {
        if (MR.server.sock.readyState !== WebSocket.OPEN) {
            status.message = "ERR_SERVER_UNAVAILABLE";
            console.error("Server is unavailable");

            return false;
        }

        self.remoteMsgBuffer.push(msg);
    };

    redirectConsole(sendInterval = 1000) {
        if (!MR.VRIsActive()) {
            return;
        }

        this.redirectSendInterval = Math.max(0, sendInterval);

        console.log   = (...args) => { this.consoleProxy(this, ...args); };
        console.error = (...args) => { this.consoleErrorProxy(this, ...args); };
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
                "MR_Message" : "Log", "msg" : this.remoteMsgBuffer, "id" : MR.playerid
            }));

            this.remoteMsgBuffer = [];
            this.redirectTimePrev = tNow;
        }
    };
}
