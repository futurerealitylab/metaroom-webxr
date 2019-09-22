"use strict"

// don't remove "use strict"

// variable declarations:

//////////////////////////
// time
let time        =  0;
let timeMS      =  0;

let timeStart   = -1;
let timeStartMS = -1;

let timePrev    =  0;
let timePrevMS  =  0;

let timeDelta   =  0;
let timeDeltaMS =  0;

let cursorState = null;

// attribute locations
let aPosLoc;
// uniform locations
// matrices
let uModelLoc;
let uViewLoc;
let uProjLoc;
// time
let uTimeLoc;
// cursor
let uCursorLoc;
// cursor clipspace
let uCursorInterpLoc;
// cursor direction
let uCursorDirLoc;
// cursor velocity
let uCursorVelLoc;
// resolution
let uResolutionLoc;

// shader program 
// (only one for now, but you can switch between many
// to achieve different effects in a more complex pipeline
let program;

// a vertex array object
let vao;
// a vertex buffer object
let vbo;
// an element buffer object
let ebo;

const usingTriList  = true;
const usingIndexing = true;

// tri list data
const triListVertexCount = 6;
const triListVertexData = new Float32Array(
    [-1,1,0, -1,-1,0, 1,-1,0, 1,-1,0, 1,1,0, -1,1,0] // 18 * 4 = 72 bytes
);
// indexed example
const triListIndexedVertexData = new Float32Array(
    [-1,1,0, -1,-1,0, 1,-1,0, 1,1,0] // 12 * 4 = 48 bytes
);
const triListElementCount = 6;
const triListElementData = new Uint16Array(
    [0, 1, 2, 2, 3, 0] // 6 * 2 = 12 bytes, 48 + 12 = 60 bytes (12 byte savings for JUST a quad)
);

// tri strip data
const triStripVertexCount = 4;
const triStripVertexData =  new Float32Array(
    [-1,1,0, 1,1,0, -1,-1,0, 1,-1,0] // 12 * 4 = 48 bytes 
            // (better than triangle lists for one quad, 
            // but indexed triangle lists may save memory at scale 
            // depending on how your meshes are organized and how easy it is to organize 
            // in triangles or strips)
);
// for indexed example
const triStripIndexedVertexData =  new Float32Array(
    [-1,1,0, 1,1,0, -1,-1,0, 1,-1,0] // 12 * 4 = 48 bytes
);
const triStripElementCount = 4;
const triStripElementData = new Uint16Array(
    [0, 1, 2, 3] // 4 * 2 = 8 bytes, 48 + 8 = 56 bytes 
    // (no savings in this case, 
    // a more complex shape with overlapping vertices would be needed to see the difference)
);



// editor recompiled shader
let recompiled = false;

//////////////////////////

function initTriangleList() {
    console.log("triangle list");

    // vertex array object (VAO) stores the format of the vertex data, stores vertex objects
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // create a vertex buffer object (VBO) to store attribute data (GPU memory)
    // you can interleave attribute data or store it across multiple buffers
    // you can make multiple buffers, or oftentimes store data for many objects
    // in one buffer
    vbo = gl.createBuffer();
    // bind it (mark it as the current buffer we're looking at)
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // upload the data to the GPU
    gl.bufferData(
        gl.ARRAY_BUFFER, // target type of buffer
        
        triListVertexData, // triangle strip vertex data
        
        gl.STATIC_DRAW // STATIC_DRAW, DYNAMIC_DRAW, and STREAM_DRAW are
                       // hints to the GPU driver to signal whether:
                       // the data will 
                       //   STATIC  never be changed,
                       //   DYNAMIC sometimes be changed, or 
                       //   STREAM  continuously be changed,
    );

    // tell the GPU what per-vertex attributes exist in the uploaded data (setting a pointer
    // and offsets to mark where in the buffer each attribute is, we currently have one attribute: position)
    aPosLoc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(
        aPosLoc,                            // attributeLocation: 
                                            //      the layout location of the attribute (see vertex shader)
        3,                                  // size: 
                                            //      3 components per iteration vec3(x, y, z)
        gl.FLOAT,                           // type: 
                                            //      the data is 32-bit floats 
        false,                              // normalize: 
                                            //      false means don't normalize data
        Float32Array.BYTES_PER_ELEMENT * 0, // stride: 
                                            //      distance between end of this attribute data and the next -- 0 here since this is the only vertex attribute for now,
                                            //      otherwise (elementCount * sizeof(type))
        Float32Array.BYTES_PER_ELEMENT * 0  // offset: 
                                            //       set the offset of this attribute's data 
                                            //       within the per-vertex data (0 since this is the only attribute)
    );


    gl.bindVertexArray(null);
}

