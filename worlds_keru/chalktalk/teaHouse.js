"use strict";

// static imports (cannot be reloaded!)

// for loading files and assets at specific paths
// NOTE: (the * syntax means to import all symbols into the named object "Path")
import * as Path from "/lib/util/path.js";
// for loading basic assets
import * as Asset from "/lib/util/asset.js";
import * as Image from "/lib/util/image.js";
// for canvas interaction
import * as Canvas from "/lib/util/canvas.js";
// for memory operations
import * as Mem from "/lib/core/memory.js";
// webgl shader utilities
import * as Shader from "/lib/core/gpu/webgl_shader_util.js";
// builtin integrated shader editor
// NOTE: this import syntax imports the specific symbol from the module by name
import {
  ShaderTextEditor
} from "/lib/core/shader_text_editor.js";

import * as Tex from "/lib/core/gpu/webgl_texture_util.js";

// mouse cursor input
import {
  ScreenCursor
} from "/lib/input/cursor.js";
// code reloading utility
import * as Code_Loader from "/lib/core/code_loader.js";
// input handling
import * as Input from "/lib/input/input.js";

// linear algebra library (can be replaced, but is useful for now)
import * as _ from "/lib/third-party/gl-matrix-min.js";
let Linalg = glMatrix;


let noise = new ImprovedNoise();
let m = new Matrix();
let w = null;

let leftPressed = false;
let rightPressed = false;
let windowDir = [0, 0, 0];
let windowLightDir = new Matrix();

///////////////////////////////////////////////////////////////////

// dynamic imports, global namespace variables for convenience
// personal math library module
let Maths = null;
// chalktalk modeler library module
let CT = null;

/**
 *  setup that needs occurs upon initial setup
 *  and on reload
 *  @param w {World_State} storage for your persistent world state
 */
async function initCommon(_w) {
  w = _w;
  w.m = m;

  // this loads the math module
  // if it has been changed - located at /lib/math/math.js
  Maths = await MR.dynamicImport("/lib/math/math.js");
  CT = await MR.dynamicImport(Path.fromLocalPath("/chalktalk/chalktalk.js"));


}

async function loadShaders(w) {
  const vertex = await Asset.loadTextRelativePath("/shaders/vertex.vert.glsl");
  const fragment = await Asset.loadTextRelativePath("/shaders/fragment.frag.glsl");

  let errorStatus = {};
  const shader = Shader.compileValidateStrings(vertex, fragment, errorStatus);
  gl.useProgram(shader);
  w.gl = gl;
  w.shader = shader;
}

// textures





async function loadImages(w) {

  let images = null;
  try {
    images = await Image.loadImagesAsync([
      Path.fromLocalPath("assets/textures/wood.png"),
      "assets/textures/brick.png",
      Path.fromLocalPath("assets/textures/tiles.png"),
      "assets/textures/stones.gif",
      "assets/textures/stones_bump.gif",
      Path.fromLocalPath("assets/textures/rug1.png"),
      Path.fromLocalPath("assets/textures/concrete.jpg"),
      Path.fromLocalPath("assets/textures/woodFloor.png"),
      Path.fromLocalPath("assets/textures/background.jpg"),
      Path.fromLocalPath("assets/textures/wood1.jpg"),
      Path.fromLocalPath("assets/textures/marble.jpg"),
      Path.fromLocalPath("assets/textures/concrete1.png"),
      Path.fromLocalPath("assets/textures/concrete2.png"),
      Path.fromLocalPath("assets/textures/concrete3.png"),
      Path.fromLocalPath("assets/textures/concrete4.png"),
      Path.fromLocalPath("assets/textures/matisse.jpg"),
      Path.fromLocalPath("assets/textures/bambooFloor.jpg"),
      Path.fromLocalPath("assets/textures/woodTable.jpg"),
      Path.fromLocalPath("assets/textures/fabricWall.jpg"),
      Path.fromLocalPath("assets/textures/paper.jpg"),
      Path.fromLocalPath("assets/textures/rug2.png"),
      Path.fromLocalPath("assets/textures/b&wpainting.png"),
      Path.fromLocalPath("assets/textures/stone.jpg"),
      Path.fromLocalPath("assets/textures/whiteWall.jpg"),
      Path.fromLocalPath("assets/textures/tree.png"),
    ]);

    // stores textures
    w.textureCatalogue = new Tex.TextureCatalogue(gl);

    // texture configuration object
    const textureDesc = Tex.makeTexture2DDescriptor(gl);
    textureDesc.generateMipmap = true;
    textureDesc.name = 'tex';

    textureDesc.paramList.push([gl.TEXTURE_WRAP_S, gl.REPEAT]);
    textureDesc.paramList.push([gl.TEXTURE_WRAP_T, gl.REPEAT]);
    textureDesc.paramList.push([gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST]);
    textureDesc.paramList.push([gl.TEXTURE_MAG_FILTER, gl.LINEAR]);

    w.textures = Tex.makeIndividualTexture2DsWithImages(
      w.textureCatalogue,
      textureDesc,
      // array 0...length-1 for texture slots to use
      Array.from({
        length: images.length
      }, (_, i) => i),
      images, [
               "wood", "brick", "tiles", "stones", "stones_bump", "rug1", "concrete", "woodFloor", // 0-7
               "background", "wood1", "marble", "concrete1", "concrete2", "concrete3", "concrete4", // 8-14
               "matisse", "bambooFloor", "woodTable", "fabricWall", "paper", "rug2", "b&wpainting", // 15-21
               "stone", "whiteWall", "tree" // 22 -
             ],
      0
    );

    // INSTRUCTIONS
    //
    // Just to show that this works, I attach a temporary canvas to the document,
    // and this canvas has the texture images drawn to it (not WebGL).
    // zoom out with command - since the images are large
    //
    // lookup texture atlas (one-to-many individual images):
    //
    // w.textureCatalogue.lookupByName("atlas1");

    //
    // it's faster if you know the direct ID
    // w.textureCatalogue.lookupByID(1)

    //
    // lookup image stored in a texture atlas
    // const texAtlas = ... some atlas
    // const image = atlas.lookupImageByName('wood');

    //
    // direct access by ID is faster
    //
    // index of first image in this atlas
    // const image = texAtlas.lookupImageByID(1)

  } catch (e) {
    console.error(e);
  }

}

