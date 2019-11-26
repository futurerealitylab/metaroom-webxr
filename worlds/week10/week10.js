"use strict"
/*
   Things you might want to try:
      object modify: move, rotate, scale, clone, delete, color, proportions
*/

/*--------------------------------------------------------------------------------

The proportions below just happen to match the dimensions of my physical space
and the tables in that space.

Note that I measured everything in inches, and then converted to units of meters
(which is what VR requires) by multiplying by 0.0254.

--------------------------------------------------------------------------------*/

const inchesToMeters = inches => inches * 0.0254;
const metersToInches = meters => meters / 0.0254;

const EYE_HEIGHT       = inchesToMeters( 69);
const HALL_LENGTH      = inchesToMeters(306);
const HALL_WIDTH       = inchesToMeters(215);
const RING_RADIUS      = 0.0425;
const TABLE_DEPTH      = inchesToMeters( 30);
const TABLE_HEIGHT     = inchesToMeters( 29);
const TABLE_WIDTH      = inchesToMeters( 60);
const TABLE_THICKNESS  = inchesToMeters( 11/8);
const LEG_THICKNESS    = inchesToMeters(  2.5);

let enableModeler = true;

let lathe = CG.createMeshVertices(10, 16, CG.uvToLathe,
             [ CG.bezierToCubic([-1.0,-1.0,-0.7,-0.3,-0.1 , 0.1, 0.3 , 0.7 , 1.0 ,1.0]),
               CG.bezierToCubic([ 0.0, 0.5, 0.8, 1.1, 1.25, 1.4, 1.45, 1.55, 1.7 ,0.0]) ]);
// let lathe = CG.cube;
////////////////////////////// SCENE SPECIFIC CODE

let noise = new ImprovedNoise();
let m = new Matrix();

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

async function setup(state) {
    hotReloadFile(getPath('week10.js'));
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

    // (New Info): input state in a sub-object that can be cached
    // for convenience
    // e.g. const input = state.input; 
    state.input = {
        turnAngle : 0,
        tiltAngle : 0,
        cursor : ScreenCursor.trackCursor(MR.getCanvas()),
        cursorPrev : [0,0,0],
        LC : null,
        RC : null
    }

    const images = await imgutil.loadImagesPromise([
        getPath("textures/wood.png"),
        getPath("textures/tiles.jpg"),
        getPath("textures/stones.gif"),
        getPath("textures/stones_bump.gif"),
     ]);

    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
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
            let libCode = MREditor.libMap.get('pnoise');
            for (let i = 0; i < 2; i++) {
                const stageCode = stages[i];
                const hdrEndIdx = stageCode.indexOf(';');
                const hdr = stageCode.substring(0, hdrEndIdx + 1);
                output[i] = hdr + '\n#line 2 1\n' + 
                            '#include<pnoise>\n#line ' + (hdr.split('\n').length + 1) + ' 0' + 
                            stageCode.substring(hdrEndIdx + 1);
            }
        }
        MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
            output[0],
            output[1],
            libMap
        );
    }

    // load vertex and fragment shaders from the server, register with the editor
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
        gl,
        "mainShader",
        {   
            // (New Info): example of how the pre-compilation function callback
            // could be in the standard library instead if I put the function defintion
            // elsewhere
            onNeedsCompilationDefault : onNeedsCompilationDefault,
            onAfterCompilation : (program) => {
                gl.useProgram(state.program = program);
                state.uColorLoc    = gl.getUniformLocation(program, 'uColor');
                state.uCursorLoc   = gl.getUniformLocation(program, 'uCursor');
                state.uModelLoc    = gl.getUniformLocation(program, 'uModel');
                state.uProjLoc     = gl.getUniformLocation(program, 'uProj');
                state.uTexScale    = gl.getUniformLocation(program, 'uTexScale');
                state.uTexIndexLoc = gl.getUniformLocation(program, 'uTexIndex');
                state.uTimeLoc     = gl.getUniformLocation(program, 'uTime');
                state.uViewLoc     = gl.getUniformLocation(program, 'uView');
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

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());


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

    // (New Info): editor state in a sub-object that can be cached
    // for convenience
    // e.g. const editor = state.editor; 
    // state.editor = {
    //     menuShape : [gfx.cube, gfx.sphere, gfx.cylinder, gfx.torus],
    //     objs : [],
    //     menuChoice : -1,
    //     enableModeler : false
    // };

    state.calibrationCount = 0;

    Input.initKeyEvents();

    // load files into a spatial audio context for playback later
    this.audioContext = new SpatialAudioContext([
      'https://raw.githubusercontent.com/bmahlbrand/wav/master/internet7-16.wav',
      'https://raw.githubusercontent.com/bmahlbrand/wav/master/SuzVega-16.wav',
      'assets/audio/Blop-Mark_DiAngelo-79054334.wav'
    ]);

}


