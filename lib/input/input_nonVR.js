"use strict";

import {Queue} from "../core/queue.js"

window.Input = {};
window.Input.INPUT_TYPE_KEYDOWN = "keydown";
window.Input.INPUT_TYPE_KEYUP   = "keyup";

Input._keydown = null;
Input._keyup = null;

Input._keyQueue = new Queue();

Input.input = {
    keyPrev : null,
    keyCurr : null,
    isInit  : false
};

window.Input.initKeyEvents = function(keypoll) {

    Input._keypoll = keypoll;

    Input.input.keyPrev = new Uint8Array(512);
    Input.input.keyCurr = new Uint8Array(512);

    for (let i = 0; i < 512; i += 1) {
        Input.input.keyPrev[i] = 0;
    }
    for (let i = 0; i < 512; i += 1) {
        Input.input.keyCurr[i] = 0;
    }

    if (!Input.input.isInit) {
        document.addEventListener("keydown", (e) => {
            if (e.target != document.body) { return; }

            Input._keyQueue.enqueue(e);

            if (Input._keydown) {
                Input._keydown(e);
            }
        }, false);
        document.addEventListener("keyup", (e) => {
            if (e.target != document.body) { return; }

            Input._keyQueue.enqueue(e);

            if (Input._keyup) {
                Input._keyup(e);
            }
        }, false);

        Input.input.isInit = true;
    }
};


window.Input.updateKeyState = function() {
    const keyPrev    = Input.input.keyPrev;
    const keyPrevLen = Input.input.keyPrev.length;
    const keyCurr    = Input.input.keyCurr;

    for (let i = 0; i < keyPrevLen; i += 1) {
        keyPrev[i] = keyCurr[i];
    }

    const Q = Input._keyQueue;
    const currState = Input.input.keyCurr;
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
            default: {}
        }
    }
};

window.Input.keyWentDown = function(code) {
    return !Input.input.keyPrev[code] && Input.input.keyCurr[code];
};
window.Input.keyWentDownNum = function(code) {
    return (~Input.input.keyPrev[code]) & Input.input.keyCurr[code];
};

window.Input.keyIsDown = function(code) {
    return Input.input.keyCurr[code];
};
window.Input.keyIsDownNum = function(code) {
    return Input.input.keyCurr[code];
};
window.Input.keyIsUp = function(code) {
    return !Input.input.keyCurr[code];
};
window.Input.keyIsUpNum = function(code) {
    return ~Input.input.keyCurr[code];
};

window.Input.keyWentUp = function(code) {
    return Input.input.keyPrev[code] && !Input.input.keyCurr[code];
};
window.Input.keyWentUpNum = function(code) {
    return Input.input.keyPrev[code] & (~Input.input.keyCurr[code]);
};

window.Input.registerKeyDownHandler = function(handler) {
    Input._keydown = handler;
}
window.Input.registerKeyUpHandler = function(handler) {
    Input._keyup = handler;
}
window.Input.deregisterKeyHandlers = function() {
    Input._keydown = null;
    Input._keyup   = null;
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

Input.updateControllerHandedness = () => {
    if (!MR.controllers) {
        return;
    }

    const controllerCount    = MR.controllers.length;
    let leftControllerFound  = false;
    let rightControllerFound = false;
    for (let i = 0; 
        i < controllerCount && (
            !(leftControllerFound && rightControllerFound)
        ); 
        i += 1
    ) {
        const controller = MR.controllers[i];
        if (!controller) {
            continue;
        }
        if (controller.hand == "left") {
            MR.leftController = controller;
            leftControllerFound = true;
        } else if (controller.hand == "right") {
            MR.rightController = controller;
            rightControllerFound = true;
        }
    }
    if (!(leftControllerFound && rightControllerFound)) {
        console.log("could not find controllers"); 
    }
}

Input.gamepadStateChanged = false;
window.addEventListener('gamepadconnected', event => {

    Input.gamepadStateChanged = true;

});

window.addEventListener('gamepaddisconnected', event => {
    console.log('Lost connection with the gamepad.');

    Input.gamepadStateChanged = true;
});





