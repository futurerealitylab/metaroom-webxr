"use strict";

// static imports (cannot be reloaded!)

// for loading files and assets at specific paths
// NOTE: (the * syntax means to import all symbols into the named object "Path")
import * as Path            from "/lib/util/path.js";
// for loading basic assets
import * as Asset           from "/lib/util/asset.js";
// for canvas interaction
import * as Canvas          from "/lib/util/canvas.js";
// for memory operations
import * as Mem             from "/lib/core/memory.js";
// webgl shader utilities
import * as Shader          from "/lib/core/gpu/webgl_shader_util.js";
// builtin integrated shader editor
// NOTE: this import syntax imports the specific symbol from the module by name
import {ShaderTextEditor} from "/lib/core/shader_text_editor.js";
// mouse cursor input
import {ScreenCursor}      from "/lib/input/cursor.js";
// code reloading utility
import * as Code_Loader     from "/lib/core/code_loader.js";
// input handling
import * as Input           from "/lib/input/input.js";

// linear algebra library (can be replaced, but is useful for now)
import * as _             from "/lib/third-party/gl-matrix-min.js";
let Linalg = glMatrix;


let noise = new ImprovedNoise();
let m = new Matrix();
let w = null;

let leftPressed = false;
let rightPressed = false;

///////////////////////////////////////////////////////////////////

// dynamic imports, global namespace variables for convenience
// personal math library module
let Maths = null;
// chalktalk modeler library module
let CT = null;

/** 
 *  setup that needs occurs upon initial setup 
 *  and on reload
 *  @param w {World_State} storage for your persistent world state
 */
async function initCommon(_w) {
    w = _w;
    w.m = m;

    // this loads the math module
    // if it has been changed - located at /lib/math/math.js
    Maths   = await MR.dynamicImport("/lib/math/math.js");
    CT      = await MR.dynamicImport(Path.fromLocalPath("/chalktalk/chalktalk.js"));


}

async function loadShaders(w) {
    const vertex   = await Asset.loadTextRelativePath("/shaders/vertex.vert.glsl");
    const fragment = await Asset.loadTextRelativePath("/shaders/fragment.frag.glsl");

    let errorStatus = {};
    const shader = Shader.compileValidateStrings(vertex, fragment, errorStatus);
    gl.useProgram(shader);
    w.gl = gl;
    w.shader = shader;
}

async function initGraphicsCommon(w) {
    w.uColor      = gl.getUniformLocation(w.shader, 'uColor');
    w.uCursor     = gl.getUniformLocation(w.shader, 'uCursor');
    w.uModel      = gl.getUniformLocation(w.shader, 'uModel');
    w.uProj       = gl.getUniformLocation(w.shader, 'uProj');
    w.uTexScale   = gl.getUniformLocation(w.shader, 'uTexScale');
    w.uTexIndex   = gl.getUniformLocation(w.shader, 'uTexIndex');
    w.uTime       = gl.getUniformLocation(w.shader, 'uTime');
    w.uToon       = gl.getUniformLocation(w.shader, 'uToon');
    w.uView       = gl.getUniformLocation(w.shader, 'uView');
    w.uBrightness = gl.getUniformLocation(w.shader, "uBrightness");
    w.uTex = [];
    for (let n = 0 ; n < 8 ; n++) {
        w.uTex[n] = gl.getUniformLocation(w.shader, 'uTex' + n);
        gl.uniform1i(w.uTex[n], n);
    }
}

/** 
 *  setup that occurs upon reload
 *  and on reload
 *  @param w {World_State} storage for your persistent world state
 */
async function onReload(w, info) {
    await initCommon(w);

    console.log(info.file);

    if (info.file.endsWith(".glsl")) {
        await loadShaders(w);
    }

    await initGraphicsCommon(w);
}
/** 
 *  setup that occurs upon initial setup 
 *  and on reload
 *  @param w {World_State} storage for your persistent world state
 */
