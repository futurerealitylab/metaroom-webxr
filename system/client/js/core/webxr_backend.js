'use strict';

import * as GPU from "./gpu/gpu.js";
import {WebXRButton} from "./../lib/webxr-button.js";
import {XRInfo, XR_REFERENCE_SPACE_TYPE, XR_SESSION_MODE} from "./../core/webxr_util.js";




const mat4 = {};
mat4.create = function() {
    return new Float32Array(16);
}
mat4.identity = function(t) {
    t.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
mat4.perspective = function perspective(t,e,n,r,a){var c=1/Math.tan(e/2),i=1/(r-a);return t[0]=c/n,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=c,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=(a+r)*i,t[11]=-1,t[12]=0,t[13]=0,t[14]=2*a*r*i,t[15]=0,t}


// class TODO_FAKE_POSE {
//     this.position 
// }
// class TODO_FAKE_FRAMEDATA {
//     constructor() {
//         this.leftProjectionMatrix = mat4.create();
//         mat4.identity(this.leftProjectionMatrix);

//         this.rightProjectionMatrix = mat4.create();
//         mat4.identity(this.rightProjectionMatrix);

//         this.leftViewMatrix = mat4.create();
//         mat4.identity(this.leftViewMatrix);

//         this.rightViewMatrix = mat4.create();
//         mat4.identity(this.rightViewMatrix);

//         this.timestamp = 0;

//         this.pose = new TODO_FAKE_POSE();
//     }
// }
// const new TODO_FAKE_FRAMEDATA();

export class MetaroomXRBackend {
    // Empty constructor.
    constructor() {}

    // Initialization.
    init(options) {
        MR.perspective = mat4.perspective;

        if (options.useExternalWindow) {
            this.externalWindow = window.open('', "Editor", 
                "height=640,width=640,menubar=no,toolbar=no,resizable=no,menu=no");

            if (!this.externalWindow) {
                console.warn("failed to load external window");
            } else {

                this.externalWindow.document.head.innerHTML = `
                <title>Editor</title>
                <style type="text/css" media="screen">
                textarea {
                    margin: 0;
                    border-radius: 0;
                    font:20px courier;
                    min-height: 0%;
                    /* min-width: 100%; */
                    /* max-height: 50vh; */
                    /* resize: vertical; */
                }


                .textAreaColumn div span {
                    display:block;
                    font:20px courier;
                    color: red;
                }

                .text_area_block {
                    font-family:    courier;
                    font-size:      12px;
                    font-weight:    bold;
                }
                /*
                body.noScroll {
                    overflow: hidden;
                }*/

                </style>
                `

                this.externalWindow.document.body.innerHTML = `
                <div style="float: left;" class="text_area_block" id="text-areas">
                <div style="float: left;" class="text_area_block" id="shader-programs-container"></div>
                <br>
                <br>
                <div style="float: left;" class="text_area_block" id="shader-libs-container"></div>
                </div>`;



                this.externalWindow.document.body.style.backgroundColor = 'black';
                this.externalWindow.document.body.style.color = 'white';

                window.onunload = () => { this.externalWindow.close(); };

            }

        }


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
        options.enableEntryByButton    = (options.enableEntryByButton !== undefined)    ? options.enableEntryByButton    : true;
        options.enableMultipleWorlds   = (options.enableMultipleWorlds !== undefined)   ? options.enableMultipleWorlds   : true;
        options.enableBellsAndWhistles = (options.enableBellsAndWhistles !== undefined) ? options.enableBellsAndWhistles : true;
        
        options.GPUAPI = options.GPUAPI || "default";

        // Member variables.
        this.options = options;
        this.main = options.main;
        this.doGPUResourceTracking   = options.doGPUResourceTracking;
        this.useCustomState       = options.useCustomState;
        this._projectionMatrix    = mat4.create();
        this._viewMatrix          = mat4.create();
        this._animationHandle     = 0;

        this.buttonsCache = [];

        this._VRIsActive = false;

        this.VRIsActive = () => {
            return this._VRIsActive;
        };

        MR.VRIsActive = this.VRIsActive;
        MR.XRIsActive = this.XRIsActive;

        // Bound functions
        this.onVRRequestPresent = this._onVRRequestPresent.bind(this);
        this.onVRExitPresent    = this._onVRExitPresent.bind(this);
        this.onVRPresentChange  = this._onVRPresentChange.bind(this);

        // Uninitialized member variables (see _init()).
        this._parent = null;
        this._canvas = null;
        this.GPUCtxCanvas = null;
        this._mirrorCanvas = null;
        this._immersiveCanvas = null;
        this.GPUCtx = null;
        this._version = null;
        this.xrButton = null;
        this._frameData = null;
        this.xrInfo = null;
        
        this.frameData = () => {
            //return this._frameData;
            return null;
        }
        
        MR.frameData = this.frameData;
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
        if (this.options.enableBellsAndWhistles && this.xrInfo.session) {
            this.xrInfo.session.cancelAnimationFrame(this._animationHandle);
            this._animationHandle = this.xrInfo.session.requestAnimationFrame(this.config.onAnimationFrame);
        } else {
            window.cancelAnimationFrame(this._animationHandle);          
            this._animationHandle = window.requestAnimationFrame(this.config.onAnimationFrame);
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
        conf.onAnimationFrame = options.onAnimationFrame || conf.onAnimationFrame;
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
                            (function(t, p, v, state, eyeIdx) {});
        options.onDrawXR = options.onDrawXR || 
                            options.onDraw ||
                            (function(t, p, v, state, eyeIdx) {});
        
        options.onAnimationFrame = options.onAnimationFrame || 
                                this._onAnimationFrame;
        options.onAnimationFrameWindow = options.onAnimationFrameWindow || 
                                this._onAnimationFrameWindow;
        
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
            GPUInterface = await GPU.initWebGL(this, options, targetSurface);
            break;
        }
        case GPU.GPU_API_TYPE.WEBGPU: {
            GPUInterface = await GPU.initWebGPU(this, options, targetSurface);
            break;
        }
        default: {
            console.error(
                "Unsupported GPU API, initialization should be done externally"
            );

            return GPU.CTX_CREATE_STATUS_FAILURE_UNKNOWN_API;
        }
        }

        if (!GPUInterface.isValid) {
            return GPU.CTX_CREATE_STATUS_FAILURE_TO_INIT;
        }

        this.GPUInterface = GPUInterface;
        this.GPUAPI       = GPUInterface.GPUAPI;
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

        this.xrInfo = new XRInfo();

        await this.main();

        if (this.GPUInterface.GPUAPI.XRIsSupported &&
            this.options.enableBellsAndWhistles) {

            this._initButton();

            console.log("initializing XR");
            const ok = await this.XRDetectImmersiveVRSupport();
            if (!ok) {
                console.log(
                    "%c%s", 
                    'color: #ff0000',
                    "XR initialization uncussessful"
                );
                console.group('');
                console.log('Initializing PC window mode ...');
                this._initWindow();
                console.groupEnd();
            }
        } else {
            console.warn("XR is unsupported");
            console.log('Initializing PC window mode ...');
            this._initWindow();        
        }

        return true;
    }

    _initButton() {
        if (this.options.enableBellsAndWhistles && this.options.enableEntryByButton) {
            this.xrButton = new WebXRButton({
                onRequestSession : this.onRequestSession,
                onEndSession     : this.onEndSession
            });
            document.querySelector('body').prepend(this.xrButton.domElement);
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
            console.log('Initializing custom state');
            this.customState = {};
            this.persistentStateMap = new Map();
            this.globalPersistent = {};
        }
    }

    _initWebVR() {
        if (navigator.getVRDisplays) {
            this._frameData = new VRFrameData();
            const button = this.xrButton;
            const me = this;
            navigator.getVRDisplays().then(function(displays) {
                if (displays.length > 0) {
                const vrDisplay = displays[displays.length - 1]; // ?
                me._vrDisplay = vrDisplay;

                // It's highly recommended that you set the near and far planes to somethin
                // appropriate for your scene so the projection matrices WebVR produces
                // have a well-scaled depth buffer.
                vrDisplay.depthNear = 0.1;
                vrDisplay.depthFar = 1024.0;

                // Generally, you want to wait until VR support is confirmed and you know the
                // user has a VRDisplay capable of presenting connected before adding UI that
                // advertizes VR features.
                if (vrDisplay.capabilities.canPresent) {
                    button.enabled = true;
                }

                // The UA may kick us out of VR present mode for any reason, so to ensure we
                // always know when we gegin/end presenting we need to listen for events.
                window.addEventListener('vrdisplaypresentchange', me.onVRPresentChange, false);

                // These events fire when the user agent has had some indication that it would
                // be appropriate to enter or exit VR presentation mode, such as the user putting
                // on a headset and triggering a proximity sensor.
                window.addEventListener('vrdisplayactivate', me.onVRRequestPresent, false);
                window.addEventListener('vrdisplaydeactivate', me.onVRExitPresent, false);
            } else {
                console.warn('WebVR supported, but no displays found.');
                // TODO route error modes to fallback display
            }
        }, function() {
            console.warn('Your browser does not support WebVR.');
            // TODO route error modes to fallback display
        });
            return true;
        } else if (navigator.getVRDevices) {
            console.warn('Your browser supports WebVR, but not the latest version.')
            return false;
        } else {
            return false;
        }
    }

    defineWorldTransitionProcedure(fn) {
        this.doWorldTransition = fn.bind(this);
    }

    _initWindow() {
        const modalCanvasInit = () => {
            const bodyWidth = document.body.getBoundingClientRect().width;
            const parent = document.getElementById('output-container');
            parent.float = 'right';
            let P = parent;
            P.style.left = (((P.style.left) + bodyWidth - this._canvas.clientWidth)) + "px";

            const out = document.getElementById(this.options.outputSurfaceName);
            out.style.position = 'relative';
            out.style.float = 'right';

            let shiftX = parseInt(P.style.left);
            let shiftY = 0;

            let shiftDown__ = false;
            let mouseDown__ = false;
            let altDown = false;
            let clientX = 0;
            let clientY = 0;

            window.getClientX = () => {
                return clientX;
            }

            window.getClientY = () => {
                return clientY;
            }

            const mouseMoveHandler__ = function(event) {
                const w = MR.wrangler._canvas.clientWidth;
                const h = MR.wrangler._canvas.clientHeight;
                P.style.left = (clientX - (w / 2.0)) + "px";
                P.style.top = (clientY - (h / 2.0)) + "px";
            };

            let beforeW;
            let beforeH;
            let altInitDown = true;
            let initialX = 0;

            document.addEventListener('mousemove', (event) => {
                clientX = event.clientX;
                clientY = event.clientY;

                if (altDown) {
                    const cursorX = clientX;
                    if (altInitDown) {
                        altInitDown = false;
                        beforeW = CanvasUtil.baseCanvasDimensions.width;
                        beforeH = CanvasUtil.baseCanvasDimensions.height;
                        initialX = cursorX;
                    }

                    const xDist = (cursorX - initialX);
                    this._canvas.width = Math.max(64, beforeW + xDist);
                    this._canvas.height = Math.floor(beforeH * ((this._canvas.width / beforeW)));
                    
                    CanvasUtil.baseCanvasDimensions.width = this._canvas.clientWidth;
                    CanvasUtil.baseCanvasDimensions.height = this._canvas.clientHeight;
                    CanvasUtil.handleResizeEvent(this._canvas, this._canvas.clientWidth, this._canvas.clientHeight);
                }
            });
            document.addEventListener('mousedown', (event) => {
                clientX = event.clientX;
                clientY = event.clientY;
            });
            document.addEventListener('mouseup', (event) => {
                clientX = event.clientX;
                clientY = event.clientY;
            });
            document.addEventListener('keydown', (event) => {
                if (event.key == "`") {
                    window.addEventListener('mousemove', mouseMoveHandler__);
                    shiftDown__ = true;
                    mouseMoveHandler__({clientX : clientX, clientY : clientY});
                } else if (event.key == 'Alt') {
                    if (window.navigator.userAgent.indexOf("Mac") != -1)
                        altDown = true;

                    event.preventDefault();
                }
            });
            document.addEventListener('keyup', (event) => {
                if (event.key == "`") {
                    window.removeEventListener('mousemove', mouseMoveHandler__);
                    shiftDown__ = false;
                } else if (event.key == 'Alt') {
                    CanvasUtil.baseCanvasDimensions.width = this._canvas.clientWidth;
                    CanvasUtil.baseCanvasDimensions.height = this._canvas.clientHeight;
                    CanvasUtil.handleResizeEvent(this._canvas, this._canvas.clientWidth, this._canvas.clientHeight);

                    altInitDown = true;
                    altDown = false;

                    event.preventDefault();
                }
            });
        }
        modalCanvasInit();
    }

    _clearConfig() {
        this.config = this.config || {};
        const options = this.config;

        options.onStartFrame = (function(t, state) {});
        options.onStartFrameXR = (function(t, state) {});
        options.onEndFrame = (function(t, state) {});
        options.onEndFrameXR = (function(t, state) {});
        options.onDraw = (function(t, p, v, state, eyeIdx) {});
        options.onDrawXR = (function(t, p, v, state, eyeIdx) {});
        options.onAnimationFrame = this._onAnimationFrame;
        options.onAnimationFrameWindow = this._onAnimationFrameWindow;
        options.onReload   = function(state) {};
        options.onExit     = function(state) {};
        options.onExitXR   = function(state) {};
        //options.onWindowFrame = this._onWindowFrame.bind(this);

        // selection
        options.onSelectStart = (function(t, state) {});
        options.onSelect = (function(t, state) {});
        options.onSelectEnd = (function(t, state) {});
    }

    clearWorld() {
        this._reset();
        this.GPUInterface.GPUCtxInfo.freeResources();
    }

    _reset() {
        if (this.xrInfo.session) {
            console.log('resetting XR animation frame');
            this.xrInfo.session.cancelAnimationFrame(this._animationHandle);
        } else {
            window.cancelAnimationFrame(this._animationHandle);
        }
    }

    enableImmersiveVREntry(supported) {
        this.xrButton.enabled = supported;
    }

    async XRDetectImmersiveVRSupport() {
        if (!navigator.xr) {
            console.log("WebXR unsupported");
            return false;
        }

        try {
            const supported = await navigator.xr.isSessionSupported(
                XR_SESSION_MODE.IMMERSIVE_VR
            );
            if (supported) {
                console.log("immersive-vr mode is supported");
                this.enableImmersiveVREntry(true);
                return true;
            }
        } catch (err) {
            console.log("immersive-vr mode is unupported");
            console.error(err.message);
            this.enableImmersiveVREntry(false);
            return false;
        }
    }

    onRequestSession() {
        console.log("requesting session");
        return navigator.xr.requestSession(
            XR_SESSION_MODE.IMMERSIVE_VR,
            {
                optionalFeatures : [
                    XR_REFERENCE_SPACE_TYPE.BOUNDED_FLOOR
                ]
            }
        ).then(this.onSessionStarted).catch((err) => {
            console.error(err.message);
            console.error("This should never happen because we check for support beforehand");
            this.enableImmersiveVREntry(false);
        });
    }

    async onSessionStarted(session) {
        console.log("session started");

        session.addEventListener('end', onSessionEnded);

        this._reset();

        this.xrInfo.session = session;

        this.xrButton.setSession(session);

        this.xrInfo.isImmersive = true;

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
        // bounded-floor == (y == 0 at floor, assumes bounded tracking space)

        // try for a bounded floor reference space, otherwise a local reference space
        session.requestReferenceSpace(
            XR_REFERENCE_SPACE_TYPE.BOUNDED_FLOOR
        ).then((refSpace) => {
            this.xrInfo.type = XR_REFERENCE_SPACE_TYPE.BOUNDED_FLOOR;
            this.xrInfo.immersiveRefSpace = refSpace;
        }).catch((err) => {
            console.error(err.message);
            // fall back to local (eye-level)
            session.requestReferenceSpace(
                XR_REFERENCE_SPACE_TYPE.LOCAL
            ).then((refSpace) => {
                this.xrInfo.type = XR_REFERENCE_SPACE_TYPE.LOCAL;
                this.xrInfo.immersiveRefSpace = refSpace;
            }).then(onRequestReferenceSpaceSuccess);

        }).then(this.onRequestReferenceSpaceSuccess);
    }
    onRequestReferenceSpaceSuccess() {
        const GPUAPILayer = new this.GPUAPI.XRLayer;

        session.updateRenderState({
            baseLayer : GPUAPILayer
        });

        this.start();

        this._VRIsActive = true;        
    }
    onEndSession(session) {
        console.log("session ended");
        session.end();
    }
    onSessionEnded(e) {
        if (!e.session.isImmersive) {
            return;
        }

        this._reset();
        this.xrButton.setSession(null);
        e.session.isImmersive   = false;
        this.xrInfo.isImmersive = false;
        this.xrInfo.session     = null;
        this.xrInfo.type        = XR_REFERENCE_SPACE_TYPE.VIEWER;

        this._VRIsActive = false;

        this._animationHandle = window.requestAnimationFrame(this.config.onAnimationFrame);
    }

    // OLD

    _onVRRequestPresent () {
        // This can only be called in response to a user gesture.
        this._vrDisplay.requestPresent([{ source: this._canvas }]).then(function () {
            // Nothing to do because we're handling things in onVRPresentChange.
        }, function (err) {
            console.error(err);
            console.log(err.name);
            console.log(err.message);
            console.log(err.code);
        });
    }
    
    _onVRExitPresent () {
        if (!this._vrDisplay.isPresenting)
            return;
        this._vrDisplay.exitPresent().then(function () {
        }, function (err) {
            console.error(err);
        });
    }

    _onVRPresentChange() {
        if (this._vrDisplay == null) {
            return;
        }

        if (this._vrDisplay.isPresenting) {
            if (!this._VRIsActive) {
                this._oldCanvasWidth = this._canvas.width;
                this._oldCanvasHeight = this._canvas.height;
                const leftEye = this._vrDisplay.getEyeParameters('left');
                const rightEye = this._vrDisplay.getEyeParameters('right');

                this._canvas.width  = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
                this._canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);

                this._vrDisplay.resetPose();
            }
            this._VRIsActive = true;

            return;
        }
        if (this._VRIsActive) {
            this.canvas.width   = this._oldCanvasWidth;
            this._canvas.height = this._oldCanvasHeight;
        }
        this._VRIsActive = false;


    }

    _onFrameXR(t) {
    }

    //

    _onAnimationFrameWindow(t) {
        const self = MR.system;

        self.time = t / 1000.0;
        self.timeMS = t;

        self._animationHandle = window.requestAnimationFrame(self.config.onAnimationFrame);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        mat4.identity(self._viewMatrix);
        mat4.perspective(self._projectionMatrix, Math.PI/4,
            gl.canvas.width / gl.canvas.height,
            0.01, 1024);

        Input.updateKeyState();
        self.config.onStartFrame(t, self.customState);

        GFX.viewportXOffset = 0;
        self.config.onDraw(t, self._projectionMatrix, self._viewMatrix, self.customState);
        self.config.onEndFrame(t, self.customState);
    }

    // TODO(TR): WebXR has its own controller API that interfaces
    // with the different reference spaces -- this may be necessary to use
    updateControllerState(self) {
        MR.controllers = navigator.getGamepads();
        let gamepads = navigator.getGamepads();
        let vrGamepadCount = 0;
        let doTransition = false;
        for (let i = 0; i < gamepads.length; i += 1) {
            const gamepad = gamepads[i];
            if (gamepad) { // gamepads may contain null-valued entries
                if (gamepad.pose || gamepad.displayId ) { // VR gamepads will have one or both of these properties.
                    let cache = self.buttonsCache[vrGamepadCount] || [];
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

    _onAnimationFrame(t, frame) {
        const self = MR.system;

        self.time = t / 1000.0;
        self.timeMS = t;

        const doTransition = false;


        if (!(frame && frame.session.isImmersive)) {
            self.config.onAnimationFrameWindow(t);
            return;
        }

        self.updateControllerState(self);

        const gl = self.GPUCtx;
        vrDisplay.getFrameData(frame);

        self._animationHandle = vrDisplay.requestAnimationFrame(self.config.onAnimationFrame);

        Input.updateControllerState();
        self.config.onStartFrameXR(t, self.customState);

        // left eye
        gl.viewport(0, 0, gl.canvas.width * 0.5, gl.canvas.height);
        GFX.viewportXOffset = 0;
        self.config.onDrawXR(t, frame.leftProjectionMatrix, frame.leftViewMatrix, self.customState);
                
        // right eye
        gl.viewport(gl.canvas.width * 0.5, 0, gl.canvas.width * 0.5, gl.canvas.height);
        GFX.viewportXOffset = gl.canvas.width * 0.5;
        self.config.onDrawXR(t, frame.rightProjectionMatrix, frame.rightViewMatrix, self.customState);

        self.config.onEndFrameXR(t, self.customState);


        vrDisplay.submitFrame();
    }
};
