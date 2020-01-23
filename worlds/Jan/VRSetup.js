"use strict";

function HeadsetHandler(poseInfo) {
    this.position    = () => poseInfo.positionAsArray;
    this.orientation = () => poseInfo.orientationAsArray;
 }
 
 function ControllerHandler(controller) {
    this.isDown      = () => controller.buttons[1].pressed;
    this.onEndFrame  = () => wasDown = this.isDown();
    this.orientation = () => controller.pose.orientation;
    this.position    = () => controller.pose.position;
    this.press       = () => ! wasDown && this.isDown();
    this.release     = () => wasDown && ! this.isDown();
    this.tip         = () => {
       m.identity();                     // MOVE THE "HOT SPOT" OF
       m.translate(this.position());     // THE CONTROLLER TOWARD
       m.rotateQ(this.orientation());    // FAR TIP (FURTHER AWAY
       m.translate(0,.04,-.02);          // FROM THE USER'S HAND).
       let v = m.value();
       return [v[12],v[13],v[14]];
    }
    this.center = () => {
       m.identity();
       m.translate(this.position());
       m.rotateQ(this.orientation());
       m.translate(0,.02,-.005);
       let v = m.value();
       return [v[12],v[13],v[14]];
    }
    let wasDown = false;
 }

 
// (New Info): constants can be reloaded without worry
// let VERTEX_SIZE = 8;

// (New Info): temp save modules as global "namespaces" upon loads
// let gfx;

