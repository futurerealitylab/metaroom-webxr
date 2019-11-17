'use strict';


MR.syncClient.registerSystemEventHandler("initialize", (json) => {

    if (!MR.avatars) {
        MR.avatars = {};
    }

    const id = json["id"];

    let avatarCube = createCubeVertices();
    let leftController = new Controller(avatarCube);
    let rightController = new Controller(avatarCube);
    let playerAvatar = new Avatar(avatarCube, id, leftController, rightController);

    for (let key in json["avatars"]) {
        const avid =  json["avatars"][key]["user"];
        let avatar = new Avatar(avatarCube, avid, leftController, rightController);
        MR.avatars[avid] = avatar;
    }

    // MR.avatars[id] = playerAvatar;
    MR.playerid = id;
    console.log("player id is", id);
    console.log(MR.avatars);
} );

MR.syncClient.registerSystemEventHandler("join", (json) => {
    console.log(json);
    const id = json["id"];
    
    if (id in MR.avatars) {

    } else {
        let avatarCube = createCubeVertices();
        let leftController = new Controller(avatarCube);
        let rightController = new Controller(avatarCube);
        let avatar = new Avatar(avatarCube, id, leftController, rightController);
        MR.avatars[id] = avatar;
    }
    
    console.log(MR.avatars);
});

MR.syncClient.registerSystemEventHandler("leave", (json) => {
    console.log(json);
    delete MR.avatars[json["user"]];
});

MR.syncClient.registerEventHandler("tick", (json) => {
    // console.log("world tick: ", json);
});

MR.syncClient.registerSystemEventHandler("avatar", (json) => { 
    if (MR.VRIsActive()) {
        const payload = json["data"];
        //console.log(json);
        //console.log(payload);
        for(let key in payload) {
            if (payload[key]["user"] in MR.avatars) {
                MR.avatars[payload[key]["user"]].translate = payload[key]["state"]["pos"];
                MR.avatars[payload[key]["user"]].rotate = payload[key]["state"]["rot"];
                //console.log(payload[key]["state"]);
                MR.avatars[payload[key]["user"]].leftController.translate = payload[key]["state"].controllers.left.pos;
                MR.avatars[payload[key]["user"]].leftController.rotate =  payload[key]["state"].controllers.left.rot;
                MR.avatars[payload[key]["user"]].rightController.translate = payload[key]["state"].controllers.right.pos;
                MR.avatars[payload[key]["user"]].rightController.rotate = payload[key]["state"].controllers.right.rot;
            } else { // never seen, create
                console.log("previously unseen user avatar");
                // let avatarCube = createCubeVertices();
                // MR.avatars[payload[key]["user"]] = new Avatar(avatarCube, payload[key]["user"]);
            }
        }
    }
});

/*
// expected format of message
    const response = {
        "type": "lock",
        "uid": key,
        "success": boolean
};

 */

MR.syncClient.registerEventHandler("lock", (json) => {
    console.log("lock: ", json);
    // is this mine?
    // success?
    // failure
    // not mine
    // note it?
});

/*
// expected format of message
    const response = {
        "type": "release",
        "uid": key,
        "success": boolean
    };

 */

MR.syncClient.registerEventHandler("release", (json) => {
    console.log("release: ", json);
    // is this mine?
    // success?
    // failure
    // not mine
    // note it?
});

/*
//on success:

    const response = {
        "type": "object",
        "uid": key,
        "state": json,
        "lockid": lockid,
        "success": true
    };

//on failure:

    const response = {
        "type": "object",
        "uid": key,
        "success": false
    };
 */

MR.syncClient.registerEventHandler("object", (json) => {
    console.log("object moved: ", json);
    // update update metadata for next frame's rendering
});

// on success
    // const response = {
    //   "type": "calibrate",
    //   "x": ret.x,
    //   "z": ret.z,
    //   "theta": ret.theta,
    //   "success": true
    // };

// on failure:
//   const response = {
//     "type": "calibrate",
//     "success": false
// };

MR.syncClient.registerEventHandler("calibration", (json) => {
    console.log("world tick: ", json);
});


const MODE_TYPE_VR      = 0;
const MODE_TYPE_GENERIC = 2;

function syncAvatarData(state, args) {
    if (MR.VRIsActive()) {
        const frameData = MR.frameData();
        if (frameData != null) {
            //User Headset
            let headsetPos = frameData.pose.position;
            let headsetRot = frameData.pose.orientation;
            let headsetTimestamp = frameData.timestamp;

            if(MR.controllers[0] != null && MR.controllers[1] != null) {
                    //Controllers 
                let controllerRight = MR.controllers[0];
                let controllerRightPos = controllerRight.pose.position;
                let controllerRightRot = controllerRight.pose.orientation;
                let controllerRightButtons = controllerRight.buttons;

                let controllerLeft = MR.controllers[1];
                let controllerLeftPos = controllerLeft.pose.position;
                let controllerLeftRot = controllerLeft.pose.orientation;
                let controllerLeftButtons = controllerLeft.buttons;

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
                    // type of mode / device? 
                    modeType: MODE_TYPE_VR,
                    state: {
                        pos: headsetPos,
                        rot: headsetRot,
                        controllers :{
                            left:{
                                pos: [controllerLeftPos[0],controllerLeftPos[1], controllerLeftPos[2]],
                                rot: [controllerLeftRot[0],controllerLeftRot[1], controllerLeftRot[2], controllerLeftRot[3]],
                                analog: controllerLeftButtons[0].pressed,
                                trigger: controllerLeftButtons[1].pressed,
                                sideTrigger: controllerLeftButtons[2].pressed,
                                x: controllerLeftButtons[3].pressed,
                                y: controllerLeftButtons[4].pressed,
                                home: controllerLeftButtons[5].pressed,
                                analogx: controllerLeft.axes[0],
                                analogy: controllerLeft.axes[1]

                            },
                            right:{
                                pos: [controllerRightPos[0],controllerRightPos[1], controllerRightPos[2]],
                                rot: [controllerRightRot[0],controllerRightRot[1], controllerRightRot[2], controllerRightRot[3]],
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

                if(MR.playerid == -1) {
                    return;
                }

                // (Discuss): Most of the callbacks in this file
                // might be world-specific, including this avatar synchronize call. 
                // Maybe this will be the default function but we can expose ways of attaching
                // functionality.
                //
                // I figure in specific worlds we will want to attach more things to the avatar,
                // including some of the extra data we get from the controllers but don't
                // need by default. Might this be in a higher level user-specific callbacks like
                // so?
                if (args.vrDeviceCallback) {
                    args.vrDeviceCallback(state, frameData, avatar_message);
                }
                // attached to all sorts of payloads, VR or not
                if (args.agnosticDeviceCallback) {
                    args.agnosticDeviceCallback(state, avatar_message);
                }

                try {
                    console.log(avatar_message);
                    MR.syncClient.send(avatar_message);
                } catch(err) {
                    console.error(err);
                }
            }
        }
    } else {
        if (MR.playerid == -1) {
            return;
        }

        const generic_msg = {
            type: "avatar",
            user: MR.playerid,
            // type of mode / device? 
            modeType: MODE_TYPE_GENERIC,
        };

        if (args.genericDeviceCallback) {
            args.genericDeviceCallback(state, msg);
        }
        if (args.agnosticDeviceCallback) {
            args.agnosticDeviceCallback(state, avatar_message);
        }

        try {
            console.log(generic_message);
            MR.syncClient.send(generic_message);
        } catch(err) {
            console.error(err);
        }
    }
}