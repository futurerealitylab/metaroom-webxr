'use strict';

window.VRCanvasWrangler = (function() {

  // temporary hard-coded shim for matrix operations
  const mat4 = {};
  mat4.create = function() {
    return new Float32Array(16);
  }
  mat4.identity = function(t) {
    t.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }
  mat4.perspective = function perspective(t,e,n,r,a){var c=1/Math.tan(e/2),i=1/(r-a);return t[0]=c/n,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=c,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=(a+r)*i,t[11]=-1,t[12]=0,t[13]=0,t[14]=2*a*r*i,t[15]=0,t}

  class VRBasicCanvasWrangler {
    // Empty constructor.
    constructor() {}

    // Initialization.
    init(options) {

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
      options.glDoResourceTracking = options.glDoResourceTracking || true;
      options.glUseGlobalContext = options.glUseGlobalContext || true;
      options.outputSurfaceName = options.outputSurfaceName || 'output-element';
      options.outputWidth = options.outputWidth || 1280;
      options.outputHeight = options.outputHeight || 720;
      options.useCustomState = options.useCustomState || true;
      options.enableEntryByButton    = (options.enableEntryByButton !== undefined)    ? options.enableEntryByButton    : true;
      options.enableMultipleWorlds   = (options.enableMultipleWorlds !== undefined)   ? options.enableMultipleWorlds   : true;
      options.enableBellsAndWhistles = (options.enableBellsAndWhistles !== undefined) ? options.enableBellsAndWhistles : true;
      // Member variables.
      this.options = options;
      this.main = options.main;
      this.glDoResourceTracking = options.glDoResourceTracking;
      this.useCustomState = options.useCustomState;
      this._projectionMatrix = mat4.create();
      this._viewMatrix = mat4.create();
      this._animationHandle = 0;

      this.buttonsCache = [];

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
        if (this._vrDisplay && this.options.enableBellsAndWhistles) {
            this._vrDisplay.cancelAnimationFrame(this._animationHandle);
            this._animationHandle = this._vrDisplay.requestAnimationFrame(this.config.onAnimationFrame);
        } else {
            window.cancelAnimationFrame(this._animationHandle);          
            this._animationHandle = window.requestAnimationFrame(this.config.onAnimationFrame);
        }
    }

    async beginSetup(options) {
      return this.configure(options);
    }

    async configure(options) {

      this._clearConfig();
      this._reset();

      options = options || {};

      options.onStartFrame = options.onStartFrame || (function(t, state) {});
      options.onEndFrame = options.onEndFrame || (function(t) {});
      options.onDraw = options.onDraw || (function(t, p, v, state, eyeIdx) {}); // projMat, viewMat
      options.onAnimationFrame = options.onAnimationFrame || this._onAnimationFrame.bind(this);
      options.onAnimationFrameWindow = options.onAnimationFrameWindow || this._onAnimationFrameWindow.bind(this);
      options.onSelectStart = options.onSelectStart || function(t, state) {};

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

      this.timeStart = 0;

      if (this.options.enableBellsAndWhistles) {
        const status = await this._initWebVR();
        if (!status) {
          console.log('Initializing PC browser mode ...');
          this._initFallback();
        }
      } else {
          console.log('Initializing PC browser mode ...');
          this._initFallback();        
      }
      this.main();
    }

    _initButton() {
      if (this.options.enableBellsAndWhistles && this.options.enableEntryByButton) {
        this._button = new XRDeviceButton({
          onRequestSession: this._onVRRequestPresent.bind(this),
          onEndSession: this._onVRExitPresent.bind(this)
        });
        document.querySelector('body').prepend(this._button.domElement);
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

    defineWorldTransitionProcedure(fn) {
      this.doWorldTransition = fn.bind(this);
    }

    _initFallback() {
        this.menu = new Menu();
        if (this.options.enableMultipleWorlds) {
          this.menu.menus.transition = new MenuItem(
            this.menu.el, 
            'ge_menu', 
            'Prev',
            () => { MR.wrangler.doWorldTransition(-1); }
          );
          this.menu.menus.transition = new MenuItem(
            this.menu.el, 
            'ge_menu', 
            'Next',
            () => { return MR.wrangler.doWorldTransition(+1); }
          );
        }

      const modalCanvasInit = () => {
          const bodyWidth = document.body.getBoundingClientRect().width;
          const parent = document.getElementById('output-container');
          parent.float = 'right';
          let P = parent;
          P.style.left = (((P.style.left) + bodyWidth - this._canvas.clientWidth)) + "px";

          const out = document.getElementById('output-element');
          out.style.position = 'relative';
          out.style.float = 'right';

          let shiftX = parseInt(P.style.left);
          let shiftY = 0;

          let shiftDown__ = false;
          let mouseDown__ = false;
          let clientX = 0;
          let clientY = 0;

          // window.addEventListener('scroll', function ( event ) {
          //   return;
          //   let curr = parseInt(P.style.top);

          //   P.style.top = "" + (window.scrollY + shiftY) + "px";
          //   P.style.left = "" + (window.scrollX + shiftX) + "px";

          // });



          const mouseMoveHandler__ = function(event) {
            const w = MR.wrangler._canvas.clientWidth;
            const h = MR.wrangler._canvas.clientHeight;
            P.style.left = (clientX - (w / 2.0)) + "px";
            P.style.top = (clientY - (h / 2.0)) + "px";
            // const doc = document;
            // const body = document.body;
            
            // let pageX = event.clientX +
            //   (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
            //   (doc && doc.clientLeft || body && body.clientLeft || 0);
            // let pageY = event.clientY +
            //   (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
            //   (doc && doc.clientTop  || body && body.clientTop  || 0 );



            // let prevLeft = parseInt(P.style.left);
            // let prevTop = parseInt(P.style.top);

            // let nextLeft = (pageX - (w / 2.0));
            // let nextTop = (pageY - (h / 2.0));

            // P.style.left = "" + (window.scrollX + nextLeft) + "px";
            // P.style.top   = "" + (window.scrollY + nextTop) + "px";

            // shiftX = nextLeft;
            // shiftY = nextTop;
          };

          window.addEventListener('mousemove', (event) => {
            clientX = event.clientX;
            clientY = event.clientY;
          });
          window.addEventListener('mousedown', (event) => {
            clientX = event.clientX;
            clientY = event.clientY;
          });
          window.addEventListener('mouseup', (event) => {
            clientX = event.clientX;
            clientY = event.clientY;
          });
          window.addEventListener('keydown', function (event) {
            if (event.key == "`") {
              window.addEventListener('mousemove', mouseMoveHandler__);
              shiftDown__ = true;
              mouseMoveHandler__({clientX : clientX, clientY : clientY});
            }
          });
          window.addEventListener('keyup', function (event) {
            if (event.key == "`") {
              window.removeEventListener('mousemove', mouseMoveHandler__);
              shiftDown__ = false;
            }
          });
        }
        modalCanvasInit();

      this.keyboardEventCallback = (ev) => {

        if (ev.key === 'Alt') {
          if (this._canvas.width !== this.options.outputWidth) {
            this._canvas.width = this.options.outputWidth;
            this._canvas.height = this.options.outputHeight;
          } else {
            CanvasUtil.resizeToDisplaySize(this._canvas, 0.22);
          }          
        }
      }

      document.addEventListener('keyup', (ev) => {
          this.keyboardEventCallback(ev);

          return false;
      }, false);
    }

    _clearConfig() {
      this.config = this.config || {};
      const options = this.config;

      options.onStartFrame = (function(t, state) {});
      options.onEndFrame = (function(t, state) {});
      options.onDraw = (function(t, p, v, state, eyeIdx) {});
      options.onAnimationFrame = this._onAnimationFrame.bind(this);
      options.onAnimationFrameWindow = this._onAnimationFrameWindow.bind(this);
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

    _onFrameXR(t) {
    }

    _onAnimationFrameWindow(t) {
        this.time = t / 1000.0;
        this.timeMS = t;

        this._animationHandle = window.requestAnimationFrame(this.config.onAnimationFrame);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        mat4.identity(this._viewMatrix);
        mat4.perspective(this._projectionMatrix, Math.PI/4,
          gl.canvas.width / gl.canvas.height,
          0.01, 1024);

        this.config.onStartFrame(t, this.customState);

        GFX.viewportXOffset = 0;
        this.config.onDraw(t, this._projectionMatrix, this._viewMatrix, this.customState);
        this.config.onEndFrame(t);
    }

    _onAnimationFrame(t) {
        this.time = t / 1000.0;
        this.timeMS = t;

        // For now, all VR gamepad button presses trigger a world transition.

        let gamepads = navigator.getGamepads();
        let vrGamepadCount = 0;
        let doTransition = false;
        for (var i = 0; i < gamepads.length; ++i) {
          var gamepad = gamepads[i];
          if (gamepad) { // gamepads may contain null-valued entries (eek!)
            if (gamepad.pose || gamepad.displayId ) { // VR gamepads will have one or both of these properties.
              var cache = this.buttonsCache[vrGamepadCount] || [];
              for (var j = 0; j < gamepad.buttons.length; j++) {

                // Check for any buttons that are pressed and previously were not.

                if (cache[j] != null && !cache[j] && gamepad.buttons[j].pressed) {
                  console.log('pressed gamepad', i, 'button', j);
                  doTransition = true;
                }
                cache[j] = gamepad.buttons[j].pressed;
              }
              this.buttonsCache[vrGamepadCount] = cache;
              vrGamepadCount++;
            }
          }
        }

        // revert to windowed rendering if there is no VR display
        // or if the VR display is not presenting
        const vrDisplay = this._vrDisplay;
        if (!vrDisplay) {
            this.config.onAnimationFrameWindow(t);
            if (this.options.enableMultipleWorlds && doTransition) {
               this.doWorldTransition();
            }
            return;
        }

        const gl = this._gl;
        const frame = this._frameData;
        if (!vrDisplay.isPresenting) {
            this.config.onAnimationFrameWindow(t);
            if (this.options.enableMultipleWorlds && doTransition) {
               this.doWorldTransition();
            }
            return;
        }
        vrDisplay.getFrameData(frame);

        this._animationHandle = vrDisplay.requestAnimationFrame(this.config.onAnimationFrame);
        this.config.onStartFrame(t, this.customState);
        {
            // left eye
            gl.viewport(0, 0, gl.canvas.width * 0.5, gl.canvas.height);
            GFX.viewportXOffset = 0;
            this.config.onDraw(t, frame.leftProjectionMatrix, frame.leftViewMatrix, this.customState);
            
            // right eye
            gl.viewport(gl.canvas.width * 0.5, 0, gl.canvas.width * 0.5, gl.canvas.height);
            GFX.viewportXOffset = gl.canvas.width * 0.5;
            this.config.onDraw(t, frame.rightProjectionMatrix, frame.rightViewMatrix, this.customState);
        }
        this.config.onEndFrame(t);
        if (this.options.enableMultipleWorlds && doTransition) {
           this.doWorldTransition();
        }

        vrDisplay.submitFrame();
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
    
    };

  return VRBasicCanvasWrangler;
})();