"use strict";

// Authors: Nick Vitovich, Karl Toby Rosenberg
//  initial boilerplate based on publicly available documentation */

// XRCanvasWrangler provides quick-and-easy setup for WebXR.  Supports session
// mirroring (for 2D display) and a fallback for when WebXR is not available.
// All rendering details (resource management, etc.) is left to the user!

// Assuming mat4 (see gl-matrix-min.js) is in global namespace
window.XRCanvasWrangler = (function () {

  //
  // Helpers
  //

  let CanvasUtil = (function() {
    function resizeToDisplaySize(canvas, scale = 1) {
      const realToCSSPixels = window.devicePixelRatio;

      const displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels * scale);
      const displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels * scale);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
          canvas.width = displayWidth;
          canvas.height = displayHeight;
      }
    }

    function createCanvasOnElement(canvasName, parentName = 'output-element', width = 400, height = 400) {
      const parent = document.querySelector('#' + parentName);
      if (!parent) {
        return null;
      }

      const canvas = document.createElement("canvas");
      canvas.setAttribute('id', canvasName);

      parent.appendChild(canvas);

      canvas.width = width;
      canvas.height = height;


      //resizeToDisplaySize(canvas);

      return {
        parent : parent, 
        canvas : canvas
      };
    }

    const _out = {
      resizeToDisplaySize : resizeToDisplaySize,
      createCanvasOnElement : createCanvasOnElement
    };

    return _out;

  }())

  //
  // Export
  //

  class XRBasicCanvasWrangler {
    _clearConfig() {
      this.config = this.config || {};
      const options = this.config;

      options.onStartFrame = (function(t, state) {});
      options.onEndFrame = (function(t, state) {});
      options.onDraw = (function(t, p, v, state, eyeIdx) {});
      options.onXRFrame = this._onXRFrame.bind(this);
      options.onWindowFrame = this._onWindowFrame.bind(this);

      // selection
      options.onSelectStart = (function(t, state) {});
      options.onSelect = (function(t, state) {});
      options.onSelectEnd = (function(t, state) {});
    }

    beginSetup(options) {
      this.configure(options);
    }

    async configure(options) {
      // (KTR) TODO: need to clear previous world state before the new world is loaded
      // to prevent people from taking advantage of others' code or breaking state

      this._clearConfig();
      this._reset();
      
      options = options || {};
      this.config = options;

      options.onStartFrame = options.onStartFrame || (function(t, state) {});
      options.onEndFrame = options.onEndFrame || (function(t) {});
      options.onDraw = options.onDraw || (function(t, p, v, state, eyeIdx) {}); // projMat, viewMat
      options.onXRFrame = options.onXRFrame || this._onXRFrame.bind(this);
      options.onWindowFrame = options.onWindowFrame || this._onWindowFrame.bind(this);

      options.onSelectStart = this.config.onSelectStart || (function(t, state) {});
      options.onSelect = this.config.onSelect || (function(t, state) {});
      options.onSelectEnd = this.config.selectEnd || (function(t, state) {});

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
        await options.setup(this.customState, this, this._session);
      }

      this.start();
    }

    constructor() {}

    init(options) {
      this.options = options || {};

      options.contextOptions = options.contextOptions || { xrCompatible: true };
      options.contextNames = options.contextNames || ['webgl2', 'webgl', 'experimental-webgl'];

      this.main = options.main;

      this.glDoResourceTracking = !!this.options.glDoResourceTracking;

      this._canvas = null;
      {
        const parentCanvasPair = CanvasUtil.createCanvasOnElement(
          'active',
          options.outputSurfaceName || 'output-element',
          options.outputWidth || 1280,
          options.outputHeight || 720
        );
        console.assert(parentCanvasPair !== null);
        console.assert(parentCanvasPair.parent !== null);
        console.assert(parentCanvasPair.canvas !== null);

        this._parent = parentCanvasPair.parent;
        this._canvas = parentCanvasPair.canvas;
      }

      this._glCanvas = null;
      this._mirrorCanvas = null;
      this._immersiveCanvas = null;

      this._gl = null;
      this._version = null;
      this._xrButton = null;
      this._xrImmersiveRefSpace = null;
      this._xrNonImmersiveRefSpace = null;
      this._fallbackViewMat = mat4.create();
      this._fallbackProjMat = mat4.create();

      this.animationHandle = 0;
      this.isFallback = false; 

      this._session = null;

      this._frameOfRef = null;

      this.customState = null;

      if (options.useCustomState === false) {
        this.useCustomState = false;
      } else {
        this.useCustomState = true;
      }

      this.useCustomState = (options.useCustomState === false) ? false : true;
      if (this.useCustomState) {
        this.customState = {};
        this.persistentStateMap = new Map();
        this.globalPersistentState = {};
      }

      this._clearConfig();

      this._init();
    }

    _init() {
      this._initButton();
      if (navigator.xr) {
        navigator.xr.supportsSessionMode('immersive-vr').then(() => {
          this._xrButton.enabled = true;
        });

        {
          const parentCanvasPair = CanvasUtil.createCanvasOnElement(
            'active-xr-gl',
            this.options.outputSurfaceName || 'output-element',
            this.options.outputWidth || 1280,
            this.options.outputHeight || 720
          );
          console.assert(parentCanvasPair !== null);
          console.assert(parentCanvasPair.parent !== null);
          console.assert(parentCanvasPair.canvas !== null);

          this._parent = parentCanvasPair.parent;
          this._glCanvas = parentCanvasPair.canvas;
        }

        console.assert(this._initGLContext(this._glCanvas));

        if (this.options.glUseGlobalContext) {
          window.gl = this._gl;
        }
        if (this.options.glDoResourceTracking) {
          this._glAttachResourceTracking();
        }

        console.log("GL Version: " + this._version);

        this._selectionInProgress = false;
        this.selectStart = (arg) => {
          if (!this._selectionInProgress) {
            console.log("(KTR) cancel erroneous selectStart, temp hack since selection seems to double-trigger");
            return;
          }

          console.log("selectstart");
          this.config.onSelectStart(arg, this.userID); // (KTR) TODO: should start using user IDs for interactions

          if (this._frameOfRef) {
            //console.log("have frame of ref");
          } else {
            //console.log("does NOT have frame of ref");
            return;
          }

          let inputPose = arg.frame.getInputPose(arg.inputSource, this._frameOfRef);
        };

        this.select = (arg) => { 
          console.log("select"); 
          this._selectionInProgress = true;
          this.config.onSelect(arg, this.userID); 
        };
        this.selectEnd = (arg) => {
          if (!this._selectionInProgress) {
            //console.log("(KTR) cancel erroneous selectEnd, temp hack since selection seems to double-trigger");
            return;
          }

          console.log("selectEnd");
          this.config.onSelectEnd(arg, this.userID); 
          this._selectionInProgress = false;
        };

        this._presentCanvas = this._canvas;
        let ctx = this._presentCanvas.getContext('xrpresent');

        navigator.xr.requestSession({ outputContext: ctx }).then((session) => {

          // session.removeEventListener('selectstart', this.selectStart );
          // session.removeEventListener('select', this.select);
          // session.removeEventListener('selectend', this.selectEnd);

          // session.addEventListener('selectstart', this.selectStart);
          // session.addEventListener('select', this.select);
          // session.addEventListener('selectend', this.selectEnd);

          this._onSessionStarted(session);
        });

      } else {
        console.log('WebXR not supported, falling back ...');
        console.assert(this._initGLContext(this._canvas));

        if (this.options.glUseGlobalContext) {
          window.gl = this._gl;
        }
        if (this.options.glDoResourceTracking) {
          this._glAttachResourceTracking();
        }

        console.log("GL Version: " + this._version);

        this._initFallback();

        this._canvas.addEventListener('mousedown', () => { this.config.onSelectStart() });

        this.main();
      }

    }

    _initButton() {
      this._xrButton = new XRDeviceButton({
        onRequestSession: this._onRequestSession.bind(this),
        onEndSession: this._onEndSession.bind(this)
      });
      document.querySelector('body').prepend(this._xrButton.domElement);
    }

    _initGLContext(target) {
      let contextNames = this.options.contextNames;
      let contextOptions = this.options.contextOptions;

      for (let i = 0; i < contextNames.length; ++i) {
        const glCtx = target.getContext(contextNames[i], contextOptions);
        if (glCtx != null) { // non-null indicates success
          this._gl      = glCtx;
          this._version = contextNames[i];
          return true;
        }
      }

      return false;
    }

    _onResize() {
      let gl = this._gl;
      gl.canvas.width = gl.canvas.offsetWidth * window.devicePixelRatio;
      gl.canvas.height = gl.canvas.offsetHeight * window.devicePixelRatio;
      mat4.perspective(this._fallbackProjMat, Math.PI/4,
        gl.canvas.width / gl.canvas.height,
        0.01, 1000.0);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    _initFallback() {
      this.isFallback = true;
      mat4.identity(this._fallbackViewMat);
      mat4.perspective(this._fallbackProjMat, Math.PI/4,
        this._gl.canvas.width / this._gl.canvas.height,
        0.01, 1000.0
      );

      return; // ?

      window.addEventListener('resize', this._onResize.bind(this));
      this._onResize();
    }

    _onRequestSession() {
      this._immersiveCanvas = document.createElement('canvas');
      let ctx = this._immersiveCanvas.getContext('xrpresent');
      this._immersiveCanvas.setAttribute('id', 'immersive-canvas');
      document.body.appendChild(this._immersiveCanvas);

      if (this._session) {
        // this._session.removeEventListener('selectstart', this.selectStart );
        // this._session.removeEventListener('select', this.select);
        // this._session.removeEventListener('selectend', this.selectEnd);
      }

      navigator.xr.requestSession({
        mode: 'immersive-vr',
        outputContext: ctx
      }).then((session) => {
        console.log("adding event handlers");
        session.addEventListener('selectstart', this.selectStart);
        session.addEventListener('select', this.select);
        session.addEventListener('selectend', this.selectEnd);

        this._xrButton.setSession(session);
        this._onSessionStarted(session);

        try {
          session.requestFrameOfReference('eye-level')
          .then((frameOfRef) => {
            this._frameOfRef = frameOfRef;
          });
        } catch (e) {
          console.log("Does not support requestFrameOfReference()");
        }
      });
    }

    // onSelectStart(ev) {
    //   // Q: Is this the same as getting the views from the reference space?
    //   // API is unclear


    //   // const refSpace = ev.frame.session.mode == "immersive-vr" ?
    //   //                  this._xrImmersiveRefSpace :
    //   //                  this._xrNonImmersiveRefSpace;

    //   // const inputSources = this._session.getInputSources();
    //   // for (let xrInputSource of inputSources) {
    //   //   let inputPose = xrFrameOfRef.getInputPose(inputSource, xrFrameOfRef);
    //   //   if (!inputPose) {
    //   //     console.log("No input pose");
    //   //     continue;
    //   //   }
    //   //   console.log("Has input pose");
    //   //   // Update the position of the input devices. e.g. when rendering them (TODO) (KTR) this should probably happen
    //   //   // via user-specified callback
    //   // }

    //   // console inputPose = ev.frame.getInputPose(ev.inputSource, refSpace);
    //   // if (!inputPose) {
    //   //   console.log("No input pose");
    //   //   return;
    //   // }

    //   // console.log("Have input pose");


    // }

    start() {
      if (this.isFallback) {
        this.animationHandle = window.requestAnimationFrame(this.config.onWindowFrame);
      } else {
        if (this.animationHandle > 0) {
          this._session.cancelAnimationFrame(this.animationHandle);
        }
        this.animationHandle = this._session.requestAnimationFrame(this.config.onXRFrame);
      }
    }


    _onSessionStarted(session) {
      this._session = session;


      session.addEventListener('end', this._onSessionEnded.bind(this));

      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, this._gl) });

      this._glFreeResources();

      session.requestReferenceSpace({
        type: 'stationary',
        subtype: 'eye-level'
      }).then((refSpace) => {
        if (session.mode == 'immersive-vr') {
          this._xrImmersiveRefSpace = refSpace;
        } else {
          this._xrNonImmersiveRefSpace = refSpace;
        }
        console.log("session is ready");

        this.main();
      });
    }

    _reset(target = null) {      
      let animationCallback = null;
      if (this.isFallback) {
        target = window;
        animationCallback = this.config.onWindowFrame;

        mat4.perspective(
          this._fallbackProjMat,
          Math.PI/4,
          this._gl.canvas.width / this._gl.canvas.height,
          0.1, 1000.0
        );

      } else {
        target = this._session;
        animationCallback = this.config.onXRFrame;
      }

      if (this.animationHandle != 0) {
        target.cancelAnimationFrame(this.animationHandle);
      }
    }

    _onEndSession(session) {
      console.log("ENDING SESSION");
      session.cancelAnimationFrame(this.animationHandle);
      session.end();
    }

    _onSessionEnded(event) {
      if (event.session.mode == 'immersive-vr') {
        console.log("IMMERSIVE VR ENDING");
        document.body.removeChild(this._immersiveCanvas);
        this._xrButton.setSession(null);
        this._parent.removeChild(this._canvas);
      }
    }

    updateInputSources(session, frame, refSpace) {
      let inputSources = session.getInputSources();
      for (let inputSource of inputSources) {
        let inputPose = frame.getInputPose(inputSource, refSpace);
        // We may not get a pose back in cases where the input source has lost
        // tracking or does not know where it is relative to the given frame
        // of reference.
        if (!inputPose) {
          continue;
        }
        if (inputPose.gripTransform.matrix) {
          // If we have a grip matrix use it to render a mesh showing the
          // position of the controller.
          //console.log("inputPose.gripTransform.matrix");
          //scene.inputRenderer.addController(inputPose.gripTransform.matrix);
        }
        if (inputPose.targetRay) {
          if (inputSource.targetRayMode == 'tracked-pointer') {
            // If we have a pointer matrix and the pointer origin is the users
            // hand (as opposed to their head or the screen) use it to render
            // a ray coming out of the input device to indicate the pointer
            // direction.
            //console.log("inputPose.tracked-pointer");
            //scene.inputRenderer.addLaserPointer(inputPose.targetRay);
          }
          // If we have a pointer matrix we can also use it to render a cursor
          // for both handheld and gaze-based input sources.
          // Statically render the cursor 2 meters down the ray since we're
          // not calculating any intersections in this sample.
          let cursorDistance = 2.0;

          //console.log("calculating position of pointer");
          // let cursorPos = vec3.fromValues(
          //     inputPose.targetRay.origin.x,
          //     inputPose.targetRay.origin.y,
          //     inputPose.targetRay.origin.z
          //     );
          // vec3.add(cursorPos, cursorPos, [
          //     inputPose.targetRay.direction.x * cursorDistance,
          //     inputPose.targetRay.direction.y * cursorDistance,
          //     inputPose.targetRay.direction.z * cursorDistance,
          //     ]);
          // vec3.transformMat4(cursorPos, cursorPos, inputPose.targetRay.transformMatrix);
          //scene.inputRenderer.addCursor(cursorPos);
        }
      }
    }   

    _onXRFrame(t, frame) {
      const session = frame.session;
      const refSpace = session.mode == 'immersive-vr' ?
                      this._xrImmersiveRefSpace : this._xrNonImmersiveRefSpace;
      const pose = frame.getViewerPose(refSpace);
      this.animationHandle = session.requestAnimationFrame(this.config.onXRFrame);
      
      this.updateInputSources(session, frame, refSpace);
      
      if (pose) {
        const glLayer = session.renderState.baseLayer;
        this._gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer); // TODO make this bind optional
        this.config.onStartFrame(t, this.customState);
        let i = 0;
        for (let view of pose.views) {
          const viewport = glLayer.getViewport(view);
          this._gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
          this.config.onDraw(t, view.projectionMatrix, view.viewMatrix, this.customState, i);
          i += 1;
        }
        this.config.onEndFrame(t, this.customState);
      }
      else {
        console.log("no pose");
      }
    }

    _onWindowFrame(t) {
      this.animationHandle = window.requestAnimationFrame(this.config.onWindowFrame);
      this.config.onStartFrame(t, this.customState);
      this.config.onDraw(t, this._fallbackProjMat, this._fallbackViewMat, this.customState);
      this.config.onEndFrame(t);
    }

    _glAttachResourceTracking() {
      if (!this.glDoResourceTracking) {
        return;
      }

      GFX.glAttachResourceTracking(this._gl, this._version);
    }

    _glFreeResources() {
      if (!this.glDoResourceTracking) {
        return;
      }

      //console.log("Cleaning graphics context:");

      GFX.glFreeResources(this._gl);
    }

    get canvas() { return this._canvas; }
    get gl() { return this._gl; }
    get version() { return this._version; }
    get session() { return this._session; }
  }

  return XRBasicCanvasWrangler;
})();


