"use strict";

import {Lock} from "/server/lock.js";

function initVar(){
   const ENABLE_BRIGHTNESS_CHECK = false;

   let enableModeler = true;
   
   /*Example Grabble Object*/
   let grabbableCube = new Obj(CG.torus);
   
   let lathe = CG.createMeshVertices(10, 16, CG.uvToLathe,
                [ CG.bezierToCubic([-1.0,-1.0,-0.7,-0.3,-0.1 , 0.1, 0.3 , 0.7 , 1.0 ,1.0]),
                  CG.bezierToCubic([ 0.0, 0.5, 0.8, 1.1, 1.25, 1.4, 1.45, 1.55, 1.7 ,0.0]) ]);
   
   const WOOD = 0,
         TILES = 1,
         NOISY_BUMP = 2;
   
   let noise = new ImprovedNoise();
   let m = new Matrix();

   let menuX = [-.2,-.1,-.2,-.1];
   let menuY = [ .1, .1,  0,  0];
   let menuShape = [ CG.cube, CG.sphere, CG.cylinder, CG.torus ];
   let menuChoice = -1;
}

async function onReload(state) {
   await defaultReload(state);
}

async function onExit(state) {
   await defaultExit(state);
}

async function setup(state) {
   hotReloadFile(getPath('week10.js'));

   initCommon(state);

   await defaultSetup(state);

   // I propose adding a dictionary mapping texture strings to locations, so that drawShapes becomes clearer
   const images = await imgutil.loadImagesPromise([
      getPath("./../../assets/textures/wood.png"),
      getPath("./../../assets/textures/tiles.jpg"),
      getPath("./../../assets/textures/noisy_bump.jpg")
   ]);

   // Load files into a spatial audio context to be played back later.
   // The path will be needed to reference this source later.

   this.audioContext1 = new SpatialAudioContext(['assets/audio/blop.wav']);
   this.audioContext2 = new SpatialAudioContext(['assets/audio/peacock.wav']);

   /************************************************************************
 
    Here we show an example of how to create a synchronized grabbable object.
    After setting initial properties, send a spawn message.
    This allows the server to keep track of objects that need to be synchronized.
 
    ************************************************************************/
 
   MR.objs.push(grabbableCube);
   grabbableCube.position    = [0,0,-.5];
   grabbableCube.orientation = [0,0,0,1];
   grabbableCube.uid = 0;
   grabbableCube.lock = new Lock();
   sendSpawnMessage(grabbableCube);

   initVar();
}

/************************************************************************

This is an example of a spawn message we send to the server.

************************************************************************/

function sendSpawnMessage(object) {
   const response = 
      {
         type: "spawn",
         uid: object.uid,
         lockid: -1,
         state: {
            position: object.position,
            orientation: object.orientation,
         }
      };
   MR.syncClient.send(response);
}

