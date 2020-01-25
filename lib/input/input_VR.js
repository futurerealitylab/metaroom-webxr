"use strict";

import {MR} from "/lib/core/metaroom.js";

export function updateControllerHandedness() {
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

let gamepadStateChanged = false;
export function setGamepadStateChanged(val) {
    gamepadStateChanged = val;
}
export function getGamepadStateChanged() {
    return gamepadStateChanged;
}

window.addEventListener('gamepadconnected', event => {
    gamepadStateChanged = true;
});

window.addEventListener('gamepaddisconnected', event => {
    console.log('Lost connection with the gamepad.');

    gamepadStateChanged = true;
});

/*--------------------------------------------------------------------------------

I wrote the following to create an abstraction on top of the left and right
controllers, so that in the onStartFrame() function we can detect press()
and release() events when the user depresses and releases the trigger.

The field detecting the trigger being pressed is buttons[1].pressed.
You can detect pressing of the other buttons by replacing the index 1
by indices 0 through 5.

You might want to try more advanced things with the controllers.
As we discussed in class, there are many more fields in the Gamepad object,
such as linear and angular velocity and acceleration. Using the browser
based debugging tool, you can do something like console.log(leftController)
to see what the options are.

--------------------------------------------------------------------------------*/

function HeadsetHandler(poseInfo) {
    console.log(poseInfo.positionAsArray[0]);
    console.log(poseInfo.positionAsArray[1]);
    console.log(poseInfo.positionAsArray[2]);

   this.position    = () => poseInfo.positionAsArray;
   this.orientation = () => poseInfo.orientationAsArray;
}

function ControllerHandler(controller) {
   this.isDown      = () => controller.buttons[1].pressed;
   this.onEndFrame  = () => wasDown = this.isDown();
   this.orientation = () => controller.pose.orientation;
   this.position    = () => controller.pose.position;
   this.press       = () => ! wasDown && this.isDown();
   this.release     = () => wasDown && ! this.isDown();
   this.tip         = () => {
      let m = new Matrix();
      m.identity();                     // MOVE THE "HOT SPOT" OF
      m.translate(this.position());     // THE CONTROLLER TOWARD
      m.rotateQ(this.orientation());    // FAR TIP (FURTHER AWAY
      m.translate(0,.04,-.02);          // FROM THE USER'S HAND).
      let v = m.value();
      return [v[12],v[13],v[14]];
   }
   this.center = () => {
      let m = new Matrix();
      m.identity();
      m.translate(this.position());
      m.rotateQ(this.orientation());
      m.translate(0,.02,-.005);
      let v = m.value();
      return [v[12],v[13],v[14]];
   }
   let wasDown = false;
}

export {HeadsetHandler, ControllerHandler};