async function setup(w) {

    // refer to the backend as "self"
    const self = MR.engine;

    // set which files to watch for reloading
    // (We can now load files other than this home world file)

    Code_Loader.hotReloadFiles(
    Path.getMainFilePath(),
    [   
        {path : "lib/math/math.js"},
        {path : Path.fromLocalPath("chalktalk/chalktalk.js")},
        {path : Path.fromLocalPath("shaders/vertex.vert.glsl")},
        {path : Path.fromLocalPath("shaders/fragment.frag.glsl")},
    ]
    );

    // call a setup function you define in your local library file,
    // useful if it's the same code in most of your projects
    //
    // NOTE: if you're just calling one function, you can just parenthesize
    // like this and throw the module object away, or statically import the function at the top of this file
    (await MR.dynamicImport(Path.fromLocalPath("/prefs/setup_common.js"))).setup(w);

    // initialize state common to first launch and reloading
    await initCommon(w);

    renderList.setWorld(w);

    w.input = {
        turnAngle : 0,
        tiltAngle : 0,
        // get a cursor for the canvas
        cursor    : ScreenCursor.trackCursor(MR.getCanvas())
    };

    w.prev_shape = null;

    // hide the pointer
    w.input.cursor.hide();

    // initialize key events
    Input.initKeyEvents();


    const gl = self.GPUCtx;

    w.CTScene = new CT.Scene({
        graphicsContext : gl
    });

    let out = await w.CTScene.init({
        // arguments
    });

    ShaderTextEditor.hideEditor();

    await loadShaders(w);

/*
    console.group("testing shader loading");
    {
        console.log(vertex);
        console.log(fragment);
    }
    console.groupEnd();
*/

   w.vao = gl.createVertexArray();
   // this records the attributes we set along
   // with the vbos we point the attribute pointers to
   gl.bindVertexArray(w.vao);
   gl.useProgram(w.shader);

   w.buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, w.buffer);

   let bpe = Float32Array.BYTES_PER_ELEMENT;

   let aPos = gl.getAttribLocation(w.shader, 'aPos');
   gl.enableVertexAttribArray(aPos);
   gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 0);

   let aNor = gl.getAttribLocation(w.shader, 'aNor');
   gl.enableVertexAttribArray(aNor);
   gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 3);

   let aTan = gl.getAttribLocation(w.shader, 'aTan');
   gl.enableVertexAttribArray(aTan);
   gl.vertexAttribPointer(aTan, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 6);

   let aUV  = gl.getAttribLocation(w.shader, 'aUV');
   gl.enableVertexAttribArray(aUV);
   gl.vertexAttribPointer(aUV , 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 9);
/*
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
*/
   await initGraphicsCommon(w);

   gl.clearColor(0.0, 0.35, 0.5, 1.0); 
   gl.enable(gl.DEPTH_TEST);
   gl.enable(gl.CULL_FACE);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 
}

let drawShape = (shape, matrix, color, opacity, texture, textureScale) => {
    let gl = w.gl;
    let drawArrays = () => gl.drawArrays(shape == CG.cube || shape == CG.quad ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
    gl.uniform1f(w.uBrightness, 1);//input.brightness === undefined ? 1 : input.brightness);
    gl.uniform4fv(w.uColor, color.length == 4 ? color : color.concat([opacity === undefined ? 1 : opacity]));
    gl.uniformMatrix4fv(w.uModel, false, matrix);
    gl.uniform1i(w.uTexIndex, texture === undefined ? -1 : texture);
    gl.uniform1f(w.uTexScale, textureScale === undefined ? 1 : textureScale);
    if (shape != w.prev_shape)
       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( shape ), gl.STATIC_DRAW);
    for (let i = 0 ; i < nViews ; i++) {
       if (nViews > 1) {
          gl.viewport(viewport[i].x, viewport[i].y, viewport[i].width, viewport[i].height);
          gl.uniformMatrix4fv(w.uView, false, viewMat[i]);
          gl.uniformMatrix4fv(w.uProj, false, projMat[i]);
       }
       if (w.isToon) {
          gl.uniform1f (w.uToon, .3 * CG.norm(m.value().slice(0,3)));
          gl.cullFace(gl.FRONT);
          drawArrays();
          gl.cullFace(gl.BACK);
          gl.uniform1f (w.uToon, 0);
       }
       if (w.isMirror)
          gl.cullFace(gl.FRONT);
       drawArrays();
    }
    gl.cullFace(gl.BACK);
    w.prev_shape = shape;
}


/** 
 *  de-initialization/clean-up that occurs when switching to a different world
 *  @param w {World_State} storage for your persistent world state
 */
async function onExit(w) {

}

