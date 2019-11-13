"use strict"
////////////////////////////// MATRIX SUPPORT

let cos = t => Math.cos(t);
let sin = t => Math.sin(t);
let identity = ()       => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
let rotateX = t         => [1,0,0,0, 0,cos(t),sin(t),0, 0,-sin(t),cos(t),0, 0,0,0,1];
let rotateY = t         => [cos(t),0,-sin(t),0, 0,1,0,0, sin(t),0,cos(t),0, 0,0,0,1];
let rotateZ = t         => [cos(t),sin(t),0,0, -sin(t),cos(t),0,0, 0,0,1,0, 0,0,0,1];
let scale = (x,y,z)     => [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1];
let translate = (x,y,z) => [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
let multiply = (a, b)   => {
   let c = [];
   for (let n = 0 ; n < 16 ; n++)
      c.push( a[n&3     ] * b[    n&12] +
              a[n&3 |  4] * b[1 | n&12] +
              a[n&3 |  8] * b[2 | n&12] +
              a[n&3 | 12] * b[3 | n&12] );
   return c;
}

let Matrix = function() {
   let topIndex = 0,
       stack = [ identity() ],
       getVal = () => stack[topIndex],
       setVal = m => stack[topIndex] = m;

   this.identity  = ()      => setVal(identity());
   this.restore   = ()      => --topIndex;
   this.rotateX   = t       => setVal(multiply(getVal(), rotateX(t)));
   this.rotateY   = t       => setVal(multiply(getVal(), rotateY(t)));
   this.rotateZ   = t       => setVal(multiply(getVal(), rotateZ(t)));
   this.save      = ()      => stack[++topIndex] = stack[topIndex-1].slice();
   this.scale     = (x,y,z) => setVal(multiply(getVal(), scale(x,y,z)));
   this.translate = (x,y,z) => setVal(multiply(getVal(), translate(x,y,z)));
   this.value     = ()      => getVal();
}

////////////////////////////// SUPPORT FOR CREATING 3D SHAPES

const VERTEX_SIZE = 8;

let cubeVertices = createCubeVertices();

////////////////////////////// SCENE SPECIFIC CODE

async function setup(state) {
    hotReloadFile(getPath('week8.js'));

    const images = await imgutil.loadImagesPromise([
       getPath("textures/brick.png"),
       getPath("textures/tiles.jpg"),
    ]);

    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { key : "pnoise"    , path : "shaders/noise.glsl"     , foldDefault : true },
        { key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true },      
    ]);
    if (! libSources)
        throw new Error("Could not load shader library");

    // load vertex and fragment shaders from the server, register with the editor
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
        gl,
        "mainShader",
        { 
            onNeedsCompilation : (args, libMap, userData) => {
                const stages = [args.vertex, args.fragment];
                const output = [args.vertex, args.fragment];
                const implicitNoiseInclude = true;
                if (implicitNoiseInclude) {
                    let libCode = MREditor.libMap.get('pnoise');
                    for (let i = 0; i < 2; i++) {
                        const stageCode = stages[i];
                        const hdrEndIdx = stageCode.indexOf(';');
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        output[i] = hdr + '\n#line 2 1\n' + 
                                    '#include<pnoise>\n#line ' + (hdr.split('\n').length + 1) + ' 0' + 
                                    stageCode.substring(hdrEndIdx + 1);
                    }
                }
                MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
                    output[0],
                    output[1],
                    libMap
                );
            },
            onAfterCompilation : (program) => {
                gl.useProgram(state.program = program);
                state.uColorLoc    = gl.getUniformLocation(program, 'uColor');
                state.uCursorLoc   = gl.getUniformLocation(program, 'uCursor');
                state.uModelLoc    = gl.getUniformLocation(program, 'uModel');
                state.uProjLoc     = gl.getUniformLocation(program, 'uProj');
                state.uTexIndexLoc = gl.getUniformLocation(program, 'uTexIndex');
                state.uTimeLoc     = gl.getUniformLocation(program, 'uTime');
                state.uViewLoc     = gl.getUniformLocation(program, 'uView');
		state.uTexLoc = [];
		for (let n = 0 ; n < 8 ; n++) {
		   state.uTexLoc[n] = gl.getUniformLocation(program, 'uTex' + n);
                   gl.uniform1i(state.uTexLoc[n], n);
		}
            } 
        },
        {
            paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
            },
            foldDefault : {
                vertex   : true,
                fragment : false
            }
        }
    );
    if (! shaderSource)
        throw new Error("Could not load shader");

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());

    state.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);

    let bpe = Float32Array.BYTES_PER_ELEMENT;

    let aPos = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 0);

    let aNor = gl.getAttribLocation(state.program, 'aNor');
    gl.enableVertexAttribArray(aNor);
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 3);

    let aUV  = gl.getAttribLocation(state.program, 'aUV');
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV , 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 6);

    for (let i = 0 ; i < images.length ; i++) {
        gl.activeTexture (gl.TEXTURE0 + i);
        gl.bindTexture   (gl.TEXTURE_2D, gl.createTexture());
        gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D    (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[i]);
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    state.bgColor = [0.529, 0.808, 0.922, 1.0];

}



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
});

