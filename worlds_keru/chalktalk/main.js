const sth = .1; // SEAT HEIGHT
const stw = .8 ; // SEAT WIDTH


////////////////////////////////////////////////////////////////
//
// HANDLE CONTROLLER DRAWING AND CONTROLLER BUTTON INPUT ////////

let buttonState = {left: [], right: []};
for (let i = 0 ; i < 7 ; i++)
   buttonState.left[i] = buttonState.right[i] = false;

let onPress = (hand, button) => {
   console.log('pressed', hand, 'button', button);
}

let onRelease = (hand, button) => {
   console.log('released', hand, 'button', button);
}

let controllerMatrix = {left: [], right: []};

function drawControllers() {
   for (let hand in controllerMatrix)
      if (controllerMatrix[hand]) {
         m.identity();
         m.multiply(controllerMatrix[hand]);
         let triggerPressed = buttonState[hand][0];
         let gripPressed = buttonState[hand][1];

         mTorus().move(0,0,-.05).size(.03,.03,.033).color(triggerPressed ? 1 : 0, 0, 0);
         mCylinder().move(0,-.01,.01).size(.02,.02,.05).color(0,0,1);
         let gx = gripPressed ? .01 : .013;
         mCube().move(hand=='left'?gx:-gx,-.01,.01).size(.01).color(gripPressed ? [1,0,0] : [.1,.1,.1]);
   }

}

////////////////////////////////////////////////////////////////


