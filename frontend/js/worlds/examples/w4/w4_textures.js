"use strict"
MR.registerWorld((function() {
    const vert = `#version 300 es
    precision highp float;
    layout (location = 0) in vec3 aPos;
    layout (location = 1) in vec3 aNor;
    layout (location = 2) in vec2 aUV;

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform float uTime;

    out vec2 vUV;
    out vec2 vUV2;

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
      gl_Position = uProj * uView * uModel * vec4(aPos + vec3(0., 0., -2.0 * (sin01(uTime) + 1.0)), 1.0);

      vNor = aNor;
      // Pass the texcoord to the fragment shader.
      vUV = aUV;

      // re-add the origin
      vUV2 = rotate_2D_point_around(aUV, vec2(0.5), uTime);
    }
    `;

    const frag = `#version 300 es
    precision highp float;

    // Passed in from the vertex shader.
    in vec3 vNor;
    in vec2 vUV;
    in vec2 vUV2;


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

        //fragColor = color0;
    }
    `;

    function loadImagePromise(url) {
        return new Promise(resolve => {
            const image = new Image();
            image.onload = () => {
                resolve(image);
            };

            image.src = url;
        });
    }

    function loadImagesPromise(urls) {
        let urlCount = urls.length;
        let images = [];

        return new Promise(() => {
            const onImageLoad = () => {
                urlCount -= 1;

                if (urlCount === 0) {
                    resolve(images);
                    images = null;
                }
            };

            for (let i = 0; i < urlCount; i += 1) {
                loadImage(urls[i]).then((image) => {
                    images.push(image);
                });
            }
        });
    }

    function loadImage(url, callback) {
        const image = new Image();
        image.src = url;
        image.onload = callback;
        image.onerror = () => { console.error("failed to load: " + url); callback(); };
        console.log(callback);
        return image;
    }

    function loadImages(urls, callback) {
        let urlCount = urls.length;
        let images = [];

        function onImageLoad() {
            urlCount -= 1;

            console.log("loaded");

            if (urlCount === 0) {
                console.log("all loaded");
                callback(images);
                images = null;
            }
        };

        for (let i = 0; i < urlCount; i += 1) {
            console.log("loading: " + urls[i]);
            const image = loadImage(urls[i], onImageLoad);
            images.push(image);
        }





    }


    function declareUniform(uniformData, name, type, size) {
        uniformData[name] = {type : type, size : size};
    }

    function setUniform(uniformData, name, data) {
        uniformData[name].data = data;
    }

    // cube without element indexing
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



    function setup(state, myWorld, session) {
        // load initial images, then continue setup
        loadImages([
            window.location + "js/worlds/examples/w4/resources/textures/brick.png",
            window.location + "js/worlds/examples/w4/resources/textures/polkadots_transparent.png",    
        ],
        (images) => {
        
        state.attribData  = {};
        state.uniformData = {};
        state.textureData = {};

        state.images = images;

        state.program = GFX.createShaderProgramFromStrings(vert, frag);
        gl.useProgram(state.program);

        // save all attribute and uniform locations

        state.attribData.posAttribLoc = gl.getAttribLocation(state.program, "aPos");
        state.attribData.norAttribLoc = gl.getAttribLocation(state.program, "aNor");
        state.attribData.uvAttribLoc  = gl.getAttribLocation(state.program, "aUV");
        console.log(state.attribData.posAttribLoc, state.attribData.norAttribLoc, state.attribData.uvAttribLoc);

        // note: could also use a uniform buffer instead of individual uniforms
        // to share uniforms across shader programs
        state.uniformData.modelLoc = gl.getUniformLocation(state.program, "uModel");
        state.uniformData.viewLoc  = gl.getUniformLocation(state.program, "uView");
        state.uniformData.projLoc  = gl.getUniformLocation(state.program, "uProj");
        state.uniformData.timeLoc  = gl.getUniformLocation(state.program, "uTime");
        state.uniformData.tex0Loc  = gl.getUniformLocation(state.program, "uTex0");
        state.uniformData.tex1Loc  = gl.getUniformLocation(state.program, "uTex1");

        gl.uniform1i(state.uniformData.tex0Loc, 0); // set texture unit 0 at uTex0
        gl.uniform1i(state.uniformData.tex1Loc, 1); // set texture unit 1 at uTex1

        // attribute state
        state.vao = gl.createVertexArray();
        gl.bindVertexArray(state.vao);
        
        // create buffer for attributes
        // Version 1: (RECOMMENDED)
        {
            // create buffer for vertex attribute data
            state.vertexBuf = gl.createBuffer();
            // set this to be the buffer we're currently looking at
            gl.bindBuffer(gl.ARRAY_BUFFER, state.vertexBuf);
            // upload data to buffer
            gl.bufferData(gl.ARRAY_BUFFER, cubeVertexData, gl.STATIC_DRAW, 0);

            // create buffer for indexing into vertex buffer
            state.elementBuf = gl.createBuffer();
            // set this to be the buffer we're currently looking at
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, state.elementBuf);
            // upload data to buffer
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndexData, gl.STATIC_DRAW, 0);

            // specify the attributes
            // TODO(KTR): possible helper function call
            //function setAttribPointers(state.attribData.posAttribLoc, size, type, normalize, stride, offset, bytesPerElement);
            
            // position
            {
                const size = 3;                                    // 3 components per iteration
                const type = gl.FLOAT;                             // the data is 32-bit floats
                const normalize = false;                           // don't normalize data
                const stride = Float32Array.BYTES_PER_ELEMENT * 8; // move forward (size * sizeof(type)) ... using 3 for ps, 3 for normal, 2 for uv (8)
                const offset = Float32Array.BYTES_PER_ELEMENT * 0;
                // set how the data is accessed in the buffer
                gl.vertexAttribPointer( 
                    state.attribData.posAttribLoc, size, type, normalize, stride, offset
                );
                gl.enableVertexAttribArray(state.attribData.posAttribLoc); // enable the attribute
            }
            // normals
            {
                const size = 3;                                    // 3 components per iteration
                const type = gl.FLOAT;                             // the data is 32-bit floats
                const normalize = false;                           // don't normalize data
                const stride = Float32Array.BYTES_PER_ELEMENT * 8; // move forward (size * sizeof(type)) ... using 3 for ps, 3 for normal, 2 for uv (8)
                const offset = Float32Array.BYTES_PER_ELEMENT * 3;
                // set how the data is accessed in the buffer
                gl.vertexAttribPointer( 
                    state.attribData.norAttribLoc, size, type, normalize, stride, offset
                );
                gl.enableVertexAttribArray(state.attribData.norAttribLoc); // enable the attribute
            }
            // uv coords
            {
                const size = 2;                                    // 3 components per iteration
                const type = gl.FLOAT;                             // the data is 32-bit floats
                const normalize = false;                           // don't normalize data
                const stride = Float32Array.BYTES_PER_ELEMENT * 8; // move forward (size * sizeof(type)) ... using 3 for ps, 3 for normal, 2 for uv (8)
                const offset = Float32Array.BYTES_PER_ELEMENT * 6;
                // set how the data is accessed in the buffer
                gl.vertexAttribPointer( 
                    state.attribData.uvAttribLoc, size, type, normalize, stride, offset
                );
                gl.enableVertexAttribArray(state.attribData.uvAttribLoc); // enable the attribute
            }
        }
        // Version 2: (OLD)
        // This version uses 2 buffers to store position and UV/texture coord
        // attributes separately, but usually we may want to use a single
        // buffer with interleaved data
        // {
        //     {   
        //         // position buffer
        //         state.posBuffer = gl.createBuffer();
        //         // set this to be the buffer we're currently looking at
        //         gl.bindBuffer(gl.ARRAY_BUFFER, state.posBuffer);
        //         // upload data to buffer
        //         gl.bufferData(gl.ARRAY_BUFFER, geometryPosData, gl.STATIC_DRAW);

        //         const size = 3;          // 3 components per iteration
        //         const type = gl.FLOAT;   // the data is 32-bit floats
        //         const normalize = false; // don't normalize data
        //         const stride = 0;        // 0 = move forward (size * sizeof(type))
        //         const offset = 0;        // start at beginning of the buffer
        //         // set how the data is accessed in the buffer
        //         gl.vertexAttribPointer( 
        //             state.attribData.posAttribLoc, size, type, normalize, stride, offset
        //         );
        //         gl.enableVertexAttribArray(state.attribData.posAttribLoc); // enable the attribute
        //     }

        //     {
        //         // uv buffer
        //         state.uvBuffer = gl.createBuffer();
        //         // set this to be the buffer we're currently looking at
        //         gl.bindBuffer(gl.ARRAY_BUFFER, state.uvBuffer);
        //         // upload data to buffer
        //         gl.bufferData(gl.ARRAY_BUFFER, geometryUVData, gl.STATIC_DRAW); 

        //         const size = 2;
        //         const type = gl.FLOAT;
        //         const normalize = true;
        //         const stride = 0;
        //         const offset = 0;
        //         gl.vertexAttribPointer(
        //             state.attribData.uvAttribLoc, size, type, normalize, stride, offset
        //         );
        //         gl.enableVertexAttribArray(state.attribData.uvAttribLoc); // enable the attribute
        //     }
        // }

        // load textures,
        // alternatively could combine the images into one and use an atlas
        {
            state.textureData.textures = [];

            const texArr = state.textureData.textures;
            for (let i = 0; i < state.images.length; i += 1) {
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
                    state.images[i]
                );
                // generate mipmaps for the texture 
                // (note: mipmapping is not required for all
                // systems. e.g. 2D sprite games don't always need this)
                gl.generateMipmap(gl.TEXTURE_2D);
            }
            // discard images unless we actually need them later (in this example, we don't)
            state.images = undefined;
        }

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // don't forget to start the world!
        myWorld.start();
        
        });
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

        // {
        //      logic goes here
        // }

        // update graphic setup (not per eye)


        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);
        //gl.enable(gl.CULL_FACE);
        
            gl.bindVertexArray(state.vao);

            gl.useProgram(state.program);

            gl.uniform1f(state.uniformData.timeLoc, now / 1000.0);
    }

    function onEndFrame(t, state) {
    }

    // per eye
    function onDraw(t, projMat, viewMat, state, eyeIdx) {
        const sec = state.time / 1000;


        gl.uniformMatrix4fv(state.uniformData.modelLoc, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1]));           
        gl.uniformMatrix4fv(state.uniformData.viewLoc, false, new Float32Array(viewMat));
        gl.uniformMatrix4fv(state.uniformData.projLoc, false, new Float32Array(projMat));

        const primitive = gl.TRIANGLES;
        const offset    = 0;
        const count     = cubeIndexCount;
        // Note: we could choose to optimize memory use further by using UNSIGNED_BYTE since we have so few indices (< 255),
        // but most of the time you would use UNSIGNED_SHORT or UNSIGNED_INT
        gl.drawElements(primitive, cubeIndexCount, gl.UNSIGNED_SHORT, offset);
    }


    function main(myWorld) {
        const def = {
            name         : 'texture_example_1',
            setup        : setup,
            onStartFrame : onStartFrame,
            onEndFrame   : onEndFrame,
            onDraw       : onDraw,

            // TEMP use these handlers for simulating world transitions
            onSelectStart : function(t, state) {
                wrangler.simulateWorldTransition();
            },
            onSelect : function(t, state) {
            },
            onSelectEnd : function(t, state) {
            },
        };

        myWorld.beginSetup(def);
    }

    return main;
}())
);
