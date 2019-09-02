"use strict";

function Metaroom() {
  this.worldIdx = 0;
  this.worlds = [];
}
Metaroom.BACKEND_TYPE = {
  WEBXR: 0,
  WEBVR: 1,
};
Metaroom.TYPE_TO_NAME = {
  [Metaroom.BACKEND_TYPE.WEBXR] : "WebXR",
  [Metaroom.BACKEND_TYPE.WEBVR] : "WebVR",
};

Metaroom.prototype = {
  registerWorld : function(world, idx) {
    if (idx) {
      this.worlds[idx] = world;
    } else {
      this.worlds.push(world);
    }
  }
};

// NGV220 says: we need to document the API boundary of the Metaroom, Metaroom_*, and
// MetaroomBackend (currently 'wrangler').  The passing back-and-forth of worlds, funcs,
// et al is difficult to follow.

function Metaroom_WebXR() {
  //this.type = METAROOM_TYPES.WEBXR;
  //this.wrangler = new XRCanvasWrangler();

  //this.worldIdx = 0;
  //this.MR.worlds = [];

  Metaroom.call(this);

  // TODO(KTR): temp still make the global var wrangler, but
  // considering making the wrangler a component of the full MetaRoom struct,
  // and separating the animation handling from the canvas wrangling
  window.wrangler = this.wrangler;
  window.MR = this;
}
Metaroom_WebXR.prototype = Object.create(
  Metaroom.prototype,
  {
    type : {value : Metaroom.BACKEND_TYPE.WEBXR},
    wrangler : {value : new XRCanvasWrangler()},
  }
);

// Metaroom impl using WebVR backend.  See `js/webxr-wrangler.js` for
// details. 
function Metaroom_WebVR() {
  Metaroom.call(this);
  window.wrangler = this.wrangler;
  window.MR = this;
}
Metaroom_WebVR.prototype = Object.create(
  Metaroom.prototype,
  {
    type : {value : Metaroom.BACKEND_TYPE.WEBVR},
    wrangler : {value : new VRCanvasWrangler()},
  }
);

Metaroom.create = function(type = Metaroom.BACKEND_TYPE.WEBXR) {
  this.type = type;
  switch (type) {
  case Metaroom.BACKEND_TYPE.WEBXR: {
    return new Metaroom_WebXR();
    break;
  } case Metaroom.BACKEND_TYPE.WEBVR: {
    return new Metaroom_WebVR();
    break;
  } default: {
    console.error("ERROR: unsupported type");
    break;
  }
  }
}

// Argument defaults
let type = Metaroom.BACKEND_TYPE.WEBVR;

// Parse URL arguments
var urlParams = new URLSearchParams(window.location.search);

// (1) useShim - when present and set to '1', applies the WebXR version
//     shim.  This will become unnecessary once the WebXR becomes stable. 
if (urlParams.has('useShim') && urlParams.get('useShim') == '1') {
    const shim = new WebXRVersionShim();
}
// (2) mrBackend - specify the Metaroom backend type.  Valid options are
//     '0' for WebXR and '1' for WebVR (default).
if (urlParams.has('mrBackend')) {
  type = parseInt(urlParams.get('mrBackend'))
}

window.MR = Metaroom.create(type);

let MY_ROOT_PATH = "";
function getPath(path) {
  if (!path || path.length < 1) {
    return;
  }
  if (path.charAt(0) !== '/') {
    path = '/' + path;
  }

  return MY_ROOT_PATH + path;
}
function setPath(path) {
  MY_ROOT_PATH = path;
}

try {

  console.log(
    "wss://127.0.0.1:3001"
  );
  MR.sock = new WebSocket(  
    "ws://127.0.0.1:3001"
  );

  MR.sock.addEventListener('open', () => {
    console.log("websocket connected");
    MR.sock.send(JSON.stringify({
      "message_type": "client_connect",
      "data": {
        "username": "synchronizer"
      }
    }));
  })

  // MR.sock.send(JSON.stringify({
  //   "files" : [{"path", "val"}, {"path", "val"}]
  // }));

  MR.sock.addEventListener('message', (ev) => {
    //console.log(JSON.parse(ev.data));
  });

} catch (err) {
  console.error("cannot connect to socket", err);
}

      class MenuItem {
        constructor (container, className, name, onClick) {
            this.el = document.createElement('li');
            this.button = document.createElement('button');
            this.button.className = className + '_button';
            this.el.appendChild(this.button);
            this.el.setAttribute('class', className);
            this.nameInit = name;
            this.button.innerHTML = name;
            this.className = className;
            this.hiddenClass = className + '--hidden';
            this.el.backgroundColor = "green";

            // Attach listeners, including those for tooltip behavior
            this.button.addEventListener('click', onClick, true);

            if (container) {
                container.appendChild(this.el);
            }
        }

        set name (name) {
            this.button.innerHTML = name;
        }

        hide () {
            this.el.setAttribute('class', this.className + ' ' + this.hiddenClass);
        }

        show () {
            this.el.setAttribute('class', this.className);
        }
      }
      
      class Menu {
        constructor() {
          this.menus = {};
          this.el = document.createElement("ul");
          this.el.setAttribute("id", "menu");
          this.el.setAttribute('class', 'ge_menu_bar');

        //   let main = {autoupdate : false};
        // this.fileInput = document.createElement('input');
        // this.fileInput.setAttribute('type', 'file');
        // this.fileInput.setAttribute('accept', 'text/x-yaml');
        // this.fileInput.style.display = 'none';
        // this.fileInput.addEventListener('change', (event) => {
        //     //main.open(event.target.files[0]);
        // });
        // this.menus.open = new MenuItem(this.el, 'ge_menu', '<i class="material-icons">folder_open</i>  Open', (event) => {
        //     //this.fileInput.click();
        // });

        // // this.menus.autoupdate.button.style.color = main.autoupdate ? 'white' : 'gray';

        // // TEST
        // this.menus.test = new MenuItem(this.el, 'ge_menu', '<i class="material-icons">timeline</i> Test', (event) => {
        //     //main.visualDebugger.check();
        // });

        // // SHARE
        // this.menus.share = new MenuItem(this.el, 'ge_menu', '<i class="material-icons">arrow_upward</i> Export', (event) => {
        //     if (main.change || !this.exportModal) {
        //         //this.exportModal = new ExportModal('ge_export', { main: main, position: 'fixed' });
        //     }

        //     //let bbox = this.menus.share.el.getBoundingClientRect();
        //     //this.exportModal.presentModal(bbox.left - 5, bbox.top + bbox.height + 5);
        // });


        // // AUTOUPDATE
        // this.menus.autoupdate = new MenuItem(this.el, 'ge_menu', ' <i class="material-icons">autorenew</i> Update: ON', (event) => {
        //     if (main.autoupdate) {
        //         main.autoupdate = false;
        //         this.menus.autoupdate.name = '<i class="material-icons">autorenew</i> Update: OFF';
        //         // this.menus.autoupdate.button.style.color = 'gray';
        //     }
        //     else {
        //         main.autoupdate = true;
        //         //main.update();
        //         this.menus.autoupdate.name = '<i class="material-icons">autorenew</i> Update: ON';
        //         // this.menus.autoupdate.button.style.color = 'white';
        //     }
        // });
          document.body.appendChild(this.el);
        }

        addMenuItem(name, callback) {

        }
      }


// Register MR.worlds (in final, probably enough to register the first world before init time and defer the rest until load) 
// TEMP hard-coded