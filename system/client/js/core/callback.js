'use strict';


MR.syncClient.registerEventHandler("initialize", (json) => {

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

  MR.viewpointController.playerid = MR.playerid;
} );

MR.syncClient.registerEventHandler("join", (json) => {
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

  MR.updatePlayersMenu();
});

MR.syncClient.registerEventHandler("leave", (json) => {
  console.log(json);
  delete MR.avatars[json["user"]];

  if (MR.viewpointController.playerid == MR.avatars[json["user"]]) {
      MR.viewpointController.switchView(MR.playerid);
  }

  MR.updatePlayersMenu();
});

MR.syncClient.registerEventHandler("tick", (json) => {
  // console.log("world tick: ", json);
});

MR.syncClient.registerEventHandler("avatar", (json) => { 
    const payload = json["data"];
    //console.log(json);
    //console.log(payload);
    for(let key in payload) {
      if (payload[key]["user"] in MR.avatars) {
        MR.avatars[payload[key]["user"]].translate = payload[key]["state"]["pos"];
        MR.avatars[payload[key]["user"]].rotate = payload[key]["state"]["rot"];
        //console.log(payload[key]["state"]);
        MR.avatars[payload[key]["user"]].leftController.translate = payload[key]["state"].controllers.left.pos;
        MR.avatars[payload[key]["user"]].leftController.rotate    =  payload[key]["state"].controllers.left.rot;
        MR.avatars[payload[key]["user"]].leftController.trigger   = payload[key]["state"].controllers.left.trigger;

        MR.avatars[payload[key]["user"]].rightController.translate = payload[key]["state"].controllers.right.pos;
        MR.avatars[payload[key]["user"]].rightController.rotate    = payload[key]["state"].controllers.right.rot;
        MR.avatars[payload[key]["user"]].rightController.trigger   = payload[key]["state"].controllers.right.trigger;
      } else { // never seen, create
        console.log("previously unseen user avatar");
        // let avatarCube = createCubeVertices();
        // MR.avatars[payload[key]["user"]] = new Avatar(avatarCube, payload[key]["user"]);
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


function syncAvatarData(){
  if (MR.VRIsActive()) {
     let frameData = MR.frameData();
      if (frameData != null) {
        //User Headset
        let headsetPos = frameData.pose.position;
        let headsetRot = frameData.pose.orientation;
        let headsetTimestamp = frameData.timestamp;

      if(MR.controllers[0] != null && MR.controllers[1] != null){
          //Controllers 
        let controllerRight = MR.rightController;
        let controllerRightPos = controllerRight.pose.position;
        let controllerRightRot = controllerRight.pose.orientation;
        let controllerRightButtons = controllerRight.buttons;

        let controllerLeft = MR.leftController;
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


      let avatar_message = {
        type: "avatar",
        user: MR.playerid,
        state: {
          pos: headsetPos,
          rot: headsetRot,
          controllers :{
            left:{
              pos: [controllerLeftPos[0], controllerLeftPos[1], controllerLeftPos[2]],
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


      try {
        console.log(avatar_message);
         MR.syncClient.send(avatar_message);
      } catch(err) {
         console.log(err);
      }
    }

    }

     
  } else {
    // TODO do something else with modeType : MODE_TYPE_GENERIC,
  }
}