function drawScene(time, w) {
    drawControllers();

    m.identity();
    m.scale(FEET_TO_METERS);

    //navigate with keys on website
    if(Input.keyIsDown(Input.KEY_LEFT)) {
      posX += 0.1;
    } else if(Input.keyIsDown(Input.KEY_RIGHT)) {
      posX -= 0.1;
    }
    if(Input.keyIsDown(Input.KEY_UP)) {
      posZ += 0.1;
    } else if(Input.keyIsDown(Input.KEY_DOWN)) {
      posZ -= 0.1;
    }

    if(Input.keyIsDown(Input.KEY_S)){
    //  rotX += Math.min(0.01,Math.PI/3 - rotX);
          posY += 0.1;
    } else if(Input.keyIsDown(Input.KEY_W)){
    //  rotX -= Math.min(0.01,Math.PI/6 + rotX);
            posY -= 0.1;
    }
    if(Input.keyIsDown(Input.KEY_A)){
      rotY += Math.min(0.01,Math.PI/2 - rotX);
      //    posZ += 0.1*rotX;
    }else if(Input.keyIsDown(Input.KEY_D)){
      rotY -= Math.min(0.01,Math.PI/2 + rotX);
      //      posZ -= 0.05*rotX;
    }

    m.translate(posX,posY,posZ);
    m.rotateX(rotX);
    m.rotateY(rotY);
    m.rotateZ(rotZ);

    // mCube().move(-sw/4,0,-sw/4).size(-sw/4,.002,-sw/4).color(gray     ); // SAFE AREA
    // mCube().move( sw/4,0,-sw/4).size(-sw/4,.002,-sw/4).color(lightGray); // SAFE AREA
    // mCube().move(-sw/4,0, sw/4).size(-sw/4,.002,-sw/4).color(lightGray); // SAFE AREA
    // mCube().move( sw/4,0, sw/4).size(-sw/4,.002,-sw/4).color(gray     ); // SAFE AREA

   mCube().move(0,.01,0).size(-sw/2,.01,-sw/2).color(superWhite).textureView(w.textures[5].lookupImageByID(1)).textureAtlas(w.textures[5]); // SAFE AREA
   mCube().size(rw/2,.001,rw/2).color(superWhite).textureView(w.textures[7].lookupImageByID(1)).textureAtlas(w.textures[7]); // FLOOR

    mCube().move(    0, rh/2, rw/2).size( rw/2, rh/2, .001).color(white).textureView(w.textures[6].lookupImageByID(1)).textureAtlas(w.textures[6]); // WALL
    mCube().move(    0, rh/2,-rw/2).size( rw/2, rh/2, .001).color(white).textureView(w.textures[6].lookupImageByID(1)).textureAtlas(w.textures[6]); // WALL
    mCube().move( rw/2, rh/2,  0  ).size( .001, rh/2, rw/2).color(white).textureView(w.textures[6].lookupImageByID(1)).textureAtlas(w.textures[6]); // WALL
    mCube().move(-rw/2, rh/2,  0  ).size( .001, rh/2, rw/2).color(white).textureView(w.textures[6].lookupImageByID(1)).textureAtlas(w.textures[6]); // WALL
    mCube().move(    0, rh  ,  0  ).size( rw/2, .001, rw/2).color(white).textureView(w.textures[8].lookupImageByID(1)).textureAtlas(w.textures[8]); // CEILING

  //  mCylinder().move(  0, rh/2, -rw/2 - .25).size(rw/5 - .1, rw/5 - .1, .5).color(skyBlue);

   mCube().move(    0,  6  , rw/2).size(  8  ,  3  , .0025).color(skyBlue ).textureView(w.textures[8].lookupImageByID(1)).textureAtlas(w.textures[8]); // WINDOW

    // mCube().move( 7.5 ,  7/2,-rw/2).size(  3/2,  7/2, .002).color(brown   ); // DOOR
    // mCube().move(-rw/2,  7/2, 7.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    // mCube().move(-rw/2,  7/2,-7.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    // mCube().move( rw/2,  7/2, 6.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    // mCube().move( rw/2,  7/2,-6.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    // mCube().move( rw/2,  4/2,   0 ).size( 1   ,  4/2,  5/2).color(brown   ); // FIREPLACE
    // mCube().move( rw/2,  3/2,   0 ).size( 1.01,  3/2,  4/2).color(black   ); // FIREPLACE

//    mCube().move(0 ,th + 2, 0).turnY(time).turnX(Math.PI/4).turnZ(Math.PI/4).size(.25).color(darkRed).opacity(0.1).textureView(w.textures[8].lookupImageByID(1)).textureAtlas(w.textures[8]); // FLOATING OBJECTS TO INTERACT WITH

    mCube().move(0,13*th/12,0).size(tw,th/6,tw).color(superWhite).textureView(w.textures[6].lookupImageByID(1)).textureAtlas(w.textures[6]); // TABLE
    mCube().move(0,th/2,0).size(tw/1.5,th/2,tw/1.5).color(darkGray).textureView(w.textures[6].lookupImageByID(1)).textureAtlas(w.textures[6]); // TABLE
    mRoundedCylinder().turnX(Math.PI/2).move(-(sw/4 + .5),sth,           0).size(stw, stw, sth).color(white).textureView(w.textures[10].lookupImageByID(1)).textureAtlas(w.textures[10]); // SEAT
    mRoundedCylinder().turnX(Math.PI/2).move( (sw/4 + .5),sth,           0).size(stw, stw, sth).color(white).textureView(w.textures[10].lookupImageByID(1)).textureAtlas(w.textures[10]); // SEAT
    mRoundedCylinder().turnX(Math.PI/2).move(           0,sth,-(sw/4 + .5)).size(stw, stw, sth).color(white).textureView(w.textures[10].lookupImageByID(1)).textureAtlas(w.textures[10]); // SEAT
    mRoundedCylinder().turnX(Math.PI/2).move(           0,sth, (sw/4 + .5)).size(stw, stw, sth).color(white).textureView(w.textures[10].lookupImageByID(1)).textureAtlas(w.textures[10]); // SEAT

    //test Bezier spline
    // let path = CG.sampleBezierPath( [-1,-1/3, 1/3,   1],  // X keys
    //                                 [ 2,   0,   2,   0],  // Y keys
    //                                 [ 1,  -1,  -1,   1],  // Z keys
    // 			                          60);
    // for (let n = 0 ; n < path.length ; n++) {
    //       mSphere().move(path[n][0], path[n][1], path[n][2]).size(.1);
    // }
    //
    // //test Catmull Rom spline
    let P = [
       [-1, -1, -1],
       [-2/3, -.3, 1],
       [ 1/3, -1/3, 1],
       [ 1,  1, -1],
       [-1, -1, -1],  // IF THE LAST KEY EQUALS THE FIRST, IT'S A LOOP.
    ];

    for (let n = 0 ; n < P.length ; n++) // SHOW KEYS AS LARGE SPHERES.
       mCube().move(P[n][0], P[n][1] + 3, P[n][2]).size(.03).turnX(Math.PI/4).color(darkRed).textureView(w.textures[8].lookupImageByID(1)).textureAtlas(w.textures[8]);;

    for (let n = 0 ; n <= 50 ; n++) {   // SHOW PATH AS SMALL SPHERES.
      // let mySz = Math.random()/2;
       let p = CG.evalCRSpline(P, n/50);
        mCube().move(p[0], p[1] + 3, p[2]).size(.001*n).textureView(w.textures[8].lookupImageByID(1)).textureAtlas(w.textures[8]);
    }

    //test lathe
    let vase = CG.createMeshVertices( 30, 30, CG.uvToLathe,
       [
          CG.bezierToCubic([0.3,.3, .3,.075,.2, .2,0]), // r
          CG.bezierToCubic([-1,-1, 0,.85,.92, 0.9,0.9] ) // z
       ]
    );
    let mVase           = () =>renderList.add(vase);

    mVase().turnX(time).move(0,th + 1.76,0).size(0.8).fx(1);

    //test extrude shape
    let createCircularPath = n => {
       let path = [];
       for (let i = 0 ; i <= n ; i++) {
          let theta = 2 * Math.PI * i / n;
          let c = Math.cos(theta);
          let s = Math.sin(theta);
          path.push([c,s,0, c,s,0]); // POSITION AND CROSS VECTOR
       }
       return path;
    }
    //
    // let createRingShape = function() {
    //    let a = .085, b = .04, c = .16,
    //        A  = .46, B = .6, C = .2;
    //
    //    let ringProfile = CG.sampleBezierPath(
    //       [a,b,  0,0,0,  0,0,0,  b,a,c, c,a],
    //       [A,B,  B,A,C, -C,-A,-B,  -B,-A,-C, C,A],
    //       [0,0,0,0],
    //       20);
    //    return CG.extrude(ringProfile, createCircularPath(50));
    // }
    //
    // let mRing           = () =>renderList.add(createRingShape());
    //
    // mRing().move(0,4,0).size(1,1,.28);


    // test textured cubes

    // const cycleIdx = Math.floor((w.frameCount / 60) % 3);
    // mCube    ().move(-2,.5, -4).turnY(time).size(.65).color(1,1,1)
    // // defines image region of texture (for now, the entire texture, always)
    // .textureView(w.textures[5].lookupImageByID(1))
    // // base
    // .textureAtlas(w.textures[5])
    // // bump
    // .textureAtlas(w.textures[4]);
    //
    //
    // mCube    ().move(-0,.5, -4).turnY(time).size(.65).color(1,1,1)
    // .textureView(w.textures[(cycleIdx + 1) % 3].lookupImageByID(1))
    // .textureAtlas(w.textures[(cycleIdx + 1) % 3]);
    //
    // mCube    ().move(2,.5, -4).turnY(time).size(.65).color(1,1,1)
    // .textureView(w.textures[(cycleIdx + 2) % 3].lookupImageByID(1))
    // .textureAtlas(w.textures[(cycleIdx + 2) % 3]);
}