function onStartFrame(t, state) {

   defaultStartFrame();

   /*-----------------------------------------------------------------

   Below is the logic for my little toy geometric modeler example.
   You should do something more or different for your assignment. 
   Try modifying the size or color or texture of objects. Try
   deleting objects or adding constraints to make objects align
   when you bring them together. Try adding controls to animate
   objects. There are lots of possibilities.

   -----------------------------------------------------------------*/
   if (enableModeler && input.LC) {
      if (input.RC.isDown()) {
         menuChoice = findInMenu(input.RC.position(), input.RC.orientation(), input.LC.tip());
         if (menuChoice >= 0 && input.LC.press()) {
            state.isNewObj = true;
            let newObject = new Obj(menuShape[menuChoice]);
            /* Should you want to support grabbing, refer to the above example in setup(). */ 
            MR.objs.push(newObject);
            sendSpawnMessage(newObject);
         }
      }
      if (state.isNewObj) {
         let obj = MR.objs[MR.objs.length - 1];
         obj.position    = input.LC.tip().slice();
         obj.orientation = input.LC.orientation().slice();
         //Create lock object for each new obj.
         obj.lock = new Lock();
      }
      if (input.LC.release())
         state.isNewObj = false;
   }

   if (input.LC) {
      let LP = input.LC.center();
      let RP = input.RC.center();
      let D  = CG.subtract(LP, RP);
      let d  = metersToInches(CG.norm(D));
      let getX = C => {
         m.save();
            m.identity();
            m.rotateQ(CG.matrixFromQuaternion(C.orientation()));
            m.rotateX(.75);
            let x = (m.value())[1];
         m.restore();
         return x;
      }
      let lx = getX(input.LC);
      let rx = getX(input.RC);
      let sep = metersToInches(TABLE_DEPTH - 2 * RING_RADIUS);
      if (d >= sep - 1 && d <= sep + 1 && Math.abs(lx) < .03 && Math.abs(rx) < .03) {
         if (state.calibrationCount === undefined)
            state.calibrationCount = 0;
         if (++state.calibrationCount == 30) {
            m.save();
               m.identity();
               m.translate(CG.mix(LP, RP, .5));
               m.rotateY(Math.atan2(D[0], D[2]) + Math.PI/2);
               m.translate(-2.35,1.00,-.72);
               state.avatarMatrixInverse = m.value();
          m.invert();
               state.avatarMatrixForward = m.value();
            m.restore();
            state.calibrationCount = 0;
         }
      }
   }

    /*-----------------------------------------------------------------

    This function releases stale locks. Stale locks are locks that
    a user has already lost ownership over by letting go.

    -----------------------------------------------------------------*/

    releaseLocks(state);

    /*-----------------------------------------------------------------

    This function checks for intersection and if user has ownership over 
    object then sends a data stream of position and orientation.

    -----------------------------------------------------------------*/

    pollGrab(state);
}

/*-----------------------------------------------------------------

If the controller tip is near to a menu item, return the index
of that item. If the controller tip is not near to any menu
item, return -1.

mp == position of the menu origin (position of the right controller).
p  == the position of the left controller tip.

-----------------------------------------------------------------*/

let findInMenu = (mp, mq, p) => {
   m.save();
      m.identity();
      m.translate(mp);
      m.rotateQ(mq);
      m.invert();
      p = m.transform(p);
   m.restore();
   for (let n = 0 ; n < 4 ; n++) {
      let dx = p[0] - menuX[n];
      let dy = p[1] - menuY[n];
      let dz = p[2];
      if (dx * dx + dy * dy + dz * dz < .03 * .03)
         return n;
   }
   return -1;
}

function Obj(shape) {
   this.shape = shape;
}

function onDraw(t, projMat, viewMat, state, info) {

   // IF THE HEADSET IS JUST SITTING IDLE, DON'T DRAW ANYTHING.

   if (ENABLE_BRIGHTNESS_CHECK) {
      if (state.input.brightness == 0)
         return;
   }

   m.identity();

   m.rotateX(state.tiltAngle);
   m.rotateY(state.turnAngle);
   m.translate(state.position);

   // FIRST DRAW THE SCENE FULL SIZE.

   m.save();
      myDraw(t, projMat, viewMat, state, info, false);
   m.restore();

   // THEN DRAW THE ENTIRE SCENE IN MINIATURE ON THE TOP OF ONE OF THE TABLES.

   m.save();
      m.translate(HALL_WIDTH/2 - TABLE_DEPTH/2, -TABLE_HEIGHT*1.048, TABLE_WIDTH/6.7);
      m.rotateY(Math.PI);
      m.scale(.1392);
      myDraw(t, projMat, viewMat, state, info, true);
   m.restore();
}

