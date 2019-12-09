
function pollGrab(state) {
   let input = state.input;
   if ((input.LC && input.LC.isDown()) || (input.RC && input.RC.isDown())) {

      let controller = input.LC.isDown() ? input.LC : input.RC;
      for (let i = 0; i < MR.objs.length; i++) {
         //ALEX: Check if grabbable.
         let isGrabbed = checkIntersection(controller.position(), MR.objs[i].shape);
         //requestLock(MR.objs[i].uid);
         if (isGrabbed == true) {
            if (MR.objs[i].lock.locked) {
               MR.objs[i].position = controller.position();
               const response =
               {
                  type: "object",
                  uid: MR.objs[i].uid,
                  state: {
                     position: MR.objs[i].position,
                     orientation: MR.objs[i].orientation,
                  },
                  lockid: MR.playerid,

               };

               MR.syncClient.send(response);
            } else {
               MR.objs[i].lock.request(MR.objs[i].uid);
            }
         }
      }
   }
}

function releaseLocks(state) {
   let input = state.input;
   if ((input.LC && !input.LC.isDown()) && (input.RC && !input.RC.isDown())) {
      for (let i = 0; i < MR.objs.length; i++) {
         if (MR.objs[i].lock.locked == true) {
            MR.objs[i].lock.locked = false;
            MR.objs[i].lock.release(MR.objs[i].uid);
         }
      }
   }
}


function pollAvatarData() 
{
    if (MR.VRIsActive()) 
    {
        const frameData = MR.frameData();
        if (frameData != null) {
            //User Headset
            // const leftInverseView = CG.matrixInverse(frameData.leftViewMatrix);
            // const rightInverseView = CG.matrixInverse(frameData.rightViewMatrix);
            
            // const leftHeadsetPos = CG.matrixTransform(leftInverseView, frameData.pose.position);
            // const rightHeadsetPos = CG.matrixTransform(rightInverseView, frameData.pose.position);
            // const headsetPos = CG.mix(leftHeadsetPos, rightHeadsetPos);
            // console.log(headsetPos);
            const headsetPos = frameData.pose.position;
            const headsetRot = frameData.pose.orientation;
            const headsetTimestamp = frameData.timestamp;

            if (MR.controllers[0] != null && MR.controllers[1] != null) {
                //Controllers
                const controllerRight = MR.controllers[0];
                const controllerRightPos = controllerRight.pose.position;
                const controllerRightRot = controllerRight.pose.orientation;
                const controllerRightButtons = controllerRight.buttons;

                const controllerLeft = MR.controllers[1];
                const controllerLeftPos = controllerLeft.pose.position;
                const controllerLeftRot = controllerLeft.pose.orientation;
                const controllerLeftButtons = controllerLeft.buttons;

                //buttons have a 'pressed' variable that is a boolean.
                /*A quick mapping of the buttons:
                        0: analog stick
                        1: trigger
                        2: side trigger
                        3: x button
                        4: y button
                        5: home button
                */
                const avatar_message = {
                    type: "avatar",
                    user: MR.playerid,
                    state: {
                        mode: MR.UserType.vr,
                        pos: CG.matrixTransform(MR.avatarMatrixInverse, headsetPos),
                        rot: headsetRot,
                        controllers: {
                            left: {
                                pos: CG.matrixTransform(MR.avatarMatrixInverse, [controllerLeftPos[0], controllerLeftPos[1], controllerLeftPos[2]]),
                                rot: [controllerLeftRot[0], controllerLeftRot[1], controllerLeftRot[2], controllerLeftRot[3]],
                                analog: controllerLeftButtons[0].pressed,
                                trigger: controllerLeftButtons[1].pressed,
                                sideTrigger: controllerLeftButtons[2].pressed,
                                x: controllerLeftButtons[3].pressed,
                                y: controllerLeftButtons[4].pressed,
                                home: controllerLeftButtons[5].pressed,
                                analogx: controllerLeft.axes[0],
                                analogy: controllerLeft.axes[1]

                            },
                            right: {
                                pos: CG.matrixTransform(MR.avatarMatrixInverse, [controllerRightPos[0], controllerRightPos[1], controllerRightPos[2]]),
                                rot: [controllerRightRot[0], controllerRightRot[1], controllerRightRot[2], controllerRightRot[3]],
                                analog: controllerRightButtons[0].pressed,
                                trigger: controllerRightButtons[1].pressed,
                                sideTrigger: controllerRightButtons[2].pressed,
                                x: controllerRightButtons[3].pressed,
                                y: controllerRightButtons[4].pressed,
                                home: controllerRightButtons[5].pressed,
                                analogx: controllerRight.axes[0],
                                analogy: controllerRight.axes[1],
                            }
                        }
                    }
                }

                if (MR.playerid == -1) {
                    return;
                }

                try {
                    //console.log(avatar_message);
                    MR.syncClient.send(avatar_message);
                } catch (err) {
                    console.log(err);
                }
            }

        }

    } else {
        let avatar_message = {
            type: "avatar",
            user: MR.playerid,
            state: {
                mode: MR.UserType.browser,
            }
        }
        try {
            //console.log(avatar_message);
            MR.syncClient.send(avatar_message);
        } catch (err) {
            console.log(err);
        }
    }
}