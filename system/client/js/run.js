"use strict";

import {MREditor} from "./lib/mreditor.js";

window.MREditor = MREditor;

// const codemirror = false;
// if (codemirror) {
//   const editorDiv = document.createElement('div');
//   editorDiv.setAttribute('class', 'ge_editor');

//   document.body.prepend(editorDiv);

//   window.editor = CodeMirror(editorDiv, {
//     lineNumbers: true,
//     keyMap: 'sublime',
//     theme:  "monokai",
//     mode:   'x-shader/x-fragment',
//     showCursorWhenSelecting: true,
//     lineWrapping: true,
//     autofocus: false
//   });


//   window.editor.setOption("extraKeys", {
//     Tab: function(cm){cm.replaceSelection("    ");},
//     Enter: function(cm){cm.replaceSelection("\n");},
//     '`': function(cm) {},
//   });
// }

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

// db.initLoggerSystem({
//   logger : new db.LoggerDefault()
// });

const VERSION = document.getElementById("version").getAttribute("value");
switch (VERSION) {
case 1: {
  MREditor.VERSION = VERSION;
}
default: {
  console.log("running version:", VERSION);

  const RESOLUTION = document.getElementById("resolution").getAttribute("value").split(',');
  MR.wrangler.init({
    outputSurfaceName      : 'output-element',
    outputWidth            : parseInt(RESOLUTION[0]),
    outputHeight           : parseInt(RESOLUTION[1]),
    glUseGlobalContext     : true,
    // frees gl resources upon world switch
    glDoResourceTracking   : true,
    glEnableEditorHook     : true,
    enableMultipleWorlds   : false,
    enableEntryByButton    : true,
    enableBellsAndWhistles : false,
    // main() is the system's entry point
    main : async () => {

      MREditor.enable();

      MREditor.init({
        defaultShaderCompilationFunction : MREditor.onNeedsCompilationDefault,
        //externalWindowGetter : function() { return MR.wrangler.externalWindow; }
      });

      MREditor.detectFeatures();

      // MR.server.subs.subscribeOneShot("Echo", () => {
      //   let callbacks = MR.wrangler.menu.instaniateServerDependentMenuArray;
      //   let callbackCount = callbacks.length;
      //   for (let i = 0; i < callbackCount; i += 1) {
      //     callbacks[i]();
      //   }
      // });
      // try {
      //   MR.server.echo("Server is active");
      // } catch (err) {
      //   console.error(err);
      // }

      let sourceFiles = document.getElementsByClassName("worlds");
      
      // call the main function of the selected world
      if (MR.wrangler.options.enableMultipleWorlds) {

        try {

          let worldIt = sourceFiles[0].firstElementChild;

          while (worldIt !== null) {
            const src = worldIt.src;

            const world     = await import(src);
            const localPath = getCurrentPath(src)


            MR.worlds.push({world : world, localPath : localPath});

            worldIt = worldIt.nextElementSibling;
          }

          const worldInfo = MR.worlds[MR.worldIdx];
          setPath(worldInfo.localPath);

          MR.wrangler.beginSetup(worldInfo.world.default()).catch(err => {
              console.error(err);
              MR.wrangler.doWorldTransition();
          });

        } catch (err) {
          console.error(err);
        }

      } else {
        try {
          
          const src  = sourceFiles[0].firstElementChild.src;
          setPath(getCurrentPath(src));

          const world = await import(src);
          MR.wrangler.configure(world.default()).catch(err => {
              console.error(err.message);
          });
        } catch (err) {
          console.error(err);
        }
      }

      wrangler.defineWorldTransitionProcedure(function(direction=+1) {
        let ok = false;

        // try to transition to the next world
        while (!ok) {
          MR.worldIdx = (MR.worldIdx + direction) % MR.worlds.length;
          if (MR.worldIdx < 0) {
            MR.worldIdx = MR.worlds.length - 1;
          }

          console.log("transitioning to world: [" + MR.worldIdx + "]");

          // TODO(KTR): TEMP, the wrangler could handle these lines
          gl.useProgram(null);
          MR.wrangler._reset();
          MR.wrangler._glFreeResources();
          //

          try {
            // call the main function of the selected world
            MR.server.subsLocal = new ServerPublishSubscribe();
            MREditor.resetState();
            

            let hadError = false;

            const worldInfo = MR.worlds[MR.worldIdx];
            setPath(worldInfo.localPath);

            MR.wrangler.beginSetup(worldInfo.world.default()).catch((e) => {
                console.error(e);
                setTimeout(function(){ 
                    console.log("Trying another world");
                    wrangler.doWorldTransition();
                }, 500);  
            });

            ok = true;

          } catch (e) {
            console.error(e);


            setTimeout(function(){ 
              console.log("Trying another world");
            }, 500);
          }
        }
      });
    },
    useExternalWindow : (new URLSearchParams(window.location.search)).has('externWin')
  });

  break;
}
}
