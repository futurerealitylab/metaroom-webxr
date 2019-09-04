"use strict"

const vert = `#version 300 es
precision highp float;
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aNor;
layout (location = 2) in vec2 aUV;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
uniform float uTime;

uniform vec2 uResolution;

out vec2 vUV;
out vec2 vUV2;
out vec3 vPos;

out vec3 vNor;

float sin01(float v) {
    return (1.0 + sin(v)) / 2.0;
}

#define PI 3.1415926535897932384626433832795

// Note, in practice it would make more sense to send a constant/uniform
// to the GPU with the pre-computed cos/sin values to avoid calculating the
// same value for every vertex
vec2 rotate_2D_point_around(const vec2 pt, const vec2 origin, const float angle) {
  // subtract the origin
  float x = pt.x - origin.x;
  float y = pt.y - origin.y;

  float cs = cos(angle);
  float sn = sin(angle);

  // rotate and re-add the origin
  return vec2(
    (x*cs) - (y*sn),
    (y*cs) + (x*sn)
  ) + origin;
}

void main() {
  // Multiply the position by the matrix.
  gl_Position = uProj * uView * uModel * vec4(aPos + vec3(2.0 * cos(uTime), 0., -2.0 * (sin01(uTime) + 1.0)), 1.0);
  
  vNor = aNor;
  // Pass the texcoord to the fragment shader.
  vUV = aUV;

  // re-add the origin
  vUV2 = rotate_2D_point_around(aUV, vec2(0.5), uTime);

  vPos = gl_Position.xyz;
}
`;

const frag = `#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec3 vNor;
in vec2 vUV;
in vec2 vUV2;
in vec3 vPos;


// The texture(s).
uniform sampler2D uTex0;
uniform sampler2D uTex1;

uniform float uTime;

out vec4 fragColor;

void main() {
    vec4 color0 = texture(uTex0, vUV + sin(uTime));
    vec4 color1 = texture(uTex1, vUV2);

    color1 = mix(color1, vec4(0.0), cos(uTime) * cos(uTime));

    fragColor = mix(color0, color1, sin(uTime));
}
`;


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