function initIndexedTriangleList() {
    console.log("indexed triangle list");

    // vertex array object (VAO) stores the format of the vertex data, stores vertex objects
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // create a vertex buffer object (VBO) to store attribute data (GPU memory)
    // you can interleave attribute data or store it across multiple buffers
    // you can make multiple buffers, or oftentimes store data for many objects
    // in one buffer
    vbo = gl.createBuffer();
    // bind it (mark it as the current buffer we're looking at)
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // upload the data to the GPU
    gl.bufferData(
        gl.ARRAY_BUFFER, // target type of buffer
        
        triListIndexedVertexData, // triangle strip vertex data
        
        gl.STATIC_DRAW // STATIC_DRAW, DYNAMIC_DRAW, and STREAM_DRAW are
                       // hints to the GPU driver to signal whether:
                       // the data will 
                       //   STATIC  never be changed,
                       //   DYNAMIC sometimes be changed, or 
                       //   STREAM  continuously be changed,
    );

    // tell the GPU what per-vertex attributes exist in the uploaded data (setting a pointer
    // and offsets to mark where in the buffer each attribute is, we currently have one attribute: position)
    aPosLoc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(
        aPosLoc,                            // attributeLocation: 
                                            //      the layout location of the attribute (see vertex shader)
        3,                                  // size: 
                                            //      3 components per iteration vec3(x, y, z)
        gl.FLOAT,                           // type: 
                                            //      the data is 32-bit floats 
        false,                              // normalize: 
                                            //      false means don't normalize data
        Float32Array.BYTES_PER_ELEMENT * 0, // stride: 
                                            //      distance between end of this attribute data and the next -- 0 here since this is the only vertex attribute for now,
                                            //      otherwise (elementCount * sizeof(type))
        Float32Array.BYTES_PER_ELEMENT * 0  // offset: 
                                            //       set the offset of this attribute's data 
                                            //       within the per-vertex data (0 since this is the only attribute)
    );

    // for larger meshes with duplicate triangle vertices,
    // an ebo can help you save memory by letting you use
    // indices to refer to the same vertex from a vbo
    ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triListElementData, gl.STATIC_DRAW, 0);

    gl.bindVertexArray(null);
}

function initTriangleStrip() {
    console.log("triangle strip");

    // vertex array object (VAO) stores the format of the vertex data, stores vertex objects
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // create a vertex buffer object (VBO) to store attribute data (GPU memory)
    // you can interleave attribute data or store it across multiple buffers
    // you can make multiple buffers, or oftentimes store data for many objects
    // in one buffer
    vbo = gl.createBuffer();
    // bind it (mark it as the current buffer we're looking at)
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // upload the data to the GPU
    gl.bufferData(
        gl.ARRAY_BUFFER, // target type of buffer
        
        triStripVertexData, // triangle strip vertex data
        
        gl.STATIC_DRAW // STATIC_DRAW, DYNAMIC_DRAW, and STREAM_DRAW are
                       // hints to the GPU driver to signal whether:
                       // the data will 
                       //   STATIC  never be changed,
                       //   DYNAMIC sometimes be changed, or 
                       //   STREAM  continuously be changed,
    );

    // tell the GPU what per-vertex attributes exist in the uploaded data (setting a pointer
    // and offsets to mark where in the buffer each attribute is, we currently have one attribute: position)
    aPosLoc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(
        aPosLoc,                            // attributeLocation: 
                                            //      the layout location of the attribute (see vertex shader)
        3,                                  // size: 
                                            //      3 components per iteration vec3(x, y, z)
        gl.FLOAT,                           // type: 
                                            //      the data is 32-bit floats 
        false,                              // normalize: 
                                            //      false means don't normalize data
        Float32Array.BYTES_PER_ELEMENT * 0, // stride: 
                                            //      distance between end of this attribute data and the next -- 0 here since this is the only vertex attribute for now,
                                            //      otherwise (elementCount * sizeof(type))
        Float32Array.BYTES_PER_ELEMENT * 0  // offset: 
                                            //       set the offset of this attribute's data 
                                            //       within the per-vertex data (0 since this is the only attribute)
    );


    gl.bindVertexArray(null);
}

