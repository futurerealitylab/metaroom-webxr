"use strict";

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
    _clearConfig() {
      this.config = this.config || {};
      const options = this.config;

      options.onStartFrame = (function(t) {});
      options.onEndFrame = (function(t) {});
      options.onDraw = (function(t, p, v) {});
      options.onXRFrame = this._onXRFrame.bind(this);
      options.onWindowFrame = this._onWindowFrame.bind(this);

      // selection
      options.onSelectStart = (function(t, state) {});
      options.onSelect = (function(t, state) {});
      options.onSelectEnd = (function(t, state) {});
    }

    configure(options) {
      this._clearConfig();
      this._reset();
      
      options = options || {};
      this.config = options;

      options.onStartFrame = options.onStartFrame || (function(t) {});
      options.onEndFrame = options.onEndFrame || (function(t) {});
      options.onDraw = options.onDraw || (function(t, p, v) {}); // projMat, viewMat
      options.onXRFrame = options.onXRFrame || this._onXRFrame.bind(this);
      options.onWindowFrame = options.onWindowFrame || this._onWindowFrame.bind(this);

        this._canvas.removeEventListener('mousedown', this.config.onSelectStart);

        this._canvas.addEventListener('mousedown', this.config.onSelectStart);


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
            this.options.outputWidth || 400,
            this.options.outputHeight || 400
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

        this._presentCanvas = this._canvas;
        let ctx = this._presentCanvas.getContext('xrpresent');
        navigator.xr.requestSession({ outputContext: ctx }).then((session) => {
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


        console.log("adding event listeners");

        this._session.removeEventListener('selectstart', this.config.onSelectStart);
        this._session.removeEventListener('select', this.config.onSelect);
        this._session.removeEventListener('selectend', this.config.onSelectEnd);

        this._session.addEventListener('selectstart', this.config.onSelectStart);
        this._session.addEventListener('select', this.config.onSelect);
        this._session.addEventListener('selectend', this.config.onSelectEnd);
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

      // (KTR) TODO let the user pass around some state between functions
      // instead of using globals (if they so choose)
      if (this.config.customState) {
        this._customState = this.config.customState;
      }

      // (KTR) TODO give user the ability to do add event listeners or other objects 
      // before the session starts, as well as do any other initialization of
      // their custom state
      if (this.config.setup) {
        this.config.setup(this._customState, this, this._session);
      }

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

        {
          const mat = this._fallbackViewMat;
          mat[0]  = 1; mat[1]  = 0; mat[2]  = 0; mat[3]  = 0;
          mat[4]  = 0; mat[5]  = 1; mat[6]  = 0; mat[7]  = 0;
          mat[8]  = 0; mat[9]  = 0; mat[10] = 1; mat[11] = 0;
          mat[12] = 0; mat[13] = 0; mat[14] = 0; mat[15] = 1;
        }
        {
          const mat = this._fallbackProjMat;
          mat[0]  = 1; mat[1]  = 0; mat[2]  = 0; mat[3]  = 0;
          mat[4]  = 0; mat[5]  = 1; mat[6]  = 0; mat[7]  = 0;
          mat[8]  = 0; mat[9]  = 0; mat[10] = 1; mat[11] = 0;
          mat[12] = 0; mat[13] = 0; mat[14] = 0; mat[15] = 1;
        }

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

    _onXRFrame(t, frame) {
      const session = frame.session;
      const refSpace = session.mode == 'immersive-vr' ?
                      this._xrImmersiveRefSpace : this._xrNonImmersiveRefSpace;
      const pose = frame.getViewerPose(refSpace);
      this.animationHandle = session.requestAnimationFrame(this.config.onXRFrame);
      if (pose) {
        const glLayer = session.renderState.baseLayer;
        this._gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer); // TODO make this bind optional
        this.config.onStartFrame(t);
        let i = 0;
        for (let view of pose.views) {
          const viewport = glLayer.getViewport(view);
          this._gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
          this.config.onDraw(t, view.projectionMatrix, view.viewMatrix, i);
          i += 1;
        }
        this.config.onEndFrame(t);
      }
      else {
        console.log("no pose");
      }
    }

    _onWindowFrame(t) {
      this.animationHandle = window.requestAnimationFrame(this.config.onWindowFrame);
      this.config.onStartFrame(t);
      this.config.onDraw(t, this._fallbackProjMat, this._fallbackViewMat);
      this.config.onEndFrame(t);
    }

    _glAttachResourceTracking() {
      if (!this.glDoResourceTracking) {
        return;
      }

      const GL = this._gl;

      let funcNames = null;
      let deleteFuncNames = null;
      GL.deletionProcMap = new Map();

      if (this._version = 'webgl2') {
      /* WebGL2
      createBuffer: ƒ createBuffer()
      createFramebuffer: ƒ createFramebuffer()
      createProgram: ƒ createProgram()
      createQuery: ƒ createQuery()
      createRenderbuffer: ƒ createRenderbuffer()
      createSampler: ƒ createSampler()
      createShader: ƒ createShader()
      createTexture: ƒ createTexture()
      createTransformFeedback: ƒ createTransformFeedback()
      createVertexArray: ƒ createVertexArray()
      */

        funcNames = [
          'createBuffer',
          'createFramebuffer',
          'createProgram',
          'createQuery',
          'createRenderbuffer',
          'createSampler',
          'createShader',
          'createTexture',
          'createTransformFeedback',
          'createVertexArray'
        ];

        deleteFuncNames = [
          'deleteBuffer',
          'deleteFramebuffer',
          'deleteProgram',
          'deleteQuery',
          'deleteRenderbuffer',
          'deleteSampler',
          'deleteShader',
          'deleteTexture',
          'deleteTransformFeedback',
          'deleteVertexArray'
        ];

        for (let i = 0; i < funcNames.length; i += 1) {
          GL.deletionProcMap.set(funcNames[i], deleteFuncNames[i]);
        }

      }
      else {

      /* WebGL1
      createBuffer: ƒ createBuffer()
      createFramebuffer: ƒ createFramebuffer()
      createProgram: ƒ createProgram()
      createRenderbuffer: ƒ createRenderbuffer()
      createShader: ƒ createShader()
      createTexture: ƒ createTexture()
      */

        funcNames = [
          'createBuffer',
          'createFramebuffer',
          'createProgram',
          'createRenderbuffer',
          'createShader',
          'createTexture'
        ];

        deleteFuncNames = [
          'deleteBuffer',
          'deleteFramebuffer',
          'deleteProgram',
          'deleteRenderbuffer',
          'deleteShader',
          'deleteTexture'
        ];

        for (let i = 0; i < funcNames.length; i += 1) {
          GL.deletionProcMap.set(funcNames[i], deleteFuncNames[i]);
        }

      }

      const len = funcNames.length;

      const self = this;
      this.deletionQueue = [];

      for (let i = 0; i < len; i += 1) {
        const funcName = funcNames[i];
        GL['_' + funcName] = GL[funcName];
        GL[funcName] = function(arg) {
          //console.log("calling wrapper for: ");
          console.log(GL['_' + funcName]);

          const out = GL['_' + funcName](arg);

          self.deletionQueue.push(function() {
            //console.log("freeing resource created with: " + funcName);
            GL[GL.deletionProcMap.get(funcName)](out);
          });

          return out;

        }.bind(GL);
      }

    }

    _glFreeResources() {
      if (!this.glDoResourceTracking) {
        return;
      }

      console.log("freeing resources");


      const GL = this._gl;

      // (KTR) TODO: may be more to delete / unbind for WebGL 2

      const maxTextureUnitCount = GL.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS);
      for (let unit = 0; unit < maxTextureUnitCount; unit += 1) {
        GL.activeTexture(GL.TEXTURE0 + unit);
        GL.bindTexture(GL.TEXTURE_2D, null);
        GL.bindTexture(GL.TEXTURE_CUBE_MAP, null);
      }

      // unbind all binding points
      GL.bindBuffer(GL.ARRAY_BUFFER, null);
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null)
      GL.bindRenderbuffer(GL.RENDERBUFFER, null);
      GL.bindFramebuffer(GL.FRAMEBUFFER, null);

      if (this._version = 'webgl2') {
        GL.bindBuffer(GL.COPY_READ_BUFFER, null);
        GL.bindBuffer(GL.COPY_WRITE_BUFFER, null);
        GL.bindBuffer(GL.TRANSFORM_FEEDBACK_BUFFER, null);
        GL.bindBuffer(GL.UNIFORM_BUFFER, null);
        GL.bindBuffer(GL.PIXEL_PACK_BUFFER, null);
        GL.bindBuffer(GL.PIXEL_UNPACK_BUFFER, null);
      }

      // free resources
      const Q = this.deletionQueue;
      const len = Q.length;
      for (let i = 0; i < len; i += 1) {
        const deletionProc = Q.pop();
        deletionProc();
      }

      // clear attributes
      const tempBuf = GL._createBuffer();
      GL.bindBuffer(GL.ARRAY_BUFFER, tempBuf);
      const maxAttributeCount = GL.getParameter(GL.MAX_VERTEX_ATTRIBS);
      for (let a = 0; a < maxAttributeCount; a += 1) {
        GL.vertexAttribPointer(a, 1, GL.FLOAT, false, 0, 0);
      }
      GL.deleteBuffer(tempBuf);
    }

    get canvas() { return this._canvas; }
    get gl() { return this._gl; }
    get version() { return this._version; }
    get session() { return this._session; }
  }

  return XRBasicCanvasWrangler;
})();


