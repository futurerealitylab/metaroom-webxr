"use strict"




function declareUniform(uniformData, name, type, size) {
    uniformData[name] = {type : type, size : size};
}

function setUniform(uniformData, name, data) {
    uniformData[name].data = data;
}

// cube without element indexing, attributes in separate buffers
const geometryPosData = new Float32Array([
    -1.0, -1.0,  -1.0,
    -1.0,  1.0,  -1.0,
     1.0, -1.0,  -1.0,
    -1.0,  1.0,  -1.0,
     1.0,  1.0,  -1.0,
     1.0, -1.0,  -1.0,

    -1.0, -1.0,   1.0,
     1.0, -1.0,   1.0,
    -1.0,  1.0,   1.0,
    -1.0,  1.0,   1.0,
     1.0, -1.0,   1.0,
     1.0,  1.0,   1.0,

    -1.0,   1.0, -1.0,
    -1.0,   1.0,  1.0,
     1.0,   1.0, -1.0,
    -1.0,   1.0,  1.0,
     1.0,   1.0,  1.0,
     1.0,   1.0, -1.0,

    -1.0,  -1.0, -1.0,
     1.0,  -1.0, -1.0,
    -1.0,  -1.0,  1.0,
    -1.0,  -1.0,  1.0,
     1.0,  -1.0, -1.0,
     1.0,  -1.0,  1.0,

    -1.0,  -1.0, -1.0,
    -1.0,  -1.0,  1.0,
    -1.0,   1.0, -1.0,
    -1.0,  -1.0,  1.0,
    -1.0,   1.0,  1.0,
    -1.0,   1.0, -1.0,

     1.0,  -1.0, -1.0,
     1.0,   1.0, -1.0,
     1.0,  -1.0,  1.0,
     1.0,  -1.0,  1.0,
     1.0,   1.0, -1.0,
     1.0,   1.0,  1.0,        
]);

const geometryUVData = new Float32Array([
    0,0,
    0,1,
    1,0,
    1,0,
    0,1,
    1,1,

    0,0,
    0,1,
    1,0,
    1,0,
    0,1,
    1,1,

    0,0,
    0,1,
    1,0,
    1,0,
    0,1,
    1,1,

    0,0,
    0,1,
    1,0,
    1,0,
    0,1,
    1,1,

    0,0,
    0,1,
    1,0,
    1,0,
    0,1,
    1,1,

    0,0,
    0,1,
    1,0,
    1,0,
    0,1,
    1,1,
]);


// data for interleaved attribute cube
const cubeVertexCount = 24;
const cubeIndexCount  = 36;
// front, right, back, left, top, bottom
const cubeVertexData = new Float32Array([
    // pos             // normals      // uv coords                                  
    -1.0,  1.0,  1.0,  0.0, 0.0, 1.0,  0.0, 1.0, // Top Left
    -1.0, -1.0,  1.0,  0.0, 0.0, 1.0,  0.0, 0.0, // Bottom Left 
     1.0, -1.0,  1.0,  0.0, 0.0, 1.0,  1.0, 0.0, // Bottom Right
     1.0,  1.0,  1.0,  0.0, 0.0, 1.0,  1.0, 1.0, // Top Right
     
     1.0,  1.0,  1.0,  1.0, 0.0, 0.0,  0.0, 1.0, // Top Left
     1.0, -1.0,  1.0,  1.0, 0.0, 0.0,  0.0, 0.0, // Bottom Left 
     1.0, -1.0, -1.0,  1.0, 0.0, 0.0,  1.0, 0.0, // Bottom Right
     1.0,  1.0, -1.0,  1.0, 0.0, 0.0,  1.0, 1.0, // Top Right
     
     1.0,  1.0, -1.0,  0.0, 0.0,-1.0,  0.0, 1.0, // Top Left
     1.0, -1.0, -1.0,  0.0, 0.0,-1.0,  0.0, 0.0, // Bottom Left 
    -1.0, -1.0, -1.0,  0.0, 0.0,-1.0,  1.0, 0.0, // Bottom Right
    -1.0,  1.0, -1.0,  0.0, 0.0,-1.0,  1.0, 1.0, // Top Right
    
    -1.0,  1.0, -1.0, -1.0, 0.0, 0.0,  0.0, 1.0, // Top Left
    -1.0, -1.0, -1.0, -1.0, 0.0, 0.0,  0.0, 0.0, // Bottom Left 
    -1.0, -1.0,  1.0, -1.0, 0.0, 0.0,  1.0, 0.0, // Bottom Right
    -1.0,  1.0,  1.0, -1.0, 0.0, 0.0,  1.0, 1.0, // Top Right
    
    -1.0,  1.0, -1.0,  0.0, 1.0, 0.0,  0.0, 1.0, // Top Left
    -1.0,  1.0,  1.0,  0.0, 1.0, 0.0,  0.0, 0.0, // Bottom Left 
     1.0,  1.0,  1.0,  0.0, 1.0, 0.0,  1.0, 0.0, // Bottom Right
     1.0,  1.0, -1.0,  0.0, 1.0, 0.0,  1.0, 1.0, // Top Right
     
    -1.0, -1.0,  1.0,  0.0,-1.0, 0.0,  0.0, 1.0, // Top Left
    -1.0, -1.0, -1.0,  0.0,-1.0, 0.0,  0.0, 0.0, // Bottom Left 
     1.0, -1.0, -1.0,  0.0,-1.0, 0.0,  1.0, 0.0, // Bottom Right
     1.0, -1.0,  1.0,  0.0,-1.0, 0.0,  1.0, 1.0  // Top Right
]);
const cubeIndexData = new Uint16Array([
    0, 1, 2,
    2, 3, 0,
    
    4, 5, 6,
    6, 7, 4,
    
    8, 9, 10,
    10, 11, 8,
    
    12, 13, 14,
    14, 15, 12,
    
    16, 17, 18,
    18, 19, 16,
    
    20, 21, 22,
    22, 23, 20
]);