function onStartFrame(t, state) {

    /*-----------------------------------------------------------------

    Whenever the user enters VR Mode, create the left and right
    controller handlers.

    Also, for my particular use, I have set up a particular transformation
    so that the virtual room would match my physical room, putting the
    resulting matrix into state.calibrate. If you want to do something
    similar, you would need to do a different calculation based on your
    particular physical room.

    -----------------------------------------------------------------*/

    const input  = state.input;
    const editor = state.editor;
    // const m      = state.m;

    Input.updateKeyState();
    Input.updateControllerState();

    if (! state.avatarMatrixForward) {
        // MR.avatarMatrixForward is because i need accesss to this in callback.js, temp hack
        MR.avatarMatrixForward = state.avatarMatrixForward = CG.matrixIdentity();
        MR.avatarMatrixInverse = state.avatarMatrixInverse = CG.matrixIdentity();
    } 

    if (MR.VRIsActive()) {
        if (!input.LC) input.LC = new ControllerHandler(MR.leftController, m);
        if (!input.RC) input.RC = new ControllerHandler(MR.rightController, m);

        if (! state.calibrate) {
            m.identity();
            m.rotateY(Math.PI/2);
            m.translate(-2.01,.04,0);
            state.calibrate = m.value().slice();
       }
    }

    if (! state.tStart)
        state.tStart = t;
    state.time = (t - state.tStart) / 1000;

    // THIS CURSOR CODE IS ONLY RELEVANT WHEN USING THE BROWSER MOUSE, NOT WHEN IN VR MODE.


    let cursorValue = () => {
        let p = state.cursor.position(), canvas = MR.getCanvas();
        return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
     }
      let cursorXYZ = cursorValue();

      if (state.cursorPrev === undefined)
        state.cursorPrev = [0,0,0];
      if (state.turnAngle === undefined)
        state.turnAngle = state.tiltAngle = 0;
     if (cursorXYZ[2] && state.cursorPrev[2]) {

        state.turnAngle -= Math.PI/2 * (cursorXYZ[0] - state.cursorPrev[0]);
        state.tiltAngle += Math.PI/2 * (cursorXYZ[1] - state.cursorPrev[1]);
     }
     state.cursorPrev = cursorXYZ;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.uniform3fv(state.uCursorLoc, cursorXYZ);
    gl.uniform1f (state.uTimeLoc  , state.time);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    /*-----------------------------------------------------------------

    Below is the logic for my little toy geometric modeler example.
    You should do something more or different for your assignment. 
    Try modifying the size or color or texture of objects. Try
    deleting objects or adding constraints to make objects align
    when you bring them together. Try adding controls to animate
    objects. There are lots of possibilities.

    -----------------------------------------------------------------*/
    if (enableModeler && input.LC) {
        if (input.RC.isDown()) {
	        menuChoice = findInMenu(input.RC.position(), input.LC.tip());
	        if (menuChoice >= 0 && input.LC.press()) {
	            state.isNewObj = true;
	            objs.push(new Obj(menuShape[menuChoice]));
	        }
        }
        if (state.isNewObj) {
            let obj = objs[objs.length - 1];
	        obj.position    = input.LC.tip().slice();
	        obj.orientation = input.LC.orientation().slice();
        }
        if (input.LC.release())
            state.isNewObj = false;
    }

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
        let sep = metersToInches(TABLE_DEPTH - 2 * RING_RADIUS);
        if (d >= sep - 1 && d <= sep + 1 && Math.abs(lx) < .03 && Math.abs(rx) < .03) {
           if (state.calibrationCount === undefined)
              state.calibrationCount = 0;
           if (++state.calibrationCount == 30) {
              m.save();
                 m.identity();
                 m.translate(CG.mix(LP, RP, .5));
                 m.rotateY(Math.atan2(D[0], D[2]) + Math.PI/2);
                 m.translate(-2.35,1.00,-.72);
                 state.avatarMatrixForward = CG.matrixInverse(m.value());
                 state.avatarMatrixInverse = m.value();
              m.restore();
              state.calibrationCount = 0;
           }
        }
    }
}

