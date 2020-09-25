"use strict";

// static imports (cannot be reloaded!)

// for loading files and assets at specific paths
// NOTE: (the * syntax means to import all symbols into the named object "Path")
import * as Path            from "/lib/util/path.js";
// for loading basic assets
import * as Asset           from "/lib/util/asset.js";
import * as Image           from "/lib/util/image.js";
// for canvas interaction
import * as Canvas          from "/lib/util/canvas.js";
// for memory operations
import * as Mem             from "/lib/core/memory.js";
// webgl shader utilities
import * as Shader          from "/lib/core/gpu/webgl_shader_util.js";
// builtin integrated shader editor
// NOTE: this import syntax imports the specific symbol from the module by name
import {ShaderTextEditor} from "/lib/core/shader_text_editor.js";
// mouse cursor input
import {ScreenCursor}      from "/lib/input/cursor.js";
// code reloading utility
import * as Code_Loader     from "/lib/core/code_loader.js";
// input handling
import * as Input           from "/lib/input/input.js";

// linear algebra library (can be replaced, but is useful for now)
import * as _             from "/lib/third-party/gl-matrix-min.js";
let Linalg = glMatrix;


let noise = new ImprovedNoise();
let m = new Matrix();
let w = null;

let leftPressed = false;
let rightPressed = false;

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
    Maths   = await MR.dynamicImport("/lib/math/math.js");
    CT      = await MR.dynamicImport(Path.fromLocalPath("/chalktalk/chalktalk.js"));


}

async function loadShaders(w) {
    const vertex   = await Asset.loadTextRelativePath("/shaders/vertex.vert.glsl");
    const fragment = await Asset.loadTextRelativePath("/shaders/fragment.frag.glsl");

    let errorStatus = {};
    const shader = Shader.compileValidateStrings(vertex, fragment, errorStatus);
    gl.useProgram(shader);
    w.gl = gl;
    w.shader = shader;
}

// textures

class SubTextureHandle {
    constructor() {
        this.ID    = 0;
        this.subID = 0;
        this.name  = "";
        
        this.u = 0;
        this.v = 0;

        this.w = 0;
        this.h = 0;
    }
}
class TextureHandle {
    constructor() {
        this.ID          = 0;
        this.name        = null;
        this.resource    = null;
        this.slot        = 0;
        this.subTextures = [];
        this.mapNameToSubTexture = new Map();
    }

    lookupImageByName(name) {
        if (this.mapNameToSubTexture.has(name)) {
            const ID = this.mapNameToSubTexture.get(name);
            return this.subTextures[ID - 1];
        }
        return null;
    }

    lookupImageByID(ID) {
        if (this.subTextures.length < ID) {
            return null;
        }

        return this.subTextures[ID - 1];
    }
}

function deleteTexture2D(catalogue, textureInfo) {

    // 0 is the null ID
    if (textureInfo.ID <= 0) {
        return false;
    }

    textureInfo.subTextures = [];

    const gl = catalogue.gl;

    gl.deleteTexture(textureInfo.resource);

    return true;
}


function registerTextureToCatalogue(catalogue, descriptor) {
    const ID = acquireNextAvailID(catalogue);

    while (catalogue.textures.length < ID) {
        catalogue.textures.push(new TextureHandle());
    }

    const texHandle = catalogue.textures[ID - 1];

    texHandle.ID = ID;
    texHandle.name = descriptor.name || texHandle.ID.toString();

    catalogue.mapNameToTexture.set(texHandle.name, ID);

    texHandle.resource = catalogue.gl.createTexture();

    return texHandle;
}

// TODO deletion - commented-out code uses non-existent fields from before some changes
// function deleteTextureFromCatalogueByID(catalogue, ID) {
//     const tex = catalogue.mapIDToSubTexture.get(ID);
//     catalogue.mapIDToTexture.delete(tex.ID);
//     catalogue.mapNameToTexture.delete(tex.name);
//     catalogue.freeIDs.push(ID);

//     if (catalogue.mapIDToSlot.has(ID)) {
//         catalogue.mapIDToSlot.delete(ID);
//     }

//     deleteTexture2D(catalogue, tex);
// }
// function deleteTextureFromCatalogueByName(catalogue, name) {
//     const tex = catalogue.mapNameToTexture.get(name);
//     catalogue.mapNameToTexture.delete(tex.name);    
//     catalogue.mapIDToTexture.delete(tex.ID);
//     catalogue.mapIDToSlot.delete(tex.ID);