// an object to hold your data
function UserData() {
}
const mydata = new UserData();

// note: mark your setup function as "async" if you need to "await" any asynchronous tasks
// (return JavaScript "Promises" like in loadImages())
async function setup(state) {
    MREditor.hideEditor();
    // load initial images, then continue setup after waiting is done
    const images = await imgutil.loadImagesPromise([
        getPath("resources/textures/brick.png"),
        getPath("resources/textures/polkadots_transparent.png"),   
    ]);

    // this line only executes after the images are loaded asynchronously
    // "await" is syntactic sugar that makes the code continue to look linear (avoid messy callbacks or "then" clauses)


    // this is an object I declare globally
    // in this world to store objects together...
    // "state" is optional in other words. Here I'm using my own
    // non-Meta_Room-controlled state. 
    mydata.images = images;

    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { 
            key : "pnoise", path : "shaders/noise.glsl", foldDefault : true
        },     
    ]);
    if (!libSources) {
        throw new Error("Could not load shader library");
    }

        let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
            // gl context
            gl,
            // name of shader as it should appear in the editor
            "mainShader",
            { 
                onNeedsCompilation : (args, libMap, userData) => {
                    const stages = [args.vertex, args.fragment];
                    const output = [args.vertex, args.fragment];

                    const implicitNoiseInclude = true;
                    if (implicitNoiseInclude) {
                        let libCode = MREditor.libMap.get("pnoise");

                        for (let i = 0; i < 2; i += 1) {
                            const stageCode = stages[i];
                            const hdrEndIdx = stageCode.indexOf(';');
                            
                            /*
                            const hdr = stageCode.substring(0, hdrEndIdx + 1);
                            output[i] = hdr + "\n#line 1 1\n" + 
                                        libCode + "\n#line " + (hdr.split('\n').length) + " 0\n" + 
                                        stageCode.substring(hdrEndIdx + 1);
                            console.log(output[i]);
                            */
                            const hdr = stageCode.substring(0, hdrEndIdx + 1);
                            
                            output[i] = hdr + "\n#line 2 1\n" + 
                                        "#include<pnoise>\n#line " + (hdr.split('\n').length + 1) + " 0" + 
                                stageCode.substring(hdrEndIdx + 1);
                        }
                    }

                    // uses a preprocessor for custom extensions to GLSL
                    MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
                        output[0],
                        output[1],
                        libMap
                    );
                },
                onAfterCompilation : (program) => {
                    mydata.program = program;

                    gl.useProgram(program);

                    // initialize uniforms (store them in the object passed-in)
                    GFX.getAndStoreIndividualUniformLocations(gl, program, mydata);

                    // uncomment the line below to get the maximum number of 
                    // texture image units available for your GPU hardware
                    // const maxTextureUnitCount = GL.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS);

                    // set texture unit 0 at uTex0
                    gl.uniform1i(mydata.uTex0Loc, 0);
                    // set texture unit 1 at uTex1
                    gl.uniform1i(mydata.uTex1Loc, 1); 
                } 
            },      
            {
            // paths to your shader files 
            paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
            },
            // whether the editor should hide the shader sections by  default
            foldDefault : {
                vertex   : false,
                fragment : false
            }
        }
        );

    // save all attribute and uniform locations

    mydata.aPosLoc = 0;
    mydata.aNorLoc = 1;
    mydata.aUVLoc  = 2;
    //GFX.getAndStoreAttributeLocations(gl, mydata.program, mydata);

    // note: could also use a uniform buffer instead of individual uniforms
    // to share uniforms across shader programs
    // mydata.uniformData.uModelLoc = gl.getUniformLocation(mydata.program, "uModel");
    // mydata.uniformData.uViewLoc  = gl.getUniformLocation(mydata.program, "uView");
    // mydata.uProjLoc  = gl.getUniformLocation(mydata.program, "uProj");
    // mydata.uTimeLoc  = gl.getUniformLocation(mydata.program, "uTime");
    // mydata.uTex0Loc  = gl.getUniformLocation(mydata.program, "uTex0");
    // mydata.uTex1Loc  = gl.getUniformLocation(mydata.program, "uTex1");

    // NOTE: individual as opposed to the uniform buffers that may be added in an example later
    // GFX.getAndStoreIndividualUniformLocations(gl, mydata.program, mydata);

    // // commented line would give you the maximum number of 
    // // texture image units availabl on your hardware
    // // const maxTextureUnitCount = GL.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS);

    // gl.uniform1i(mydata.uTex0Loc, 0); // set texture unit 0 at uTex0
    // gl.uniform1i(mydata.uTex1Loc, 1); // set texture unit 1 at uTex1

    // attribute state
    mydata.vao = gl.createVertexArray();
    gl.bindVertexArray(mydata.vao);
    
    // create buffer for attributes
    // Version 1: (RECOMMENDED)
    {
        // Step 1: create GPU buffers

        // create buffer for vertex attribute data
        mydata.vertexBuf = gl.createBuffer();
        // set this to be the buffer we're currently looking at
        gl.bindBuffer(gl.ARRAY_BUFFER, mydata.vertexBuf);
        // upload data to buffer
        gl.bufferData(gl.ARRAY_BUFFER, cubeVertexData, gl.STATIC_DRAW, 0);

        // create buffer for indexing into vertex buffer
        mydata.elementBuf = gl.createBuffer();
        // set this to be the buffer we're currently looking at
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mydata.elementBuf);
        // upload data to buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndexData, gl.STATIC_DRAW, 0);

        // Step 2: specify the attributes

        // TODO(KTR): possible helper function call
        //function setAttribPointers(state.attribData.aPosLoc, size, type, normalize, stride, offset, bytesPerElement);
        
        // position
        {
            gl.vertexAttribPointer( 
                mydata.aPosLoc,                     // attributeLocation: the layout location of the attribute
                3,                                  // size: 3 components per iteration
                gl.FLOAT,                           // type: the data is 32-bit floats
                false,                              // normalize: don't normalize data
                Float32Array.BYTES_PER_ELEMENT * 8, // stride: move forward (size * sizeof(type)) ... using 3 for ps, 3 for normal, 2 for uv (8)
                Float32Array.BYTES_PER_ELEMENT * 0  // offset: set how the data is accessed in the buffer
            );
            gl.enableVertexAttribArray(mydata.aPosLoc); // enable the attribute
        }
        // normals
        {
            // set how the data is accessed in the buffer
            gl.vertexAttribPointer( 
                mydata.aNorLoc,                     // attributeLocation: the layout location of the attribute
                3,                                  // size: 3 components per iteration
                gl.FLOAT,                           // type: the data is 32-bit floats
                false,                              // normalize: don't normalize data
                Float32Array.BYTES_PER_ELEMENT * 8, // stride: move forward (size * sizeof(type)) ... using 3 for ps, 3 for normal, 2 for uv (8)
                Float32Array.BYTES_PER_ELEMENT * 3  // offset: set how the data is accessed in the buffer
            );
            gl.enableVertexAttribArray(mydata.aNorLoc); // enable the attribute
        }
        // uv coords
        {
            // set how the data is accessed in the buffer
            gl.vertexAttribPointer( 
                mydata.aUVLoc,                      // attributeLocation: the layout location of the attribute
                2,                                  // size: 3 components per iteration
                gl.FLOAT,                           // type: the data is 32-bit floats
                false,                              // normalize: don't normalize data
                Float32Array.BYTES_PER_ELEMENT * 8, // stride: move forward (size * sizeof(type)) ... using 3 for ps, 3 for normal, 2 for uv (8)
                Float32Array.BYTES_PER_ELEMENT * 6  // offset: set how the data is accessed in the buffer
            );
            gl.enableVertexAttribArray(mydata.aUVLoc); // enable the attribute
        }
    }
    // Version 2: (Separate Buffers Per Attribute)
    // This version uses 2 buffers to store position and UV/texture coord
    // attributes separately, but usually we may want to use a single
    // buffer with interleaved data
    // {
    //     {   
    //         // position buffer
    //         mydata.posBuffer = gl.createBuffer();
    //         // set this to be the buffer we're currently looking at
    //         gl.bindBuffer(gl.ARRAY_BUFFER, mydatae.posBuffer);
    //         // upload data to buffer
    //         gl.bufferData(gl.ARRAY_BUFFER, geometryPosData, gl.STATIC_DRAW);

    //         const size = 3;          // 3 components per iteration
    //         const type = gl.FLOAT;   // the data is 32-bit floats
    //         const normalize = false; // don't normalize data
    //         const stride = 0;        // 0 = move forward (size * sizeof(type))
    //         const offset = 0;        // start at beginning of the buffer
    //         // set how the data is accessed in the buffer
    //         gl.vertexAttribPointer( 
    //             mydata.aPosLoc, size, type, normalize, stride, offset
    //         );
    //         gl.enableVertexAttribArray(mydata.aPosLoc); // enable the attribute
    //     }

    //     {
    //         // uv buffer
    //         mydata.uvBuffer = gl.createBuffer();
    //         // set this to be the buffer we're currently looking at
    //         gl.bindBuffer(gl.ARRAY_BUFFER, mydata.uvBuffer);
    //         // upload data to buffer
    //         gl.bufferData(gl.ARRAY_BUFFER, geometryUVData, gl.STATIC_DRAW); 

    //         const size = 2;
    //         const type = gl.FLOAT;
    //         const normalize = true;
    //         const stride = 0;
    //         const offset = 0;
    //         gl.vertexAttribPointer(
    //             mydata.aUVLoc, size, type, normalize, stride, offset
    //         );
    //         gl.enableVertexAttribArray(mydata.aUVLoc); // enable the attribute
    //     }
    // }

    // Step 3: load textures if you have any,
    // alternatively could combine the images into one and use an atlas
    {
        mydata.textures = [];

        const texArr = mydata.textures;
        for (let i = 0; i < mydata.images.length; i += 1) {
            const tex = gl.createTexture();
            texArr.push(tex);

            // look at texture unit 0 + i
            // (yes, you can just increment TEXTURE0, which is constant number, by an offset. 
            // The TEXTURE<N>s are all assigned contiguous valures
            gl.activeTexture(gl.TEXTURE0 + i);
            // bind texture to the unit
            gl.bindTexture(gl.TEXTURE_2D, tex); 

            // note, there are other options too! Not every texture neats to have the same
            // parameters set -- you just need to do more than loop over each texture the same way
            //
            // gl.REPEAT: The default behavior for textures. Repeats the texture image.
            // gl.MIRRORED_REPEAT: Same as REPEAT but mirrors the image with each repeat.
            // gl.CLAMP_TO_EDGE: Clamps the coordinates between 0 and 1. The result is that higher coordinates become clamped to the edge, resulting in a stretched edge pattern.
            // gl.CLAMP_TO_BORDER: Coordinates outside the range are now given a user-specified border color.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // upload the texture to the current texture unit
            const mipLevel = 0;                      // largest mip is 0
            const internalFormat = gl.RGBA;          // desired texture format
            const srcFormat      = gl.RGBA;          // format of data
            const srcType        = gl.UNSIGNED_BYTE; // type of data
            gl.texImage2D(
                gl.TEXTURE_2D,
                mipLevel,
                internalFormat,
                srcFormat,
                srcType,
                mydata.images[i]
            );
            // generate mipmaps for the texture 
            // (note: mipmapping is not required for all
            // systems. e.g. 2D sprite games don't always need this)
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        // discard images unless we actually need them later (in this example, we don't)
        mydata.images = undefined;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // MR.registerKeyDownHandler((e) => {

    // });

    // MR.registerKeyUpHandler((e) => {

    // });
}

const KEY_LEFT  = 37;
const KEY_UP    = 38;
const KEY_RIGHT = 39;
const KEY_DOWN  = 40;
const KEY_MOVE_VERT = 16; // shift
const KEY_RESET_POS = 48; // 0
const MAX_SPEED = 14.0;
const FRICTION = 0.002;
const startPosition = [0, 0, 5]
function clamp(val,min_,max_){return Math.max(min_,Math.min(max_,val));}


function onStartFrame(t, state) {
    state.world = state.world || { 
        cam_pos : [
            startPosition[0], 
            startPosition[1], 
            startPosition[2]
        ], 
        v : [0.0, 0.0, 0.0] 
    };
    Input.updateKeyState();



    // update time
    let tStart = t;
    if (!state.tStart) {
        state.tStart = t;
        state.time = t;
    }

    tStart = state.tStart;

    const now = (t - tStart);

    state.deltaTime = now - state.time;
    state.deltaTimeS = state.deltaTime / 1000.0;
    state.time = now;

    // put logic updates here
    // {
    // }

    // update rendering state here

    if (Input.keyWentDown(KEY_RESET_POS)) {
        const v = state.world.v;
        v[0] = 0;
        v[1] = 0;
        v[2] = 0;

        state.world.cam_pos[0] = startPosition[0];
        state.world.cam_pos[1] = startPosition[1];
        state.world.cam_pos[2] = startPosition[2];
    } else {

        const v = state.world.v;
        if (Input.keyIsDown(KEY_LEFT)) {
            v[0] -= 1;
        }
        if (Input.keyIsDown(KEY_RIGHT)) {
            v[0] += 1;
        }
        if (Input.keyIsDown(KEY_UP)) {
            if (Input.keyIsDown(KEY_MOVE_VERT)) {
                v[1] += 1;
            } else {
                v[2] -= 1;
            }
        }
        if (Input.keyIsDown(KEY_DOWN)) {
            if (Input.keyIsDown(KEY_MOVE_VERT)) {
                v[1] -= 1;
            } else {
                v[2] += 1;
            }
        }
        v[0] = clamp(v[0], -MAX_SPEED, MAX_SPEED);
        v[1] = clamp(v[1], -MAX_SPEED, MAX_SPEED);
        v[2] = clamp(v[2], -MAX_SPEED, MAX_SPEED);

        const drag = Math.pow(FRICTION, state.deltaTimeS);
        if (Math.abs(v[0]) < drag) {
            v[0] = 0;
        } else {
            v[0] *= drag;
        }
        if (Math.abs(v[1]) < drag) {
            v[1] = 0;
        } else {
            v[1] *= drag;
        }
        if (Math.abs(v[2]) < drag) {
            v[2] = 0;
        } else {
            v[2] *= drag;
        }

        const cam_pos = state.world.cam_pos;
        cam_pos[0] += state.world.v[0] * state.deltaTimeS;
        cam_pos[1] += state.world.v[1] * state.deltaTimeS;
        cam_pos[2] += state.world.v[2] * state.deltaTimeS;
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
        gl.bindVertexArray(mydata.vao);

        gl.useProgram(mydata.program);

        gl.uniform1f(mydata.uTimeLoc, now / 1000.0);
}

function onEndFrame(t, state) {
}

// per eye
function onDraw(t, projMat, viewMat, state, eyeIdx) {
    // do draw calls here
    const sec = state.time / 1000;

    // (KTR): or just use MR.time for seconds, MR.timeMS for milliseconds

    gl.uniformMatrix4fv(mydata.uModelLoc, false, 
        new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0, 0.0,1])
    );           
    

    // TODO: temp without proper translation;
    viewMat[12] = -state.world.cam_pos[0];
    viewMat[13] = -state.world.cam_pos[1];
    viewMat[14] = -state.world.cam_pos[2];

    gl.uniformMatrix4fv(mydata.uViewLoc, false, viewMat);
    gl.uniformMatrix4fv(mydata.uProjLoc, false, projMat);

    const primitive = gl.TRIANGLES;
    const offset    = 0;
    const count     = cubeIndexCount;

    // Note: we could choose to optimize memory use further by using UNSIGNED_BYTE since we have so few indices (< 255),
    // but most of the time you would use UNSIGNED_SHORT or UNSIGNED_INT
    gl.drawElements(primitive, count, gl.UNSIGNED_SHORT, offset);
}


export default function main() {
    const def = {
        name         : 'textures',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}