// (New Info):
// handle reloading of imports (called in setup() and in onReload())
async function initCommon(state) {
    // (New Info): use the previously loaded module saved in state, use in global scope
    // TODO automatic re-setting of loaded libraries to reduce boilerplate?
    // gfx = state.gfx;
    // state.m = new CG.Matrix();
    // noise = state.noise;
 }
 
 // (New Info):
 async function onReload(state) {
    // called when this file is reloaded
    // re-initialize imports, objects, and state here as needed
    await initCommon(state);
 
    // Note: you can also do some run-time scripting here.
    // For example, do some one-time modifications to some objects during
    // a performance, then remove the code before subsequent reloads
    // i.e. like coding in the browser console
 }
 
 // (New Info):
 async function onExit(state) {
    // called when world is switched
    // de-initialize / close scene-specific resources here
    console.log("Goodbye! =)");
 }

 async function template_setup(state) {
    hotReloadFile(getPath('datacollection.js'));
    // (New Info): Here I am loading the graphics module once
    // This is for the sake of example:
    // I'm making the arbitrary decision not to support
    // reloading for this particular module. Otherwise, you should
    // do the import in the "initCommon" function that is also called
    // in onReload, just like the other import done in initCommon
    // the gfx module is saved to state so I can recover it
    // after a reload
    // state.gfx = await MR.dynamicImport(getPath('lib/graphics.js'));
    state.noise = new ImprovedNoise();
    await initCommon(state);
 
    // I propose adding a dictionary mapping texture strings to locations, so that drawShapes becomes clearer
    const images = await imgutil.loadImagesPromise([
       getPath("../../assets/textures/wood.png"),
       getPath("../../assets/textures/tiles.jpg"),
       getPath("../../assets/textures/noisy_bump.jpg")
    ]);
 
    let libSources = await ShaderTextEditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
       { key : "pnoise"    , path : "shaders/noise.glsl"     , foldDefault : true },
       { key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true },      
    ]);
    if (! libSources)
       throw new Error("Could not load shader library");
 
    function onNeedsCompilationDefault(args, libMap, userData) {
       const stages = [args.vertex, args.fragment];
       const output = [args.vertex, args.fragment];
       const implicitNoiseInclude = true;
       if (implicitNoiseInclude) {
          let libCode = ShaderTextEditor.libMap.get('pnoise');
          for (let i = 0; i < 2; i++) {
                const stageCode = stages[i];
                const hdrEndIdx = stageCode.indexOf(';');
                const hdr = stageCode.substring(0, hdrEndIdx + 1);
                output[i] = hdr + '\n#line 2 1\n' + 
                            '#include<pnoise>\n#line ' + (hdr.split('\n').length + 1) + ' 0' + 
                            stageCode.substring(hdrEndIdx + 1);
          }
       }
       ShaderTextEditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
          output[0],
          output[1],
          libMap
       );
    }
 
    // load vertex and fragment shaders from the server, register with the editor
    let shaderSource = await ShaderTextEditor.loadAndRegisterShaderForLiveEditing(
       gl,
       "mainShader",
       {   
          // (New Info): example of how the pre-compilation function callback
          // could be in the standard library instead if I put the function defintion
          // elsewhere
          onNeedsCompilationDefault : onNeedsCompilationDefault,
          onAfterCompilation : (program) => {
                gl.useProgram(state.program = program);
                state.uBrightnessLoc = gl.getUniformLocation(program, 'uBrightness');
                state.uColorLoc      = gl.getUniformLocation(program, 'uColor');
                state.uCursorLoc     = gl.getUniformLocation(program, 'uCursor');
                state.uModelLoc      = gl.getUniformLocation(program, 'uModel');
                state.uProjLoc       = gl.getUniformLocation(program, 'uProj');
                state.uTexScale      = gl.getUniformLocation(program, 'uTexScale');
                state.uTexIndexLoc   = gl.getUniformLocation(program, 'uTexIndex');
                state.uTimeLoc       = gl.getUniformLocation(program, 'uTime');
                state.uToonLoc       = gl.getUniformLocation(program, 'uToon');
                state.uViewLoc       = gl.getUniformLocation(program, 'uView');
                      state.uTexLoc = [];
                      for (let n = 0 ; n < 8 ; n++) {
                         state.uTexLoc[n] = gl.getUniformLocation(program, 'uTex' + n);
                         gl.uniform1i(state.uTexLoc[n], n);
                      }
          } 
       },
       {
          paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
          },
          foldDefault : {
                vertex   : true,
                fragment : false
          }
       }
    );
    if (! shaderSource)
       throw new Error("Could not load shader");
 
    state.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
 
    let bpe = Float32Array.BYTES_PER_ELEMENT;
 
    let aPos = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 0);
 
    let aNor = gl.getAttribLocation(state.program, 'aNor');
    gl.enableVertexAttribArray(aNor);
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 3);
 
    let aTan = gl.getAttribLocation(state.program, 'aTan');
    gl.enableVertexAttribArray(aTan);
    gl.vertexAttribPointer(aTan, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 6);
 
    let aUV  = gl.getAttribLocation(state.program, 'aUV');
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV , 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 9);
 
 
    for (let i = 0 ; i < images.length ; i++) {
       gl.activeTexture (gl.TEXTURE0 + i);
       gl.bindTexture   (gl.TEXTURE_2D, gl.createTexture());
       gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
       gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
       gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
       gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
       gl.texImage2D    (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[i]);
       gl.generateMipmap(gl.TEXTURE_2D);
    }
 
    Input.initKeyEvents();
 
    
 }

 function toy_geometric_modeler(enableModeler, state){
    /*-----------------------------------------------------------------

    Below is the logic for my little toy geometric modeler example.
    You should do something more or different for your assignment. 
    Try modifying the size or color or texture of objects. Try
    deleting objects or adding constraints to make objects align
    when you bring them together. Try adding controls to animate
    objects. There are lots of possibilities.

    -----------------------------------------------------------------*/
    const input= state.input;
    if (enableModeler && input.LC) {
        if (input.RC.isDown()) {
        menuChoice = findInMenu(input.RC.position(), input.RC.orientation(), input.LC.tip());
        if (menuChoice >= 0 && input.LC.press()) {
            state.isNewObj = true;
            let newObject = new Obj(menuShape[menuChoice]);
            /* Should you want to support grabbing, refer to the above example in setup(). */ 
            MR.objs.push(newObject);
            sendSpawnMessage(newObject);
        }
        }
        if (state.isNewObj) {
        let obj = MR.objs[MR.objs.length - 1];
        obj.position    = input.LC.tip().slice();
        obj.orientation = input.LC.orientation().slice();
        //Create lock object for each new obj.
        obj.lock = new Lock();
        }
        if (input.LC.release())
        state.isNewObj = false;
    }    
 }

 function calibrate(state){
    const input = state.input;
    if (input.LC) {
        let LP = input.LC.center();
        let RP = input.RC.center();
        let D  = CG.subtract(LP, RP);
        let d  = metersToInches(CG.norm(D));
        let getX = C => {
           m.save();
              m.identity();
              m.rotateQ(CG.matrixFromQuaternion(C.orientation()));
              m.rotateX(.75);
              let x = (m.value())[1];
           m.restore();
           return x;
        }
        let lx = getX(input.LC);
        let rx = getX(input.RC);
        let sep = [metersToInches(TABLE_DEPTH   - 2 * RING_RADIUS),
                   metersToInches(TABLE_DEPTH/2 - 2 * RING_RADIUS)];
        for (let n = 0 ; n < 2 ; n++) {
           let sgn = n == 0 ? -1 : 1;
           if (d >= sep[n] - 1 && d <= sep[n] + 1 && Math.abs(lx) < .03 && Math.abs(rx) < .03) {
              if (state.calibrationCount === undefined)
                 state.calibrationCount = 0;
              if (++state.calibrationCount == 30) {
                 m.save();
                    m.identity();
                    m.translate(CG.mix(LP, RP, .5));
                    m.rotateY(Math.atan2(D[0], D[2]) - sgn * Math.PI/2);
                    m.translate(-2.35, 1.00, sgn * .72);
                    state.avatarMatrixInverse = m.value();
                    m.invert();
                    state.avatarMatrixForward = m.value();
                 m.restore();
                 state.calibrationCount = 0;
              }
           }
        }
     }
 }

 /*-----------------------------------------------------------------

If the controller tip is near to a menu item, return the index
of that item. If the controller tip is not near to any menu
item, return -1.

mp == position of the menu origin (position of the right controller).
p  == the position of the left controller tip.

-----------------------------------------------------------------*/

 let findInMenu = (mp, mq, p) => {
    m.save();
       m.identity();
       m.translate(mp);
       m.rotateQ(mq);
       m.invert();
       p = m.transform(p);
    m.restore();
    for (let n = 0 ; n < 4 ; n++) {
       let dx = p[0] - menuX[n];
       let dy = p[1] - menuY[n];
       let dz = p[2];
       if (dx * dx + dy * dy + dz * dz < .03 * .03)
          return n;
    }
    return -1;
 }
 
 function Obj(shape) {
    this.shape = shape;
 }

 



  /*-----------------------------------------------------------------

  drawTable() just happens to model the physical size and shape of the
  tables in my lab (measured in meters). If you want to model physical
  furniture, you will probably want to do something different.

  -----------------------------------------------------------------*/

 let drawCamera = (state,id) => {
    m.save();
       m.translate(0,0,.1).scale(.1);
       drawShape(state, CG.cube, [.5,.5,.5]);
    m.restore();
    m.save();
       m.translate(0,0,-.05).scale(.05);
       drawShape(state, CG.cylinder, [.5,.5,.5]);
    m.restore();
    m.save();
       m.translate(0,0,-.1).scale(.04,.04,.001);
       drawShape(state, CG.cylinder, [-1,-1,-1]);
    m.restore();
 }

 /*-----------------------------------------------------------------

   Below is an example of two-link inverse kinematics, such as we might
   use to connect a shoulder to a wrist for an animated character, via
   an elbow joint whose position is calculated via two-link IK.

   The "lathe" object that defines the shape of each limb is a surface
   of revolution, which is defined up at the top of this source file.

   We are also enabling toon shading, based on a tutorial I read by
   Josh Marinacci. Most of the work of the toon shading is done in
   the vertex and fragment shaders.

   -----------------------------------------------------------------*/
   let lathe = CG.createMeshVertices(10, 16, CG.uvToLathe,
      [ CG.bezierToCubic([-1.0,-1.0,-0.7,-0.3,-0.1 , 0.1, 0.3 , 0.7 , 1.0 ,1.0]),
        CG.bezierToCubic([ 0.0, 0.5, 0.8, 1.1, 1.25, 1.4, 1.45, 1.55, 1.7 ,0.0]) ]);
