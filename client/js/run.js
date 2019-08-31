"use strict";

import {MREditor} from "./lib/mreditor.js";

window.MREditor = MREditor;

  // const editorDiv = document.createElement('div');
  // editorDiv.setAttribute('class', 'ge_editor');

  // document.body.appendChild(editorDiv);

  // const editor = CodeMirror(editorDiv, {
  //   lineNumbers: true,
  //   keyMap: 'sublime',
  //   theme:  "monokai",
  //   mode:   'x-shader/x-fragment',
  //   showCursorWhenSelecting: true,
  //   lineWrapping: true,
  //   autofocus: false
  // });

  // editor.setOption("extraKeys", {
  //   Tab: function(cm){cm.replaceSelection("    ");},
  //   Enter: function(cm){cm.replaceSelection("\n");}
  // });


  const parent = document.getElementById('output-container');
  parent.float = 'right';
  window.P = parent;
  const out = document.getElementById('output-element');
  out.style.position = 'relative';
  out.style.float = 'right';

  window.CN = out;

  window.offsetX = 0;
  window.offsetY = 0;
  let shiftX = 0;
  let shiftY = 0;

  window.addEventListener('scroll', function ( event ) {
    let curr = parseInt(P.style.top);

    P.style.top = "" + (window.scrollY + shiftY) + "px";
    P.style.left = "" + (window.scrollX + shiftX) + "px";

  });

  let shiftDown__ = false;
  let clientX = 0;
  let clientY = 0;


  const mouseMoveHandler__ = function(event) {
    const doc = document;
    const body = document.body;
    
    let pageX = event.clientX +
      (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
      (doc && doc.clientLeft || body && body.clientLeft || 0);
    let pageY = event.clientY +
      (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
      (doc && doc.clientTop  || body && body.clientTop  || 0 );

    const w = MR.wrangler._canvas.clientWidth;
    const h = MR.wrangler._canvas.clientHeight;

    let prevLeft = parseInt(P.style.left);
    let prevTop = parseInt(P.style.top);

    let nextLeft = (pageX - (w / 2.0));
    let nextTop = (pageY - (h / 2.0));

    P.style.left = "" + (window.scrollX + nextLeft) + "px";
    P.style.top   = "" + (window.scrollY + nextTop) + "px";

    shiftX = nextLeft;
    shiftY = nextTop;
  };

  window.addEventListener('mousemove', function(event) {
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






function treq(data) {
  fetch("/world_transition", {
      method: "POST",
      body: JSON.stringify(data),         
      headers: {
        'Content-Type': 'application/json',
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      mode: 'cors'
  }).then(res => res.json()).then(parsed => {
      console.log(parsed);
  }).error(err => {
      console.error(err);
  });
}
window.treq = treq;

db.initLoggerSystem({
  logger : new db.LoggerDefault()
});

const VERSION = document.getElementById("version").getAttribute("value");
switch (VERSION) {
case 1: {
}
default: {
  console.log("running version:", VERSION);
  MR.wrangler.init({
    outputSurfaceName      : 'output-element',
    outputWidth            : 1280,
    outputHeight           : 720,
    glUseGlobalContext     : true,
    // frees gl resources upon world switch
    glDoResourceTracking   : true,
    glEnableEditorHook     : true,
    enableMultipleWorlds   : true,
    enableEntryByButton    : true,
    enableBellsAndWhistles : false,
    // main() is the system's entry point
    main : async () => {

      console.log(MREditor);
      MREditor.enable();

      MREditor.init({
        defaultShaderCompilationFunction : MREditor.onNeedsCompilationDefault,
        //externalWindowGetter : function() { return MR.wrangler.externalWindow; }
      });

      let sourceFiles = document.getElementsByClassName("worlds");

      function getLocalPath(path) {
          let slashIdx = path.lastIndexOf('/');
          if (slashIdx === -1) {
              slashIdx = path.lastIndexOf('\\');
          }

          return path.substring(0, slashIdx);
      }
      
      // call the main function of the selected world
      if (MR.wrangler.options.enableMultipleWorlds) {

        try {

          let worldIt = sourceFiles[0].firstElementChild;

          while (worldIt !== null) {
            const src = worldIt.src;

            // TODO consider using explicit Promises
            const world     = await import(src);
            const localPath = getLocalPath(src)

            MR.worlds.push({world : world, localPath : localPath});

            worldIt = worldIt.nextElementSibling;
          }

          const worldInfo = MR.worlds[MR.worldIdx];
          setPath(worldInfo.localPath);

          MR.wrangler.beginSetup(worldInfo.world.default());

          console.log(MR.worlds);

        } catch (err) {
          console.error(err);
        }

      } else {
        try {
          
          const src  = sourceFiles[0].firstElementChild.src;
          setPath(getLocalPath(src));

          const world = await import(src);
          MR.wrangler.beginSetup(world.default());

        } catch (err) {
          console.error(err);
        }
      }

      // this is just a temporary function
      wrangler.simulateWorldTransition = function() {
        let ok = false;

        // try to transition to the next world
        while (!ok) {
          MR.worldIdx = (MR.worldIdx + 1) % MR.worlds.length;

          console.log("transitioning to world: [" + MR.worldIdx + "]");

          // TODO(KTR): TEMP, the wrangler will handle these lines
          gl.useProgram(null);
          MR.wrangler._reset();
          MR.wrangler._glFreeResources();
          //

          try {
            // call the main function of the selected world

            MREditor.resetState();

            let hadError = false;

            const worldInfo = MR.worlds[MR.worldIdx];
            setPath(worldInfo.localPath);

            MR.wrangler.beginSetup(worldInfo.world.default()).catch((e) => {
                console.error(e);
                wrangler.simulateWorldTransition();
            });

            ok = true;

          } catch (e) {
            console.error(e);


            setTimeout(function(){ 
              console.log("Trying another world");
            }, 2000);

            // TODO(KTR) some sort of shader animation to indicate error?
          }
        }
      }
    },
    useExternalWindow : (new URLSearchParams(window.location.search)).has('externWin')
  });

  break;
}
}