function myDraw(t, projMat, viewMat, state, info, isMiniature) {
   viewMat = CG.matrixMultiply(viewMat, state.avatarMatrixInverse);
   gl.uniformMatrix4fv(state.uViewLoc, false, viewMat);
   gl.uniformMatrix4fv(state.uProjLoc, false, projMat);

   let prev_shape = null;

   const input  = state.input;

   if (input.LC) {
      if (isMiniature){
         m.save();
            m.multiply(state.avatarMatrixForward);
            drawHeadset(input.HS.position(), input.HS.orientation());
         m.restore();
      }         
      m.save();

         let P = state.position;
         m.translate(-P[0],-P[1],-P[2]);
         m.rotateY(-state.turnAngle);
         m.rotateX(-state.tiltAngle);

         m.save();
            m.multiply(state.avatarMatrixForward);
            drawController(input.LC.position(), input.LC.orientation(), 0, input.LC.isDown());
            drawController(input.RC.position(), input.RC.orientation(), 1, input.RC.isDown());
         m.restore();
         if (enableModeler && input.RC.isDown())
            showMenu(input.RC.position());
      m.restore();
   }

   /*-----------------------------------------------------------------

   This is where I draw the objects that have been created.

   If I were to make these objects interactive (that is, responsive
   to the user doing things with the controllers), that logic would
   need to go into onStartFrame(), not here.

   -----------------------------------------------------------------*/

   for (let n = 0 ; n < MR.objs.length ; n++) {
      let obj = MR.objs[n];
      m.save();
         m.multiply(state.avatarMatrixForward);
         m.translate(obj.position);
         m.rotateQ(obj.orientation);
         m.scale(.03,.03,.03);
         drawShape(obj.shape, n==0 ? [1,.5,.5] : [1,1,1]);
      m.restore();
   }

   m.translate(0, -EYE_HEIGHT, 0);
 
   /*-----------------------------------------------------------------

   Notice that I make the room itself as an inside-out cube, by
   scaling x,y and z by negative amounts. This negative scaling
   is a useful general trick for creating interiors.

   -----------------------------------------------------------------*/

   m.save();
      let dy = isMiniature ? 0 : HALL_WIDTH/2;
      m.translate(0, dy, 0);
      m.scale(-HALL_WIDTH/2, -dy, -HALL_LENGTH/2);
      drawShape(CG.cube, [1,1,1], 1,4, 2,4);
   m.restore();

   /*-----------------------------------------------------------------

   Demonstration of how to render the mirror reflection of an object.

   -----------------------------------------------------------------*/

   let drawTestShape = () => {
      m.save();
         m.rotateY(state.time).scale(.1);
         drawShape(CG.cube, [.5,1,1]);
         m.translate(1.5,.5,.5).scale(.5);
         drawShape(CG.cube, [.5,1,1]);
      m.restore();
   }
   m.save();
      m.translate(0,EYE_HEIGHT-.2,-2).rotateY(Math.PI/2).translate(0,0,.4);
      drawTestShape();
      drawInMirror(-.4, drawTestShape);
   m.restore();

   /*-----------------------------------------------------------------

   Draw the two tables in the room.

   -----------------------------------------------------------------*/

   m.save();
      m.translate((HALL_WIDTH - TABLE_DEPTH) / 2, 0, 0);
      drawTable(0);
   m.restore();

   m.save();
      m.translate((TABLE_DEPTH - HALL_WIDTH) / 2, 0, 0);
      drawTable(1);
   m.restore();

   /*-----------------------------------------------------------------

   The stool below corresponds to the exact size and height of a round
   stool that we have placed in the physical space. This allows people who
   work in the space to sit down. We will likely be adding more physical
   stools, in which case we will add corresponding virtual ones to match.

   -----------------------------------------------------------------*/

   m.save();
      m.translate((HALL_WIDTH - TABLE_DEPTH) / 2, 0, TABLE_WIDTH / 2 + STOOL_RADIUS * 1.5);
      drawStool(0);
   m.restore();

   /*-----------------------------------------------------------------

   Below is an example of two-link inverse kinematics, such as we might
   use to connect a shoulder to a wrist for an animated character, via
   an elbow joint whose position is calculated via two-link IK.

   The "lathe" object that defines the shape of each limb is a surface
   of revolution, which is defined up at the top of this source file.

   We are also enabling toon shading, based on a tutorial I read by
   Josh Marinacci. Most of the work of the toon shading is done in
   the vertex and fragment shaders.

   -----------------------------------------------------------------*/

   let A = [0,0,0];
   let B = [1+.4*Math.sin(2 * state.time),.4*Math.cos(2 * state.time),0];
   let C = CG.ik(.7,.7,B,[0,-1,-2]);

   m.save();
      m.translate(-.5, 2.5 * TABLE_HEIGHT, (TABLE_DEPTH - HALL_WIDTH) / 2);
      let skinColor = [1,.5,.3], D;
      state.isToon = true;

      m.save();
         m.translate(CG.mix(A,C,.5)).aimZ(CG.subtract(A,C)).scale(.05,.05,.37);
         drawShape(lathe, skinColor, -1,1, 2,1);
      m.restore();

      m.save();
         m.translate(CG.mix(C,B,.5)).aimZ(CG.subtract(C,B)).scale(.03,.03,.37);
         drawShape(lathe, skinColor, -1,1, 2,1);
      m.restore();

      state.isToon = false;
   m.restore();

   /*-----------------------------------------------------------------
      Here is where we draw avatars and controllers.
   -----------------------------------------------------------------*/
   
   for (let id in MR.avatars) {
      
      const avatar = MR.avatars[id];
      if (MR.playerid == avatar.playerid)
         continue;

      let headsetPos = avatar.headset.position;
      let headsetRot = avatar.headset.orientation;
      if(headsetPos == null || headsetRot == null)
         continue;
      if (typeof headsetPos == 'undefined') {
         console.log(id);
         console.log("not defined");
      }

      if (avatar.mode == MR.UserType.vr) {
         const rcontroller = avatar.rightController;
         const lcontroller = avatar.leftController;
         
         let hpos = headsetPos.slice();
         hpos[1] += EYE_HEIGHT;
         let lpos = lcontroller.position.slice();
         lpos[1] += EYE_HEIGHT;
         let rpos = rcontroller.position.slice();
         rpos[1] += EYE_HEIGHT;

         drawHeadset(hpos, headsetRot);
         drawController(rpos, rcontroller.orientation, 0);
         drawController(lpos, lcontroller.orientation, 1);
      }

      else {
         m.save();
       m.translate(headsetPos);
       m.rotateQ(headsetRot);
       drawCamera();
         m.restore();
      }
   }
}

