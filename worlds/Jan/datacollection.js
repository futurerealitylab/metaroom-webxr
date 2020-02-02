"use strict"

import {Lock} from "../../lib/core/lock.js";


/*--------------------------------------------------------------------------------

The proportions below just happen to match the dimensions of my physical space
and the tables in that space.

Note that I measured everything in inches, and then converted to units of meters
(which is what VR requires) by multiplying by 0.0254.

--------------------------------------------------------------------------------*/

const inchesToMeters = inches => inches * 0.0254;
const metersToInches = meters => meters / 0.0254;

const EYE_HEIGHT       = inchesToMeters( 69);
const HALL_LENGTH      = inchesToMeters(306);
const HALL_WIDTH       = inchesToMeters(215);
const RING_RADIUS      = 0.0425;
const STOOL_HEIGHT     = inchesToMeters( 18);
const STOOL_RADIUS     = inchesToMeters( 10);
const TABLE_DEPTH      = inchesToMeters( 30);
const TABLE_HEIGHT     = inchesToMeters( 29);
const TABLE_WIDTH      = inchesToMeters( 60);
const TABLE_THICKNESS  = inchesToMeters( 11/8);
const LEG_THICKNESS    = inchesToMeters(  2.5);

const HYPERCUBE_POSITION = [0,EYE_HEIGHT,-1];
const HYPERCUBE_SCALE    = 0.2;

let enableModeler = true;

/*Example Grabble Object*/
let grabbableCube = new Obj(CG.torus);


////////////////////////////// SCENE SPECIFIC CODE

const WOOD = 0,
      TILES = 1,
      NOISY_BUMP = 2;

let noise = new ImprovedNoise();
window.m = new Matrix();

let rot4 = new Rot4();

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