const FEET_TO_METERS = 0.3048;

function drawScene(time) {

    const black     = [0,0,0];
    const brown     = [.25,.1,.05];
    const darkRed   = [.5,.0,.0];
    const darkGray  = [.3,.3,.3];
    const gray      = [.4,.4,.4];
    const lightGray = [.5,.5,.5];
    const beige     = [.3,.2,.1];
    const offWhite  = [.5,.4,.3];
    const skyBlue   = [.5,.8,1];

    const dw = 2.5; // DOOR WIDTH
    const dh = 7  ; // DOOR HEIGHT
    const rw = 20 ; // ROOM WIDTH
    const rh = 11 ; // ROOM HEIGHT
    const sw = 10 ; // SAFE WIDTH


    for (let i = 0 ; i < 2 ; i++)
       if (controllerMatrix[i]) {
          m.identity();
          m.multiply(controllerMatrix[i]);
	  let triggerPressed = buttonState[i][0];
	  let gripPressed = buttonState[i][1];

          mTorus().move(0,0,-.05).size(.03,.03,.033).color(triggerPressed ? 1 : 0, 0, 0);
          mCylinder().move(0,-.01,.01).size(.02,.02,.05).color(0,0,0);
	  let gx = gripPressed ? .01 : .013;
          mCube().move(i==0?gx:-gx,-.01,.01).size(.01).color(gripPressed ? [1,0,0] : [.1,.1,.1]);
       }

    m.identity();
    m.scale(FEET_TO_METERS);
    m.translate(0,4.6,0);

    mCube().move(-sw/4,0,-sw/4).size(-sw/4,.002,-sw/4).color(gray     ); // SAFE AREA
    mCube().move( sw/4,0,-sw/4).size(-sw/4,.002,-sw/4).color(lightGray); // SAFE AREA
    mCube().move(-sw/4,0, sw/4).size(-sw/4,.002,-sw/4).color(lightGray); // SAFE AREA
    mCube().move( sw/4,0, sw/4).size(-sw/4,.002,-sw/4).color(gray     ); // SAFE AREA

    mCube().size(rw/2,.001,rw/2).color(darkGray); // FLOOR

    mCube().move(    0, rh/2, rw/2).size( rw/2, rh/2, .001).color(offWhite); // WALL
    mCube().move(    0, rh/2,-rw/2).size( rw/2, rh/2, .001).color(offWhite); // WALL
    mCube().move( rw/2, rh/2,  0  ).size( .001, rh/2, rw/2).color(offWhite); // WALL
    mCube().move(-rw/2, rh/2,  0  ).size( .001, rh/2, rw/2).color(offWhite); // WALL
    mCube().move(    0, rh  ,  0  ).size( rw/2, .001, rw/2).color(offWhite); // CEILING

    mCube().move(    0,  6  , rw/2).size(  8  ,  3  , .002).color(skyBlue ); // WINDOW

    mCube().move( 7.5 ,  7/2,-rw/2).size(  3/2,  7/2, .002).color(brown   ); // DOOR
    mCube().move(-rw/2,  7/2, 7.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    mCube().move(-rw/2,  7/2,-7.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    mCube().move( rw/2,  7/2, 6.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    mCube().move( rw/2,  7/2,-6.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    mCube().move( rw/2,  4/2,   0 ).size( 1   ,  4/2,  5/2).color(brown   ); // FIREPLACE
    mCube().move( rw/2,  3/2,   0 ).size( 1.01,  3/2,  4/2).color(black   ); // FIREPLACE

    mSphere  ().move( 3,3,-3).turnY(time).size(1,1,.65).color(1,0,0);
    mTorus   ().move(-3,3,-3).turnY(time).size(.65).color(1,1,0);
    mCylinder().move( 3,3, 3).turnY(time).size(.65).color(0,0,1);
    mCube    ().move(-3,3, 3).turnY(time).size(.65).color(1,1,1);
}

function drawFrame(time) {
    renderList.beginFrame();
    drawScene(time);
    renderList.endFrame(drawShape);
}

let buttonState = [[],[]];
for (let i = 0 ; i < 7 ; i++)
   buttonState[0][i] = buttonState[1][i] = false;

let onPress = (hand, button) => {
   console.log('pressed', hand==0 ? 'left' : 'right', 'button', button);
}

let onRelease = (hand, button) => {
   console.log('released', hand==0 ? 'left' : 'right', 'button', button);
}

let controllerMatrix = [[], []];

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

    // this crude function updates the controller state
    function TEMPGripControllerUpdate() {
        const inputSources = session.inputSources;
        for (let i = 0; i < inputSources.length; i += 1) {
            const inputSource = inputSources[i];

            if (inputSource.gripSpace) {
               let gripPose = frame.getPose(inputSource.gripSpace, xrInfo.immersiveRefSpace);
               if (gripPose)
	         controllerMatrix[i] = gripPose.transform.matrix;
            }

            if (inputSource.gripSpace) {
               const gripPose = frame.getPose(inputSource.gripSpace, xrInfo.immersiveRefSpace);
	       let gamepad = inputSource.gamepad;
               if (gripPose) {
	          let h = 0;
                  switch (inputSource.handedness) {
		  case 'left' : MR.leftController  = gamepad; break;
		  case 'right': MR.rightController = gamepad; h = 1; break;
		  }
                  for (let i = 0 ; i < gamepad.buttons.length ; i++) {
	             let button = gamepad.buttons[i];
                     if (button.pressed && ! buttonState[h][i])
			onPress(h, i);
                     if (! button.pressed && buttonState[h][i])
			onRelease(h, i);
                     buttonState[h][i] = button.pressed;
                  }
               }
            }
        }
    }
    TEMPGripControllerUpdate();

    // API-specific information
    // (transforms, tracking, direct access to render state, etc.)
    self.systemArgs.frame = frame;
    self.systemArgs.pose  = pose;
    // renderState contains depthFar, depthNear
    self.systemArgs.renderState = session.renderState;

    const gl        = self.GPUCtx;
    const glAPI     = self.gpuAPI;
    const glCtxInfo = self.gpuCtxInfo;

    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
  
    // Clear the framebuffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const views = pose.views;
    nViews = views.length;

    for (let i = 0; i < nViews ; i++) {
        viewport[i] = layer.getViewport(views[i]);
        projMat [i] = views[i].projectionMatrix;
        viewMat [i] = views[i].transform.inverse.matrix;
    }

    for (let i = 0; i < nViews ; i++) {
        self.systemArgs.viewIdx  = i;
        self.systemArgs.view     = views[i];
        self.systemArgs.viewport = viewport[i];
    }

    drawFrame(time);

    // tells the input system that the end of the frame has been reached
    Input.setGamepadStateChanged(false);
}

let nViews   = 1;
let viewport = [null,null];
let projMat  = [null,null];
let viewMat  = [null,null];


/** 
 *  animation function for a PC platform, using WebGL graphics
 *  @param t {Number} elapsed time in milliseconds
 */
function animatePCWebGL(t) {
    const self = MR.engine;

    self._animationHandle = window.requestAnimationFrame(self.config.onAnimationFrameWindow);

    // update time
    self.time = t / 1000.0;
    self.timeMS = t;

    // this is the state variable
    const w = self.customState;

    const gl = self.GPUCtx; 
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    const viewport = self.systemArgs.viewport;
    viewport.x      = 0;
    viewport.y      = 0;
    viewport.width  = gl.drawingBufferWidth;
    viewport.height = gl.drawingBufferHeight;
    self.systemArgs.viewIdx = 0;

    Linalg.mat4.identity(self._viewMatrix);
    //self._viewMatrix = CG.matrixMultiply(self._viewMatrix, CG.matrixRotateY(self.time));

    Linalg.mat4.perspective(self._projectionMatrix, 
        Math.PI / 4,
        self._canvas.width / self._canvas.height,
        0.01, 1024
    );

    gl.uniformMatrix4fv(w.uView, false, self._viewMatrix);
    gl.uniformMatrix4fv(w.uProj, false, self._projectionMatrix);

    Input.updateKeyState();

    // graphics

    // bind default framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawFrame(self.time);

    // tells the input system that the end of the frame has been reached
    w.input.cursor.updateState();
}

export default function main() {
    const def = {
        name                   : 'chalktalk',
        setup                  : setup,
        onAnimationFrameWindow : animatePCWebGL,
        onAnimationFrameXR     : animateXRWebGL,
        onReload               : onReload,
        onExit                 : onExit
    };

    return def;
}