let menuX = [-.2,-.1,-.2,-.1];
let menuY = [ .1, .1,  0,  0];
let menuShape = [ CG.cube, CG.sphere, CG.cylinder, CG.torus ];
let menuChoice = -1;

/*-----------------------------------------------------------------

If the controller tip is near to a menu item, return the index
of that item. If the controller tip is not near to any menu
item, return -1.

mp == position of the menu origin (position of the right controller).
p  == the position of the left controller tip.

-----------------------------------------------------------------*/

let findInMenu = (mp, p) => {
   let x = p[0] - mp[0];
   let y = p[1] - mp[1];
   let z = p[2] - mp[2];
   for (let n = 0 ; n < 4 ; n++) {
      let dx = x - menuX[n];
      let dy = y - menuY[n];
      let dz = z;
      if (dx * dx + dy * dy + dz * dz < .03 * .03)
	 return n;
   }
   return -1;
}

function Obj(shape) {
   this.shape = shape;
};

let objs = [];

function onDraw(t, projMat, viewMat, state, eyeIdx) {

    viewMat = CG.matrixMultiply(viewMat, state.avatarMatrixInverse);
    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));

    let prev_shape = null;

    const editor = state.editor;
    const input  = state.input;

    /*-----------------------------------------------------------------

    The drawShape() function below is optimized in that it only downloads
    new vertices to the GPU if the vertices (the "shape" argument) have
    changed since the previous call.

    Also, currently we only draw gl.TRIANGLES if this is a cube. In all
    other cases, we draw gl.TRIANGLE_STRIP. You might want to change
    this if you create other kinds of shapes that are not triangle strips.

    -----------------------------------------------------------------*/

    let drawShape = (shape, color, texture, textureScale) => {
        gl.uniform4fv(state.uColorLoc, color.length == 4 ? color : color.concat([1]));
        gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
        gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
        gl.uniform1f(state.uTexScale, textureScale === undefined ? 1 : textureScale);
        if (shape != prev_shape)
           gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( shape ), gl.STATIC_DRAW);
        gl.drawArrays(shape == CG.cube ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
        prev_shape = shape;
     }

    /*-----------------------------------------------------------------

    In my little toy geometric modeler, the pop-up menu of objects only
    appears while the right controller trigger is pressed. This is just
    an example. Feel free to change things, depending on what you are
    trying to do in your homework.

    -----------------------------------------------------------------*/

    let showMenu = p => {
        let x = p[0], y = p[1], z = p[2];
        for (let n = 0 ; n < 4 ; n++) {
           m.save();
              m.multiply(state.avatarMatrixForward);
              m.translate(x + menuX[n], y + menuY[n], z);
              m.scale(.03, .03, .03);
              drawShape(menuShape[n], n == menuChoice ? [1,.5,.5] : [1,1,1]);
           m.restore();
        }
     }

    /*-----------------------------------------------------------------

    drawTable() just happens to model the physical size and shape of the
    tables in my lab (measured in meters). If you want to model physical
    furniture, you will probably want to do something different.

    -----------------------------------------------------------------*/

    let drawTable = id => {
        m.save();
           m.translate(0, TABLE_HEIGHT - TABLE_THICKNESS/2, 0);
           m.scale(TABLE_DEPTH/2, TABLE_THICKNESS/2, TABLE_WIDTH/2);
           drawShape(CG.cube, [1,1,1], 0);
        m.restore();
        m.save();
           let h  = (TABLE_HEIGHT - TABLE_THICKNESS) / 2;
           let dx = (TABLE_DEPTH  - LEG_THICKNESS  ) / 2;
           let dz = (TABLE_WIDTH  - LEG_THICKNESS  ) / 2;
           for (let x = -dx ; x <= dx ; x += 2 * dx)
           for (let z = -dz ; z <= dz ; z += 2 * dz) {
              m.save();
                 m.translate(x, h, z);
                 m.scale(LEG_THICKNESS/2, h, LEG_THICKNESS/2);
                 drawShape(CG.cube, [.5,.5,.5]);
              m.restore();
           }
        m.restore();
     }

    /*-----------------------------------------------------------------

    The below is just my particular "programmer art" for the size and
    shape of a controller. Feel free to create a different appearance
    for the controller. You might also want the controller appearance,
    as well as the way it animates when you press the trigger or other
    buttons, to change with different functionality.

    For example, you might want to have one appearance when using it as
    a selection tool, a resizing tool, a tool for drawing in the air,
    and so forth.

    -----------------------------------------------------------------*/

    let drawController = (C, hand) => {
        let P = C.position();
        m.save();
           m.multiply(state.avatarMatrixForward);
           m.translate(P);
           m.rotateQ(C.orientation());
           m.translate(0,.02,-.005);
           m.rotateX(.75);
           m.save();
              m.translate(0,0,-.0095).scale(.004,.004,.003);
              drawShape(CG.sphere, C.isDown() ? [10,0,0] : [.5,0,0]);
           m.restore();
           m.save();
              m.translate(0,0,-.01).scale(.04,.04,.13);
              drawShape(CG.torus, [0,0,0]);
           m.restore();
           m.save();
              m.translate(0,-.0135,-.008).scale(.04,.0235,.0015);
              drawShape(CG.cylinder, [0,0,0]);
           m.restore();
           m.save();
              m.translate(0,-.01,.03).scale(.012,.02,.037);
              drawShape(CG.cylinder, [0,0,0]);
           m.restore();
           m.save();
              m.translate(0,-.01,.067).scale(.012,.02,.023);
              drawShape(CG.sphere, [0,0,0]);
           m.restore();
        m.restore();
     }
 
     m.identity();


    let drawSyncController = (pos, rot, color) => {
        let P = pos;
        m.save();
        m.identity();
            m.translate(P[0], P[1], P[2]);
            m.rotateQ(rot);
            m.translate(0,.02,-.005);
            m.rotateX(.75);
            m.save();
                m.translate(0,0,-.0095).scale(.004,.004,.003);
            m.restore();
            m.save();
                m.translate(0,0,-.01).scale(.04,.04,.13);
                drawShape(CG.torus, [0,0,0]);
            m.restore();
            m.save();
                m.translate(0,-.0135,-.008).scale(.04,.0235,.0015);
                drawShape(CG.cylinder, [0,0,0]);
            m.restore();
            m.save();
                m.translate(0,-.01,.03).scale(.012,.02,.037);
                drawShape(CG.cylinder, [0,0,0]);
            m.restore();
            m.save();
                m.translate(0,-.01,.067).scale(.012,.02,.023);
                drawShape(CG.sphere, [0,0,0]);
            m.restore();
        m.restore();
    }


    m.identity();

    if (input.LC) {
        drawController(input.LC, 0);
        drawController(input.RC, 1);
        if (enableModeler && input.RC.isDown())
           showMenu(input.RC.position());
    }


    /*-----------------------------------------------------------------

    This is where I draw the objects that have been created.

    If I were to make these objects interactive (that is, responsive
    to the user doing things with the controllers), that logic would
    need to go into onStartFrame(), not here.

    -----------------------------------------------------------------*/

    for (let n = 0 ; n < objs.length ; n++) {
        let obj = objs[n], P = obj.position;
        m.save();
           m.multiply(state.avatarMatrixForward);
           m.translate(P);
           m.rotateQ(obj.orientation);
           m.scale(.03,.03,.03);
           drawShape(obj.shape, [1,1,1]);
        m.restore();
     }

     m.translate(0, -EYE_HEIGHT, 0);
     m.rotateX(state.tiltAngle);
     m.rotateY(state.turnAngle);
    //  console.log(state.tiltAngle);
    // if (state.calibrate) {
    //     m.set(state.calibrate);
    //     m.rotateY(Math.PI/2);
    //     m.translate(-2.35,1.00,-.72);
    // }



    /*-----------------------------------------------------------------

    Notice that I make the room itself as an inside-out cube, by
    scaling x,y and z by negative amounts. This negative scaling
    is a useful general trick for creating interiors.

    -----------------------------------------------------------------*/

    m.save();
       m.translate(0, HALL_WIDTH/2, 0);
       m.scale(-HALL_WIDTH/2, -HALL_WIDTH/2, -HALL_LENGTH/2);
       drawShape(CG.cube, [1,1,1], 1,4, 2,4);
    m.restore();

    m.save();
       m.translate((HALL_WIDTH - TABLE_DEPTH) / 2, 0, 0);
       drawTable(0);
    m.restore();

    m.save();
       m.translate((TABLE_DEPTH - HALL_WIDTH) / 2, 0, 0);
       drawTable(1);
    m.restore();

    m.save();
       m.translate(0, 2 * TABLE_HEIGHT, (TABLE_DEPTH - HALL_WIDTH) / 2);
       //m.aimZ([Math.cos(state.time),Math.sin(state.time),0]);
       m.scale(.06,.06,.6);
       //drawShape(lathe, [1,.2,0]);
    m.restore();

    let A = [0,0,0];
    let B = [1+.4*Math.sin(2 * state.time),.4*Math.cos(2 * state.time),0];
    let C = CG.ik(.7,.7,B,[0,-1,-2]);  

    m.save();
       m.translate(-.5, 2.5 * TABLE_HEIGHT, (TABLE_DEPTH - HALL_WIDTH) / 2);
       //m.rotateY(state.time);