function initIndexedTriangleStrip() {
    console.log("indexed triangle strip");

    // vertex array object (VAO) stores the format of the vertex data, stores vertex objects
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // create a vertex buffer object (VBO) to store attribute data (GPU memory)
    // you can interleave attribute data or store it across multiple buffers
    // you can make multiple buffers, or oftentimes store data for many objects
    // in one buffer
    vbo = gl.createBuffer();
    // bind it (mark it as the current buffer we're looking at)
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // upload the data to the GPU
    gl.bufferData(
        gl.ARRAY_BUFFER, // target type of buffer
        
        triStripIndexedVertexData, // triangle strip vertex data
        
        gl.STATIC_DRAW // STATIC_DRAW, DYNAMIC_DRAW, and STREAM_DRAW are
                       // hints to the GPU driver to signal whether:
                       // the data will 
                       //   STATIC  never be changed,
                       //   DYNAMIC sometimes be changed, or 
                       //   STREAM  continuously be changed,
    );

    // tell the GPU what per-vertex attributes exist in the uploaded data (setting a pointer
    // and offsets to mark where in the buffer each attribute is, we currently have one attribute: position)
    aPosLoc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(
        aPosLoc,                            // attributeLocation: 
                                            //      the layout location of the attribute (see vertex shader)
        3,                                  // size: 
                                            //      3 components per iteration vec3(x, y, z)
        gl.FLOAT,                           // type: 
                                            //      the data is 32-bit floats 
        false,                              // normalize: 
                                            //      false means don't normalize data
        Float32Array.BYTES_PER_ELEMENT * 0, // stride: 
                                            //      distance between end of this attribute data and the next -- 0 here since this is the only vertex attribute for now,
                                            //      otherwise (elementCount * sizeof(type))
        Float32Array.BYTES_PER_ELEMENT * 0  // offset: 
                                            //       set the offset of this attribute's data 
                                            //       within the per-vertex data (0 since this is the only attribute)
    );

    // for larger meshes with duplicate triangle vertices,
    // an ebo can help you save memory by letting you use
    // indices to refer to the same vertex from a vbo
    ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triStripElementData, gl.STATIC_DRAW, 0);

    gl.bindVertexArray(null);
}