MR.syncClient.registerEventHandler("leave", (json) => {
  console.log(json);
  delete MR.avatars[json["user"]];
});

MR.syncClient.registerEventHandler("tick", (json) => {
  // console.log("world tick: ", json);
});

MR.syncClient.registerEventHandler("avatar", (json) => { 
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
        // console.log("previously unseen user avatar");
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





let noise = new ImprovedNoise();
let m = new Matrix();
let turnAngle = 0, cursorPrev = [0,0,0];

function onStartFrame(t, state) {
    if (! state.tStart)
        state.tStart = t;
    state.time = (t - state.tStart) / 1000;

    let cursorValue = () => {
       let p = state.cursor.position(), canvas = MR.getCanvas();
       return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
    }
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(state.bgColor[0], state.bgColor[1], state.bgColor[2], state.bgColor[3]);


    let cursorXYZ = cursorValue();
    if (cursorXYZ[2] && cursorPrev[2])
        turnAngle += 2 * (cursorXYZ[0] - cursorPrev[0]);
    cursorPrev = cursorXYZ;

    gl.uniform3fv(state.uCursorLoc     , cursorXYZ);
    gl.uniform1f (state.uTimeLoc       , state.time);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);


}

function drawAvatar(id, pos, rot, scale, state) {
  let drawShape = (color, type, vertices, texture) => {
    gl.uniform3fv(state.uColorLoc, color);
    gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
    // gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STATIC_DRAW);
    gl.drawArrays(type, 0, vertices.length / VERTEX_SIZE);
 }
m.save();
  m.translate(pos[0],pos[1],pos[2]);
  m.rotateX(rot[0]);
  m.rotateY(rot[1]);
  m.rotateZ(rot[2]);
  m.scale(scale,scale,scale);
  drawShape([1,1,1], gl.TRIANGLES, MR.avatars[id].vertices, 1);
m.restore();
}

function onDraw(t, projMat, viewMat, state, eyeIdx) {
    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));

    let drawShape = (color, type, vertices, texture) => {
       gl.uniform3fv(state.uColorLoc, color);
       gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
       gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STATIC_DRAW);
       gl.drawArrays(type, 0, vertices.length / VERTEX_SIZE);
    }

    m.identity();
    m.rotateY(turnAngle);

    m.save();
       m.translate(0,-2,0);
       m.scale(6,.01,6);
       drawShape([1,1,1], gl.TRIANGLES, cubeVertices, 1);
    m.restore();

    for (let z = -3 ; z <= 3 ; z += 2)
    for (let x = -3 ; x <= 3 ; x += 2) {
       m.save();
          let y = Math.max(Math.abs(x),Math.abs(z)) / 3 - 1 +
	          noise.noise(x, 0, 100 * z + state.time / 2) / 5;
          m.translate(x, y, z);
          m.scale(.3,.3,.3);
          drawShape([1,1,1], gl.TRIANGLES, cubeVertices, 0);
       m.restore();
    }

    //Cube that represents avatar.
    // uncomment three following three lines once testing off headset is done
     if (MR.VRIsActive()) {
      let frameData = MR.frameData();
      if (frameData != null) {
        for (let id in MR.avatars) {

          // if (!headsetPos) {
            
          //   console.log(id);
          //   console.log("not defined");
          // }

          if(MR.playerid == MR.avatars[id].playerid){

            let headsetPos = frameData.pose.position;
            let headsetRot = frameData.pose.orientation;

            const rcontroller = MR.controllers[0];
            const lcontroller = MR.controllers[1];
            //console.log("user");
            //console.log(headsetPos);
            //console.log(headsetRot);
            drawAvatar(id, headsetPos, headsetRot, .1, state);
            drawAvatar(id, rcontroller.pose.position, rcontroller.pose.orientation, 0.05, state);
            drawAvatar(id, lcontroller.pose.position, lcontroller.pose.orientation, 0.05, state);
            // m.save();
            //   m.translate(headsetPos[0],headsetPos[1],headsetPos[2]);
            //   m.rotateX(headsetRot[0]);
            //   m.rotateY(headsetRot[1]);
            //   m.rotateZ(headsetRot[2]);
            //   m.scale(.1,.1,.1);
            //   drawShape([1,1,1], gl.TRIANGLES, MR.avatars[id].vertices, 1);
            // m.restore();
          } else {
            let headsetPos = MR.avatars[id].translate;
            let headsetRot = MR.avatars[id].rotate;
            if (typeof headsetPos == 'undefined') {
              console.log(id);
              console.log("not defined");
            }
            //console.log("other user");
            // console.log(headsetPos);
            // console.log(headsetRot);
            //console.log(MR.avatars[id]);
            const rcontroller = MR.avatars[id].rightController;
            const lcontroller = MR.avatars[id].leftController;
            //console.log("user");
            //console.log(headsetPos);
            //console.log(headsetRot);
            drawAvatar(id, headsetPos, headsetRot, .1, state);
            drawAvatar(id, rcontroller.translate, rcontroller.rotate, 0.05, state);
            drawAvatar(id, lcontroller.translate, lcontroller.rotate, 0.05, state);
          }
        
        }

    }
  } 
  // else {
  //   for (let id in MR.avatars) {
  //     let headsetPos = MR.avatars[id].translate;
  //     let headsetRot = MR.avatars[id].rotate;
  //     if (!headsetPos) {
        
  //       console.log(id);
  //       console.log("not defined");
  //     }
  //     if(MR.playerid == MR.avatars[id].playerid){

  //       // let headsetPos = frameData.pose.position;
  //       // let headsetRot = frameData.pose.orientation;
  //       //console.log("user");
  //       //console.log(headsetPos);
  //       //console.log(headsetRot);
  //       m.save();
  //         m.translate(headsetPos[0],headsetPos[1],headsetPos[2]);
  //         m.rotateX(headsetRot[0]);
  //         m.rotateY(headsetRot[1]);
  //         m.rotateZ(headsetRot[2]);
  //         m.scale(.3,.3,.3);
  //         drawShape([1,1,1], gl.TRIANGLES, MR.avatars[id].vertices, 1);
  //       m.restore();
  //     }
  //     else{
        
  //       //console.log("other user");
  //       // console.log(headsetPos);
  //       // console.log(headsetRot);

  //       m.save();
  //         m.translate(headsetPos[0],headsetPos[1],headsetPos[2]);
  //         m.rotateX(headsetRot[0]);
  //         m.rotateY(headsetRot[1]);
  //         m.rotateZ(headsetRot[2]);
  //         m.scale(.3,.3,.3);
  //         drawShape([1,1,1], gl.TRIANGLES, MR.avatars[id].vertices, 1);
  //       m.restore();
  //     }
    
  //   }
  // }

}