//

async function initGraphicsCommon(w) {
  w.uColor = gl.getUniformLocation(w.shader, 'uColor');
  w.uCursor = gl.getUniformLocation(w.shader, 'uCursor');
  w.uModel = gl.getUniformLocation(w.shader, 'uModel');
  w.uProj = gl.getUniformLocation(w.shader, 'uProj');
  w.uTexScale = gl.getUniformLocation(w.shader, 'uTexScale');
  w.uTexIndex = gl.getUniformLocation(w.shader, 'uTexIndex');
  w.uBumpIndex = gl.getUniformLocation(w.shader, 'uBumpIndex');
  w.uTime = gl.getUniformLocation(w.shader, 'uTime');
  w.uToon = gl.getUniformLocation(w.shader, 'uToon');
  w.uView = gl.getUniformLocation(w.shader, 'uView');
  w.uBrightness = gl.getUniformLocation(w.shader, "uBrightness");
  w.uFxMode = gl.getUniformLocation(w.shader, 'uFxMode');
  w.uWindowDir = gl.getUniformLocation(w.shader, 'uWindowDir');
  w.uTex = [];
  for (let n = 0; n < gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS); n++) {
    w.uTex[n] = gl.getUniformLocation(w.shader, 'uTex' + n);
    gl.uniform1i(w.uTex[n], n);
  }
}

/**
 *  setup that occurs upon reload
 *  and on reload
 *  @param w {World_State} storage for your persistent world state
 */
async function onReload(w, info) {
  await initCommon(w);

  console.log(info.file);

  if (info.file.endsWith(".glsl")) {
    await loadShaders(w);
  }

  await initGraphicsCommon(w);
}
/**
 *  setup that occurs upon initial setup
 *  and on reload
 *  @param w {World_State} storage for your persistent world state
 */
async function setup(w) {

  // refer to the backend as "self"
  const self = MR.engine;

  // set which files to watch for reloading
  // (We can now load files other than this home world file)

  Code_Loader.hotReloadFiles(
    Path.getMainFilePath(), [{
        path: "lib/math/math.js"
      },
      {
        path: Path.fromLocalPath("chalktalk/chalktalk.js")
      },
      {
        path: Path.fromLocalPath("shaders/vertex.vert.glsl")
      },
      {
        path: Path.fromLocalPath("shaders/fragment.frag.glsl")
      },
    ]
  );

  // call a setup function you define in your local library file,
  // useful if it's the same code in most of your projects
  //
  // NOTE: if you're just calling one function, you can just parenthesize
  // like this and throw the module object away, or statically import the function at the top of this file
  (await MR.dynamicImport(Path.fromLocalPath("/prefs/setup_common.js"))).setup(w);

  // initialize state common to first launch and reloading
  await initCommon(w);

  renderList.setWorld(w);

  w.input = {
    turnAngle: 0,
    tiltAngle: 0,
    // get a cursor for the canvas
    cursor: ScreenCursor.trackCursor(MR.getCanvas())
  };

  w.prev_shape = null;

  // hide the pointer
  w.input.cursor.hide();

  // initialize key events
  Input.initKeyEvents();


  const gl = self.GPUCtx;

  w.CTScene = new CT.Scene({
    graphicsContext: gl
  });

  let out = await w.CTScene.init({
    // arguments
  });

  ShaderTextEditor.hideEditor();

  await loadShaders(w);

  await loadImages(w);

  renderList.setTextureCatalogue(w.textureCatalogue);

  /*
      console.group("testing shader loading");
      {
          console.log(vertex);
          console.log(fragment);
      }
      console.groupEnd();
  */

  w.vao = gl.createVertexArray();
  // this records the attributes we set along
  // with the vbos we point the attribute pointers to
  gl.bindVertexArray(w.vao);
  gl.useProgram(w.shader);

  w.buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, w.buffer);

  let bpe = Float32Array.BYTES_PER_ELEMENT;

  let aPos = gl.getAttribLocation(w.shader, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 0);

  let aNor = gl.getAttribLocation(w.shader, 'aNor');
  gl.enableVertexAttribArray(aNor);
  gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 3);

  let aTan = gl.getAttribLocation(w.shader, 'aTan');
  gl.enableVertexAttribArray(aTan);
  gl.vertexAttribPointer(aTan, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 6);

  let aUV = gl.getAttribLocation(w.shader, 'aUV');
  gl.enableVertexAttribArray(aUV);
  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 9);

  w.bufferAux = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, w.bufferAux);

  //let aUVOff = gl.getAttribLocation(w.shader, 'aUVOff');
  // gl.enableVertexAttribArray(aUVOff);
  // gl.vertexAttribPointer(aUVOff, 4, gl.FLOAT, false, bpe * 4, bpe * 0);

  await initGraphicsCommon(w);

  gl.clearColor(1.5,1.45,1.2, 1.);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 

  w.frameCount = 0;
}