/*
       m.save();
          m.translate(A).scale(.07);
          drawShape(CG.sphere, [1,1,1]);
       m.restore();

       m.save();
          m.translate(B).scale(.07);
          drawShape(CG.sphere, [1,1,1]);
       m.restore();

       m.save();
          m.translate(C).scale(.07);
          drawShape(CG.sphere, [1,1,1]);
       m.restore();
*/
       m.save();
          m.translate(CG.mix(A,C,.5)).aimZ(CG.subtract(A,C)).scale(.05,.05,.37);
          drawShape(lathe, [0,.2,1]);
       m.restore();

       m.save();
          m.translate(CG.mix(C,B,.5)).aimZ(CG.subtract(C,B)).scale(.03,.03,.37);
          drawShape(lathe, [0,.2,1]);
       m.restore();

    m.restore();
      /*-----------------------------------------------------------------
        Here is where we draw avatars and controllers.
      -----------------------------------------------------------------*/

    for (let id in MR.avatars) {

          if(MR.playerid == MR.avatars[id].playerid && MR.avatars[id].mode == MR.UserType.vr){
            let frameData = MR.frameData();
            if (frameData != null) {
              let headsetPos = frameData.pose.position;
              let headsetRot = frameData.pose.orientation;

              const avatar = MR.avatars[id];
              const rcontroller = MR.controllers[0];
              const lcontroller = MR.controllers[1];
              
              drawAvatar(avatar, headsetPos, headsetRot, .03, state);
              drawController(input.LC, [1,0,0]);
              drawController(input.RC, [0,1,1]);
              //drawAvatar(avatar, rcontroller.pose.position, rcontroller.pose.orientation, 0.05, state);
              //drawAvatar(avatar, lcontroller.pose.position, lcontroller.pose.orientation, 0.05, state);
             

            }
         
          } else if(MR.avatars[id].mode == MR.UserType.vr) {

            let headsetPos = MR.avatars[id].headset.position;
            let headsetRot = MR.avatars[id].headset.orientation;
            
            if(headsetPos == null || headsetRot == null){
                continue;
            }

            if (typeof headsetPos == 'undefined') {
              console.log(id);
              console.log("not defined");
            }
            
            const avatar = MR.avatars[id];
            const rcontroller = MR.avatars[id].rightController;
            const lcontroller = MR.avatars[id].leftController;
          
            //console.log("VR position and orientation:")
            //console.log(headsetPos);
            //console.log(headsetRot);
            drawAvatar(avatar, headsetPos, headsetRot, .1, state);
            drawSyncController(rcontroller.position, rcontroller.orientation, [1,0,0]);
            drawSyncController(lcontroller.position, lcontroller.orientation, [0,1,1]);
          }
        
        }
}

