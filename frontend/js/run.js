////



////



let autoExpand = function(field) {
  // field.style.height = "inherit";

  // var computed = window.getComputedStyle(field);

  // var height = parseInt(computed.getPropertyValue('border-top-width'), 10) +
  //              parseInt(computed.getPropertyValue('padding-top'), 10) +
  //              field.scrollHeight +
  //              parseInt(computed.getPropertyValue('padding-bottom'), 10) +
  //              parseInt(computed.getPropertyValue('border-bottom-width'), 10);


  // field.style.height = height + 'px';

  let text = field.value.split('\n');
  let cols = 0;
  for (let i = 0; i < text.length; i += 1) {
      cols = Math.max(cols, text[i].length);
  }

  field.rows = text.length + 1;
  field.cols = cols;
}
document.addEventListener('input', function (event) {
  if (event.target.tagName.toLowerCase() !== 'textarea') return;
  autoExpand(event.target);
}, false);   

function tempShaderEditingInit() {
    // TODO(KTR): make cleaner
    {
      MR.shaderMap = new Map();
      const _tareas = document.getElementById("text-areas");
      if (!_tareas) {
        return;
      }
      const _children = _tareas.children;
      for (let i = 0; i < _children.length; i += 1) {
        let _subtareas = _children[i];
        while (_subtareas && _subtareas.firstChild) {
            _subtareas.removeChild(_subtareas.firstChild);
        }
      }
    }
    {
      if (wrangler.externalWindow) {
        const _tareas = wrangler.externalWindow.document.getElementById("text-areas");
        if (!_tareas) {
          return;
        }
        const _children = _tareas.children;
        for (let i = 0; i < _children.length; i += 1) {
          let _subtareas = _children[i];
          while (_subtareas && _subtareas.firstChild) {
              _subtareas.removeChild(_subtareas.firstChild);
          }
        }
      }
    }
}


db.initLoggerSystem({
  redirect : true,
  logger : new db.LoggerGUIDefault()
});



MR.wrangler.init({
  outputSurfaceName : 'output-element',
  outputWidth : 1280 / 2,
  outputHeight : 720 / 2,
  glUseGlobalContext : true,
  // frees gl resources upon world switch
  glDoResourceTracking : true,
  glEnableEditorHook : true,
  // main() is the system's entry point
  main : () => {

    tempShaderEditingInit();

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

          tempShaderEditingInit();

          MR.wrangler.beginSetup(MR.worlds[MR.worldIdx](MR.wrangler));

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