//     if (catalogue.mapIDToSlot.has(ID)) {
//         catalogue.mapIDToSlot.delete(ID);
//     }
// }

class TextureCatalogue {
    constructor(gl, w = 2048, h = 2048) {
        this.mapNameToTexture = new Map();
        this.mapIDToSlot = new Map();

        this.freeIDs = [];

        this.canvas    = document.createElement('canvas');
        this.canvas.id = "TextureCatalogue";
        this.canvas.zIndex = 10000;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.canvas.width  = w;
        this.canvas.height = h;

        this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 0.0;
        this.ctx.fillStyle = 'black';
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;

        this.textures = [];

        this.nextAvailID = 1;

        this.gl = gl;
    }

    lookupByName(name) {
        const ID = this.mapNameToTexture.get(name);
        return this.lookupByID(ID);
    }
    lookupByID(ID) {
        if (ID > this.textures.length) {
            return null;
        }
        return this.textures[ID - 1];
    }

    setSlotByID(ID, slot) {
        if (this.mapIDToSlot.has(ID)) {
            const existingSlot = this.mapIDToSlot.get(ID);
            if (existingSlot == slot) {
                return;
            } else {
                const gl = this.gl;
                gl.activeTexture(gl.TEXTURE0 + slot);
                gl.bindTexture(gl.TEXTURE_2D, this.lookupByID(ID).resource);
            }
        } else {
            this.mapIDToSlot.set(ID, slot);
            gl.activeTexture(gl.TEXTURE0 + slot);
            gl.bindTexture(gl.TEXTURE_2D, this.lookupByID(ID).resource);
        }
    }

    getSlotByID(ID) {
        if (this.mapIDToSlot.has(ID)) {
            return this.mapIDToSlot.get(ID);
        }
        return -1;
    }

    registerTextureToCatalogue(descriptor) {
        return registerTextureToCatalogue(this, descriptor);
    }

    // removeTextureFromCatalogueByID(ID) {
    //     return removeTextureFromCatalogueByID(this, ID);
    // }

    // removeTextureFromCatalogueByName(name) {
    //     return removeTextureFromCatalogueByName(this, name);
    // }

    deinit() {
        this.canvas.width = 0;
        this.canvas.height = 0
        this.canvas = null;
    }
}

function acquireNextAvailID(catalogue) {
    if (catalogue.freeIDs.length > 0) {
        return catalogue.freeIDs.pop();
    }

    catalogue.nextAvailID += 1;
    return catalogue.nextAvailID - 1;
}


function makeSubTexture(catalogue, texHandle, srcName, u, v, w, h) {
    const subTexture = new SubTextureHandle();
    texHandle.subTextures.push(subTexture);
        
    subTexture.ID    = texHandle.ID;
    subTexture.subID = texHandle.subTextures.length;

    subTexture.name  = srcName || subTexture.subID.toString();
        
    subTexture.u = u;
    subTexture.v = v;

    subTexture.w = w;
    subTexture.h = h;

    texHandle.mapNameToSubTexture.set(srcName, subTexture.subID);

    return subTexture;
}

