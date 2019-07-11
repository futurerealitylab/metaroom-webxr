"use strict";

function onWorldVisit(wrangler) {
  wrangler._resetGfxContext(wrangler.session);
}

// XRCanvasWrangler provides quick-and-easy setup for WebXR.  Supports session
// mirroring (for 2D display) and a fallback for when WebXR is not available.
// All rendering details (resource management, etc.) is left to the user!
window.XRCanvasWrangler = (function () {

  //
  // Helpers
  //

  // Math (from gl-matrix mat4.js).  NOTE: Can I just include that instead?
  function perspective(out, fovy, aspect, near, far) {
    let f = 1.0 / Math.tan(fovy / 2), nf;
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = (2 * far * near) * nf;
    } else {
      out[10] = -1;
      out[14] = -2 * near;
    }
    return out;
  }

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
    constructor(options) {
      this.options = options || {};

      options.contextOptions = options.contextOptions || { xrCompatible: true };
      options.contextNames = options.contextNames || ['webgl2', 'webgl', 'experimental-webgl'];
      options.onStartFrame = options.onStartFrame || (function(t) {});
      options.onEndFrame = options.onEndFrame || (function(t) {});
      options.onDraw = options.onDraw || (function(t, p, v) {}); // projMat, viewMat
      options.onXRFrame = options.onXRFrame || this._onXRFrame.bind(this);
      options.onWindowFrame = options.onWindowFrame || this._onWindowFrame.bind(this);

      // selection
      options.onSelectStart = options.onSelectStart || (function(t, state) {});
      options.onSelect = options.onSelect || (function(t, state) {});
      options.onSelectEnd = options.onSelectEnd || (function(t, state) {});

      this.canvasGenerationID = 0;
      //this.canvases = [];
      //this.canvasSwapIdx = 0;

      this._canvas = null;
      {
        const parentCanvasPair = CanvasUtil.createCanvasOnElement(
          'active' + this.canvasGenerationID,
          options.outputSurfaceName || 'output-element',
          options.outputWidth || 400,
          options.outputHeight || 400
        );
        console.assert(parentCanvasPair !== null);
        console.assert(parentCanvasPair.parent !== null);
        console.assert(parentCanvasPair.canvas !== null);

        this._parent = parentCanvasPair.parent;
        this._canvas = parentCanvasPair.canvas;
      }

      this._glCanvas = null;
      // {
      //   const parentCanvasPair = CanvasUtil.createCanvasOnElement(
      //     'inactive',
      //     options.outputSurfaceName || 'output-element',
      //     options.outputWidth || 400,
      //     options.outputHeight || 400
      //   );
      //   console.assert(parentCanvasPair !== null);
      //   this._parent = parentCanvasPair.parent;
      //   this._canvas = parentCanvasPair.canvas;
      // }

      //this._canvas = canvas;
      this._mirrorCanvas = null;
      this._immersiveCanvas = null;

      this._gl = null;
      this._version = null;
      this._xrButton = null;
      this._xrImmersiveRefSpace = null;
      this._xrNonImmersiveRefSpace = null;
      this._fallbackViewMat = null;
      this._fallbackProjMat = null;

      this.animationHandle = 0;
      this.isFallback = false; 

      this._session = null;

      this._frameOfRef = null;

      this._customState = null;

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
            'active_xr_gl' + this.canvasGenerationID,
            this.options.outputSurfaceName || 'output-element',
            this.options.outputWidth || 400,
            this.options.outputHeight || 400
          );
          console.assert(parentCanvasPair !== null);
          console.assert(parentCanvasPair.parent !== null);
          console.assert(parentCanvasPair.canvas !== null);

          this._parent = parentCanvasPair.parent;
          this._glCanvas = parentCanvasPair.canvas;
        }

        this._initGLContext(this._glCanvas);

        this._presentCanvas = this._canvas;
        let ctx = this._presentCanvas.getContext('xrpresent');
        navigator.xr.requestSession({ outputContext: ctx }).then((session) => {
          this._onSessionStarted(session);
        });
      } else {
        console.log('WebXR not supported, falling back ...');
        this._initGLContext(this._canvas);
        this._initFallback();
      }

      console.log("GL Version: " + this._version);
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
          this._gl       = glCtx;
          this._version  = contextNames[i];
          return true;
        }
      }

      return false;
    }

    _onResize() {
      return; // temp
      let gl = this._gl;
      gl.canvas.width = gl.canvas.offsetWidth * window.devicePixelRatio;
      gl.canvas.height = gl.canvas.offsetHeight * window.devicePixelRatio;
      perspective(this._fallbackProjMat, Math.PI*0.5,
        gl.canvas.width / gl.canvas.height,
        0.1, 1000.0);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    _initFallback() {
      this.isFallback = true;
      this._fallbackViewMat = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
      this._fallbackProjMat = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
      window.addEventListener('resize', this._onResize.bind(this));
      this._onResize();
      this.animationHandle = window.requestAnimationFrame(this.options.onWindowFrame);
    }

    _onRequestSession() {
      this._immersiveCanvas = document.createElement('canvas');
      let ctx = this._immersiveCanvas.getContext('xrpresent');
      this._immersiveCanvas.setAttribute('id', 'immersive-canvas');
      document.body.appendChild(this._immersiveCanvas);
      navigator.xr.requestSession({
        mode: 'immersive-vr',
        outputContext: ctx
      }).then((session) => {
        this._xrButton.setSession(session);
        this._onSessionStarted(session);
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

    _onSessionStarted(session) {
      this._session = session;

      // By listening for the 'select' event we can find out when the user has
      // performed some sort of primary input action and respond to it.
      session.addEventListener('selectstart', this.options.onSelectStart);
      session.addEventListener('select', this.options.onSelect);
      session.addEventListener('selectend', this.options.onSelectEnd);
      session.addEventListener('end', this._onSessionEnded.bind(this));


      // (KTR) TODO let the user pass around some state between functions
      // instead of using globals (if they so choose)
      if (this.options.customState) {
        this._customState = this.options.customState;
      }

      // (KTR) TODO give user the ability to do add event listeners or other objects 
      // before the session starts, as well as do any other initialization of
      // their custom state
      if (this.options.init) {
        this.options.init(this._customState, this, this._session);
      }


      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, this._gl) });
      
      // ??? webxr-version-shim.js:423 Uncaught (in promise) TypeError: Cannot read property 'call' of undefined 
      // session.requestFrameOfReference('eye-level')
      // .then((frameOfRef) => {
      //   this._frameOfRef = frameOfRef;
      // })

      session.requestReferenceSpace({
        type: 'stationary',
        subtype: 'eye-level'
      }).then((refSpace) => {
        if (session.mode == 'immersive-vr') {
          this._xrImmersiveRefSpace = refSpace;
        } else {
          this._xrNonImmersiveRefSpace = refSpace;
        }
        this.animationHandle = session.requestAnimationFrame(this.options.onXRFrame);
      });
    }

    _resetGfxContext(session = null) {
      // fallback path /////////////////////////////////////
      if (this.isFallback) {  
        if (this.animationHandle !== 0) {
          //window.cancelAnimationFrame(this.animationHandle);
        }

        if (this._canvas !== null) {
          this._parent.removeChild(this._canvas);
          this._gl.clear(this._gl.DEPTH_BUFFER_BIT | this._gl.COLOR_BUFFER_BIT | this._gl.STENCIL_BUFFER_BIT);
          this._gl = null;

          this._canvas = null;
        }

        this.canvasGenerationID += 1;
        {
          const parentCanvasPair = CanvasUtil.createCanvasOnElement(
            'active' + this.canvasGenerationID,
            this.options.outputSurfaceName || 'output-element',
            this.options.outputWidth || 400,
            this.options.outputHeight || 400
          );
          console.assert(parentCanvasPair !== null);
          console.assert(parentCanvasPair.parent !== null);
          console.assert(parentCanvasPair.canvas !== null);

          this._parent = parentCanvasPair.parent;
          this._canvas = parentCanvasPair.canvas;
        }

        this._initGLContext(this._canvas);

        this._fallbackViewMat = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
        this._fallbackProjMat = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

        //this.animationHandle = window.requestAnimationFrame(this.options.onWindowFrame);
      }

      // WebXR path //////////////////////////////////////
      if (this.animationHandle !== 0) {
        //session.cancelAnimationFrame(this.animationHandle);
      }

      if (this._glCanvas !== null) {
        this._parent.removeChild(this._glCanvas);
        this._gl.clear(this._gl.DEPTH_BUFFER_BIT | this._gl.COLOR_BUFFER_BIT | this._gl.STENCIL_BUFFER_BIT);
        this._gl = null;

        this._glCanvas = null;
      }

      if (this.animationHandle !== 0) {
        if (session !== null) {
          //session.cancelAnimationFrame(this.animationHandle);
        }
      }

      this._glCanvas = null;
      this.canvasGenerationID += 1;
      {
        const parentCanvasPair = CanvasUtil.createCanvasOnElement(
          'active_xr_gl' + this.canvasGenerationID,
          this.options.outputSurfaceName || 'output-element',
          this.options.outputWidth || 400,
          this.options.outputHeight || 400
        );
        console.assert(parentCanvasPair !== null);
        console.assert(parentCanvasPair.parent !== null);
        console.assert(parentCanvasPair.canvas !== null);

        this._parent = parentCanvasPair.parent;
        this._glCanvas = parentCanvasPair.canvas;
      }

      if (!this._initGLContext(this._glCanvas)) {
        console.log("ERROR: GL CONTEXT LOAD UNSUCCESSFUL");
      }


      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, this._gl) });
      //this.animationHandle = session.requestAnimationFrame(this.options.onXRFrame);

      // (KTR) TODO maybe have a default transition animation in-between that
      // loads a shader into the current context
      // then replaces the context (or something simpler)


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

    _onXRFrame(t, frame) {
      const session = frame.session;
      const refSpace = session.mode == 'immersive-vr' ?
                      this._xrImmersiveRefSpace : this._xrNonImmersiveRefSpace;
      const pose = frame.getViewerPose(refSpace);
      this.animationHandle = session.requestAnimationFrame(this.options.onXRFrame);
      if (pose) {
        const glLayer = session.renderState.baseLayer;
        this._gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
        this.options.onStartFrame(t);
        for (let view of pose.views) {
          const viewport = glLayer.getViewport(view);
          this._gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
          this.options.onDraw(t, view.projectionMatrix, view.viewMatrix);
        }
        this.options.onEndFrame(t);
      }
      else {
        console.log("no pose");
      }
    }

    _onWindowFrame(t) {
      this.animationHandle = window.requestAnimationFrame(this.options.onWindowFrame);
      this.options.onStartFrame(t);
      this.options.onDraw(t, this._fallbackProjMat, this._fallbackViewMat);
      this.options.onEndFrame(t);
    }

    get canvas() { return this._canvas; }
    get gl() { return this._gl; }
    get version() { return this._version; }
    get session() { return this._session; }
  }

  return XRBasicCanvasWrangler;
})();


