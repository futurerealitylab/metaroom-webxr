"use strict";

import {ShaderTextEditor} from "/lib/core/shader_text_editor.js";
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

const TABLETOP_CLONE_SCALE = .1392;

const HYPERCUBE_POSITION = [0,EYE_HEIGHT,0];
const HYPERCUBE_SCALE    = 0.2;

let enableModeler = true;
let enablePathRenderer = true;

/*Example Grabble Object*/
let grabbableCube = new Obj(CG.torus);

let lathe = CG.createMeshVertices(10, 16, CG.uvToLathe,
             [ CG.bezierToCubic([-1.0,-1.0,-0.7,-0.3,-0.1 , 0.1, 0.3 , 0.7 , 1.0 ,1.0]),
               CG.bezierToCubic([ 0.0, 0.5, 0.8, 1.1, 1.25, 1.4, 1.45, 1.55, 1.7 ,0.0]) ]);
// let lathe = CG.cube;
////////////////////////////// SCENE SPECIFIC CODE

const WOOD = 0,
      TILES = 1,
      NOISY_BUMP = 2;

let noise = new ImprovedNoise();
let m = new Matrix();



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
      m.identity();                     // MOVE THE "HOT SPOT" OF
      m.translate(this.position());     // THE CONTROLLER TOWARD
      m.rotateQ(this.orientation());    // FAR TIP (FURTHER AWAY
      m.translate(0,.04,-.02);          // FROM THE USER'S HAND).
      let v = m.value();
      return [v[12],v[13],v[14]];
   }
   this.center = () => {
      m.identity();
      m.translate(this.position());
      m.rotateQ(this.orientation());
      m.translate(0,.02,-.005);
      let v = m.value();
      return [v[12],v[13],v[14]];
   }
   let wasDown = false;
}

let rot4;

let DRend;     // module
let DR;        // module alias
let drend;     // render static type (constructor)

async function initCommon(state) {
    DRend = await MR.dynamicImport(
        "/lib/render/dynamic_renderer_wgl.js"
    );
    DR = DRend;
    drend = DR.Renderer;

    rot4 = state.rot4;
}

async function onReload(state) {
   // dynamic renderer (updates per-frame)
   state.dr.rewindToStart();

   await initCommon(state);

   myRenderPipeline = state.myRenderPipeline;
}

async function onExit(state) {
   state.dr.rewindToStart();
   state.dr.deinit();
}

let myRenderPipeline;
// temp, will be internal state
function bindRenderPipeline(pip) {
   gl.cullFace(pip.cull_mode);
}
async function initRenderer(state) {
   // init system (shared between instances)
   await drend.initSystem({ctx : gl});
   state.dr = new drend();
   // init the instance
   await state.dr.init(gl);

   myRenderPipeline = {
      cull_mode : gl.BACK
   };
   state.myRenderPipeline = myRenderPipeline;
}