// catalogue:
//      texture catalogue storing info about textures
// descriptor: 
//     settings for the texture
// srcList: 
//     list of images to put into the texture
// padding: 
//     number of transparent pixels with 
//     which to surround an individual subtexture to avoid undesired blending
//     (default = 8)
function makeTexture2DWithImages(catalogue, descriptor, slot, srcList, srcNameList, padding = 0, cornerWhite = false) {
    if (!descriptor) {
        throw new Error("texture descriptor not provided");
    }
    console.log(srcList, srcNameList);
    if (srcList.length != srcNameList.length) {
        throw new Error("source image and source image name input lengths do not match");
    }

    const gl = catalogue.gl;

    const texHandle = registerTextureToCatalogue(catalogue, descriptor);
    catalogue.setSlotByID(texHandle.ID, slot);


    gl.activeTexture(gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_2D, texHandle.resource);

    for (let i = 0; i < descriptor.paramList.length; i += 1) {
        gl.texParameteri(gl.TEXTURE_2D, descriptor.paramList[i][0], descriptor.paramList[i][1]);
    }


    // pack the textures
    {
        // taken from:
        // https://github.com/mapbox/potpack

   
        function potpack(boxes) {

            // calculate total box area and maximum box width
            let area = 0;
            let maxWidth = 0;

            for (const box of boxes) {
                area += box.w * box.h;
                maxWidth = Math.max(maxWidth, box.w);
            }

            // sort the boxes for insertion by height, descending
            boxes.sort((a, b) => b.h - a.h);

            // aim for a squarish resulting container,
            // slightly adjusted for sub-100% space utilization
            const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth);

            // start with a single empty space, unbounded at the bottom
            const spaces = [{x: 0, y: 0, w: startWidth, h: Infinity}];

            let width = 0;
            let height = 0;

            for (const box of boxes) {
                // look through spaces backwards so that we check smaller spaces first
                for (let i = spaces.length - 1; i >= 0; i--) {
                    const space = spaces[i];

                    // look for empty spaces that can accommodate the current box
                    if (box.w > space.w || box.h > space.h) continue;

                    // found the space; add the box to its top-left corner
                    // |-------|-------|
                    // |  box  |       |
                    // |_______|       |
                    // |         space |
                    // |_______________|
                    box.x = space.x;
                    box.y = space.y;

                    height = Math.max(height, box.y + box.h);
                    width = Math.max(width, box.x + box.w);

                    if (box.w === space.w && box.h === space.h) {
                        // space matches the box exactly; remove it
                        const last = spaces.pop();
                        if (i < spaces.length) spaces[i] = last;

                    } else if (box.h === space.h) {
                        // space matches the box height; update it accordingly
                        // |-------|---------------|
                        // |  box  | updated space |
                        // |_______|_______________|
                        space.x += box.w;
                        space.w -= box.w;

                    } else if (box.w === space.w) {
                        // space matches the box width; update it accordingly
                        // |---------------|
                        // |      box      |
                        // |_______________|
                        // | updated space |
                        // |_______________|
                        space.y += box.h;
                        space.h -= box.h;

                    } else {
                        // otherwise the box splits the space into two spaces
                        // |-------|-----------|
                        // |  box  | new space |
                        // |_______|___________|
                        // | updated space     |
                        // |___________________|
                        spaces.push({
                            x: space.x + box.w,
                            y: space.y,
                            w: space.w - box.w,
                            h: box.h
                        });
                        space.y += box.h;
                        space.h -= box.h;
                    }
                    break;
                }
            }



            
            return {
                w: width, // container width
                h: height, // container height
                fill: (area / (width * height)) || 0 // space utilization
            };
        }
 
        {
            const boxes = [];
            for (let i = 0; i < srcList.length; i += 1) {
                boxes.push({
                    w : srcList[i].width  + padding,
                    h : srcList[i].height + padding,
                    i : i,
                });

            }

            const packed = potpack(boxes);


            let resized = false;

            // taken from:
            // https://www.geeksforgeeks.org/smallest-power-of-2-greater-than-or-equal-to-n/
            function nextPowerOf2(n)  {
                n--; 
                n |= n >> 1; 
                n |= n >> 2; 
                n |= n >> 4; 
                n |= n >> 8; 
                n |= n >> 16; 
                n++; 
                return n; 
            }


            if (cornerWhite) {
                packed.w = nextPowerOf2(packed.w + padding + 1);
                packed.h = nextPowerOf2(packed.h + padding + 1);
            } else {
                packed.w = nextPowerOf2(packed.w);
                packed.h = nextPowerOf2(packed.h);                
            }

            const canvas = catalogue.canvas;

            if (canvas.width < packed.w) {
                canvas.width = packed.w;
                resized = true;
            }
            if (canvas.height < packed.h) {
                canvas.height = packed.h;
                resized = true;
            }

            const ctx = catalogue.ctx;
            
            if (resized) {
                ctx.rect(0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 0.0;
                ctx.fillStyle = 'black';
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
            ctx.globalAlpha = 1.0;

            let offset = 0;
            if (cornerWhite) {
                offset = padding + 4;
                
                ctx.fillStyle = "white"
                ctx.fillRect(0, 0, 4, 4);
            }

            for (let i = 0; i < boxes.length; i += 1) {
                ctx.drawImage(srcList[boxes[i].i], boxes[i].x + offset, boxes[i].y + offset);
                makeSubTexture(
                    catalogue,
                    texHandle,
                    srcNameList[i],
                    boxes[i].x,
                    boxes[i].y,
                    srcList[i].width, 
                    srcList[i].height
                );                
            }
        }
    }

    gl.texImage2D(
        gl.TEXTURE_2D,
        descriptor.detailLevel,
        descriptor.internalFormat,
        descriptor.format,
        descriptor.type,
        catalogue.canvas
    );

    if (descriptor.generateMipmap) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    return texHandle;
}

// returns a default-initialized texture 2D descriptor
function makeTexture2DDescriptor(gl) {
    return  {
        detailLevel    : 0,
        internalFormat : gl.RGBA,
        format         : gl.RGBA,
        type           : gl.UNSIGNED_BYTE,
        generateMipmap : false,
        width          : 0,
        height         : 0,
        border         : 0,
        name           : null,
        paramList      : [],
        slot           : 0
    };
}



async function loadImages(w) {

    let images = null;
    try {
        images = await Image.loadImagesAsync([
            Path.fromLocalPath("assets/textures/wood.png"),

            "assets/textures/brick.png",
            Path.fromLocalPath("assets/textures/tiles.png"),

        ]);

        // stores textures
        w.textureCatalogue = new TextureCatalogue(gl);
        
        // texture configuration object
        const textureDesc          = makeTexture2DDescriptor(gl);
        textureDesc.generateMipmap = true;
        textureDesc.name           = 'atlas1';

        textureDesc.paramList.push([gl.TEXTURE_WRAP_S, gl.REPEAT]);
        textureDesc.paramList.push([gl.TEXTURE_WRAP_S, gl.REPEAT]);
        textureDesc.paramList.push([gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST]);
        textureDesc.paramList.push([gl.TEXTURE_MAG_FILTER, gl.LINEAR]);

        w.textureAtlas1 = makeTexture2DWithImages(
            // catalogue to fill
            w.textureCatalogue, 
            // config
            textureDesc,
            // texture binding slot
            0, 
            // list of images
            images, 
            // list of image names
            [
                "wood", "brick", "tiles"
            ],

            // optional args:

            // padding between images (to avoid blending issues at boundaries)
            8,
            // enable a 4x4 white square at 
            // u,v == 0,0 so you can have one shader for 
            // textures and non-textures 
            // (no texture means u,v == 0,0 so you just multiply by 1,1,1,1)
            true
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

        // REMOVE THIS LINE
        document.body.appendChild(w.textureCatalogue.canvas);

    } catch (e) {
        console.error(e);
    }

}

//

async function initGraphicsCommon(w) {
    w.uColor      = gl.getUniformLocation(w.shader, 'uColor');
    w.uCursor     = gl.getUniformLocation(w.shader, 'uCursor');
    w.uModel      = gl.getUniformLocation(w.shader, 'uModel');
    w.uProj       = gl.getUniformLocation(w.shader, 'uProj');
    w.uTexScale   = gl.getUniformLocation(w.shader, 'uTexScale');
    w.uTexIndex   = gl.getUniformLocation(w.shader, 'uTexIndex');
    w.uTime       = gl.getUniformLocation(w.shader, 'uTime');
    w.uToon       = gl.getUniformLocation(w.shader, 'uToon');
    w.uView       = gl.getUniformLocation(w.shader, 'uView');
    w.uBrightness = gl.getUniformLocation(w.shader, "uBrightness");
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
    Path.getMainFilePath(),
    [   
        {path : "lib/math/math.js"},
        {path : Path.fromLocalPath("chalktalk/chalktalk.js")},
        {path : Path.fromLocalPath("shaders/vertex.vert.glsl")},
        {path : Path.fromLocalPath("shaders/fragment.frag.glsl")},
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
        turnAngle : 0,
        tiltAngle : 0,
        // get a cursor for the canvas
        cursor    : ScreenCursor.trackCursor(MR.getCanvas())
    };

    w.prev_shape = null;

    // hide the pointer
    w.input.cursor.hide();

    // initialize key events
    Input.initKeyEvents();


    const gl = self.GPUCtx;

    w.CTScene = new CT.Scene({
        graphicsContext : gl
    });

    let out = await w.CTScene.init({
        // arguments
    });

    ShaderTextEditor.hideEditor();

    await loadShaders(w);

    await loadImages(w);

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

   let aUV  = gl.getAttribLocation(w.shader, 'aUV');
   gl.enableVertexAttribArray(aUV);
   gl.vertexAttribPointer(aUV , 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 9);

   await initGraphicsCommon(w);

   gl.clearColor(0.0, 0.35, 0.5, 1.0); 
   gl.enable(gl.DEPTH_TEST);
   gl.enable(gl.CULL_FACE);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 
}

let drawShape = (shape, matrix, color, opacity, texture, textureScale) => {
    let gl = w.gl;
    let drawArrays = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
    gl.uniform1f(w.uBrightness, 1);//input.brightness === undefined ? 1 : input.brightness);
    gl.uniform4fv(w.uColor, color.length == 4 ? color : color.concat([opacity === undefined ? 1 : opacity]));
    gl.uniformMatrix4fv(w.uModel, false, matrix);
    gl.uniform1i(w.uTexIndex, texture === undefined ? -1 : texture);
    gl.uniform1f(w.uTexScale, textureScale === undefined ? 1 : textureScale);
    if (shape != w.prev_shape)
       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( shape ), gl.STATIC_DRAW);
    for (let i = 0 ; i < nViews ; i++) {
       if (nViews > 1) {
          gl.viewport(viewport[i].x, viewport[i].y, viewport[i].width, viewport[i].height);
          gl.uniformMatrix4fv(w.uView, false, viewMat[i]);
          gl.uniformMatrix4fv(w.uProj, false, projMat[i]);
       }
       if (w.isToon) {
          gl.uniform1f (w.uToon, .3 * CG.norm(m.value().slice(0,3)));
          gl.cullFace(gl.FRONT);
          drawArrays();
          gl.cullFace(gl.BACK);
          gl.uniform1f (w.uToon, 0);
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

function drawScene(time) {

    const black     = [0,0,0];
    const brown     = [.25,.1,.05];
    const darkRed   = [.5,.0,.0];
    const darkGray  = [.3,.3,.3];
    const gray      = [.4,.4,.4];
    const lightGray = [.5,.5,.5];
    const beige     = [.3,.2,.1];
    const offWhite  = [.5,.4,.3];
    const skyBlue   = [.5,.8,1];

    const dw = 2.5; // DOOR WIDTH
    const dh = 7  ; // DOOR HEIGHT
    const rw = 20 ; // ROOM WIDTH
    const rh = 11 ; // ROOM HEIGHT
    const sw = 10 ; // SAFE WIDTH


    for (let i = 0 ; i < 2 ; i++)
       if (controllerMatrix[i]) {
          m.identity();
          m.multiply(controllerMatrix[i]);
	  let triggerPressed = buttonState[i][0];
	  let gripPressed = buttonState[i][1];

          mTorus().move(0,0,-.05).size(.03,.03,.033).color(triggerPressed ? 1 : 0, 0, 0);
          mCylinder().move(0,-.01,.01).size(.02,.02,.05).color(0,0,0);
	  let gx = gripPressed ? .01 : .013;
          mCube().move(i==0?gx:-gx,-.01,.01).size(.01).color(gripPressed ? [1,0,0] : [.1,.1,.1]);
       }

    m.identity();
    m.scale(FEET_TO_METERS);

    mCube().move(-sw/4,0,-sw/4).size(-sw/4,.002,-sw/4).color(gray     ); // SAFE AREA
    mCube().move( sw/4,0,-sw/4).size(-sw/4,.002,-sw/4).color(lightGray); // SAFE AREA
    mCube().move(-sw/4,0, sw/4).size(-sw/4,.002,-sw/4).color(lightGray); // SAFE AREA
    mCube().move( sw/4,0, sw/4).size(-sw/4,.002,-sw/4).color(gray     ); // SAFE AREA

    mCube().size(rw/2,.001,rw/2).color(darkGray); // FLOOR

    mCube().move(    0, rh/2, rw/2).size( rw/2, rh/2, .001).color(offWhite); // WALL
    mCube().move(    0, rh/2,-rw/2).size( rw/2, rh/2, .001).color(offWhite); // WALL
    mCube().move( rw/2, rh/2,  0  ).size( .001, rh/2, rw/2).color(offWhite); // WALL
    mCube().move(-rw/2, rh/2,  0  ).size( .001, rh/2, rw/2).color(offWhite); // WALL
    mCube().move(    0, rh  ,  0  ).size( rw/2, .001, rw/2).color(offWhite); // CEILING

    mCube().move(    0,  6  , rw/2).size(  8  ,  3  , .002).color(skyBlue ); // WINDOW

    mCube().move( 7.5 ,  7/2,-rw/2).size(  3/2,  7/2, .002).color(brown   ); // DOOR
    mCube().move(-rw/2,  7/2, 7.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    mCube().move(-rw/2,  7/2,-7.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    mCube().move( rw/2,  7/2, 6.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    mCube().move( rw/2,  7/2,-6.5 ).size( .002,  7/2,  3/2).color(brown   ); // DOOR
    mCube().move( rw/2,  4/2,   0 ).size( 1   ,  4/2,  5/2).color(brown   ); // FIREPLACE
    mCube().move( rw/2,  3/2,   0 ).size( 1.01,  3/2,  4/2).color(black   ); // FIREPLACE

    mSphere  ().move( 3,3,-3).turnY(time).size(1,1,.65).color(1,0,0);
    mTorus   ().move(-3,3,-3).turnY(time).size(.65).color(1,1,0);
    mCylinder().move( 3,3, 3).turnY(time).size(.65).color(0,0,1);
    mCube    ().move(-3,3, 3).turnY(time).size(.65).color(1,1,1);
}

function drawFrame(time) {
    renderList.beginFrame();
    drawScene(time);
    renderList.endFrame(drawShape);
}

let buttonState = [[],[]];
for (let i = 0 ; i < 7 ; i++)
   buttonState[0][i] = buttonState[1][i] = false;

let onPress = (hand, button) => {
   console.log('pressed', hand==0 ? 'left' : 'right', 'button', button);
}

let onRelease = (hand, button) => {
   console.log('released', hand==0 ? 'left' : 'right', 'button', button);
}

let controllerMatrix = [[], []];

/** 
 *  animation function for a WebXR-supporting platform, using WebGL graphics
 *  @param t {Number} elapsed time in milliseconds
 */
function animateXRWebGL(t, frame) {
    const self = MR.engine;

    const xrInfo  = self.xrInfo;

    // request next frame
    self._animationHandle = xrInfo.session.requestAnimationFrame(
        self.config.onAnimationFrameXR
    );

    // update time
    self.time   = t / 1000.0;
    self.timeMS = t;

    const time = self.time;

    // this is the state variable
    const w = self.customState;

    const session = frame.session;
    // unpack session and pose information
    const layer   = session.renderState.baseLayer;

    const pose    = frame.getViewerPose(xrInfo.immersiveRefSpace);
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
                    
                    controllerMatrix[i] = gripPose.transform.matrix;

	                let h = 0;
                    switch (inputSource.handedness) {
	                case 'left' : MR.leftController  = gamepad; break;
		            case 'right': MR.rightController = gamepad; h = 1; break;
		            }
                    for (let i = 0 ; i < gamepad.buttons.length ; i++) {
	                    let button = gamepad.buttons[i];
                        if (button.pressed && ! buttonState[h][i]) {
			                onPress(h, i);
                        }
                        if (! button.pressed && buttonState[h][i]) {
			                onRelease(h, i);
                        }
                        buttonState[h][i] = button.pressed;
                    }
                }
            }
        }
    }
    gripControllerUpdate();

    // API-specific information
    // (transforms, tracking, direct access to render state, etc.)
    self.systemArgs.frame = frame;
    self.systemArgs.pose  = pose;
    // renderState contains depthFar, depthNear
    self.systemArgs.renderState = session.renderState;

    const gl        = self.GPUCtx;
    const glAPI     = self.gpuAPI;
    const glCtxInfo = self.gpuCtxInfo;

    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
  
    // Clear the framebuffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const views = pose.views;
    nViews = views.length;

    for (let i = 0; i < nViews ; i++) {
        viewport[i] = layer.getViewport(views[i]);
        projMat [i] = views[i].projectionMatrix;
        viewMat [i] = views[i].transform.inverse.matrix;
    }

    for (let i = 0; i < nViews ; i++) {
        self.systemArgs.viewIdx  = i;
        self.systemArgs.view     = views[i];
        self.systemArgs.viewport = viewport[i];
    }

    drawFrame(time);

    // tells the input system that the end of the frame has been reached
    Input.setGamepadStateChanged(false);
}

let nViews   = 1;
let viewport = [null,null];
let projMat  = [null,null];
let viewMat  = [null,null];


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

    // this is the state variable
    const w = self.customState;

    const gl = self.GPUCtx; 
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    const viewport = self.systemArgs.viewport;
    viewport.x      = 0;
    viewport.y      = 0;
    viewport.width  = gl.drawingBufferWidth;
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

    drawFrame(self.time);

    // tells the input system that the end of the frame has been reached
    w.input.cursor.updateState();
}

export default function main() {
    const def = {
        name                   : 'chalktalk',
        setup                  : setup,
        onAnimationFrameWindow : animatePCWebGL,
        onAnimationFrameXR     : animateXRWebGL,
        onReload               : onReload,
        onExit                 : onExit
    };

    return def;
}
