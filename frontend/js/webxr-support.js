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

  //
  // Export
  //

  class XRBasicCanvasWrangler {
    constructor(canvas, options) {
      options = options || {};

      options.contextOptions = options.contextOptions || { xrCompatible: true };
      options.contextNames = options.contextNames || ['webgl2', 'webgl', 'experimental-webgl'];
      options.onStartFrame = options.onStartFrame || (function() {});
      options.onEndFrame = options.onEndFrame || (function() {});
      options.onDraw = options.onDraw || (function(p, v) {}); // projMat, viewMat
      options.onXRFrame = options.onXRFrame || this._onXRFrame.bind(this);
      options.onWindowFrame = options.onWindowFrame || this._onWindowFrame.bind(this);

      this.options = options;

      this._canvas = canvas;
      this._glCanvas = null;
      this._mirrorCanvas = null;
      this._immersiveCanvas = null;
      this._gl = null;
      this._version = null;
      this._xrButton = null;
      this._xrImmersiveRefSpace = null;
      this._xrNonImmersiveRefSpace = null;
      this._fallbackViewMat = null;
      this._fallbackProjMat = null;

      this._init();
    }

    _init() {
      this._initButton();
      if (navigator.xr) {
        navigator.xr.supportsSessionMode('immersive-vr').then(() => {
          this._xrButton.enabled = true;
        });
        let glCanvas = document.createElement('canvas');
        this._initGLContext(glCanvas);
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
    }

    _initButton() {
      this._xrButton = new XRDeviceButton({
        onRequestSession: this._onRequestSession.bind(this),
        onEndSession: this._onEndSession.bind(this)
      });
      document.querySelector('body').prepend(this._xrButton.domElement);
    }

    _initGLContext(target) {
      if (this._gl) return;

      let contextNames = this.options.contextNames;
      let contextOptions = this.options.contextOptions;

      for (let i = 0; i < contextNames.length; ++i) {
        gl = target.getContext(contextNames[i], contextOptions);
        if (gl != null) { // non-null indicates success
          this._glCanvas = target;
          this._gl       = gl;
          this._version  = contextNames[i];
          break;
        }
      }
    }

    _onResize() {
      let gl = this._gl;
      gl.canvas.width = gl.canvas.offsetWidth * window.devicePixelRatio;
      gl.canvas.height = gl.canvas.offsetHeight * window.devicePixelRatio;
      perspective(this._fallbackProjMat, Math.PI*0.5,
        gl.canvas.width / gl.canvas.height,
        0.1, 1000.0);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    _initFallback() {
      this._fallbackViewMat = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
      this._fallbackProjMat = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
      window.addEventListener('resize', this._onResize.bind(this));
      this._onResize();
      window.requestAnimationFrame(this.options.onWindowFrame);
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

    _onSessionStarted(session) {
      session.addEventListener('end', this._onSessionEnded.bind(this));
      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, this._gl) });
      session.requestReferenceSpace({
        type: 'stationary',
        subtype: 'eye-level'
      }).then((refSpace) => {
        if (session.mode == 'immersive-vr') {
          this._xrImmersiveRefSpace = refSpace;
        } else {
          this._xrNonImmersiveRefSpace = refSpace;
        }
        session.requestAnimationFrame(this.options.onXRFrame);
      });
    }

    _onEndSession(session) {
      session.end();
    }

    _onSessionEnded(event) {
      if (event.session.mode == 'immersive-vr') {
        document.body.removeChild(this._immersiveCanvas);
        this._xrButton.setSession(null);
      }
    }

    _onXRFrame(t, frame) {
      let session = frame.session;
      let refSpace = session.mode == 'immersive-vr' ?
      this._xrImmersiveRefSpace : this._xrNonImmersiveRefSpace;
      let pose = frame.getViewerPose(refSpace);
      session.requestAnimationFrame(this.options.onXRFrame);
      if (pose) {
        let glLayer = session.renderState.baseLayer;
        this._gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
        this.options.onStartFrame(t);
        for (let view of pose.views) {
          let viewport = glLayer.getViewport(view);
          this._gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
          this.options.onDraw(view.projectionMatrix, view.viewMatrix);
        }
        this.options.onEndFrame();
      }
    }

    _onWindowFrame(t) {
      window.requestAnimationFrame(this.options.onWindowFrame);
      this.options.onStartFrame(t);
      this.options.onDraw(this._fallbackProjMat, this._fallbackViewMat);
      this.options.onEndFrame();
    }

    get canvas() { return this._canvas; }
    get gl() { return this._gl; }
    get version() { return this._version; }
  }

  return XRBasicCanvasWrangler;
})();