let drawShape = (shape, matrix, color, opacity, textureInfo, fxMode) => {

  let gl = w.gl;
  let drawArrays = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
  gl.uniform1f(w.uBrightness, 1);
  gl.uniform4fv(w.uColor, color.length == 4 ? color : color.concat([opacity === undefined ? 1 : opacity]));
  gl.uniformMatrix4fv(w.uModel, false, matrix);
  gl.uniform1i(w.uFxMode, fxMode);
  windowLightDir.set(CG.matrixTranspose(matrix));
  windowLightDir.translate(0, rh / 2, rw / 2);
  gl.uniform3fv(w.uWindowDir, [windowLightDir.value()[12],windowLightDir.value()[13],windowLightDir.value()[14]]);
  if (textureInfo.isValid) {

    gl.uniform1i(w.uTexIndex, 0);

    // base texture : 0
    // bump texture : 1
    // ...
    for (let i = 0; i < textureInfo.textures.length; i += 1) {
      gl.uniform1f(w.uTexScale, textureInfo.scale);

      if (w.textureCatalogue.slotToTextureID(i) != textureInfo.textures[i].ID) {
        w.textureCatalogue.setSlotByTextureInfo(textureInfo.textures[i], i);
      }
    }

    gl.uniform1i(w.uBumpIndex, (textureInfo.textures.length > 1) ? 0 : -1);

  } else {
    gl.uniform1i(w.uTexIndex, -1);
  }


  if (shape != w.prev_shape) {
    gl.bindBuffer(gl.ARRAY_BUFFER, w.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape), gl.DYNAMIC_DRAW);
  }
  // if (textureInfo.isValid) {
  //     gl.bindBuffer(gl.ARRAY_BUFFER, w.bufferAux);
  //     const auxData = new Float32Array(4 * (shape.length / VERTEX_SIZE));
  //     for (let i = 0; i < auxData.length; i += 4) {
  //         auxData[i]     = textureInfo.image.uFrac;
  //         auxData[i + 1] = textureInfo.image.vFrac;

  //         auxData[i + 2] = textureInfo.image.w / textureInfo.textures[0].w;
  //         auxData[i + 3] = textureInfo.image.h / textureInfo.textures[0].h;
  //     }
  //     gl.bufferData(gl.ARRAY_BUFFER, auxData, gl.STREAM_DRAW);
  // }
  for (let i = 0; i < nViews; i++) {
    if (nViews > 1) {
      gl.viewport(viewport[i].x, viewport[i].y, viewport[i].width, viewport[i].height);
      gl.uniformMatrix4fv(w.uView, false, viewMat[i]);
      gl.uniformMatrix4fv(w.uProj, false, projMat[i]);
    }
    if (w.isToon) {
      gl.uniform1f(w.uToon, .3 * CG.norm(m.value().slice(0, 3)));
      gl.cullFace(gl.FRONT);
      drawArrays();
      gl.cullFace(gl.BACK);
      gl.uniform1f(w.uToon, 0);
    }
    if (w.isMirror)
      gl.cullFace(gl.FRONT);
    drawArrays();
  }
  gl.cullFace(gl.BACK);
  w.prev_shape = shape;
}


/**
 *  de-initialization/clean-up that occurs when switching to a different world
 *  @param w {World_State} storage for your persistent world state
 */
async function onExit(w) {
  w.textureCatalogue.deinit();
}

const FEET_TO_METERS = 0.3048;

let posX = 0,
  posY = -3,
  posZ = -4;
let rotX = 0,
  rotY = 0,
  rotZ = 0;

const black = [0, 0, 0];
const brown = [.25, .1, .05];
const darkRed = [.5, .0, .0];
const darkGray = [.2, .2, .2];
const gray = [.4, .4, .4];
const lightGray = [.5, .5, .5];
const beige = [.3, .2, .1];
const offWhite = [.5, .4, .3];
const white = [.9, .9, .9];
const skyBlue = [.5, .8, 1];
const warmYellow = [.8,.7,.3];
const lightBrown = [.42, .35, .25];
const superWhite = [1.5, 1.5, 1.5];