async function setup(state) {
   hotReloadFile(getPath('metanook.js'));

   ShaderTextEditor.showEditor();

   state.noise = new ImprovedNoise();
   state.rot4 = new Rot4();
   await initCommon(state);

   await initRenderer(state);

   state.input = {
      turnAngle : 0,
      tiltAngle : 0,
      cursor : ScreenCursor.trackCursor(MR.getCanvas()),
      cursorPrev : [0,0,0],
      LC : null,
      RC : null
   }

   // I propose adding a dictionary mapping texture strings to locations, so that drawShapes becomes clearer
   const images = await imgutil.loadImagesAsync([
      "/assets/textures/wood.png",
      "/assets/textures/tiles.jpg",
      "/assets/textures/noisy_bump.jpg"
   ]);

   let libSources = await ShaderTextEditor.loadLibs(gl, "libs", [
      { key : "pnoise"    , path : "shaders/noise.glsl"     , foldDefault : true },
   ]);
   if (! libSources)
      throw new Error("Could not load shader library");

   function onNeedsCompilationDefault(args, libMap, userData) {
      const stages = [args.vertex, args.fragment];
      const output = [args.vertex, args.fragment];
      const implicitNoiseInclude = true;
      if (implicitNoiseInclude) {
         let libCode = ShaderTextEditor.libMap.get('pnoise');
         for (let i = 0; i < 2; i++) {
               const stageCode = stages[i];
               const hdrEndIdx = stageCode.indexOf(';');
               const hdr = stageCode.substring(0, hdrEndIdx + 1);
               output[i] = hdr + '\n#line 2 1\n' + 
                           '#include<pnoise>\n#line ' + (hdr.split('\n').length + 1) + ' 0' + 
                           stageCode.substring(hdrEndIdx + 1);
         }
      }
      ShaderTextEditor.preprocessCompileValidateStrings(
         output[0],
         output[1],
         libMap
      );
   }

   // load vertex and fragment shaders from the server, register with the editor
   let shaderSource = await ShaderTextEditor.loadShader(
      gl,
      "main",
      {  
         onNeedsCompilationDefault : onNeedsCompilationDefault,
         onAfterCompilation : (program) => {
            gl.useProgram(state.program = program);
            state.uBrightnessLoc = gl.getUniformLocation(program, 'uBrightness');
            state.uColorLoc      = gl.getUniformLocation(program, 'uColor');
            state.uCursorLoc     = gl.getUniformLocation(program, 'uCursor');
            state.uModelLoc      = gl.getUniformLocation(program, 'uModel');
            state.uProjLoc       = gl.getUniformLocation(program, 'uProj');
            state.uTexScale      = gl.getUniformLocation(program, 'uTexScale');
            state.uTexIndexLoc   = gl.getUniformLocation(program, 'uTexIndex');
            state.uTimeLoc       = gl.getUniformLocation(program, 'uTime');
            state.uToonLoc       = gl.getUniformLocation(program, 'uToon');
            state.uViewLoc       = gl.getUniformLocation(program, 'uView');
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
         foldDefault : {vertex : true, fragment : true}
      }
   );
   if (! shaderSource)
      throw new Error("Could not load shader");

   state.vao = gl.createVertexArray();
   // this records the attributes we set along
   // with the vbos we point the attribute pointers to
   gl.bindVertexArray(state.vao);
   gl.useProgram(state.program);

   state.buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);

   let bpe = Float32Array.BYTES_PER_ELEMENT;

   let aPos = gl.getAttribLocation(state.program, 'aPos');
   gl.enableVertexAttribArray(aPos);
   gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 0);

   let aNor = gl.getAttribLocation(state.program, 'aNor');
   gl.enableVertexAttribArray(aNor);
   gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 3);

   let aTan = gl.getAttribLocation(state.program, 'aTan');
   gl.enableVertexAttribArray(aTan);
   gl.vertexAttribPointer(aTan, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 6);

   let aUV  = gl.getAttribLocation(state.program, 'aUV');
   gl.enableVertexAttribArray(aUV);
   gl.vertexAttribPointer(aUV , 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 9);

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

   state.calibrationCount = 0;

   Input.initKeyEvents();

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
const ident = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

function enqueuePathRenderingData(state, dr, time) {
   if (!enablePathRenderer) {
      return;
   }

   // use the default shader for this renderer
   // (vertex-colored flat shapes, no lighting) 
   // shader stage files located in "/assets/shaders"
   dr.fxDefault();
   // update the global time
   dr.updateGlobalTimeSeconds(state.time);

   m.save();
      m.identity();

      dr.modelMatrix(m.value());
      m.rotateX(state.tiltAngle);
      m.rotateY(state.turnAngle);
      m.translate(state.position);

      dr.viewMatrix(m.value());
      dr.projectionMatrix(ident);

      m.restore();
   m.save();
      m.identity();

   

   //dr.color(1, 0, 0, 1);

   // if you want lines:
   //dr.modePrimitiveLines();
   //dr.lineWidth(4); // width is only 1 on most devices, variable on Quest
   // triangles:
   // dr.modeTriangles();

   
   // TODO follow the examples to see what can be done here
   // see /worlds/dynamic_renderer/dynamic_renderer.js for examples of
   // what to do here. Specifically, find the function calls in each case
   // of the switch statement on line 130

// state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH
   penExample(state, m, dr, time, 
      (Math.sin(time) + 1.0) / 2.0,
      Math.sin(time), Math.cos(time), -1
   );

   DR.uploadData(dr);
}