function drawFrame(time, w) {
    w.frameCount += 1;

    renderList.beginFrame();
    drawScene(time, w);
    renderList.endFrame(drawShape);
}

let prevTime = 0;

/**
 *  animation function for a WebXR-supporting platform, using WebGL graphics
 *  @param t {Number} elapsed time in milliseconds
 */
function animateXRWebGL(t, frame) {
    const self = MR.engine;

    const xrInfo  = self.xrInfo;

    // request next frame
    self._animationHandle = xrInfo.session.requestAnimationFrame(
        self.config.onAnimationFrameXR
    );

    // update time
    self.time   = t / 1000.0;
    self.timeMS = t;

    const time = self.time;

    // this is the state variable
    const w = self.customState;

    const session = frame.session;
    // unpack session and pose information
    const layer   = session.renderState.baseLayer;

    const pose    = frame.getViewerPose(xrInfo.immersiveRefSpace);
    xrInfo.pose = pose;
    // updates the extended pose data
    // containing buffer representations of position, orientation
    xrInfo.poseEXT.update(xrInfo.pose);

    function gripControllerUpdate(frame, xrInfo) {
        const inputSources = session.inputSources;
        for (let i = 0; i < inputSources.length; i += 1) {
            const inputSource = inputSources[i];

            if (inputSource.gripSpace) {
                const gripPose = frame.getPose(
                    inputSource.gripSpace, xrInfo.immersiveRefSpace
                );
	            let gamepad = inputSource.gamepad;
                if (gripPose) {
                    let hand = inputSource.handedness;

                    controllerMatrix[hand] = gripPose.transform.matrix;

                    switch (inputSource.handedness) {
	                case 'left' : MR.leftController  = gamepad; break;
		        case 'right': MR.rightController = gamepad; break;
		    }
                    for (let i = 0 ; i < gamepad.buttons.length ; i++) {
	                let button = gamepad.buttons[i];
                        if (button.pressed && ! buttonState[hand][i])
			    onPress(hand, i);
                        if (! button.pressed && buttonState[hand][i])
			    onRelease(hand, i);
                        buttonState[hand][i] = button.pressed;
                    }
                }
            }
        }
    }
    gripControllerUpdate(frame, xrInfo);

    // API-specific information
    // (transforms, tracking, direct access to render state, etc.)