const dw = 2.5; // DOOR WIDTH
const dh = 7; // DOOR HEIGHT
const rw = 20; // ROOM WIDTH
const rh = 11; // ROOM HEIGHT
const sw = 10; // SAFE WIDTH
let th = 0.8; // TABLE HEIGHT
let tw = 1.7; // TABLE WIDTH
const sth = .1; // SEAT HEIGHT
const stw = .8; // SEAT WIDTH
const bcY = 17 * rh / 32 - 0.74; // BEAM CENTER Y
const bh = 7 * rh / 16 - 0.3; // BEAM HEIGHT

let grotX = 0;
let grotY = 0;
let moved = false;
let movePose = [0,0,0];
let moveMat = [];
let detMove = [0,0,0];


////////////////////////////////////////////////////////////////
//
// HANDLE CONTROLLER DRAWING AND CONTROLLER BUTTON INPUT ////////

let handPos = {left: [], right: []};
let grab = {left: false, right: false};
let justGrab = {left: true, right: true};

let controllerMatrix = {left: [], right: []};

let buttonState = {left: [], right: []};
for (let i = 0 ; i < 7 ; i++)
   buttonState.left[i] = buttonState.right[i] = false;

let onPress = (hand, button) => {
   console.log('pressed', hand, 'button', button);
}

let onRelease = (hand, button) => {
   console.log('released', hand, 'button', button);
}

function drawControllers() {
   for (let hand in controllerMatrix) {
      if (controllerMatrix[hand]) {
         m.identity();
         m.multiply(controllerMatrix[hand]);
	 m.translate(0,.025,.01);
         let triggerPressed = buttonState[hand][0];
         let gripPressed = buttonState[hand][1];

         let s = hand=='left' ? -1 : 1;
         mTorus().move(-.012*s,-.005,-.05).turnY(.11*s).size(.03,.03,.03).color(triggerPressed ? [1,0,0] : [1,1,1]);
         mCylinder().move(0,-.01,.01).size(.015,.02,.05).color([1,1,1]);
         let gx = gripPressed ? .007 : .01;
         mCube().move(-gx*s,-.01,.01).size(.01).color(gripPressed ? [1,0,0] : [1,1,1]);
      }
   }
}

////////////////////////////////////////////////////////////////