const pnoiseLibSource = `
vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec4 mod289(vec4 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec4 permute(vec4 x) { return mod289(((x*34.)+1.)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - .85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.-15.)+10.); }
float noise(vec3 P) {
vec3 i0 = mod289(floor(P)), i1 = mod289(i0 + vec3(1.)),
   f0 = fract(P), f1 = f0 - vec3(1.), f = fade(f0);
vec4 ix = vec4(i0.x, i1.x, i0.x, i1.x), iy = vec4(i0.yy, i1.yy),
   iz0 = i0.zzzz, iz1 = i1.zzzz,
   ixy = permute(permute(ix) + iy), ixy0 = permute(ixy + iz0), ixy1 = permute(ixy + iz1),
   gx0 = ixy0 * (1. / 7.), gy0 = fract(floor(gx0) * (1. / 7.)) - .5,
   gx1 = ixy1 * (1. / 7.), gy1 = fract(floor(gx1) * (1. / 7.)) - .5;
gx0 = fract(gx0); gx1 = fract(gx1);
vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0), sz0 = step(gz0, vec4(0.)),
   gz1 = vec4(0.5) - abs(gx1) - abs(gy1), sz1 = step(gz1, vec4(0.));
gx0 -= sz0 * (step(0., gx0) - .5); gy0 -= sz0 * (step(0., gy0) - .5);
gx1 -= sz1 * (step(0., gx1) - .5); gy1 -= sz1 * (step(0., gy1) - .5);
vec3 g0 = vec3(gx0.x,gy0.x,gz0.x), g1 = vec3(gx0.y,gy0.y,gz0.y),
   g2 = vec3(gx0.z,gy0.z,gz0.z), g3 = vec3(gx0.w,gy0.w,gz0.w),
   g4 = vec3(gx1.x,gy1.x,gz1.x), g5 = vec3(gx1.y,gy1.y,gz1.y),
   g6 = vec3(gx1.z,gy1.z,gz1.z), g7 = vec3(gx1.w,gy1.w,gz1.w);
vec4 norm0 = taylorInvSqrt(vec4(dot(g0,g0), dot(g2,g2), dot(g1,g1), dot(g3,g3))),
   norm1 = taylorInvSqrt(vec4(dot(g4,g4), dot(g6,g6), dot(g5,g5), dot(g7,g7)));
g0 *= norm0.x; g2 *= norm0.y; g1 *= norm0.z; g3 *= norm0.w;
g4 *= norm1.x; g6 *= norm1.y; g5 *= norm1.z; g7 *= norm1.w;
vec4 nz = mix(vec4(dot(g0, vec3(f0.x, f0.y, f0.z)), dot(g1, vec3(f1.x, f0.y, f0.z)),
                 dot(g2, vec3(f0.x, f1.y, f0.z)), dot(g3, vec3(f1.x, f1.y, f0.z))),
            vec4(dot(g4, vec3(f0.x, f0.y, f1.z)), dot(g5, vec3(f1.x, f0.y, f1.z)),
                 dot(g6, vec3(f0.x, f1.y, f1.z)), dot(g7, vec3(f1.x, f1.y, f1.z))), f.z);
return 2.2 * mix(mix(nz.x,nz.z,f.y), mix(nz.y,nz.w,f.y), f.x);
}
float turbulence(vec3 P) {
float f = 0., s = 1.;
for (int i = 0 ; i < 9 ; i++) {
 f += abs(noise(s * P)) / s;
 s *= 2.;
 P = vec3(.866 * P.x + .5 * P.z, P.y + 100., -.5 * P.x + .866 * P.z);
}
return f;
}
`;

    // register code snippets
    MREditor.registerShaderLibrariesForLiveEditing(gl, "libs", [
        { key : "wee.glsl",    code : "void do_procedural_graphics(void) { /* :) */ }", saveTo : "shaders/wee.glsl"},
        { key : "pnoise.glsl", code : pnoiseLibSource, saveTo : "shaders/pnoise.glsl" },
    ]);

    /*

    // register the shader for display in the editor
    // returns a callback in case you want to recompile at a different time
    // within your program
    let recompileCallback = MREditor.registerShaderForLiveEditing(
        // pass your gl context
        gl,
        // shader name
        "mainShader",
        {
            // pass your original vertex and fragment shader sources
            vertex    : vert, 
            fragment  : frag,
        }, 
        {
            // onNeedsCompilation is completely optional because it has an internal
            // default -- this callback is meant more for if you want to do something
            // more advanced and requires some more knowledge about how the editor
            // works -- i.e. a leaky abstraction

            // // called upon a recompilation event
            // onNeedsCompilation : (args, libMap, userData) => {
            //     // get the vertex and source code currently written into the editor
            //     const vertex    = args.vertex;
            //     const fragment  = args.fragment;

            //     // // choose to use the preprocessor
            //     const vertRecord = GFX.preprocessShader(vertex,   libMap);
            //     const fragRecord = GFX.preprocessShader(fragment, libMap);

            //      // you need to do error handling manually and tell the
            //      // editor what your error was -- this is your chance
            //      // to do custom error messages if you want
            //     if (!vertRecord.isValid || !fragRecord.isValid) {
            //         return {program : null, errRecord : {
            //             vertex : vertRecord.errRecord, 
            //             fragment : fragRecord.errRecord
            //         }};
            //     }
                
            //     //try to compile the shader program
            //     //use an external object if you want to capture the errors
            //     //for yourself (uncomment lines), otherwise the library
            //     //keeps an internal object for you,
                
            //     //NOTE: use this if there is some additional
            //     //behavior you'd like to implement based on the error
            //     //e.g. hook-in an external system
            //     const errRecord = {};
            //     const program = GFX.createShaderProgramFromStrings(
            //         vertRecord.shaderSource, 
            //         fragRecord.shaderSource
            //         //, errRecord
            //     );

            //     // return the program and its error record, also set of includes used
            //     // for updating
            //     // the editor's record of the shader,
            //     // if there was an error, the editor displays it and does
            //     // not update the user program state or call onAfterCompilation()
            //     return {
            //         program : program
            //         // , errRecord : errRecord
            //         ,includes : new Set([
            //             vertRecord.includes, fragRecord.includes
            //         ])
            //     };

            //     // This function is recommended if you want to do some
            //     // string manipulation without having to know the innards of the
            //     // editor, and if you don't want to use the preprocessor
            //    
            //     // MREditor.createShaderProgramFromStringsAndHandleErrors(
            //     //     vertRecord.shaderSource,
            //     //     fragRecord.shaderSource,
            //     // );

            //     // This gives you the preprocessing in addition
            //     MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
            //         vertex,
            //         fragment,
            //         libMap
            //     );
            // },
            // // OR just set a default callback:
            // // onNeedsCompilation : GFX.onNeedsCompilationDefault,
            

            // The callback is required, 
            // use it to set any state that needs
            // to be updated after compiling the shader,
            // this function is only called upon successfull recompilation
            onAfterCompilation : (program, userData) => {
                // update any global or local references to the shader 
                // to point to the newly compiled version
                // this is a very important step. Otherwise the rest of your
                // program may use an outdated or deleted shader
                mydata.program = program;
                // bind the newly compiled program
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
            },

        },
        {
            // optional parameter if you want to keep some metadata / info about the shader
            // over the course of compilation and re-compilation
            userData  : mydata,
            // optional parameter if you want to defer compilation until later
            // (set to false, true by default)
            doCompilationAfterFirstSetup : true,
        }
    );

    */
    // // simplified :
        MREditor.registerShaderForLiveEditing(
            gl,
            "mainShader", 
            {
                vertex : vert, 
                fragment : frag
            }, 
            { 
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
            }
        );

    // proposed API for setting highlighted sections in the code in sequence,
    // 
    // MREditor.createShaderWalkthrough(
    // {
    //     key       : "mainShader",
    //     vertex    : [
    //         [line numbers indexed by 1],
    //         [...],
    //         [...],
    //         [...],
    //     ],
    //     fragment : [
    //         [line numbers indexed by 1],
    //         [...],
    //         [...],
    //         [...],
    //     ]
    // });



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
}

function onStartFrame(t, state) {
    // update time
    let tStart = t;
    if (!state.tStart) {
        state.tStart = t;
        state.time = t;
    }

    tStart = state.tStart;

    const now = (t - tStart);

    state.deltaTime = now - state.time;
    state.time = now;

    // put logic updates here
    // {
    // }

    // update rendering state here


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
        new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0, -1.0,1])
    );           
    gl.uniformMatrix4fv(mydata.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(mydata.uProjLoc, false, new Float32Array(projMat));

    const primitive = gl.TRIANGLES;
    const offset    = 0;
    const count     = cubeIndexCount;

    // Note: we could choose to optimize memory use further by using UNSIGNED_BYTE since we have so few indices (< 255),
    // but most of the time you would use UNSIGNED_SHORT or UNSIGNED_INT
    gl.drawElements(primitive, count, gl.UNSIGNED_SHORT, offset);
}


export default function main() {
    const def = {
        name         : 'texture_example_1',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}
