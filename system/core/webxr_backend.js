"use strict";

import * as GPU      from "./gpu/gpu.js";
// TODO pass-in any user-provided object to act as an entry into an XR
// so WebXRButton doesn't need to be part of the core
import {WebXRButton} from "./../lib/webxr-button.js";
import {
    XRInfo, 
    XR_REFERENCE_SPACE_TYPE, 
    XR_SESSION_MODE,
    XR_HANDEDNESS,
    XR_TARGET_RAY_MODE
} from "./webxr_util.js";
import {Viewport} from "./viewport.js";


const mat4 = {};
mat4.create = function() {
    return new Float32Array(16);
}
mat4.identity = function(t) {
    t.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
mat4.perspective = function perspective(t,e,n,r,a){var c=1/Math.tan(e/2),i=1/(r-a);return t[0]=c/n,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=c,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=(a+r)*i,t[11]=-1,t[12]=0,t[13]=0,t[14]=2*a*r*i,t[15]=0,t}
window.mat4 = mat4;
// use this to send any system information
// we want to the world code
class SystemArgs {
    constructor() {
        this.viewport = new Viewport();
        this.GPUCtx   = null;
        this.xrInfo   = null;
        this.viewIdx  = 0;
    }
}

export class MetaroomXRBackend {
    // Empty constructor.
    constructor() {}

    // Initialization.
    init(options) {
        MR.perspective = mat4.perspective;

        // Set default options.
        options = options || {};
        options.contextOptions = options.contextOptions || { xrCompatible: true };
        options.contextNames = options.contextNames || ['webgl2', 'webgl', 'experimental-webgl'];
        options.main = options.main || function() {};
        options.doGPUResourceTracking = options.doGPUResourceTracking || true;
        options.useGlobalContext = options.useGlobalContext || true;
        options.outputSurfaceName = options.outputSurfaceName || 'output-surface';
        options.outputWidth = options.outputWidth || 1280;
        options.outputHeight = options.outputHeight || 720;
        options.useCustomState = options.useCustomState || true;
        options.enableMultipleWorlds   = (options.enableMultipleWorlds !== undefined)   ? options.enableMultipleWorlds   : true;
        options.enableBellsAndWhistles = (options.enableBellsAndWhistles !== undefined) ? options.enableBellsAndWhistles : true;
        
        // Member variables.
        this.options = options;
        this.main = options.main;
        this.doGPUResourceTracking   = options.doGPUResourceTracking;
        this.useCustomState       = options.useCustomState;
        this._projectionMatrix    = mat4.create();
        this._viewMatrix          = mat4.create();
        this._identityMatrix      = mat4.create();
        mat4.identity(this._identityMatrix);
        this._animationHandle     = 0;

        this.buttonsCache = [];

        this._VRIsActive = false;

        this.VRIsActive = () => {
            return this._VRIsActive;
        };

        // temp
        MR.VRIsActive = this.VRIsActive;
        MR.XRIsActive = this.VRIsActive;

        // Uninitialized member variables (see _init()).
        this._parent = null;
        this._canvas = null;
        this.GPUCtxCanvas = null;
        this._mirrorCanvas = null;
        this._immersiveCanvas = null;
        this.GPUCtx = null;
        this._version = null;
        this.xrButton = null;
        this.xrInfo = null;

        this.systemArgs = new SystemArgs();
        
        MR.getViewerPoseInfo = () => {
            return this.xrInfo.poseEXT;
        };
        // alias
        MR.headsetInfo = () => {
            return this.xrInfo.poseEXT;
        };

        MR.controllers = navigator.getGamepads();

        this.customState = null;
        this.persistentStateMap = null;
        this.globalPersistentState = null;

        this.reloadGeneration = 0;

        this._clearConfig();

        const ok = this._init();
        if (!ok) {
            return false;
        }

        Input.initKeyEvents(this._canvas);

        return true;
    }

    start() {
        let target = null;
        if (this.xrInfo.session) {
            this.xrInfo.session.cancelAnimationFrame(this._animationHandle);
            this._animationHandle = this.xrInfo.session.requestAnimationFrame(this.config.onAnimationFrameXR);
        } else {
            window.cancelAnimationFrame(this._animationHandle);          
            this._animationHandle = window.requestAnimationFrame(this.config.onAnimationFrameWindow);
        }
    }

    async beginSetup(options) {
        return this.configure(options);
    }

    async onReload(options) {
        const conf = this.config;

        conf.onSelectStart = options.onSelectStart || conf.onSelectStart;
        conf.onReload = options.onReload || conf.onReload;

        conf.onSelect = options.onSelect || conf.onSelect;
        conf.onSelectEnd = options.selectEnd || conf.selectEnd;

        if (conf.onReload) {
            await conf.onReload(this.customState);
        }

        conf.onStartFrame = options.onStartFrame || conf.onStartFram
        conf.onStartFrameXR = options.onStartFrameXR || conf.onStartFrame;
        conf.onEndFrame = options.onEndFrame || conf.onEndFrame;
        conf.onEndFrameXR = options.onEndFrameXR || conf.onEndFrame;
        conf.onDraw = options.onDraw || conf.onDraw;
        conf.onDrawXR = options.onDrawXR || conf.onDraw;
        conf.onExit = options.onExit || conf.onExit;
        conf.onExitXR = options.onExitXR || conf.onExit;

        conf.onAnimationFrameXR = options.onAnimationFrameXR || conf.onAnimationFrameXR;
        conf.onAnimationFrameWindow = options.onAnimationFrameWindow || conf.onAnimationFrameWindow;
    }

    initializeWorldCallbacks(options) {
        options.onStartFrame = options.onStartFrame || 
                                (function(t, state) {});
        options.onStartFrameXR = options.onStartFrameXR || 
                                options.onStartFrame || 
                                (function(t, state) {});
        
        options.onEndFrame = options.onEndFrame || 
                                (function(t, state) {});
        options.onEndFrameXR = options.onEndFrameXR || 
                                options.onEndFrame || 
                                (function(t, state) {});
        
        options.onDraw = options.onDraw || 
                            (function(t, p, v, state, args) {});
        options.onDrawXR = options.onDrawXR || 
                            options.onDraw ||
                            (function(t, p, v, state, args) {});
        
        options.onAnimationFrameXR = options.onAnimationFrameXR || 
                                this._onAnimationFrameXRWebGL;
        options.onAnimationFrameWindow = options.onAnimationFrameWindow || 
                                this._onAnimationFrameWindowWebGL;
        
        options.onSelectStart = options.onSelectStart || 
                                function(t, state) {};
        
        options.onReload = options.onReload || 
                            function(state) {};
        
        options.onExit = options.onExit || 
                        function(state) {};

        options.onExitXR = options.onExitXR || 
                            options.onExit || 
                            function(state) {};


        options.onSelect = options.onSelect || (function(t, state) {});
        options.onSelectEnd = options.selectEnd || (function(t, state) {});        
    }

    async configure(options) {
        if (this.config.onExit) {
            this.config.onExit(this.customState);
        }

        this._clearConfig();
        this._reset();

        options = options || {};

        this.initializeWorldCallbacks(options);

        this.config = options;
        this.name = options.name || "unnamed";

        if (this.useCustomState) {
            // retrieve persistent state for this world
            let persistentState = this.persistentStateMap.get(options.name);
            if (!persistentState) {
                persistentState = {};
                this.persistentStateMap.set(options.name, persistentState);
            }

            this.customState = {};
            this.customState.persistent = persistentState;
            this.customState.globalPersistent = this.globalPersistentState;
        }

        if (options.setup) {
            return options.setup(this.customState, this, this._session).then(() => {
                this.start();
            });
        }
        return this.start();
    }

    async initGPUAPI(options, targetSurface) {
        // note, initialization is the same for now,
        // but likely to change -- will keep separated for now

        let GPUInterface;
        switch (options.GPUAPIType) {
        case GPU.GPU_API_TYPE.WEBGL: {
            console.log("WebGL");
            GPUInterface = await GPU.initWebGL(this, options, targetSurface);
            break;
        }
        case GPU.GPU_API_TYPE.WEBGPU: {
            console.log("WebGPU")
            GPUInterface = await GPU.initWebGPU(this, options, targetSurface);

            if (GPUInterface != null) {
                console.warn(
                    "%c%s",
                    "color: #00ff00",
                    "WebGPU successfully initialized, but implementation incomplete, falling back to WebGL"
                );
                // TODO(TR): allow WebGPU to be used
                GPUInterface.isValid = false;
            }
            break;
        }
        default: {
            console.error(
                "%s%s%s",
                "Unsupported GPU API, ",
                "User should initialize and provide a context, ",
                "as well as animation loops using the context"
            );

            return GPU.CTX_CREATE_STATUS_FAILURE_UNKNOWN_API;
        }
        }

        if (!GPUInterface.isValid) {
            return GPU.CTX_CREATE_STATUS_FAILURE_TO_INIT;
        }

        this.GPUInterface = GPUInterface;

        this.GPUAPI       = this.GPUInterface.GPUAPI;
        this.GPUCtxInfo   = this.GPUInterface.GPUCtxInfo;
        this.GPUCtx       = this.GPUInterface.GPUCtxInfo.ctx;

        if (options.useGlobalContext) {
            window.gl = this.GPUCtx;
        }
        if (options.doGPUResourceTracking) {
            this.GPUInterface.GPUCtxInfo.enableResourceTracking();
        }
        return GPU.CTX_CREATE_STATUS_SUCCESS;
    }

    async tryGPUAPIFallbacks() {
        console.warn(
            "%s is unsupported, falling back to %s",
            this.options.GPUAPIType, GPU.GPU_API_TYPE.WEBGL
        );

        this.options.GPUAPIType = GPU.GPU_API_TYPE.WEBGL;
        
        return this.initGPUAPI(
            this.options, 
            this._canvas
        );
    }

    async _init() {
        this._initCanvasOnParentElement();
        this._initCustomState();

        if (this.options.GPUAPIProvidedContext) {
            console.error("NOT IMPLEMENTED YET: developer-provided GPU API context");
            return false;
        } else {
            console.log("initializing built-in GPU API");
            let status = await this.initGPUAPI(
                this.options, 
                this._canvas
            );
            if (status !== GPU.CTX_CREATE_STATUS_SUCCESS) {
                status = await this.tryGPUAPIFallbacks();
                if (status !== GPU.CTX_CREATE_STATUS_SUCCESS) {
                    console.error("failed to initialize a graphics context");
                    return false;
                }
            }
        }

        this.xrInfo = new XRInfo();
        this.systemArgs.xrInfo = this.xrInfo;

        await this.main();

        if (this.GPUInterface.GPUAPI.XRIsSupported &&
            this.options.enableBellsAndWhistles) {

            console.log(
                "%c%s",
                "color: #9faaff",
                "trying to initialize immersive XR"
            );

            this._initButton();

            const ok = await this.XRDetectImmersiveVRSupport();
            if (ok) {
                this.enableImmersiveVREntryAccess(true);
            } else {
                console.log(
                    "%c%s",
                    'color: #ff0000;',
                    "immersive XR unsupported"
                );

                this.enableImmersiveVREntryAccess(false);
                
                console.log("initializing windowed mode instead ...");
                this._initWindow();
            }

        } else {
            if (this.options.enableBellsAndWhistles) {
                console.warn("XR is unsupported");
            }
            console.log("initializing windowed mode");
            this._initWindow();        
        }

        return true;
    }

    _initButton() {
        if (this.options.enableBellsAndWhistles) {
            this.xrButton = new WebXRButton({
                onRequestSession : MR.engine.onRequestSession,
                onEndSession     : MR.engine.onEndSession,

                textEnterXRTitle    : "ENTER XR",
                textXRNotFoundTitle : "XR UNAVAILABLE",
                textExitXRTitle     : "EXIT XR",
            });
            //document.querySelector('body').prepend(this.xrButton.domElement);
            this.ui.menu.el.prepend(this.xrButton.domElement);
        }
    }

    _initCanvasOnParentElement(parent = 'active') {
        const parentCanvasRecord = CanvasUtil.createCanvasOnElement(
            'active',
            this.options.outputSurfaceName,
            this.options.outputWidth,
            this.options.outputHeight
        );
        console.assert(parentCanvasRecord !== null);
        console.assert(parentCanvasRecord.parent !== null);
        console.assert(parentCanvasRecord.canvas !== null);

        this._parent = parentCanvasRecord.parent;
        this._canvas = parentCanvasRecord.canvas;
    }

    _initCustomState() {
        if (this.useCustomState) {
            this.customState = {};
            this.persistentStateMap = new Map();
            this.globalPersistent = {};
        }
    }

    defineWorldTransitionProcedure(fn) {
        this.doWorldTransition = fn.bind(this);
    }

    _initWindow() {
    }

    _clearConfig() {
        this.config = this.config || {};
        const options = this.config;

        options.onStartFrame = (function(t, state) {});
        options.onStartFrameXR = (function(t, state) {});
        options.onEndFrame = (function(t, state) {});
        options.onEndFrameXR = (function(t, state) {});
        options.onDraw = (function(t, p, v, state, args) {});
        options.onDrawXR = (function(t, p, v, state, args) {});
        options.onAnimationFrameXR = function() {};
        options.onAnimationFrameWindow = function() {};
        options.onReload   = function(state) {};
        options.onExit     = function(state) {};
        options.onExitXR   = function(state) {};

        // selection
        options.onSelectStart = (function(t, state) {});
        options.onSelect = (function(t, state) {});
        options.onSelectEnd = (function(t, state) {});
    }

    clearWorld() {
        this._reset();
        if (this.options.doGPUResourceTracking) {
            this.GPUInterface.GPUCtxInfo.freeResources();
        }
    }

    _reset() {
        if (this.xrInfo.session) {
            console.log('resetting XR animation frame');
            this.xrInfo.session.cancelAnimationFrame(this._animationHandle);
        } else {
            console.log('resetting window animation frame');
            window.cancelAnimationFrame(this._animationHandle);
        }
    }

    enableImmersiveVREntryAccess(supported) {
        MR.engine.xrButton.enabled = supported;
    }

    async XRDetectImmersiveVRSupport() {
        if (!navigator.xr) {
            console.log(
                "%c%s", 
                "font-weight: bold; color: #ff0000;",
                "WebXR unsupported"
            );
            return false;
        }

        try {
            const supported = await navigator.xr.isSessionSupported(
                XR_SESSION_MODE.IMMERSIVE_VR
            );
            if (supported) {
                console.log("immersive-vr mode is supported");
                return true;
            }
        } catch (err) {
            console.log(
                "%c%s", 
                "font-weight: bold; color: #ffa500;",
                "WebXR immersive vr mode unsupported"
            );
            console.error(err.message);
            return false;
        }
    }

    onRequestSession() {
        console.log("requesting session");
        return navigator.xr.requestSession(
            XR_SESSION_MODE.IMMERSIVE_VR,
            {
                requiredFeatures : [
                    XR_REFERENCE_SPACE_TYPE.LOCAL
                ],
                optionalFeatures : [
                    XR_REFERENCE_SPACE_TYPE.BOUNDED_FLOOR
                ]
            }
        ).then(MR.engine.onSessionStarted).catch((err) => {
            console.error(err);
            console.error("This should never happen because we check for support beforehand");
            MR.engine.enableImmersiveVREntryAccess(false);

            console.log("initializing windowed mode instead ...");
            MR.engine._initWindow();
        });
    }

    onSessionStarted(session) {
        console.log("session started");

        const self = MR.engine;

        self.xrInfo.session = session;

        self.xrButton.setSession(session);

        self.xrInfo.isImmersive = true;

        const GPUAPILayer = new self.GPUAPI.XRLayer(session, self.GPUCtx);

        session.updateRenderState({
            baseLayer : GPUAPILayer
        });

// TODO(TR): use something like this to reorient the world
// if the user resets the tracking direction during the session
/*
xrReferenceSpace.addEventListener('reset', xrReferenceSpaceEvent => {
  // Check for the transformation between the previous origin and the current origin
  // This will not always be available, but if it is, developers may choose to use it
  let transform = xrReferenceSpaceEvent.transform;

  // For an app that allows artificial Yaw rotation, this would be a perfect
  // time to reset that.
  resetYawTransform(transform);

  // For an app using a bounded reference space, this would be a perfect time to
  // re-layout content intended to be reachable within the bounds
  createBoundsMesh(transform);
});
*/
        console.log("requesting reference space");
        // bounded-floor == (y == 0 at floor, assumes bounded tracking space)

        // try for a bounded floor reference space, otherwise a local reference space
        session.requestReferenceSpace(
            XR_REFERENCE_SPACE_TYPE.BOUNDED_FLOOR
        ).then((refSpace) => {
            self.xrInfo.type = XR_REFERENCE_SPACE_TYPE.BOUNDED_FLOOR;
            self.xrInfo.immersiveRefSpace = refSpace;
            console.log(refSpace);

            console.log(
                "%c%s", 
                "font-weight: bold; color: #00ff00;",
                "using reference space=[bounded-floor]"
            );

        }).catch((err) => {
            console.error(err);
            // fall back to local (eye-level), which should be guaranteed
            session.requestReferenceSpace(
                XR_REFERENCE_SPACE_TYPE.LOCAL
            ).then((refSpace) => {
                self.xrInfo.type = XR_REFERENCE_SPACE_TYPE.LOCAL;
                self.xrInfo.immersiveRefSpace = refSpace;

                console.log(
                    "%c%s", 
                    "font-weight: bold; color: #ffa500;",
                    "using fallback reference space=[local]"
                );

            }).then(self.onRequestReferenceSpaceSuccess);

        }).then(self.onRequestReferenceSpaceSuccess);
    }
    onRequestReferenceSpaceSuccess() {
        const self = MR.engine;

        self._reset();

        const xrInfo = self.xrInfo;
        const session = xrInfo.session;

        console.warn("TODO: allow for end, select, selectstart, selectend custom callbacks ")
        session.addEventListener('end',    self.onSessionEnded);
        session.addEventListener('select', self.onSelect);
        session.addEventListener('selectstart', self.onSelectStart);
        session.addEventListener('selectend', self.onSelectEnd);

        session.addEventListener('inputsourceschange', () => {
            console.warn("TODO: handle inputsourceschange event");
        });

        self._VRIsActive = true;        

        self.start();
    }
    onEndSession(session) {
        console.log("session ended");
        session.end();
    }
    onSessionEnded(e) {
        const self = MR.engine;
        const xrInfo = self.xrInfo;
        if (!xrInfo.session.isImmersive) {
            self._reset();
            self.start();
            return;
        }

        self._reset();

        self.xrButton.setSession(null);

        xrInfo.isImmersive       = false;
        xrInfo.immersiveRefSpace = null;
        xrInfo.session           = null;
        xrInfo.type              = XR_REFERENCE_SPACE_TYPE.VIEWER;

        self._VRIsActive = false;

        // going back to windowed mode
        self.start();
    }

    // TODO(TR): WebXR has its own controller API that interfaces
    // with the different reference spaces -- this may be necessary to use
    updateControllerState(self) {
        MR.controllers = navigator.getGamepads();
        let gamepads = navigator.getGamepads();
        let vrGamepadCount = 0;
        for (let i = 0; i < gamepads.length; i += 1) {
            const gamepad = gamepads[i];
            if (gamepad) { // gamepads may contain null-valued entries
                if (gamepad.pose || gamepad.displayId ) { // VR gamepads will have one or both of these properties.
                    const cache = self.buttonsCache[vrGamepadCount] || [];
                    for (let j = 0; j < gamepad.buttons.length; j += 1) {
                        // Check for any buttons that are pressed and previously were not.
                        if (cache[j] != null && !cache[j] && gamepad.buttons[j].pressed) {
                            console.log('pressed gamepad', i, 'button', j);
                        }
                        cache[j] = gamepad.buttons[j].pressed;
                    }
                    self.buttonsCache[vrGamepadCount] = cache;
                    vrGamepadCount += 1;
                }
            }
        }
    }

    onSelectStart(e) {

    }
    onSelectEnd(e) {

    }
    // TODO(???) modified version of: https://github.com/immersive-web/webxr-samples/blob/429aeb7cd46f1009d2e529e69854418a5a0903d5/input-selection.html#L181
    onSelect(e) {
        const self = MR.engine;
        if (!self.xrInfo.isImmersive) {
            return;
        }

        const refSpace = self.xrInfo.immersiveRefSpace;

        const targetRayPose = e.frame.getPose(
            ev.inputSource.targetRaySpace, 
            refSpace
        );
        if (!targetRayPose) {
            return;
        }

        const hitResult = scene.hitTest(targetRayPose.transform);
        if (!hitResult) {
            return;
        }
        // the example raycasts against some boxes
        // // Check to see if the hit result was one of our boxes.
        // for (let box of boxes) {
        //     if (hitResult.node == box.node) {
        //         // Change the box color to something random.
        //         let uniforms = box.renderPrimitive.uniforms;
        //         uniforms.baseColorFactor.value = [Math.random(), Math.random(), Math.random(), 1.0];
        //     }
        // }
    }

    processGamepad(self, inputSource, pose) {
        // this uses the gamepad API internally
    }

    // TODO(???) integrate modified version of: https://github.com/immersive-web/webxr-samples/blob/429aeb7cd46f1009d2e529e69854418a5a0903d5/input-tracking.html#L166
    updateInputSources(self, session, frame, refSpace) {
        const inputSources = session.inputSources;
        for (let i = 0; i < inputSources; i += 1) {
            const inputSource = inputSources[i];


            if (inputSource.gripSpace) {
                const gripPose = frame.getPose(inputSource.gripSpace, refSpace);
                if (gripPose) {
                    // If we have a grip pose use it to render a mesh showing the
                    // position of the controller.
                    // NOTE: this contains a "handedness property". Wonderful!
                    //scene.inputRenderer.addController(gripPose.transform.matrix, inputSource.handedness);
                }
            }

            // this part assumes we care about pointing and raycasting (we will)
            const targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);

            // We may not get a pose back in cases where the input source has lost
            // tracking or does not know where it is relative to the given frame
            // of reference.
            if (!targetRayPose) {
                continue;
            }

            if (inputSource.targetRayMode == XR_TARGET_RAY_MODE.TRACKED_POINTER) {
                // TODO(?): replacement for controller tip() ?
                // If we have a pointer matrix and the pointer origin is the users
                // hand (as opposed to their head or the screen) use it to render
                // a ray coming out of the input device to indicate the pointer
                // direction.
                //scene.inputRenderer.addLaserPointer(targetRayPose.transform);                
            }

            // If we have a pointer matrix we can also use it to render a cursor
            // for both handheld and gaze-based input sources.

            // From example: (this gets the position of the cursor)

          // // Check and see if the pointer is pointing at any selectable objects.
          // let hitResult = this.hitTest(targetRayPose.transform);

          // if (hitResult) {
          //   // Render a cursor at the intersection point.
          //   this.inputRenderer.addCursor(hitResult.intersection);

          //   if (hitResult.node._hoverFrameId != lastHoverFrame) {
          //     hitResult.node.onHoverStart();
          //   }
          //   hitResult.node._hoverFrameId = this._hoverFrame;
          //   newHoveredNodes.push(hitResult.node);
          // } else {
          //   // Statically render the cursor 1 meters down the ray since we didn't
          //   // hit anything selectable.
          //   let targetRay = new Ray(targetRayPose.transform.matrix);
          //   let cursorDistance = 1.0;
          //   let cursorPos = vec3.fromValues(
          //       targetRay.origin[0], //x
          //       targetRay.origin[1], //y
          //       targetRay.origin[2]  //z
          //       );
          //   vec3.add(cursorPos, cursorPos, [
          //       targetRay.direction[0] * cursorDistance,
          //       targetRay.direction[1] * cursorDistance,
          //       targetRay.direction[2] * cursorDistance,
          //       ]);
          //   // let cursorPos = vec3.fromValues(0, 0, -1.0);
          //   // vec3.transformMat4(cursorPos, cursorPos, inputPose.targetRay);
          //   this.inputRenderer.addCursor(cursorPos);
          // }

        }
    }

    _onAnimationFrameWindowWebGPU(t) {
        console.warn("WebGPU default animation frame not yet implemented");

        self._animationHandle = window.requestAnimationFrame(self.config.onAnimationFrameWindow);
    }

    _onAnimationFrameWindowWebGL(t) {
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
        self.config.onStartFrame(t, self.customState, self.systemArgs);

        self.config.onDraw(t, self._projectionMatrix, self._viewMatrix, self.customState, self.systemArgs);
        self.config.onEndFrame(t, self.customState, self.systemArgs);
    }

    _onAnimationFrameXRWebGPU(t, frame) {
        console.warn("WebGPU unsupported in WebXR for now");
        self._animationHandle = xrInfo.session.requestAnimationFrame(
            self.config.onAnimationFrameXR
        );
    }

    // default WebGL animation frame
    _onAnimationFrameXRWebGL(t, frame) {
        /////////////////////////////////////
        // temp debug
        redirectConsole(4000);
        try {
        /////////////////////////////////////

        const self = MR.engine;

        // update time
        self.time   = t / 1000.0;
        self.timeMS = t;

        console.log("in animation frame:");
        console.log(frame);
        console.log(frame ? frame.session : null);

        const xrInfo  = self.xrInfo;

        console.log("is immersive", xrInfo.isImmersive);

        // request next frame
        self._animationHandle = xrInfo.session.requestAnimationFrame(
            self.config.onAnimationFrameXR
        );

        console.log(frame.session);
        console.log(session.renderState.baseLayer);

        // unpack session and pose information
        const session = frame.session;
        const layer   = session.renderState.baseLayer;
        console.log(xrInfo.immersiveRefSpace);
        const pose    = frame.getViewerPose(xrInfo.immersiveRefSpace);
        xrInfo.pose = pose;
        // updates the extended pose data
        // containing buffer representations of position, orientation
        xrInfo.poseEXT.update(xrInfo.pose);

        // input updates (TODO use WebXR APIs)

        self.updateControllerState(self);
        // update left and right controllers, but WebXR already provides
        // this information (TODO)
        Input.updateControllerHandedness();

        self.systemArgs.frame = frame;
        self.systemArgs.pose  = pose;
        // renderState contains depthFar, depthNear
        self.systemArgs.renderState = session.renderState;

        // begin frame
        self.config.onStartFrameXR(t, self.customState, self.systemArgs);
        // draw
        {
            const gl        = self.GPUCtx;
            const glAPI     = self.gpuAPI;
            const glCtxInfo = self.gpuCtxInfo;

            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);

            const viewport = self.systemArgs.viewport;

            const views     = pose.views;
            const viewCount = views.count;

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
            console.error(err.message);
        }
        flushAndRestoreConsole();
        ////////////////////////////////////////
    }
};