function drawScene(time, w) {

  // var d = new Date();
  // let hours = d.getHours() % 12;
  // let minutes = d.getMinutes();
  // let seconds = d.getSeconds();
  // let rotH = Math.PI / 2 - (Math.PI / 6) * (hours + minutes / 60); // ROTATION FOR HOUR HAND
  // let rotM = Math.PI / 2 - (minutes + seconds / 60) * Math.PI / 30; // ROTATION FOR MINUTE HAND
  // let rotS = Math.PI / 2 - seconds * Math.PI / 30; // ROTATION FOR SECOND HAND
  // let mL = 0.55; // MINUTE HAND LENGTH
  // let hL = 0.25; // HOUR HAND LENGTH

  drawControllers();

  m.identity();
  m.scale(FEET_TO_METERS);

  //QUICK NAVIGATION USING KEYS IN WEB MODE: ← LEFT, → RIGHT, ↑ FORWARD, ↓ BACK
  if (Input.keyIsDown(Input.KEY_LEFT)) {
    posX += 0.2;
  } else if (Input.keyIsDown(Input.KEY_RIGHT)) {
    posX -= 0.2;
  }
  if (Input.keyIsDown(Input.KEY_UP)) {
    posZ += 0.2;
  } else if (Input.keyIsDown(Input.KEY_DOWN)) {
    posZ -= 0.2;
  }
  //QUICK NAVIGATION USING KEYS IN WEB MODE: A TURN LEFT, D TURN RIGHT, W UP, S DOWN
  if (Input.keyIsDown(Input.KEY_S)) {
    posY += 0.2;
  } else if (Input.keyIsDown(Input.KEY_W)) {
    posY -= 0.2;
  }
  if (Input.keyIsDown(Input.KEY_A)) {
    rotY -= 2 * Math.min(0.01, Math.PI / 2 - rotX);
  } else if (Input.keyIsDown(Input.KEY_D)) {
    rotY += 2 * Math.min(0.01, Math.PI / 2 + rotX);
  }

  m.translate(posX, posY, posZ);
  m.rotateX(rotX);
  m.rotateY(rotY);
  m.rotateZ(rotZ);

  // TEST INTERACT WITH OBJECT: WILL BE PACKED INTO A FUNCTION
  let cubeColor = [1,1,1];
  let highlightColor = [1,0,0];
  let grabColor = [0,0,2];

  m.save();
  m.scale(0.2);

  if(! grab.left && ! grab.right)
    m.translate(0, 18, 10);

  for (let hand in handPos) {
    if (CG.distV3(m.getTranslate(),handPos[hand]) < 0.15) {  // CHECK WHETHER THE CONTROLLER HIT THE CUBE
      cubeColor = highlightColor;
      if (buttonState[hand][0])
         grab[hand] = true;      // CHECK WHETHER THE TRIGGER IS PRESSED
    }

    if (grab[hand]) {
      moved = true;
      cubeColor = grabColor;
      movePose = handPos[hand];
      moveMat = controllerMatrix[hand];
    }

    if (moved) {
      m.multiply(moveMat);
      m.setTranslate(movePose);
      m.translate(0,0,-1);
    }
    if (! buttonState[hand][0]) {
      grab[hand] = false;
      justGrab[hand] = true;
    }
  }

  drawShape(CG.cube, m.value(), cubeColor, 1, new TextureInfo(), 0);
  m.restore();

//  windowLightDir.restore();
//  mCube().move(-2, 3, 0).turnX(time).turnY(time).size(0.5).color(white);
  mCube().move(0, .01, 0).size(-sw / 2, .01, -sw / 2).color(white).textureView(w.textures[20].lookupImageByID(1)).textureAtlas(w.textures[20]); // SAFE AREA - RUG
  mCube().size(rw / 2, .001, rw / 2).color(0.8,0.7,0.7).textureView(w.textures[16].lookupImageByID(1)).textureAtlas(w.textures[16]); // FLOOR

  //THE WALL WITH WINDOW
  mCube().move(0, rh / 2, rw ).size(rw , rh , .001).color(superWhite).textureView(w.textures[24].lookupImageByID(1)).textureAtlas(w.textures[24]); // OUTDOOR VIEW
  mCube().move(0, rh / 2, rw / 2).size(rw / 2, rh / 2, .001).color(white).opacity(0.2).textureView(w.textures[19].lookupImageByID(1)).textureAtlas(w.textures[19]); // WINDOW PAPER

  mCube().move(rw / 2 - rw / 8, rh / 2, rw / 2).size(rw / 8, rh / 2, .3).color(white).textureView(w.textures[18].lookupImageByID(1)).textureAtlas(w.textures[18]); // WALL LEFT
  mCube().move(-rw / 2 + rw / 8, rh / 2, rw / 2).size(rw / 8, rh / 2, .3).color(white).textureView(w.textures[18].lookupImageByID(1)).textureAtlas(w.textures[18]); // WALL RIGHT
  mCube().move(0, rh - rh / 16, rw / 2).size(rw / 2, rh / 16, .3).color(white).textureView(w.textures[18].lookupImageByID(1)).textureAtlas(w.textures[18]); // WALL UP
  mCube().move(0, 0.35, rw / 2).size(rw / 2, 0.3, .3).color(white).textureView(w.textures[18].lookupImageByID(1)).textureAtlas(w.textures[18]); // WALL DOWN

  mCube().move(0, bcY, rw / 2).size(0.1, bh, .1).color(0.8,0.7,0.7).textureView(w.textures[0].lookupImageByID(1)).textureAtlas(w.textures[0]); // MAIN BEAM VERTICAL
  mCube().move(0, bcY, rw / 2).size(rw / 4, 0.05, .05).color(0.8,0.7,0.7).textureView(w.textures[0].lookupImageByID(1)).textureAtlas(w.textures[0]); // MAIN BEAM HORIZONTAL
  mCube().move(0, bcY + rh / 4, rw / 2).size(rw / 4, 0.05, .05).color(0.8,0.7,0.7).textureView(w.textures[0].lookupImageByID(1)).textureAtlas(w.textures[0]); // MAIN BEAM HORIZONTAL
  mCube().move(0, bcY - rh / 4, rw / 2).size(rw / 4, 0.05, .05).color(0.8,0.7,0.7).textureView(w.textures[0].lookupImageByID(1)).textureAtlas(w.textures[0]); // MAIN BEAM HORIZONTAL
  mCube().move(0, 7 * rh / 8, rw / 2).size(rw / 4 + 0.15, 0.1, .35).color(0.8,0.7,0.7).textureView(w.textures[0].lookupImageByID(1)).textureAtlas(w.textures[0]); // MAIN BEAM HORIZONTAL
  mCube().move(0, 0.6, rw / 2).size(rw / 4 + 0.15, 0.1, .35).color(0.8,0.7,0.7).textureView(w.textures[0].lookupImageByID(1)).textureAtlas(w.textures[0]); // MAIN BEAM HORIZONTAL

  mCube().move(rw / 4 + 0.05, bcY, rw / 2).size(0.1, bh, 0.35).color(0.8,0.7,0.7).textureView(w.textures[0].lookupImageByID(1)).textureAtlas(w.textures[0]);
  for(let i = 1; i < 20; i ++){
    mCube().move(rw / 4 - i * rw / 40, bcY, rw / 2).size(0.03, bh, 0.03).color(0.8,0.7,0.7).textureView(w.textures[0].lookupImageByID(1)).textureAtlas(w.textures[0]); // BEAM VERTICAL i
  }
  mCube().move(rw / 4 - rw / 2 - 0.05, bcY, rw / 2).size(0.1, bh, 0.35).color(0.8,0.7,0.7).textureView(w.textures[0].lookupImageByID(1)).textureAtlas(w.textures[0]);

  mCube().move(0, rh / 2, -rw / 2 + 0.003).turnZ(-Math.PI / 2).size(3.2, 4.8, .0001).color(superWhite).textureView(w.textures[21].lookupImageByID(1)).textureAtlas(w.textures[21]); // PAINTING
  mCube().move(0, rh / 2, -rw / 2 + 0.001).turnZ(-Math.PI / 2).size(3.3, 4.9, .0005).color(0.25, 0.2, 0.2).textureView(w.textures[9].lookupImageByID(1)).textureAtlas(w.textures[9]); // PAINTING FRAME

  mCube().move( 0, 0.4, -7 * rw / 16).size(0.4 * rw, 0.4, rw/16).color(white).color(darkGray).textureView(w.textures[22].lookupImageByID(1)).textureAtlas(w.textures[22]); // SIDE TABLE
  mCube().move(0, 0.01, -3 * rw / 7).size(rw/2, 0.01, rw/14); // SIDE TABLE FLOOR
  mCube().move(0, 7 * rh / 8, -5 * rw / 14).size(rw/2, rh/8, 0.05).color(0.9,0.8,0.8).textureView(w.textures[0].lookupImageByID(1)).textureAtlas(w.textures[0]); // SIDE TABLE ROOF

  mCube().move(0, rh / 2, -rw / 2).size(rw / 2, rh / 2, .001).color(0.5,0.4,0.4).textureView(w.textures[16].lookupImageByID(1)).textureAtlas(w.textures[16]); // WALL
  mCube().move(rw / 2, rh / 2, 0).size(.001, rh / 2, rw / 2).color(superWhite).textureView(w.textures[18].lookupImageByID(1)).textureAtlas(w.textures[18]); // WALL
  mCube().move(-rw / 2, rh / 2, 0).size(.001, rh / 2, rw / 2).color(superWhite).textureView(w.textures[18].lookupImageByID(1)).textureAtlas(w.textures[18]); // WALL
  mCube().move(0, rh, 0).size(rw / 2, .001, rw / 2).color(white).textureView(w.textures[16].lookupImageByID(1)).textureAtlas(w.textures[16]); // CEILING

  mGluedCylinder().turnX(Math.PI / 2).move(0, 13 * th / 12, 0).size(tw, tw, th / 6).color(0.35,0.3,0.3).textureView(w.textures[17].lookupImageByID(1)).textureAtlas(w.textures[17]); // TABLE
  mDisk().move(0, 13 * th / 12 + 0.11, 0).turnX(Math.PI/2).size(tw, tw,0.01).color(white).textureView(w.textures[17].lookupImageByID(1)).textureAtlas(w.textures[17]); // TABLE
  mCube().move(0.6 * tw, th / 2, 0.6 * tw).size(0.15, th / 2, 0.15).color(white).textureView(w.textures[17].lookupImageByID(1)).textureAtlas(w.textures[17]); // TABLE
  mCube().move(0.6 * tw, th / 2, -0.6 * tw).size(0.15, th / 2, 0.15).color(white).textureView(w.textures[17].lookupImageByID(1)).textureAtlas(w.textures[17]); // TABLE
  mCube().move(-0.6 * tw, th / 2, 0.6 * tw).size(0.15, th / 2, 0.15).color(white).textureView(w.textures[17].lookupImageByID(1)).textureAtlas(w.textures[17]); // TABLE
  mCube().move(-0.6 * tw, th / 2, -0.6 * tw).size(0.15, th / 2, 0.15).color(white).textureView(w.textures[17].lookupImageByID(1)).textureAtlas(w.textures[17]); // TABLE
  //mCube().move(0, th / 2, 0).size(tw / 1.5, th / 2, tw / 1.5).color(darkGray).textureView(w.textures[6].lookupImageByID(1)).textureAtlas(w.textures[6]); // TABLE

  mRoundedCylinder().turnX(Math.PI / 2).move(-(sw / 4.5), sth, 0).size(stw, stw, sth).color(white).textureView(w.textures[18].lookupImageByID(1)).textureAtlas(w.textures[18]); // SEAT
  mRoundedCylinder().turnX(Math.PI / 2).move((sw / 4.5), sth, 0).size(stw, stw, sth).color(white).textureView(w.textures[18].lookupImageByID(1)).textureAtlas(w.textures[18]); // SEAT
  mRoundedCylinder().turnX(Math.PI / 2).move(0, sth, -(sw / 4.5)).size(stw, stw, sth).color(white).textureView(w.textures[18].lookupImageByID(1)).textureAtlas(w.textures[18]); // SEAT
  mRoundedCylinder().turnX(Math.PI / 2).move(0, sth, (sw / 4.5)).size(stw, stw, sth).color(white).textureView(w.textures[18].lookupImageByID(1)).textureAtlas(w.textures[18]); // SEAT

  //TEST BEZIER SPLINE
  // let path = CG.sampleBezierPath( [-1,-1/3, 1/3,   1],  // X keys
  //                                 [ 2,   0,   2,   0],  // Y keys
  //                                 [ 1,  -1,  -1,   1],  // Z keys
  // 			                          60);
  // for (let n = 0 ; n < path.length ; n++) {
  //       mSphere().move(path[n][0], path[n][1], path[n][2]).size(.1);
  // }
  //

  //TEST CATMULL RUM SPLINE
  // let P = [
  //   [-1, -1, -1],
  //   [-2 / 3, -.3, 1],
  //   [1 / 3, -1 / 3, 1],
  //   [1, 1, -1],
  //   [-1, -1, -1],
  // ];
  //
  // for (let n = 0; n < P.length; n++) // SHOW KEYS AS LARGE CUBES.
  //   mCube().move(P[n][0], P[n][1] + 3, P[n][2]).size(.03).turnX(Math.PI / 4).color(darkRed).textureView(w.textures[8].lookupImageByID(1)).textureAtlas(w.textures[8]);;
  //
  // for (let n = 0; n <= 50; n++) { // SHOW PATH AS SMALL CUBES.
  //   let p = CG.evalCRSpline(P, n / 50);
  //   mCube().move(p[0], p[1] + 3, p[2]).size(.001 * n).textureView(w.textures[8].lookupImageByID(1)).textureAtlas(w.textures[8]);
  // }

  //TEST LATHE
 //  let vase = CG.createMeshVertices(30, 30, CG.uvToLathe, [
 //    CG.bezierToCubic([0.3, .3, .3, .075, .2, .2, 0]), // r
 //    CG.bezierToCubic([-1, -1, 0, .85, .92, 0.9, 0.9]) // z
 //  ]);
 //
 //  let mVase = () => renderList.add(vase);
 // mVase().turnX(-Math.PI / 2).move(0, th + 0.4, 0).color(0.01,0.01,0.01).size(0.4).fx(1);

  // SCULPTURES : CURRENTLY JUST SOME CONES
  // mCone().turnX(Math.PI/2).move(9.,1.,-9).size(0.25,0.25,1.4);
  // mCone().turnX(Math.PI/2).move(8.2,0.8,-9).size(0.3,0.3,0.8).color(0.2,0.1,0.1);
  // mCone().turnX(Math.PI/2).move(7,1.,-9).size(0.3,0.3,1.).color(0.4,0.4,0.4).fx(1);

  // TEST MATERIALS: fx(1) - PLASTER, fx(2) - METALLIC, fx(3) - GLOSSY RUBBER
  // mTorus().turnY(time).move(-1.5, th + 2., 0).size(0.2).color(0.2, 0.1, 0.1).fx(2);
  // mTorus().turnY(time).move(-0.5, th + 2., 0).size(0.2).color(0.5, 0.2, 0.25);
  // mTorus().turnY(time).move(0.5, th + 2., 0).size(0.2).color(.3, .4, .8).fx(3);
  // mTorus().turnY(time).move(1.5, th + 2., 0).size(0.2).color(.68, .65, .65).fx(1);



  // TEST EXTRUDE SHAPE
  // let createCircularPath = n => {
  //   let path = [];
  //   for (let i = 0; i <= n; i++) {
  //     let theta = 2 * Math.PI * i / n;
  //     let c = Math.cos(theta);
  //     let s = Math.sin(theta);
  //     path.push([c, s, 0, c, s, 0]);
  //   }
  //   return path;
  // }
  //
  // let createStraightPath = n => {
  //   let path = [];
  //   for (let i = 0; i <= n; i++) {
  //     path.push([0, i/n, 0, 0, i/n, 0]);
  //   }
  //   return path;
  // }
  //
  // let createRingShape = function() {
  //   let a = .085,
  //     b = .04,
  //     c = .16,
  //     A = .46,
  //     B = .6,
  //     C = .2;
  //
  //   let ringProfile = CG.sampleBezierPath(
  //     [a, b, 0, 0, 0, 0, 0, 0, b, a, c, c, a], [A, B, B, A, C, -C, -A, -B, -B, -A, -C, C, A], [0, 0, 0, 0],
  //     20);
  //   return CG.extrude(ringProfile, createStraightPath(50));
  // }
  //
  // let mRing = () => renderList.add(createRingShape());
  //
  // mRing().move(0, 3, 0).turnX(time).turnY(time).size(10, 10, 10).color(0.1, 0.1, 0.08).fx(2);
  //

  // test textured cubes

  // const cycleIdx = Math.floor((w.frameCount / 60) % 3);
  // mCube    ().move(-2,.5, -4).turnY(time).size(.65).color(1,1,1)
  // // defines image region of texture (for now, the entire texture, always)
  // .textureView(w.textures[5].lookupImageByID(1))
  // // base
  // .textureAtlas(w.textures[5])
  // // bump
  // .textureAtlas(w.textures[4]);
  //
  //
  // mCube    ().move(-0,.5, -4).turnY(time).size(.65).color(1,1,1)
  // .textureView(w.textures[(cycleIdx + 1) % 3].lookupImageByID(1))
  // .textureAtlas(w.textures[(cycleIdx + 1) % 3]);
  //
  // mCube    ().move(2,.5, -4).turnY(time).size(.65).color(1,1,1)
  // .textureView(w.textures[(cycleIdx + 2) % 3].lookupImageByID(1))
  // .textureAtlas(w.textures[(cycleIdx + 2) % 3]);
}