function onEndFrame(t, state) {
    pollAvatarData();
    /*-----------------------------------------------------------------

    The below two lines are necessary for making the controller handler
    logic work properly -- in particular, detecting press() and release()
    actions.

    -----------------------------------------------------------------*/
    const input  = state.input;
    if (input.LC) input.LC.onEndFrame();
    if (input.RC) input.RC.onEndFrame();


    let frameData = MR.frameData();
    if (frameData != null) {
        let headsetPos = frameData.pose.position;
        let headsetRot = frameData.pose.orientation;
           /*Button stuff that we might move somewhere else*/
        if (input.LC && input.LC.isDown()) {
          this.audioContext.playFileAt('assets/audio/Blop-Mark_DiAngelo-79054334.wav', input.LC.position(), [0,0,0], headsetPos, headsetRot);
        }

        if (input.RC && input.RC.isDown()) {
            this.audioContext.playFileAt('assets/audio/Blop-Mark_DiAngelo-79054334.wav', input.RC.position(), [0,0,0], headsetPos, headsetRot);
        }
    }
}

export default function main() {
    const def = {
        name         : 'YOUR_NAME_HERE week10',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,

        // (New Info): New callbacks:
            
        // VR-specific drawing callback
        // e.g. for when the UI must be different 
        //      in VR than on desktop
        //      currently setting to the same callback as on desktop
        onDrawXR     : onDraw, 
        // call upon reload
        onReload     : onReload,
        // call upon world exit
        onExit       : onExit
    };
    return def;
}