function penExample(state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH) {
    // this sets a default global color
    pr.color(1, 0, 0, 1);

    m.save();

    const ts = [0.5, 0.5, -DEPTH];

    {
        pr.modePrimitiveLines(); 

        // in pixels for now
        pr.lineWidth(7);

        //pr.moveTo(0, 0, DEPTH); // start cursor at A
        //pr.beginPath();

        // this is equivalent to the commented-out steps above
        pr.beginPathAt(0, 0, DEPTH); 

        pr.pathTo(0.5, 0.5 - 0.5 * sinTime, DEPTH, 1.0, 0.0, 0.0, 1.0); // [A, B)

        // "EX" variants of functions require the caller to pass
        // all arguments explicitly - this overrides the global
        // settings such as "color". I prefer this to the global
        // settings since I don't need to track what the global state
        // actually is. All the information is here in-place
        pr.pathToEX(0.5, 0.0, DEPTH, 0.0, 1.0, 0.0, 1.0); // [B, C)
        pr.closePathEX(0.0, 0.0, 1.0, 1.0);
        pr.pathToEX(-0.5, -0.5, DEPTH, 1.0, 0.0, 0.0, 1.0);
        pr.endPathEX(1.0, 1.0, 1.0, 0.5); // C] must include the endpoint
    }
    {
        pr.modeTriangles();

        m.save();
            m.translate(-ts[0], -ts[1], -ts[2]);
            m.rotateZ(timeS);
            m.translate(ts[0], ts[1], ts[2]);
            pr.modelMatrix(m.value());
        m.restore();

        pr.beginPath();
        pr.pathToEX(-0.5, -1.0 + DEPTH / 4, DEPTH, 1.0, 1.0, 1.0, 0.27);
        pr.pathToEX(0.5, -1.0, DEPTH, 0.0, 1.0, 0.0, 1.0);
        
        pr.color(0.7, 0.0, 1.0, 1.0);
        pr.endPath();

        m.save();
            m.translate(-ts[0], -ts[1], -ts[2]);
            m.rotateY(timeS * 2);
            m.translate(ts[0], ts[1], ts[2]);
            pr.modelMatrix(m.value());
        m.restore();

        // two sides (instead of disabling culling): 
        // (TODO: option to generate both sides upon call to endPath?)
        pr.beginPath();

            pr.pathTo(0.5 + 2 * sin01Time, -0.2, DEPTH);
            pr.color(0.2, 0.0, 1.0, 1.0);
            pr.pathTo(0.0, -0.2 - DEPTH / 7, DEPTH);

        pr.endPathEX(1.0, 0.0, 0.0, 1.0);
        pr.beginPath();

            pr.pathToEX(0.5 + 2 * sin01Time, -0.2, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.color(0.2, 0.0, 1.0, 1.0);
            pr.pathTo(0.5, -1.0, DEPTH);

        pr.endPathEX(0.7, 0.0, 1.0, 1.0);
        
        // TODO coordinate stack to return here
        pr.moveTo(0.0, -0.2 - DEPTH / 7, DEPTH);
    }
    {
        pr.modePrimitiveLines();
        
        pr.beginPath();
        pr.pathToEX(-0.5, -0.5, DEPTH, 1.0, 0.0, 0.0, 1.0);
        pr.endPathEX(1.0, 1.0, 1.0, 0.5);
    }

    m.restore();
}

// class Time {
//    constructor() {
//       this.s      = 0;
//       this.ms     = 0;
//       this.msprev = 0;
//       this.dt     = 0;
//    }
// }

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

// // KEEP TRACK OF TIME IN SECONDS SINCE THE CLIENT STARTED.

   if (! state.tStart) {
      state.tStart = t;
      state.tPrev = t;
   }
   state.time = (t - state.tStart) / 1000;
   state.dt = (t - state.tPrev) / 1000;
   state.tPrev = t;

// // NOTE: CURSOR AND KEYBOARD INPUT ARE NOT RELEVANT WHEN CLIENT IS A VR HEADSET.

   let cursorValue = () => {
      let p = input.cursor.position(), canvas = MR.getCanvas();
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
   let fx = -5 * Math.sin(state.turnAngle),
       fz =  5 * Math.cos(state.turnAngle);
   let moveBy = (dx,dz) => {
      state.position[0] += dx * state.dt;
      state.position[2] += dz * state.dt;
   };
   if (Input.keyIsDown(Input.KEY_UP   )) moveBy( fx, fz);
   if (Input.keyIsDown(Input.KEY_DOWN )) moveBy(-fx,-fz);
   if (Input.keyIsDown(Input.KEY_LEFT )) moveBy( fz,-fx);
   if (Input.keyIsDown(Input.KEY_RIGHT)) moveBy(-fz, fx);

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
      let sep = [metersToInches(TABLE_DEPTH   - 2 * RING_RADIUS),
                 metersToInches(TABLE_DEPTH/2 - 2 * RING_RADIUS)];
      for (let n = 0 ; n < 2 ; n++) {
         let sgn = n == 0 ? -1 : 1;
         if (d >= sep[n] - 1 && d <= sep[n] + 1 && Math.abs(lx) < .03 && Math.abs(rx) < .03) {
            if (state.calibrationCount === undefined)
               state.calibrationCount = 0;
            if (++state.calibrationCount == 30) {
               m.save();
                  m.identity();
                  m.translate(CG.mix(LP, RP, .5));
                  m.rotateY(Math.atan2(D[0], D[2]) - sgn * Math.PI/2);
                  m.translate(-2.35, 1.00, sgn * .72);
                  state.avatarMatrixInverse = m.value();
                  m.invert();
                  state.avatarMatrixForward = m.value();
               m.restore();
               state.calibrationCount = 0;
            }
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


   // SET UNIFORMS AND GRAPHICAL STATE BEFORE DRAWING.
   gl.clearColor(0.429, 0.808, 0.93, 1.0);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   gl.useProgram(state.program);
   gl.uniform3fv(state.uCursorLoc, cursorXYZ);
   gl.uniform1f (state.uTimeLoc  , state.time);

   gl.enable(gl.DEPTH_TEST);
   gl.enable(gl.CULL_FACE);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   /*----------------------------------
   enqueue data for dynamic geometry (e.g. lines and triangles),
   this only needs to be called once-per frame
   since the same data can be reused with different
   view and projection matrices
   ------------------------------------*/
   enqueuePathRenderingData(state, state.dr, state.time);
}

let menuX = [-.2,-.1,-.2,-.1];
let menuY = [ .1, .1,  0,  0];
let menuShape = [ CG.cube, CG.sphere, CG.cylinder, CG.torus ];
let menuChoice = -1;

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
      // TABLETOP_CLONE_SCALE
      // constant declared at top of file
      // so we don't need to change the value across all instances
      m.scale(TABLETOP_CLONE_SCALE); 
      myDraw(t, projMat, viewMat, state, info, true);
   m.restore();
}

function myDraw(t, projMat, viewMat, state, eyeIdx, isMiniature) {
   gl.bindVertexArray(state.vao);
   gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
   gl.useProgram(state.program);

   viewMat = CG.matrixMultiply(viewMat, state.avatarMatrixInverse);
   gl.uniformMatrix4fv(state.uViewLoc, false, viewMat);
   gl.uniformMatrix4fv(state.uProjLoc, false, projMat);

   let prev_shape = null;

   const input  = state.input;

   /*-----------------------------------------------------------------

   The drawShape() function below is optimized in that it only downloads
   new vertices to the GPU if the vertices (the "shape" argument) have
   changed since the previous call.

   Also, currently we only draw gl.TRIANGLES if this is a cube. In all
   other cases, we draw gl.TRIANGLE_STRIP. You might want to change
   this if you create other kinds of shapes that are not triangle strips.

   -----------------------------------------------------------------*/

   let drawShape = (shape, color, texture, textureScale) => {
      let drawArrays = () => gl.drawArrays(shape == CG.cube || shape == CG.quad ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
      gl.uniform1f(state.uBrightnessLoc, input.brightness === undefined ? 1 : input.brightness);
      gl.uniform4fv(state.uColorLoc, color.length == 4 ? color : color.concat([1]));
      gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
      gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
      gl.uniform1f(state.uTexScale, textureScale === undefined ? 1 : textureScale);
      if (shape != prev_shape)
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( shape ), gl.STATIC_DRAW);
      if (state.isToon) {
         gl.uniform1f (state.uToonLoc, .3 * CG.norm(m.value().slice(0,3)));
         gl.cullFace(gl.FRONT);
         drawArrays();
         gl.cullFace(gl.BACK);
         gl.uniform1f (state.uToonLoc, 0);
      }
      if (state.isMirror) gl.cullFace(gl.FRONT);
         drawArrays();
      gl.cullFace(gl.BACK);
      prev_shape = shape;
   }

   /*-----------------------------------------------------------------

   In my little toy geometric modeler, the pop-up menu of objects only
   appears while the right controller trigger is pressed. This is just
   an example. Feel free to change things, depending on what you are
   trying to do in your homework.

   -----------------------------------------------------------------*/

   let showMenu = p => {
      for (let n = 0 ; n < 4 ; n++) {
         m.save();
            m.multiply(state.avatarMatrixForward);
            m.translate(p);
            m.rotateQ(input.RC.orientation());
            m.translate(menuX[n], menuY[n], 0);
            m.scale(.03, .03, .03);
            drawShape(menuShape[n], n == menuChoice ? [1,.5,.5] : [1,1,1]);
         m.restore();
      }
   }

    /*-----------------------------------------------------------------

    drawTable() just happens to model the physical size and shape of the
    tables in my lab (measured in meters). If you want to model physical
    furniture, you will probably want to do something different.

    -----------------------------------------------------------------*/

   let drawCamera = id => {
      m.save();
         m.translate(0,0,.1).scale(.1);
         drawShape(CG.cube, [.5,.5,.5]);
      m.restore();
      m.save();
         m.translate(0,0,-.05).scale(.05);
         drawShape(CG.cylinder, [.5,.5,.5]);
      m.restore();
      m.save();
         m.translate(0,0,-.1).scale(.04,.04,.001);
         drawShape(CG.cylinder, [-1,-1,-1]);
      m.restore();
   }

   let drawStool = id => {
      m.save();
         m.translate(0, STOOL_HEIGHT/2, 0);
         m.rotateX(Math.PI/2);
         m.scale(STOOL_RADIUS, STOOL_RADIUS, STOOL_HEIGHT/2);
         drawShape(CG.roundedCylinder, [.2,.2,.2]);
      m.restore();
   }

   let drawTable = id => {
      m.save();
         m.translate(0, TABLE_HEIGHT - TABLE_THICKNESS/2, 0);
         m.scale(TABLE_DEPTH/2, TABLE_THICKNESS/2, TABLE_WIDTH/2);
         drawShape(CG.cube, [1,1,1], 0);
      m.restore();
      m.save();
         let h  = (TABLE_HEIGHT - TABLE_THICKNESS) / 2;
         let dx = (TABLE_DEPTH  - LEG_THICKNESS  ) / 2;
         let dz = (TABLE_WIDTH  - LEG_THICKNESS  ) / 2;
         for (let x = -dx ; x <= dx ; x += 2 * dx)
         for (let z = -dz ; z <= dz ; z += 2 * dz) {
            m.save();
               m.translate(x, h, z);
               m.scale(LEG_THICKNESS/2, h, LEG_THICKNESS/2);
               drawShape(CG.cube, [.5,.5,.5]);
            m.restore();
         }
      m.restore();
   }

   let drawHeadset = (position, orientation) => {
      m.save();
         m.translate(position);
         m.rotateQ(orientation);
         m.scale(.1);
         m.save();
            m.scale(1,1.5,1);
            drawShape(CG.sphere, [0,0,0]);
         m.restore();
         for (let s = -1 ; s <= 1 ; s += 2) {
            m.save();
               m.translate(s*.4,.2,-.8);
               m.scale(.4,.4,.1);
               drawShape(CG.sphere, [10,10,10]);
            m.restore();
         }
      m.restore();
   }

   /*-----------------------------------------------------------------

   The below is just my particular visual design for the size and
   shape of a controller. Feel free to create a different appearance
   for the controller. You might also want the controller appearance,
   as well as the way it animates when you press the trigger or other
   buttons, to change with different functionality.

   For example, you might want to have different appearances when using
   a controller as a selection tool, a resizing tool, a tool for drawing
   in the air, and so forth.

   -----------------------------------------------------------------*/
    
   let getControllerBeamPoint = (C, t) => {
     let P = state.position;
     m.save();
         m.translate(-P[0],-P[1],-P[2]);
         m.rotateY(-state.turnAngle);
         m.rotateX(-state.tiltAngle);
         m.multiply(state.avatarMatrixForward);

         m.translate(C.position());
         m.rotateQ(C.orientation());
         m.translate(0,.02,-.005);
         m.rotateX(.75);
         m.translate(0,0,-.0095 - t);
	 P = m.transform([0,0,0]);
      m.restore();
      return P;
   }

   let drawController = (pos, rot, hand, isPressed) => {
      m.save();
         m.translate(pos);
         m.rotateQ(rot);
         m.translate(0,.02,-.005);
         m.rotateX(.75);
         m.save();
               m.translate(0,0,-.0095).scale(.004,.004,.003);
               drawShape(CG.sphere, isPressed ? [10,0,0] : [.5,0,0]);
         m.restore();
         m.save();
               m.translate(0,0,-.01).scale(.04,.04,.13);
               drawShape(CG.torus1, [0,0,0]);
         m.restore();
         m.save();
               m.translate(0,-.0135,-.008).scale(.04,.0235,.0015);
               drawShape(CG.cylinder, [0,0,0]);
         m.restore();
         m.save();
               m.translate(0,-.01,.03).scale(.012,.02,.037);
               drawShape(CG.cylinder, [0,0,0]);
         m.restore();
         m.save();
               m.translate(0,-.01,.067).scale(.012,.02,.023);
               drawShape(CG.sphere, [0,0,0]);
         m.restore();
      m.restore();
   }

   // DRAW AN OBJECT AS THOUGH IT IS REFLECTED IN AN MIRROR ALIGNED WITH THE XY PLANE AT Z==z.

   let drawInMirror = (z, drawProc) => {
      m.save();
         m.translate(0,0,2 * z);
         m.scale(1,1,-1);
         state.isMirror = true;
         drawProc();
         state.isMirror = false;
      m.restore();
   }

   let drawAvatar = () => {
      m.save();
         m.multiply(state.avatarMatrixForward);
         drawHeadset(input.HS.position(), input.HS.orientation());
      m.restore();
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
      m.restore();
   }

   if (input.LC) {
      drawInMirror(-1, drawAvatar);

      if (isMiniature) {
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

   let bounce = t => {
      t = (2 * t) % 2;
      t = t < 1 ? t : 2 - t;
      return 1 - t * t;
   }

   // SEE IF WE HAVE A CORRECT UNDERSTANDING OF THE CONTROLLER TIP POSITION.

   if (input.LC) {
      m.save();
         m.translate(getControllerBeamPoint(input.LC, .3 * bounce(state.time)));
	      m.rotateY(state.time);
         m.scale(.021);
         drawShape(CG.sphere, [2,2,2]);
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
      drawShape(CG.cube, [0.8,0.8,1,1], 1,4, 2,4);
   m.restore();

   /*-----------------------------------------------------------------

   Demonstration of how to render the mirror reflection of an object.

   -----------------------------------------------------------------*/
/*
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
*/
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
/*
      if (isControllerInHypercube)
         rot4.rotate([-.101,0,.9],[-.1,0,.9]);
*/
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

               drawShape(CG.cube, [0,1,2]);
            m.restore();
      	}
         for (let n = 0 ; n < H.vertices.length ; n++) {
   	      drawVertex(H.vertices[n]);
         }
   	   for (let n = 0 ; n < H.edges.length ; n++) {
            let a = H.vertices[H.edges[n][0]],
   	          b = H.vertices[H.edges[n][1]];
            for (let t = 1/10 ; t < 1 ; t += 1/10) {
   	         drawVertex([
                  a[0] * (1-t) + b[0] * t,
   	            a[1] * (1-t) + b[1] * t,
   			      a[2] * (1-t) + b[2] * t,
   			      a[3] * (1-t) + b[3] * t]
               );
            }
   	   }
      m.restore();
   }


   // path line rendering
   drawPaths(state, state.dr, projMat, viewMat, isMiniature);
}

let m2 = new Matrix();
class Transform {
   constructor() {
      this.position    = new Float32Array(3);
      this.rotation    = new Float32Array(3);
      this.scale       = new Float32Array(3);
   }
}
const gizmoXform = new Transform();

function drawPaths(state, dr, projMat, viewMat, isMiniature) {
   if (!enablePathRenderer) {
      return;
   }

   gizmoXform.position[0] = 0;
   gizmoXform.position[1] = 1.7;
   gizmoXform.position[2] = 0;
   gizmoXform.rotation[0] = 0;
   gizmoXform.rotation[1] = 0;
   gizmoXform.rotation[2] = 0;
   gizmoXform.scale[0]    = 1;
   gizmoXform.scale[1]    = 1;
   gizmoXform.scale[2]    = 1;

   DR.beginRenderPass(dr);
   bindRenderPipeline(myRenderPipeline);

      dr.projectionMatrixGlobal(projMat);
      dr.viewMatrixGlobal(viewMat);

      
      m2.save();
      m2.identity();
      
      if (isMiniature) {
         m2.translate(HALL_WIDTH/2 - TABLE_DEPTH/2, -TABLE_HEIGHT*1.048, TABLE_WIDTH/6.7);
         m2.rotateY(Math.PI);
         m2.scale(TABLETOP_CLONE_SCALE);   
      }
      m2.translate(
         gizmoXform.position[0], 
         gizmoXform.position[1],
         gizmoXform.position[2]
      );
      m2.rotateX(
         gizmoXform.rotation[0],
      );
      m2.scale(
         gizmoXform.scale[0],
         gizmoXform.scale[1],
         gizmoXform.scale[2]
      );
      dr.modelMatrixGlobal(m2.value());

      m2.restore();

      DR.draw(dr);

   DR.endRenderPass(dr);
}

function onEndFrame(t, state) {
   // reset the dynamic renderer to start
   // since this instance is used for
   // per-frame data
   state.dr.rewindToStart();

   //pollAvatarData();

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
      name: 'metanook',
      setup: setup,
      onStartFrame: onStartFrame,
      onStartFrameXR: onStartFrame,
      onEndFrame: onEndFrame,
      onEndFrameXR: onEndFrame,
      onDraw: onDraw,
      onDrawXR: onDraw,
      onReload: onReload,
      onExit: onExit
   };

   return def;
}