function drawFrame(time, w) {
  w.frameCount += 1;

  renderList.beginFrame();
  drawScene(time, w);
  renderList.endFrame(drawShape);
}

let prevTime = 0;

/**
 *  animation function for a WebXR-supporting platform, using WebGL graphics
 *  @param t {Number} elapsed time in milliseconds
 */
function animateXRWebGL(t, frame) {
  const self = MR.engine;

  const xrInfo = self.xrInfo;

  // request next frame
  self._animationHandle = xrInfo.session.requestAnimationFrame(
    self.config.onAnimationFrameXR
  );

  // update time
  self.time = t / 1000.0;
  self.timeMS = t;

  const time = self.time;

  // this is the state variable
  const w = self.customState;

  const session = frame.session;
  // unpack session and pose information
  const layer = session.renderState.baseLayer;

  const pose = frame.getViewerPose(xrInfo.immersiveRefSpace);
  xrInfo.pose = pose;
  // updates the extended pose data
  // containing buffer representations of position, orientation
  xrInfo.poseEXT.update(xrInfo.pose);

  // this crude function updates the controller state
  function gripControllerUpdate() {
    const inputSources = session.inputSources;
    for (let i = 0; i < inputSources.length; i += 1) {
      const inputSource = inputSources[i];

      if (inputSource.gripSpace) {
        const gripPose = frame.getPose(
          inputSource.gripSpace, xrInfo.immersiveRefSpace
        );
        let gamepad = inputSource.gamepad;
        if (gripPose) {
	  let hand = inputSource.handedness;

          controllerMatrix[hand] = gripPose.transform.matrix;

          switch (inputSource.handedness) {
            case 'left':
              MR.leftController = gamepad;
              break;
            case 'right':
              MR.rightController = gamepad;
              break;
          }
          for (let i = 0; i < gamepad.buttons.length; i++) {
            let button = gamepad.buttons[i];
            if (button.pressed && !buttonState[hand][i]) {
              onPress(hand, i);
            }
            if (!button.pressed && buttonState[hand][i]) {
              onRelease(hand, i);
            }
            buttonState[hand][i] = button.pressed;
          }
        }
      }
    }
  }
  gripControllerUpdate();

  // API-specific information
  // (transforms, tracking, direct access to render state, etc.)
  self.systemArgs.frame = frame;
  self.systemArgs.pose = pose;
  // renderState contains depthFar, depthNear
  self.systemArgs.renderState = session.renderState;

  const gl = self.GPUCtx;
  const glAPI = self.gpuAPI;
  const glCtxInfo = self.gpuCtxInfo;

  gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);

  // Clear the framebuffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const views = pose.views;
  nViews = views.length;

  for (let i = 0; i < nViews; i++) {
    viewport[i] = layer.getViewport(views[i]);
    projMat[i] = views[i].projectionMatrix;
    viewMat[i] = views[i].transform.inverse.matrix;
  }

  for (let i = 0; i < nViews; i++) {
    self.systemArgs.viewIdx = i;
    self.systemArgs.view = views[i];
    self.systemArgs.viewport = viewport[i];
  }

  drawFrame(time, w);

  // tells the input system that the end of the frame has been reached
  Input.setGamepadStateChanged(false);
}

