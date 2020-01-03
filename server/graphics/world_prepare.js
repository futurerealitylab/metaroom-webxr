"use strict";


// (New Info): constants can be reloaded without worry
// let VERTEX_SIZE = 8;

// (New Info): temp save modules as global "namespaces" upon loads
// let gfx;

// (New Info):
// handle reloading of imports (called in setup() and in onReload())
async function initCommon(state) {
    // (New Info): use the previously loaded module saved in state, use in global scope
    // TODO automatic re-setting of loaded libraries to reduce boilerplate?
    // gfx = state.gfx;
    // state.m = new CG.Matrix();
    // noise = state.noise;
 }
 
 // (New Info):
 async function defaultReload(state) {
    // called when this file is reloaded
    // re-initialize imports, objects, and state here as needed
    await initCommon(state);
 
    // Note: you can also do some run-time scripting here.
    // For example, do some one-time modifications to some objects during
    // a performance, then remove the code before subsequent reloads
    // i.e. like coding in the browser console
 }
 
 // (New Info):
 async function defaultExit(state) {
    // called when world is switched
    // de-initialize / close scene-specific resources here
    console.log("Goodbye! =)");
 }
 
async function defaultSetup(state) {
 
    // (New Info): Here I am loading the graphics module once
    // This is for the sake of example:
    // I'm making the arbitrary decision not to support
    // reloading for this particular module. Otherwise, you should
    // do the import in the "initCommon" function that is also called
    // in onReload, just like the other import done in initCommon
    // the gfx module is saved to state so I can recover it
    // after a reload
    // state.gfx = await MR.dynamicImport(getPath('lib/graphics.js'));
    state.noise = new ImprovedNoise();
    
    initCommon(state);
 
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
 
    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
       { key : "pnoise"    , path : "shaders/noise.glsl"     , foldDefault : true },
       // { key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true },      
    ]);
    if (! libSources)
       throw new Error("Could not load shader library");
 
    function onNeedsCompilationDefault(args, libMap, userData) {
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
    }
 
    // load vertex and fragment shaders from the server, register with the editor
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
       gl,
       "mainShader",
       {   
          // (New Info): example of how the pre-compilation function callback
          // could be in the standard library instead if I put the function defintion
          // elsewhere
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
 
                gl.uniform1f(state.uBrightnessLoc, 1.0);
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
 
    // (New Info): editor state in a sub-object that can be cached
    // for convenience
    // e.g. const editor = state.editor; 
    // state.editor = {
    //     menuShape : [gfx.cube, gfx.sphere, gfx.cylinder, gfx.torus],
    //     objs : [],
    //     menuChoice : -1,
    //     enableModeler : false
    // };
 
    state.calibrationCount = 0;
 
    Input.initKeyEvents();
 }

 function defaultStartFrame(t, state) {
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
       // TODO(TR): WebXR gives us an inverse transform that we can use directly
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
 }

 
function defaultEndFrame(t, state) {
 
    /*-----------------------------------------------------------------
 
    The below two lines are necessary for making the controller handler
    logic work properly -- in particular, detecting press() and release()
    actions.
 
    -----------------------------------------------------------------*/
 
    const input  = state.input;
 
    if (input.HS) {
 
       // If headset doesn't move at all for 10 seconds, set scene brightness to zero.
 
       if (ENABLE_BRIGHTNESS_CHECK) {
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