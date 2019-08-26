"use strict";

db.initLoggerSystem({
  logger : new db.LoggerDefault()
});


MR.wrangler.init({
  outputSurfaceName : 'output-element',
  outputWidth : 1280,
  outputHeight : 720,
  glUseGlobalContext : true,
  // frees gl resources upon world switch
  glDoResourceTracking : true,
  glEnableEditorHook : true,
  // main() is the system's entry point
  main : () => {

    MREditor.enable();

    MREditor.init({
      defaultShaderCompilationFunction : MREditor.onNeedsCompilationDefault,
      externalWindowGetter : function() { return MR.wrangler.externalWindow; }
    });

    // call the main function of the selected world
    MR.wrangler.beginSetup(MR.worlds[MR.worldIdx](MR.wrangler));

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