function pollAvatarData(){
  if (MR.VRIsActive()) {
     let frameData = MR.frameData();
      if (frameData != null) {
        //User Headset
        let headsetPos = frameData.pose.position;
        let headsetRot = frameData.pose.orientation;
        let headsetTimestamp = frameData.timestamp;

      if(MR.controllers[0] != null && MR.controllers[1] != null){
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


      let avatar_message = {
        type: "avatar",
        user: MR.playerid,
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


      try {
        // console.log(avatar_message);
         MR.syncClient.send(avatar_message);
      } catch(err) {
         console.log(err);
      }
    }

    }

     
  } 
}
 

function onEndFrame(t, state) {
  //synchronize objects
  pollAvatarData();

  //Objects
  //Sample message:
  const response = {
     type: "object",
     uid: 0,
     lockid: 0,
     state:{
     pos: [0,0,0],
     rot: [0,0,0],
     }
  };
  
  // // Lock
  // //Sample message:
  // const response = {
  //   type: "lock",
  //   uid: 0,
  //   lockid: 0
  // };

  // // Release
  // //Sample message:
  // const response = {
  //   type: "release",
  //   uid: 0,
  //   lockid: 0
  // };

  // // Calibration
  // // Sample message:
  // you should use 2 points, 2 known anchors in your world (fixedPoints) that map to real space and 2 points that represent your clicks in world space (inputPoints)
  // const response = {
    // type: "calibrate",
    // fixedPoints: [],
    // inputPoints: []
  // }

  // MR.syncClient.ws.send(JSON.stringify(response));
  // FAKE STAND IN FOR DEBUGGING, remove once we have real data
  // if(MR.playerid == -1) {
  //   return;
  // }

  // const headsetPos = [Math.sin(Date.now()), 0.0, 0.0];
  // const headsetRot = [Math.sin(Date.now()), 0.0, 0.0];
  //   const avatar_message = {
  //     type: "avatar",
  //     user: MR.playerid,
  //     state: {
  //       pos: headsetPos,
  //       rot: headsetRot
  //     }
  //   };

  //   try {
  //     MR.syncClient.send(avatar_message);
  //   } catch(err) {
  //     console.log(err);
  //   }
  //   // console.log(avatar_message);

}

export default function main() {
    const def = {
        name         : 'week8',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}

