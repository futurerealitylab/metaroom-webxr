"use strict";

export function pollGrab(state) {
    let input = state.input;
    if ((input.LC && input.LC.isDown()) || (input.RC && input.RC.isDown())) {
        let controller = input.LC.isDown() ? input.LC : input.RC;
        for (let i = 0; i < MR.objs.length; i++)
            if (checkIntersection(controller.tip(), MR.objs[i].shape))
                if (MR.objs[i].lock.locked) {
                    MR.objs[i].position = controller.tip();
		    MR.syncClient.send({
                        type: "object",
                        uid: MR.objs[i].uid,
                        state: {
                           position: MR.objs[i].position,
                           orientation: MR.objs[i].orientation
                        },
                        lockid: MR.playerid
                    });
                }
		else
                    MR.objs[i].lock.request(MR.objs[i].uid);
    }
}
// temp
window.pollGrab = pollGrab;

export function checkIntersection(P, verts) {
    const lo = [ 10000, 10000, 10000 ],
          hi = [-10000,-10000,-10000 ];

    for (let i = 0 ; i < verts.length ; i += 3)
        for (let j = 0 ; j < 3 ; j++) {
           if (verts[i+j] < lo[j]) lo[j] = verts[i+j];
           if (verts[i+j] > hi[j]) hi[j] = verts[i+j];
        }

    return P[0] > lo[0] && P[0] < hi[0] &&
           P[1] > lo[1] && P[1] < hi[1] &&
           P[2] > lo[2] && P[2] < hi[2] ;
}

export function releaseLocks(state) {
    let input = state.input;
    if (input.LC && !input.LC.isDown() && input.RC && !input.RC.isDown()) {
        for (let i = 0; i < MR.objs.length; i++) {
            if (MR.objs[i].lock.locked == true) {
                MR.objs[i].lock.locked = false;
                MR.objs[i].lock.release(MR.objs[i].uid);
            }
        }
    }
}
// temp
window.releaseLocks = releaseLocks;