async function setup(state) {
   await template_setup(state);   
   // Load files into a spatial audio context to be played back later.
    // The path will be needed to reference this source later.
 
    this.audioContext1 = new SpatialAudioContext(['assets/audio/blop.wav']);
    this.audioContext2 = new SpatialAudioContext(['assets/audio/peacock.wav']);

   // (New Info): input state in a sub-object that can be cached
   // for convenience
   // e.g. const input = state.input; 
   state.input = {
      turnAngle : 0,
      tiltAngle : 0,
      cursor : ScreenCursor.trackCursor(MR.getCanvas()),
      cursorPrev : [0,0,0],
      LC : null,
      RC : null
   }

   state.cursor = ScreenCursor.trackCursor(MR.getCanvas());
   state.calibrationCount = 0;

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

   /*-----------------------------------------------------------------

   Whenever the user enters VR Mode, create the left and right
   controller handlers.

   Also, for my particular use, I have set up a particular transformation
   so that the virtual room would match my physical room, putting the
   resulting matrix into state.calibrate. If you want to do something
   similar, you would need to do a different calculation based on your
   particular physical room.

   -----------------------------------------------------------------*/

   const input  = state.input;
   const editor = state.editor;
   
   if (! state.avatarMatrixForward) {
      state.avatarMatrixForward = CG.matrixIdentity();
      state.avatarMatrixInverse = CG.matrixIdentity();
   }
   MR.avatarMatrixForward = state.avatarMatrixForward;
   MR.avatarMatrixInverse = state.avatarMatrixInverse;

   if (MR.VRIsActive()) {
      input.HS = new HeadsetHandler(MR.headsetInfo());
      if (!input.LC || Input.gamepadStateChanged) input.LC = new ControllerHandler(MR.leftController);
      if (!input.RC || Input.gamepadStateChanged) input.RC = new ControllerHandler(MR.rightController);

      if (! state.calibrate) {
         m.identity();
         m.rotateY(Math.PI/2);
         m.translate(-2.01,.04,0);
         state.calibrate = m.value().slice();
      }
   }

// KEEP TRACK OF TIME IN SECONDS SINCE THE CLIENT STARTED.

   if (! state.tStart)
      state.tStart = t;
   state.time = (t - state.tStart) / 1000;

// NOTE: CURSOR AND KEYBOARD INPUT ARE NOT RELEVANT WHEN CLIENT IS A VR HEADSET.

   let cursorValue = () => {
      let p = state.cursor.position(), canvas = MR.getCanvas();
      return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
   }

   let cursorXYZ = cursorValue();
   if (state.cursorPrev === undefined)
      state.cursorPrev = [0,0,0];
   if (state.turnAngle === undefined)
      state.turnAngle = state.tiltAngle = 0;
   if (cursorXYZ[2] && state.cursorPrev[2]) {
      state.turnAngle -= Math.PI/2 * (cursorXYZ[0] - state.cursorPrev[0]);
      state.tiltAngle += Math.PI/2 * (cursorXYZ[1] - state.cursorPrev[1]);
   }
   state.cursorPrev = cursorXYZ;

   if (state.position === undefined)
      state.position = [0,0,0];
   let fx = -.01 * Math.sin(state.turnAngle),
       fz =  .01 * Math.cos(state.turnAngle);
   let moveBy = (dx,dz) => {
      state.position[0] += dx;
      state.position[2] += dz;
   };
   if (Input.keyIsDown(Input.KEY_UP   )) moveBy( fx, fz);
   if (Input.keyIsDown(Input.KEY_DOWN )) moveBy(-fx,-fz);
   if (Input.keyIsDown(Input.KEY_LEFT )) moveBy( fz,-fx);
   if (Input.keyIsDown(Input.KEY_RIGHT)) moveBy(-fz, fx);

// SET UNIFORMS AND GRAPHICAL STATE BEFORE DRAWING.

   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   gl.clearColor(0.0, 0.0, 0.0, 1.0);

   gl.uniform3fv(state.uCursorLoc, cursorXYZ);
   gl.uniform1f (state.uTimeLoc  , state.time);

   gl.enable(gl.DEPTH_TEST);
   gl.enable(gl.CULL_FACE);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   toy_geometric_modeler(enableModeler, state);
   
   calibrate(state);
   // maybe use Calibrator later? What is that var in server.js?
   

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

let menuX = [-.2,-.1,-.2,-.1];
let menuY = [ .1, .1,  0,  0];
let menuShape = [ CG.cube, CG.sphere, CG.cylinder, CG.torus ];
let menuChoice = -1;

function onDraw(t, projMat, viewMat, state, info) {

   // IF THE HEADSET IS JUST SITTING IDLE, DON'T DRAW ANYTHING.

   if (state.input.brightness == 0)
      return;

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

function myDraw(t, projMat, viewMat, state, eyeIdx, isMiniature) {
   // pay attention to the avatarMatrixInverse here
   viewMat = CG.matrixMultiply(viewMat, state.avatarMatrixInverse);
   gl.uniformMatrix4fv(state.uViewLoc, false, viewMat);
   gl.uniformMatrix4fv(state.uProjLoc, false, projMat);

   window.prev_shape = null;

   const input  = state.input;

   if (input.LC) {
      drawInMirror(state, -1, drawAvatar);

      if (isMiniature) {
         m.save();
            m.multiply(state.avatarMatrixForward);
            drawHeadset(state,input.HS.position(), input.HS.orientation());
         m.restore();
      }         

      // draw self controllers
      m.save();
         let P = state.position;
         m.translate(-P[0],-P[1],-P[2]);
         m.rotateY(-state.turnAngle);
         m.rotateX(-state.tiltAngle);
         m.save();
            m.multiply(state.avatarMatrixForward);
            drawController(state,input.LC.position(), input.LC.orientation(), 0, input.LC.isDown());
            drawController(state,input.RC.position(), input.RC.orientation(), 1, input.RC.isDown());
         m.restore();
         if (enableModeler && input.RC.isDown())
            showMenu(state, input.RC.position());
      m.restore();
   }
   
   draw_created_objs(state);

   // this is important, everything is shifted from now
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
      drawShape(state, CG.cube, [1,1,1], 1,4, 2,4);
   m.restore();

   /*-----------------------------------------------------------------

   Draw the two tables in the room.

   -----------------------------------------------------------------*/

   m.save();
      m.translate((HALL_WIDTH - TABLE_DEPTH) / 2, 0, 0);
      drawTable(state, 0);
   m.restore();

   m.save();
      m.translate((TABLE_DEPTH - HALL_WIDTH) / 2, 0, 0);
      drawTable(state, 1);
   m.restore();

   /*-----------------------------------------------------------------

   The stool below corresponds to the exact size and height of a round
   stool that we have placed in the physical space. This allows people who
   work in the space to sit down. We will likely be adding more physical
   stools, in which case we will add corresponding virtual ones to match.

   -----------------------------------------------------------------*/

   m.save();
      m.translate((HALL_WIDTH - TABLE_DEPTH) / 2, 0, TABLE_WIDTH / 2 + STOOL_RADIUS * 1.5);
      drawStool(state, 0);
   m.restore();

   m.save();
      m.translate((HALL_WIDTH - TABLE_DEPTH) / 2, 0, -TABLE_WIDTH / 2 - STOOL_RADIUS * 1.5);
      drawStool(state, 0);
   m.restore();

   draw_two_link_inverse_kinematics(state);  

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
         m.save();
            m.multiply(avatar.calibMatrix);
            m.translate(0, EYE_HEIGHT, 0);
         
            const rcontroller = avatar.rightController;
            const lcontroller = avatar.leftController;
            
            drawHeadset(state,headsetPos, headsetRot);
            drawController(state,rcontroller.position, rcontroller.orientation, 0);
            drawController(state,lcontroller.position, lcontroller.orientation, 1);
         m.restore();
      }

      else {
         m.save();
            m.translate(headsetPos);
            m.rotateQ(headsetRot);
            drawCamera(state);
         m.restore();
      }
   }

   // HYPERCUBE IN A 4D TRACKBALL

   {
      let isControllerInHypercube = false;
      if (input.LC && input.LC.isDown()) {
         let D = CG.scale(CG.subtract(input.LC.tip(), HYPERCUBE_POSITION), 1 / HYPERCUBE_SCALE);
         if (CG.norm(D) < 1) {
            isControllerInHypercube = true;
            if (input.D !== undefined)
               rot4.rotate(input.D, D);
            input.D = D.slice();
         }
         else
            delete input.D;
      }
      // if (isControllerInHypercube)
      //   rot4.rotate([-.101,0,.9],[-.1,0,.9]);
      let U = rot4.hypercube();
      let H = rot4.transformedHypercube();

      rot4.rotate([-.104,0,0],[-.1,0,0]);

      m.save();
         m.translate(HYPERCUBE_POSITION);
         //m.rotateY(state.time);
         m.scale(HYPERCUBE_SCALE);
         let drawVertex = P => {
            m.save();
               m.scale(1 / (1 - .2 * P[3])).
                  translate([P[0],P[1],P[2]]).
                  scale(.03);

               drawShape(state, CG.cube, [0,1,2]);
            m.restore();
         }
         for (let n = 0 ; n < H.vertices.length ; n++)
            drawVertex(H.vertices[n]);

         for (let n = 0 ; n < H.edges.length ; n++) {
            let a = H.vertices[H.edges[n][0]],
                b = H.vertices[H.edges[n][1]];
            for (let t = 1/10 ; t < 1 ; t += 1/10)
               drawVertex([ a[0] * (1-t) + b[0] * t,
                            a[1] * (1-t) + b[1] * t,
                            a[2] * (1-t) + b[2] * t,
                            a[3] * (1-t) + b[3] * t ]);
         }
      m.restore();
   }

}

