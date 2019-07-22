'use strict';

window.VRCanvasWrangler = (function() {

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
  // Exports
  //

  class VRBasicCanvasWrangler {
    // Empty constructor.
    constructor() {}

    // Initialization.
    init(options) {
      // Set default options.
      options = options || {};
      options.contextOptions = options.contextOptions || { xrCompatible: true };
      options.contextNames = options.contextNames || ['webgl2', 'webgl', 'experimental-webgl'];
      options.main = options.main || function() {};
      options.glDoResourceTracking = options.glDoResourceTracking || true;
      options.glUseGlobalContext = options.glUseGlobalContext || true;
      options.outputSurfaceName = options.outputSurfaceName || 'output-element';
      options.outputWidth = options.outputWidth || 1280;
      options.outputHeight = options.outputHeight || 720;
      options.useCustomState = options.useCustomState || true;

      // Member variables.
      this.options = options;
      this.main = options.main;
      this.glDoResourceTracking = options.glDoResourceTracking;
      this.useCustomState = options.useCustomState;
      this._projectionMatrix = mat4.create();
      this._viewMatrix = mat4.create();
      this._animationHandle = 0;

      // Bound functions
      this.onVRRequestPresent = this._onVRRequestPresent.bind(this);
      this.onVRExitPresent = this._onVRExitPresent.bind(this);
      this.onVRPresentChange = this._onVRPresentChange.bind(this);

      // Uninitialized member variables (see _init()).
      this._parent = null;
      this._canvas = null;
      this._glCanvas = null;
      this._mirrorCanvas = null;
      this._immersiveCanvas = null;
      this._gl = null;
      this._version = null;
      this._button = null;
      this._frameData = null;
      this.customState = null;
      this.persistentStateMap = null;
      this.globalPersistentState = null;

      this._clearConfig();

      this._init();
    }

    start() {
        let target = null;
        if (this._vrDisplay) {
            this._vrDisplay.cancelAnimationFrame(this._animationHandle);
            this._animationHandle = this._vrDisplay.requestAnimationFrame(this.config.onAnimationFrame);
        } else {
            window.cancelAnimationFrame(this._animationHandle);          
            this._animationHandle = window.requestAnimationFrame(this.config.onAnimationFrame);
        }
    }

    beginSetup(options) {
      this.configure(options);
    }

    async configure(options) {

      this._clearConfig();
      this._reset();

      options = options || {};

      options.onStartFrame = options.onStartFrame || (function(t, state) {});
      options.onEndFrame = options.onEndFrame || (function(t) {});
      options.onDraw = options.onDraw || (function(t, p, v, state, eyeIdx) {}); // projMat, viewMat
      options.onAnimationFrame = options.onAnimationFrame || this._onAnimationFrame.bind(this);

      options.onSelectStart = options.onSelectStart || (function(t, state) {});
      options.onSelect = options.onSelect || (function(t, state) {});
      options.onSelectEnd = options.selectEnd || (function(t, state) {});

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
        await options.setup(this.customState, this, this._session);
      }

      this.start();
    }

    //
    // Private member functions (if we can claim such a thing...)
    //

    async _init() {
      this._initButton();
      this._initCanvasOnParentElement();
      this._initCustomState();

      const ctx = GFX.initGLContext(this._canvas, this.options.contextNames, this.options.contextOptions);
      console.assert(ctx.isValid);
      this._gl      = ctx.gl;
      this._version = ctx.version;

      if (this.options.glUseGlobalContext) {
        window.gl = this._gl;
      }
      if (this.options.glDoResourceTracking) {
        this._glAttachResourceTracking();
      }

      const status = await this._initWebVR();
      if (!status) {
        console.log('Initializing fallback ...');
        this._initFallback();
      }

      // After initialization, begin main program
      console.log(this._canvas);
      this._canvas.addEventListener('mousedown', () => { this.config.onSelectStart() });
      this.main();
    }

    _initButton() {
      this._button = new XRDeviceButton({
        onRequestSession: this._onVRRequestPresent.bind(this),
        onEndSession: this._onVRExitPresent.bind(this)
      });
      document.querySelector('body').prepend(this._button.domElement);
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
        const button = this._button;
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

    _initFallback() {
    }

    _clearConfig() {
      this.config = this.config || {};
      const options = this.config;

      options.onStartFrame = (function(t, state) {});
      options.onEndFrame = (function(t, state) {});
      options.onDraw = (function(t, p, v, state, eyeIdx) {});
      options.onAnimationFrame = this._onAnimationFrame.bind(this);
      //options.onWindowFrame = this._onWindowFrame.bind(this);

      // selection
      options.onSelectStart = (function(t, state) {});
      options.onSelect = (function(t, state) {});
      options.onSelectEnd = (function(t, state) {});
    }

    _reset() {
      if (this._vrDisplay) {
        this._vrDisplay.cancelAnimationFrame(this._animationHandle);
      } else {
        window.cancelAnimationFrame(this._animationHandle);
      }


    }

    _onVRRequestPresent () {
      // This can only be called in response to a user gesture.
      this._vrDisplay.requestPresent([{ source: this._canvas }]).then(function () {
        // Nothing to do because we're handling things in onVRPresentChange.
      }, function (err) {
        console.error(err);
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
    }

    _onAnimationFrame(t) {
      let gl = this._gl;
      let vrDisplay = this._vrDisplay;
      let frame = this._frameData;

      if (vrDisplay) {

        vrDisplay.getFrameData(frame);
        if (vrDisplay.isPresenting) {

          this._animationHandle = vrDisplay.requestAnimationFrame(this.config.onAnimationFrame);

          this.config.onStartFrame(t, this.customState);

          gl.viewport(0, 0, gl.canvas.width * 0.5, gl.canvas.height);
          this.config.onDraw(t, frame.leftProjectionMatrix, frame.leftViewMatrix, this.customState);
          gl.viewport(gl.canvas.width * 0.5, 0, gl.canvas.width * 0.5, gl.canvas.height);
          this.config.onDraw(t, frame.rightProjectionMatrix, frame.rightViewMatrix, this.customState);

          this.config.onEndFrame(t);

          vrDisplay.submitFrame();

        } else {
          this._animationHandle = window.requestAnimationFrame(this.config.onAnimationFrame);
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          mat4.identity(this._viewMatrix);
          mat4.perspective(this._projectionMatrix, Math.PI/4,
            gl.canvas.width / gl.canvas.height,
            0.01, 1024);

          this.config.onStartFrame(t, this.customState);
          this.config.onDraw(t, this._projectionMatrix, this._viewMatrix, this.customState);
          this.config.onEndFrame(t);
        }

      } else {
        this._animationHandle = window.requestAnimationFrame(this.config.onAnimationFrame);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        mat4.identity(this._viewMatrix);
        mat4.perspective(this._projectionMatrix, Math.PI/4,
          gl.canvas.width / gl.canvas.height,
          0.01, 1024);

        this.config.onStartFrame(t, this.customState);
        this.config.onDraw(t, this._projectionMatrix, this._viewMatrix, this.customState);
        this.config.onEndFrame(t);

      }
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
          //console.log("calling " + funcName);

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

      //console.log("Cleaning graphics context:");


      const GL = this._gl;

      GL.disable(gl.CULL_FACE);
      GL.disable(gl.DEPTH_TEST);
      GL.disable(gl.BLEND);

      // (KTR) TODO: may be more to delete / unbind for WebGL 2

      //console.log("-unbinding texture units ...");
      const maxTextureUnitCount = GL.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS);
      for (let unit = 0; unit < maxTextureUnitCount; unit += 1) {
        GL.activeTexture(GL.TEXTURE0 + unit);
        GL.bindTexture(GL.TEXTURE_2D, null);
        GL.bindTexture(GL.TEXTURE_CUBE_MAP, null);
      }

      // unbind all binding points
      //console.log("-unbinding buffers ...");
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
        GL.bindVertexArray(null);
      }

      // free resources
      //console.log("-freeing resources ...");
      const Q = this.deletionQueue;
      const len = Q.length;
      for (let i = 0; i < len; i += 1) {
        const deletionProc = Q.pop();
        deletionProc();
      }

      // clear attributes
      //console.log("-clearing attributes ...");
      const tempBuf = GL._createBuffer();
      GL.bindBuffer(GL.ARRAY_BUFFER, tempBuf);
      const maxAttributeCount = GL.getParameter(GL.MAX_VERTEX_ATTRIBS);
      for (let a = 0; a < maxAttributeCount; a += 1) {
        GL.vertexAttribPointer(a, 1, GL.FLOAT, false, 0, 0);
      }
      GL.deleteBuffer(tempBuf);
      //console.log("Done!");
    }
  };

  return VRBasicCanvasWrangler;
})();