//////////////DEBUG TOOLS
function drawAvatar(avatar, pos, rot, scale, state) {
//   let drawShape = (color, type, vertices, texture) => {
//       gl.uniform3fv(state.uColorLoc, color);
//       gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
//       // gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
//       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STATIC_DRAW);
//       gl.drawArrays(type, 0, vertices.length / VERTEX_SIZE);
//    }
let prev_shape = null;
let drawShape = (shape, color, texture, textureScale) => {
   gl.uniform4fv(state.uColorLoc, color.length == 4 ? color : color.concat([1]));
   gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
   gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
   gl.uniform1f(state.uTexScale, textureScale === undefined ? 1 : textureScale);
   if (shape != prev_shape)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( shape ), gl.STATIC_DRAW);
   gl.drawArrays(shape == CG.cube ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
   prev_shape = shape;
}
   m.save();
      m.identity();
      m.translate(pos[0],pos[1],pos[2] - .75);
      m.rotateQ(rot);
      m.scale(scale,scale,scale);
      drawShape(avatar.headset.vertices, [1,1,1], 0);
      // drawShape([1,1,1], gl.TRIANGLES, avatar.headset.vertices, 1);
   m.restore();
}

let fromQuaternion = q => {
   var x = q[0], y = q[1], z = q[2], w = q[3];
   return [ 1 - 2 * (y * y + z * z),     2 * (z * w + x * y),     2 * (x * z - y * w), 0,
                2 * (y * x - z * w), 1 - 2 * (z * z + x * x),     2 * (x * w + y * z), 0,
                2 * (y * w + z * x),     2 * (z * y - x * w), 1 - 2 * (x * x + y * y), 0,  0,0,0,1 ];
}

