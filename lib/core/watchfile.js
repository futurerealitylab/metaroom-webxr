"use strict";

export function watchFiles(arr, status = {}) {
    if (!arr) {
        status.message = "ERR_NO_FILES_SPECIFIED";
        console.error("No files specified");
        return false;
    }
    if (MR.server.sock.readyState !== WebSocket.OPEN) {
        status.message = "ERR_SERVER_UNAVAILABLE";
        console.error("Server is unavailable");

        return false;
    }

    MR.server.sock.send(JSON.stringify({"MR_Message" : "Watch_Files", "files" : arr}));
};

export function unwatchFiles(arr, status = {}) {
    if (!arr) {
        status.message = "ERR_NO_FILES_SPECIFIED";
        console.error("No files specified");
        return false;
    }
    if (MR.server.sock.readyState !== WebSocket.OPEN) {
        status.message = "ERR_SERVER_UNAVAILABLE";
        console.error("Server is unavailable");

        return false;
    }        

    MR.server.sock.send(JSON.stringify({"MR_Message" : "Unwatch_Files", "files" : arr}));
};