function onEndFrame(t, state) {
   pollAvatarData();

   defaultEndFrame(t, state);
}

export default function main() {
   const def = {
      name: 'week10 WebXR',
      setup        : setup,
      onStartFrame : onStartFrame,
      onDraw       : onDraw,
      onEndFrame   : onEndFrame,

      // (New Info): New callbacks:

      // VR-specific drawing callbacks
      // e.g. for when the UI must be different 
      //      in VR than on desktop
      //      currently setting to the same callback as on desktop
      onStartFrameXR : onStartFrame,
      onDrawXR       : onDraw,
      onEndFrameXR   : onEndFrame,
      // call upon reload
      onReload       : onReload,
      // call upon world exit
      onExit         : onExit,
      onExitXR       : onExit,

// Note: only uncomment if using WebXR
// for debugging engine-side or taking full control
// over the system, you can override the "lower-level" wrapper functions
// and edit them at runtime as well:
/*
    onAnimationFrameWindow : function(t) {
        const self = MR.engine;

        self.time = t / 1000.0;
        self.timeMS = t;

        const gl = self.GPUCtx; 

        self._animationHandle = window.requestAnimationFrame(self.config.onAnimationFrameWindow);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        
        const viewport = self.systemArgs.viewport;
        viewport.x      = 0;
        viewport.y      = 0;
        viewport.width  = gl.drawingBufferWidth;
        viewport.height = gl.drawingBufferHeight;
        self.systemArgs.viewIdx = 0;

        mat4.identity(self._viewMatrix);
        
        mat4.perspective(self._projectionMatrix, 
            Math.PI / 4,
            self._canvas.width / self._canvas.height,
            0.01, 1024
        );

        Input.updateKeyState();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        self.config.onStartFrame(t, self.customState, self.systemArgs);

        self.config.onDraw(t, self._projectionMatrix, self._viewMatrix, self.customState, self.systemArgs);
        self.config.onEndFrame(t, self.customState, self.systemArgs);
    },
    onAnimationFrameXR : function(t, frame) {
        /////////////////////////////////////
        // temp debug
        redirectConsole(1000);
        try {
        /////////////////////////////////////

        const self = MR.engine;

        // update time
        self.time   = t / 1000.0;
        self.timeMS = t;

        //console.log("in animation frame:");
        //console.log(frame ? true : false);

        const xrInfo  = self.xrInfo;

        //console.log("is immersive");
        //console.log(xrInfo.isImmersive);

        const session = frame.session;

        // request next frame
        self._animationHandle = xrInfo.session.requestAnimationFrame(
            self.config.onAnimationFrameXR
        );

        // unpack session and pose information
        const layer   = session.renderState.baseLayer;

        const pose    = frame.getViewerPose(xrInfo.immersiveRefSpace);
        xrInfo.pose = pose;
        // updates the extended pose data
        // containing buffer representations of position, orientation
        xrInfo.poseEXT.update(xrInfo.pose);


        function TEMPGripControllerUpdate() {
            const inputSources = session.inputSources;
            for (let i = 0; i < inputSources.length; i += 1) {
                const inputSource = inputSources[i];

                //console.log("input source found=[" + i + "]");
                //console.log("has grip: " + (inputSource.gripSpace ? true : false));

                if (inputSource.gripSpace) {
                    const gripPose = frame.getPose(inputSource.gripSpace, xrInfo.immersiveRefSpace);
                    if (gripPose) {
                        //console.log("handedness: " + inputSource.handedness);

                        // TODO(TR): temporary "hack", 
                        switch (inputSource.handedness) {
                        case "left": {
                            // TODO(TR): should use the transform matrices provided for position/orientation,
                            // also provides a "pointer tip" transform
                            MR.leftController = inputSource.gamepad;
                            break;
                        }
                        case "right": {
                            MR.rightController = inputSource.gamepad;
                            break;
                        }
                        case "none": {
                            break;
                        }
                        }
                    // If we have a grip pose use it to render a mesh showing the
                    // position of the controller.
                    // NOTE: this contains a "handedness property". Wonderful!
                    //scene.inputRenderer.addController(gripPose.transform.matrix, inputSource.handedness);
                    }
                }
            }
        }
        TEMPGripControllerUpdate();

        self.systemArgs.frame = frame;
        self.systemArgs.pose  = pose;
        // renderState contains depthFar, depthNear
        self.systemArgs.renderState = session.renderState;

        const gl        = self.GPUCtx;
        const glAPI     = self.gpuAPI;
        const glCtxInfo = self.gpuCtxInfo;

        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);

        // begin frame
        self.config.onStartFrameXR(t, self.customState, self.systemArgs);
        // draw
        {
            const viewport = self.systemArgs.viewport;

            const views     = pose.views;
            const viewCount = views.length;

            // in this configuration of the animation loop,
            // for each view, we re-draw the whole screne -
            // other configurations possible 
            // (for example, for each object, draw every view (to avoid repeated binding))
            for (let i = 0; i < viewCount; i += 1) {
                self.systemArgs.viewIdx = i;

                const view     = views[i];
                const viewport = layer.getViewport(view);

                self.systemArgs.view     = view;
                self.systemArgs.viewport = viewport;

                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

                self.config.onDrawXR(
                    t, 
                    view.projectionMatrix,
                    // view.transform.matrix gives you the camera matrix
                    view.transform.inverse.matrix,
                    // user state
                    self.customState,
                    // pass all API-specific information
                    // (transforms, tracking, direct access to render state, etc.)
                    self.systemArgs
                );
            }
        }
        // end frame
        self.config.onEndFrameXR(t, self.customState, self.systemArgs);

        ////////////////////////////////////////
        // temp debug
        } catch (err) {
            console.error(err.stack);
        }
        console.log();
        flushAndRestoreConsole();
        ////////////////////////////////////////
    }
    */
   };

   return def;
}

