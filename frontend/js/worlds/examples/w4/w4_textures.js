"use strict"
MR.registerWorld((function() {
    const vert = `#version 300 es
    precision highp float;
    in vec3 aPos;
    in vec2 aUV;

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProj;

    out vec2 vUV;

    void main() {
      // Multiply the position by the matrix.
      gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);

      // Pass the texcoord to the fragment shader.
      vUV = aUV;
    }
    `;

    const frag = `#version 300 es
    precision highp float;

    // Passed in from the vertex shader.
    in vec2 vUV;

    // The texture(s).
    uniform sampler2D uTex0;
    uniform sampler2D uTex1;

    uniform float uTime;

    out vec4 fragColor;

    void main() {
       fragColor = texture(uTex0, vUV);
    }
    `;


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
        0,1,
        1,1,
        1,0,

        0,0,
        0,1,
        1,0,
        0,1,
        1,1,
        1,0,

        0,0,
        0,1,
        1,0,
        0,1,
        1,1,
        1,0,

        0,0,
        0,1,
        1,0,
        0,1,
        1,1,
        1,0,

        0,0,
        0,1,
        1,0,
        0,1,
        1,1,
        1,0,

        0,0,
        0,1,
        1,0,
        0,1,
        1,1,
        1,0,
    ]);

    function setup(state, wrangler, session) {
        state.attribData  = {};
        state.uniformData = {};
        state.textureData = {};

        state.program = GFX.createShaderProgramFromStrings(vert, frag);
        gl.useProgram(state.program);

        state.attribData.posAttribLoc = gl.getAttribLocation(state.program, "aPos");
        state.attribData.uvAttribLoc  = gl.getAttribLocation(state.program, "aUV");

        state.uniformData.modelLoc = gl.getUniformLocation(state.program, "uModel");
        state.uniformData.viewLoc  = gl.getUniformLocation(state.program, "uView");
        state.uniformData.projLoc  = gl.getUniformLocation(state.program, "uProj");
        state.uniformData.texLoc  = gl.getUniformLocation(state.program, "uTex");
        state.uniformData.timeLoc  = gl.getUniformLocation(state.program, "uTime");

        // attribute state
        state.vao = gl.createVertexArray();
        gl.bindVertexArray(state.vao);
        

        {   
            // position buffer
            state.posBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, state.posBuffer);

            gl.getError();
            // upload cube data
            gl.bufferData(gl.ARRAY_BUFFER, geometryPosData, gl.STATIC_DRAW);

            const size = 3;          // 3 components per iteration
            const type = gl.FLOAT;   // the data is 32-bit floats
            const normalize = false; // don't normalize data
            const stride = 0;        // 0 = move forward (size * sizeof(type))
            const offset = 0;        // start at beginning of the buffer
            gl.vertexAttribPointer( 
                state.attribData.posAttribLoc, size, type, normalize, stride, offset
            );
            gl.enableVertexAttribArray(state.attribData.posAttribLoc);
        }

        {
            // uv buffer
            state.uvBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, state.uvBuffer);

            gl.getError();

            gl.bufferData(gl.ARRAY_BUFFER, geometryUVData, gl.STATIC_DRAW);
            

            const size = 2;
            const type = gl.FLOAT;
            const normalize = true;
            const stride = 0;
            const offset = 0;
            gl.vertexAttribPointer(
                state.attribData.uvAttribLoc, size, type, normalize, stride, offset
            );
            gl.enableVertexAttribArray(state.attribData.uvAttribLoc);

            state.textureData 

            state.textureData.texture = gl.createTexture();

            // texture unit 0 (TEXTURE0 + i)
            gl.activeTexture(gl.TEXTURE0 + 0);

            // bind to the TEXTURE_2D bind point of texture unit 0
            gl.bindTexture(gl.TEXTURE_2D, state.textureData.texture);

            // default texture before load
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([255, 255, 255, 255])
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

            let img = new Image();
            // img.src = "url";
            // img.addEventListener('load', () => {
            //     gl.activeTexture(gl.TEXTURE0 + 0);
            //     gl.bindTexture(gl.TEXTURE_2D, state.textureData.texture);
            //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            //     gl.generateMipmap(gl.TEXTURE_2D);
            // }}
        }
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
        gl.enable(gl.CULL_FACE);
        
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
        const count     = 6 * 6;
        gl.drawArrays(primitive, offset, count);
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

        myWorld.configure(def);
        myWorld.start();
    }

    return main;
}())
);