// let lathe = CG.cube;
 function draw_two_link_inverse_kinematics(state){
    let A = [0,0,0];
   let B = [1+.4*Math.sin(2 * state.time),.4*Math.cos(2 * state.time),0];
   let C = CG.ik(.7,.7,B,[0,-1,-2]);

   window.m.save();
      window.m.translate(-.5, 2.5 * TABLE_HEIGHT, (TABLE_DEPTH - HALL_WIDTH) / 2);
      let skinColor = [1,.5,.3], D;
      state.isToon = true;

      window.m.save();
      window.m.translate(CG.mix(A,C,.5)).aimZ(CG.subtract(A,C)).scale(.05,.05,.37);
         drawShape(state, lathe, skinColor, -1,1, 2,1);
         window.m.restore();

      window.m.save();
         window.m.translate(CG.mix(C,B,.5)).aimZ(CG.subtract(C,B)).scale(.03,.03,.37);
         drawShape(state, lathe, skinColor, -1,1, 2,1);
      window.m.restore();

      state.isToon = false;
   window.m.restore();
 }


/*-----------------------------------------------------------------

   The drawShape() function below is optimized in that it only downloads
   new vertices to the GPU if the vertices (the "shape" argument) have
   changed since the previous call.

   Also, currently we only draw gl.TRIANGLES if this is a cube. In all
   other cases, we draw gl.TRIANGLE_STRIP. You might want to change
   this if you create other kinds of shapes that are not triangle strips.

   -----------------------------------------------------------------*/
   let drawShape = (state, shape, color, texture, textureScale) => {
      let drawArrays = () => gl.drawArrays(shape == CG.cube ||
                                           shape == CG.quad ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
      gl.uniform1f(state.uBrightnessLoc, state.input.brightness === undefined ? 1 : state.input.brightness);
      gl.uniform4fv(state.uColorLoc, color.length == 4 ? color : color.concat([1]));
      gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
      gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
      gl.uniform1f(state.uTexScale, textureScale === undefined ? 1 : textureScale);
      if (shape != window.prev_shape)
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( shape ), gl.STATIC_DRAW);
      if (state.isToon) {
         gl.uniform1f (state.uToonLoc, .3 * CG.norm(m.value().slice(0,3)));
         gl.cullFace(gl.FRONT);
         drawArrays();
         gl.cullFace(gl.BACK);
         gl.uniform1f (state.uToonLoc, 0);
      }
      if (state.isMirror) gl.cullFace(gl.FRONT);
      drawArrays();
      gl.cullFace(gl.BACK);
      window.prev_shape = shape;
   }

   function draw_created_objs(state){
      /*-----------------------------------------------------------------

   This is where I draw the objects that have been created.

   If I were to make these objects interactive (that is, responsive
   to the user doing things with the controllers), that logic would
   need to go into onStartFrame(), not here.

   -----------------------------------------------------------------*/

      for (let n = 0 ; n < MR.objs.length ; n++) {
         let obj = MR.objs[n];
         m.save();
         m.multiply(state.avatarMatrixForward);
         m.translate(obj.position);
         m.rotateQ(obj.orientation);
         m.scale(.03,.03,.03);
         drawShape(state, obj.shape, n==0 ? [1,.5,.5] : [1,1,1]);
         m.restore();
      }
   }

   let drawInMirror = (state, z, drawProc) => {
      m.save();
         m.translate(0,0,2 * z);
         m.scale(1,1,-1);
         state.isMirror = true;
         drawProc(state);
         state.isMirror = false;
      m.restore();
   }
   