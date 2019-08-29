"use strict";

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
default: {
  console.log("running version:", VERSION);
  MR.wrangler.init({
    outputSurfaceName : 'output-element',
    outputWidth : 1280,
    outputHeight : 720,
    glUseGlobalContext : true,
    // frees gl resources upon world switch
    glDoResourceTracking : true,
    glEnableEditorHook : true,
    enableMultipleWorlds : false,
    enableEntryByButton : false,
    enableBellsAndWhistles : false,
    // main() is the system's entry point
    main : () => {

      MREditor.enable();

      MREditor.init({
        defaultShaderCompilationFunction : MREditor.onNeedsCompilationDefault,
        //externalWindowGetter : function() { return MR.wrangler.externalWindow; }
      });

      // call the main function of the selected world
      if (MR.wrangler.enableMultipleWorlds) {
          const configCallback = MR.worlds[MR.worldIdx];

          MR.wrangler.beginSetup(configCallback());
      } else {
        try {
          const configCallback = main;
          if (!configCallback) {
            return;
          }

          MR.wrangler.beginSetup(configCallback());
        } catch (err) {
          console.error("ERROR: main function not defined!", err);
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

            MR.wrangler.beginSetup(MR.worlds[MR.worldIdx](MR.wrangler)).catch((e) => {
                console.error(e);
                wrangler.simulateWorldTransition();
            });

            ok = true;

          } catch (e) {
            console.error(e);

            if (typeof MR.worlds[MR.worldIdx] !== "function") {
              console.error("must return a main initialization function");
            }


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
