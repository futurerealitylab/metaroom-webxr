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