export function pollAvatarData() {
    if (MR.VRIsActive()) {
        const poseInfo = MR.getViewerPoseInfo();
        if (!poseInfo.isValid()) {
            return;
        }

        const pose        = poseInfo.pose;

        // for record of what is available
        const xform       = pose.transform;
        const position    = xform.position;
        const orientation = xform.orientation;
        const matrix      = xform.matrix;
        const inverse     = xform.inverse;

        // custom since otherwise would need to adapt to using {x:val, y:val, z:val, ...}
        const headsetPos  = poseInfo.positionAsArray;
        const headsetRot  = poseInfo.orientationAsArray;

        if (MR.leftController != null && 
            MR.rightController != null) {
            //Controllers
            const controllerRight = MR.rightController;
            const controllerRightPos = controllerRight.pose.position;
            const controllerRightRot = controllerRight.pose.orientation;
            const controllerRightButtons = controllerRight.buttons;

            const controllerLeft = MR.leftController;
            const controllerLeftPos = controllerLeft.pose.position;
            const controllerLeftRot = controllerLeft.pose.orientation;
            const controllerLeftButtons = controllerLeft.buttons;

            // buttons have a 'pressed' variable that is a boolean.
            /* A quick mapping of the buttons:
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
            // The Date.now() method returns the number of milliseconds elapsed since January 1, 1970
            timestamp: Date.now(),
            state: {
                mode: MR.UserType.vr,
                pos: CG.matrixTransform(MR.avatarMatrixForward, headsetPos),
                rot: headsetRot,
                controllers: {
                left: {
                    pos: CG.matrixTransform(MR.avatarMatrixForward, [
                        controllerLeftPos[0],
                        controllerLeftPos[1],
                        controllerLeftPos[2]
                    ]),
                    rot: [
                        controllerLeftRot[0],
                        controllerLeftRot[1],
                        controllerLeftRot[2],
                        controllerLeftRot[3]
                    ],
                    angularAcceleration: [controllerLeft.pose.angularAcceleration[0],controllerLeft.pose.angularAcceleration[1],controllerLeft.pose.angularAcceleration[2]],
                    angularVelocity: [controllerLeft.pose.angularVelocity[0],controllerLeft.pose.angularVelocity[1],controllerLeft.pose.angularVelocity[2]],
                    linearAcceleration: [controllerLeft.pose.linearAcceleration[0],controllerLeft.pose.linearAcceleration[1],controllerLeft.pose.linearAcceleration[2]],
                    linearVelocity: [controllerLeft.pose.linearVelocity[0],controllerLeft.pose.linearVelocity[1],controllerLeft.pose.linearVelocity[2]],
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
                    pos: CG.matrixTransform(MR.avatarMatrixForward, [
                        controllerRightPos[0],
                        controllerRightPos[1],
                        controllerRightPos[2]
                    ]),
                    rot: [
                        controllerRightRot[0],
                        controllerRightRot[1],
                        controllerRightRot[2],
                        controllerRightRot[3]
                    ],
                    angularAcceleration: [controllerRight.pose.angularAcceleration[0],controllerRight.pose.angularAcceleration[1],controllerRight.pose.angularAcceleration[2]],
                    angularVelocity: [controllerRight.pose.angularVelocity[0],controllerRight.pose.angularVelocity[1],controllerRight.pose.angularVelocity[2]],
                    linearAcceleration: [controllerRight.pose.linearAcceleration[0],controllerRight.pose.linearAcceleration[1],controllerRight.pose.linearAcceleration[2]],
                    linearVelocity: [controllerRight.pose.linearVelocity[0],controllerRight.pose.linearVelocity[1],controllerRight.pose.linearVelocity[2]],
                    analog: controllerRightButtons[0].pressed,
                    trigger: controllerRightButtons[1].pressed,
                    sideTrigger: controllerRightButtons[2].pressed,
                    x: controllerRightButtons[3].pressed,
                    y: controllerRightButtons[4].pressed,
                    home: controllerRightButtons[5].pressed,
                    analogx: controllerRight.axes[0],
                    analogy: controllerRight.axes[1]
                }
                }
            }
            };

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
    } else {
        let avatar_message = {
            type: "avatar",
            user: MR.playerid,
            state: {
                mode: MR.UserType.browser
            }
        };
        try {
        //console.log(avatar_message);
        MR.syncClient.send(avatar_message);
        } catch (err) {
        console.log(err);
        }
    }
}
window.pollAvatarData = pollAvatarData;

// temp keep

// function pollAvatarData() {
//     if (MR.VRIsActive()) {
//         const frameData = MR.frameData();
//         if (frameData == null)
//             return;

//         const headsetPos       = frameData.pose.position;
//         const headsetRot       = frameData.pose.orientation;
//         const headsetTimestamp = frameData.timestamp;

//         if (MR.controllers[0] != null && MR.controllers[1] != null) {
//             //Controllers
//             const controllerRight = MR.rightController;
//             const controllerRightPos = controllerRight.pose.position;
//             const controllerRightRot = controllerRight.pose.orientation;
//             const controllerRightButtons = controllerRight.buttons;

//             const controllerLeft = MR.leftController;
//             const controllerLeftPos = controllerLeft.pose.position;
//             const controllerLeftRot = controllerLeft.pose.orientation;
//             const controllerLeftButtons = controllerLeft.buttons;

//             // buttons have a 'pressed' variable that is a boolean.
//             /* A quick mapping of the buttons:
//                             0: analog stick
//                             1: trigger
//                             2: side trigger
//                             3: x button
//                             4: y button
//                             5: home button
//             */
//             const avatar_message = {
//             type: "avatar",
//             user: MR.playerid,
//             state: {
//                 mode: MR.UserType.vr,
//                 pos: CG.matrixTransform(MR.avatarMatrixForward, headsetPos),
//                 rot: headsetRot,
//                 controllers: {
//                 left: {
//                     pos: CG.matrixTransform(MR.avatarMatrixForward, [
//                         controllerLeftPos[0],
//                         controllerLeftPos[1],
//                         controllerLeftPos[2]
//                     ]),
//                     rot: [
//                         controllerLeftRot[0],
//                         controllerLeftRot[1],
//                         controllerLeftRot[2],
//                         controllerLeftRot[3]
//                     ],
//                     analog: controllerLeftButtons[0].pressed,
//                     trigger: controllerLeftButtons[1].pressed,
//                     sideTrigger: controllerLeftButtons[2].pressed,
//                     x: controllerLeftButtons[3].pressed,
//                     y: controllerLeftButtons[4].pressed,
//                     home: controllerLeftButtons[5].pressed,
//                     analogx: controllerLeft.axes[0],
//                     analogy: controllerLeft.axes[1]
//                 },
//                 right: {
//                     pos: CG.matrixTransform(MR.avatarMatrixForward, [
//                         controllerRightPos[0],
//                         controllerRightPos[1],
//                         controllerRightPos[2]
//                     ]),
//                     rot: [
//                         controllerRightRot[0],
//                         controllerRightRot[1],
//                         controllerRightRot[2],
//                         controllerRightRot[3]
//                     ],
//                     analog: controllerRightButtons[0].pressed,
//                     trigger: controllerRightButtons[1].pressed,
//                     sideTrigger: controllerRightButtons[2].pressed,
//                     x: controllerRightButtons[3].pressed,
//                     y: controllerRightButtons[4].pressed,
//                     home: controllerRightButtons[5].pressed,
//                     analogx: controllerRight.axes[0],
//                     analogy: controllerRight.axes[1]
//                 }
//                 }
//             }
//             };

//             if (MR.playerid == -1) {
//                 return;
//             }

//             try {
//                 //console.log(avatar_message);
//                 MR.syncClient.send(avatar_message);
//             } catch (err) {
//                 console.log(err);
//             }
//         }
//     } else {
//         let avatar_message = {
//             type: "avatar",
//             user: MR.playerid,
//             state: {
//                 mode: MR.UserType.browser
//             }
//         };
//         try {
//         //console.log(avatar_message);
//         MR.syncClient.send(avatar_message);
//         } catch (err) {
//         console.log(err);
//         }
//     }
// }