let nViews = 1;
let viewport = [null, null];
let projMat = [null, null];
let viewMat = [null, null];


/**
 *  animation function for a PC platform, using WebGL graphics
 *  @param t {Number} elapsed time in milliseconds
 */
function animatePCWebGL(t) {
  const self = MR.engine;

  self._animationHandle = window.requestAnimationFrame(self.config.onAnimationFrameWindow);

  // update time
  self.time = t / 1000.0;
  self.timeMS = t;


  window.dt = self.timeMS - prevTime;
  prevTime = self.timeMS;

  // this is the state variable
  const w = self.customState;

  const gl = self.GPUCtx;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  const viewport = self.systemArgs.viewport;
  viewport.x = 0;
  viewport.y = 0;
  viewport.width = gl.drawingBufferWidth;
  viewport.height = gl.drawingBufferHeight;
  self.systemArgs.viewIdx = 0;

  Linalg.mat4.identity(self._viewMatrix);
  //self._viewMatrix = CG.matrixMultiply(self._viewMatrix, CG.matrixRotateY(self.time));

  Linalg.mat4.perspective(self._projectionMatrix,
    Math.PI / 4,
    self._canvas.width / self._canvas.height,
    0.01, 1024
  );

  gl.uniformMatrix4fv(w.uView, false, self._viewMatrix);
  gl.uniformMatrix4fv(w.uProj, false, self._projectionMatrix);

  Input.updateKeyState();

  // graphics

  // bind default framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  drawFrame(self.time, w);

  // tells the input system that the end of the frame has been reached
  w.input.cursor.updateState();
}

export default function main() {
  const def = {
    name: 'chalktalk',
    setup: setup,
    onAnimationFrameWindow: animatePCWebGL,
    onAnimationFrameXR: animateXRWebGL,
    onReload: onReload,
    onExit: onExit
  };

  return def;
}
