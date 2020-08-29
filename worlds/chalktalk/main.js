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

        // this loads the math module
        // if it has been changed - located at /lib/math/math.js
        Maths   = await MR.dynamicImport("/lib/math/math.js");
        CT      = await MR.dynamicImport(Path.fromLocalPath("/chalktalk/chalktalk.js"));
}

/** 
 *  setup that occurs upon reload
 *  and on reload
 *  @param w {World_State} storage for your persistent world state
 */
async function onReload(w) {
    await initCommon(w);

    // call an onReload function you define in your local library file,
        // useful if it's the same code in most of your projects

    w.uBrightness = gl.getUniformLocation(w.shader, 'uBrightness');
    w.uColor      = gl.getUniformLocation(w.shader, 'uColor');
    w.uCursor     = gl.getUniformLocation(w.shader, 'uCursor');
    w.uModel      = gl.getUniformLocation(w.shader, 'uModel');
    w.uProj       = gl.getUniformLocation(w.shader, 'uProj');
    w.uTexScale   = gl.getUniformLocation(w.shader, 'uTexScale');
    w.uTexIndex   = gl.getUniformLocation(w.shader, 'uTexIndex');
    w.uTime       = gl.getUniformLocation(w.shader, 'uTime');
    w.uToon       = gl.getUniformLocation(w.shader, 'uToon');
    w.uView       = gl.getUniformLocation(w.shader, 'uView');
    w.uTex = [];
    for (let n = 0 ; n < 8 ; n++) {
        w.uTex[n] = gl.getUniformLocation(w.shader, 'uTex' + n);
        gl.uniform1i(w.uTex[n], n);
    }
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
            {path : Path.fromLocalPath("chalktalk/chalktalk.js")}
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

        gl.clearColor(0.0, 0.7, 0.0, 1.0);

    w.CTScene = new CT.Scene({
        graphicsContext : gl
    });

    let out = await w.CTScene.init({
        // arguments
    });

    ShaderTextEditor.hideEditor();

    const vertex   = await Asset.loadTextRelativePath("/shaders/vertex.vert.glsl");
    const fragment = await Asset.loadTextRelativePath("/shaders/fragment.frag.glsl");

    let errorStatus = {};
    const shader = Shader.compileValidateStrings(vertex, fragment, errorStatus);
    gl.useProgram(shader);
    w.gl = gl;
    w.shader = shader;

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

   gl.enable(gl.DEPTH_TEST);
   gl.disable(gl.CULL_FACE);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 
}

   let drawShape = (shape, color, texture, textureScale) => {
      let gl = w.gl;
      let drawArrays = () => gl.drawArrays(shape == CG.cube || shape == CG.quad ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
      gl.uniform1f(w.uBrightness, 1);//input.brightness === undefined ? 1 : input.brightness);
      gl.uniform4fv(w.uColor, color.length == 4 ? color : color.concat([1]));
      gl.uniformMatrix4fv(w.uModel, false, m.value());
      gl.uniform1i(w.uTexIndex, texture === undefined ? -1 : texture);
      gl.uniform1f(w.uTexScale, textureScale === undefined ? 1 : textureScale);
      if (shape != w.prev_shape)
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( shape ), gl.STATIC_DRAW);
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
      gl.cullFace(gl.BACK);
      w.prev_shape = shape;
   }


/** 
 *  de-initialization/clean-up that occurs when switching to a different world
 *  @param w {World_State} storage for your persistent world state
 */
async function onExit(w) {

}

function drawScene(time) {
    m.identity();
    m.translate(0,0,-10 + 10 * Math.sin(3 * time));
    m.rotateY(time);
    drawShape(CG.cube, [1,0,0]);
}

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
                // NOTE: this contains a "handedness property" so we don't have to guess. Wonderful!
                // i.e. gripPose.transform.matrix, inputSource.handedness;
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

            let projMat = view.projectionMatrix;
            let viewMat = view.transform.inverse.matrix;

            gl.uniformMatrix4fv(w.uView, false, viewMat);
            gl.uniformMatrix4fv(w.uProj, false, projMat);


            // per-eye rendering here in this loop configuration
            // 
            // graphics!! --------------------------------------

            drawScene(time);

            //
            // your content here
        }
    }

    // tells the input system that the end of the frame has been reached
    Input.setGamepadStateChanged(false);
}


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

    drawScene(self.time);

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