// Define a setup function
// to call before your program starts running
//
// This is where you initialize all logic, state, and graphics
// code before your animation loop runs
//
// NOTE: the "state" variable is an optional object passed through the system
// for convenience, e.g. if you want to attach objects to a single package for organization
// For simple programs, globals are fine.
async function setup(state) {

    // NOTE: we have created custom functions to hook into the system editor functionality
    // Beyond this class you may want to create your own system for creating, compiling, and updating shaders.
    // 
    // For the curious, see system/client/js/lib/gfxutil.js for WebGL utility functions
    // used by the editor. You can use these directly (e.g. for other projects), 
    // but they won't work with the editor
    //
    // see function initGLContext(target, contextNames, contextOptions)
    //     function addShader(program, type, src, errRecord)
    //     function createShaderProgramFromStrings(vertSrc, fragSrc, errRecord)
    // and others for examples

    // Editor Specific:
    // editor library function for loading shader snippets from files on disk
    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { 
            key : "pnoise", path : "shaders/noise.glsl", foldDefault : true
        },
        {
            key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true
        },      
    ]);
    if (!libSources) {
        throw new Error("Could not load shader library");
    }


    // Editor Specific:
    // load vertex and fragment shaders from disk, register with the editor
    // (You can also use MREditor.registerShaderForLiveEditing to load a shader string
    // created in the program
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
        // gl context
        gl,
        // name of shader as it should appear in the editor
        "mainShader",
        { 
            // OPTIONAL : callback for before compilation
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
            // Required callback for after 
            // the shader program has been compiled
            // the "program" argument is the newly compiled shader program
            //
            // Remember to update the reference to the respective program in
            // your code, and update all the uniform locations, which are no longer valid from
            // the previous version of the program!
            onAfterCompilation : (shaderProgram) => {
                program = shaderProgram;

                // a shader must be activated with this call
                gl.useProgram(program);

                // store uniform locations 
                // (these point to the memory associated 
                // with the uniform data you wish to update)
                //
                // Individual uniform locations must be updated per-shader
                //
                // NOTE: for the curious, Uniform Buffer Objects (UBO)s
                // can also be used to store bundles of uniforms that can
                // be updated across multiple shaders with one call. 
                // Other graphics APIs use (or require) them as well.
                uModelLoc        = gl.getUniformLocation(program, 'uModel');
                uViewLoc         = gl.getUniformLocation(program, 'uView');
                uProjLoc         = gl.getUniformLocation(program, 'uProj');
                uTimeLoc         = gl.getUniformLocation(program, 'uTime');
                
                uCursorLoc       = gl.getUniformLocation(program, 'uCursor');
                uCursorInterpLoc = gl.getUniformLocation(program, 'uCursorInterp');
                uCursorDirLoc    = gl.getUniformLocation(program, 'uCursorDir');
                uCursorVelLoc    = gl.getUniformLocation(program, 'uCursorVel');

                uResolutionLoc   = gl.getUniformLocation(program, 'uResolution');

                const cvs = MR.getCanvas();
                gl.uniform2fv(uResolutionLoc, new Float32Array([cvs.clientWidth, cvs.clientHeight]));

                // reupload the static model matrix
                gl.uniformMatrix4fv(
                    uModelLoc, 
                    false, 
                    new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1])
                );

                recompiled = true;
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
                vertex   : true,
                fragment : false
            }
        }
    );
    if (!shaderSource) {
        throw new Error("Could not load shader");
    }

    if (usingIndexing) {
        if (usingTriList) {
            initIndexedTriangleList();
        } else {
            initIndexedTriangleStrip();
        }
    } else {
        if (usingTriList) {
            initTriangleList();
        } else {
            initTriangleStrip();
        }
    }

    // set mouse handler
    {
        const buf = new Float32Array([0, 0, 0]);
        cursorState = ScreenCursor.trackCursor(MR.getCanvas(), {
            up   : (cursorInfo) => {
                const pos = cursorInfo.position();

                gl.uniform3fv(uCursorLoc, pos);
                const cvs = MR.getCanvas();
                const w = cvs.clientWidth;
                const h = cvs.clientHeight;

                // clip space
                // clip space
                pos[0] = (2.0 * (pos[0] / w)) - 1.0;
                pos[1] = -1.0 * ((2.0 * (pos[1] / h)) - 1.0);

                gl.uniform3fv(uCursorInterpLoc, pos);

                gl.uniform3fv(uCursorDirLoc, cursorState.direction());

                const velocity = cursorInfo.toClipPosition(cursorInfo.positionChange(), w, h);
                velocity[0] *= timeDelta;
                velocity[1] *= timeDelta;
                velocity[2] *= timeDelta;

                gl.uniform3fv(uCursorVelLoc, velocity);
            },
            down : (cursorInfo) => { 
                const pos = cursorInfo.position();

                gl.uniform3fv(uCursorLoc, pos);
                const cvs = MR.getCanvas();
                const w = cvs.clientWidth;
                const h = cvs.clientHeight;

                // clip space
                pos[0] = (2.0 * (pos[0] / w)) - 1.0;
                pos[1] = -1.0 * ((2.0 * (pos[1] / h)) - 1.0);

                gl.uniform3fv(uCursorInterpLoc, pos);

                gl.uniform3fv(uCursorDirLoc, cursorState.direction());

                const velocity = cursorInfo.toClipPosition(cursorInfo.positionChange(), w, h);
                velocity[0] *= timeDelta;
                velocity[1] *= timeDelta;
                velocity[2] *= timeDelta;

                gl.uniform3fv(uCursorVelLoc, velocity);
            },
            move : (cursorInfo) => {
                const pos = cursorInfo.position();

                gl.uniform3fv(uCursorLoc, pos);
                const cvs = MR.getCanvas();
                const w = cvs.clientWidth;
                const h = cvs.clientHeight;

                // clip space
                pos[0] = (2.0 * (pos[0] / w)) - 1.0;
                pos[1] = -1.0 * ((2.0 * (pos[1] / h)) - 1.0);

                gl.uniform3fv(uCursorInterpLoc, pos);

                gl.uniform3fv(uCursorDirLoc, cursorState.direction());
                

                const velocity = cursorInfo.toClipPosition(cursorInfo.positionChange(), w, h);
                velocity[0] *= timeDelta;
                velocity[1] *= timeDelta;
                velocity[2] *= timeDelta;

                gl.uniform3fv(uCursorVelLoc, velocity);


            },
        });

        // make the mouse cursor invisible while on the canvas
        cursorState.hide();
    }

    CanvasUtil.setOnResizeEventHandler((cvs, w, h) => {
        gl.uniform2fv(uResolutionLoc, new Float32Array([w, h]));
    });
}