function onEndFrame(t, state) {
   pollAvatarData();

   /*-----------------------------------------------------------------

   The below two lines are necessary for making the controller handler
   logic work properly -- in particular, detecting press() and release()
   actions.

   -----------------------------------------------------------------*/

   const input  = state.input;

   if (input.HS) {

      // If headset doesn't move at all for 10 seconds, set scene brightness to zero.

      {
         let P = input.HS.position();
         let Q = input.HS.orientation();

         if (input.previousP === undefined) {
            input.previousP = P;
            input.previousQ = Q;
         }

         let diff = 0;
         for (let n = 0 ; n < P.length ; n++)
            diff += Math.abs(P[n] - input.previousP[n]);
         for (let n = 0 ; n < Q.length ; n++)
            diff += Math.abs(Q[n] - input.previousQ[n]);
         input.previousP = P;
         input.previousQ = Q;

         if (input.motionlessCount === undefined || diff > .003)
            input.motionlessCount = 0;
         else
            input.motionlessCount++;

         input.brightness = input.motionlessCount < 720 ? 1 : 0; // wait 10 seconds
      }

      /*-----------------------------------------------------------------------------
      Here is an example of updating each audio context with the most
      recent headset position - otherwise it will not be spatialized
      -----------------------------------------------------------------------------*/

      this.audioContext1.updateListener(input.HS.position(), input.HS.orientation());
      this.audioContext2.updateListener(input.HS.position(), input.HS.orientation());

      /*-----------------------------------------------------------------------------
      Here you initiate the 360 spatial audio playback from a given position,
      in this case controller position. The visual object can be anything,
      such as an audio speaker or an drum in the room.

      In the current version, you must provide the file path.
      -----------------------------------------------------------------------------*/

      if (input.LC && input.LC.press())
         this.audioContext1.playFileAt('assets/audio/blop.wav', input.LC.position());

      if (input.RC && input.RC.press())
         this.audioContext2.playFileAt('assets/audio/peacock.wav', input.RC.position());
   }

   if (input.LC) input.LC.onEndFrame();
   if (input.RC) input.RC.onEndFrame();

   Input.gamepadStateChanged = false;
}

export default function main() {
   const def = {
      name: 'data collection',
      setup: setup,
      onStartFrame: onStartFrame,
      onEndFrame: onEndFrame,
      onDraw: onDraw,

      // (New Info): New callbacks:

      // VR-specific drawing callback
      // e.g. for when the UI must be different 
      //      in VR than on desktop
      //      currently setting to the same callback as on desktop
      onDrawXR: onDraw,
      // call upon reload
      onReload: onReload,
      // call upon world exit
      onExit: onExit
   };

   return def;
}

