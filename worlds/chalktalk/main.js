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
async function initCommon(w) {

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

    console.group("testing shader loading");
    {
        console.log(vertex);
        console.log(fragment);
    }
    console.groupEnd();
}

/** 
 *  de-initialization/clean-up that occurs when switching to a different world
 *  @param w {World_State} storage for your persistent world state
 */
async function onExit(w) {

}


/** 
 *  animation function for a WebXR-supporting platform, using WebGL graphics
 *  @param t {Number} elapsed time in milliseconds
 */
function animateXRWebGL(t) {
    const self = MR.engine;

    // request next frame
    self._animationHandle = xrInfo.session.requestAnimationFrame(
        self.config.onAnimationFrameXR
    );

    // update time
    self.time   = t / 1000.0;
    self.timeMS = t;

    // this is the state variable
    const w = self.customState;

    const xrInfo  = self.xrInfo;

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

            let projectionMatrix = view.projectionMatrix;
            let cameraMatrix = view.transform.inverse.matrix;


            // per-eye rendering here in this loop configuration
            // 
            // graphics!! --------------------------------------
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

    Input.updateKeyState();

    // graphics

    // bind default framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


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