// This function is called once at the start of each frame
// use it to update logic and update graphics state
//
// t is the elapsed time since system start in ms (but you can use your own
// adjusted times locally)
function onStartFrame(t, state) {
    // set start time if this is the first time
    if (timeStartMS === -1) { // only occurs once at the beginning
        timeStartMS = t;
        timeStart   = t / 1000.0;

        // For this world, we want the depth test so opaque
        // objects can be rendered in unsorted order
        gl.enable(gl.DEPTH_TEST);

        // in this simple example, 
        // we only render one static quad to the screen, 
        // which means we only need to upload the model, view, and projection matrices once
        gl.uniformMatrix4fv(
            uModelLoc, 
            false, 
            new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1])
        );
    }

    {
        //////////////////////////
        // update time
        //////////////////////////
        // in milliseconds
        timeMS = t - timeStartMS;
        // in seconds
        time   = timeMS / 1000.0; // shaders much prefer time in seconds
        // time between frames
        // in milliseconds 
        timeDeltaMS = timeMS - timePrevMS;
        // in seconds
        timeDelta   = timeDeltaMS / 1000.0;
        // update the previous time so delta time can be calculated next frame
        // in milliseconds
        timePrevMS = timeMS;
        // in seconds
        timePrev   = time;
        //////////////////////////
    }

    // clear the color as well as the depth buffer 
    // (the depth buffer tracks the depth of for each pixels)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // update the time uniform used in our shader
    gl.uniform1f(uTimeLoc, time);

    gl.bindVertexArray(vao);
}

// This function is called every time the frame needs to be drawn,
// 
// by default called after onStartFrame
// NOTE: MAY BE CALLED MULTIPLE TIMES PER FRAME, do not put logic
// here that should be updated only once per frame.
//
// t is the elapsed time since system start in ms (but you can use your own
// adjusted times locally)


// using triangle list
function onDrawTriangleList(t, projMat, viewMat, state) {

    // update the view and projection matrices (Unnecessary if they don't change, but 
    // we don't make that optimization here
    gl.uniformMatrix4fv(uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(uProjLoc, false, new Float32Array(projMat));

    gl.drawArrays(gl.TRIANGLES, 0, triListVertexCount);
}

// using indexed triangle list
function onDrawIndexedTriangleList(t, projMat, viewMat, state) {

    // update the view and projection matrices (Unnecessary if they don't change, but 
    // we don't make that optimization here
    gl.uniformMatrix4fv(uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(uProjLoc, false, new Float32Array(projMat));

    gl.drawElements(gl.TRIANGLES, triListElementCount, gl.UNSIGNED_SHORT, 0);
}

// using triangle strips:
function onDrawTriangleStrip(t, projMat, viewMat, state) {

    // update the view and projection matrices (Unnecessary if they don't change, but 
    // we don't make that optimization here
    gl.uniformMatrix4fv(uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(uProjLoc, false, new Float32Array(projMat));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, triStripVertexCount);
}

function onDrawIndexedTriangleStrip(t, projMat, viewMat, state) {

    // update the view and projection matrices (Unnecessary if they don't change, but 
    // we don't make that optimization here
    gl.uniformMatrix4fv(uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(uProjLoc, false, new Float32Array(projMat));

    // indexed data uses drawElements, which takes the primitive type,
    // the number of indices, the type of indices (could be different byte sizes), and
    // a byte offset into the buffer
    gl.drawElements(gl.TRIANGLE_STRIP, triStripElementCount, gl.UNSIGNED_SHORT, 0);
}

// which example to use?
let onDraw;
if (usingIndexing) {
    onDraw = (usingTriList) ? onDrawIndexedTriangleList : onDrawIndexedTriangleStrip;
} else {
    onDraw = (usingTriList) ? onDrawTriangleList : onDrawTriangleStrip;
}



// This function is called at the end of the frame, after onDraw
// 
// Use it if you want to do some debug logging, performance statistics,
// or miscellaneous I/O based on the current frame 
//
// t is the elapsed time since system start in ms (but you can use your own
// adjusted times locally) 
function onEndFrame(t, state) {
    gl.bindVertexArray(null);
}

// NOTE: You must "export default" a function that returns an object
// with these exact properties set to your function callbacks
export default function main() {
    const def = {
        name         : 'week3',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}
