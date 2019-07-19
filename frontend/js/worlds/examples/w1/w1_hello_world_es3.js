"use strict"
MR.registerWorld((function() {

    const vertModern = `#version 300 es
    in vec3 aPos; // attributes replaced with "in"
    out   vec3 vPos; // varying output replaced with "out"
    uniform   mat4 uModel;
    uniform   mat4 uView;
    uniform   mat4 uProj;

    uniform   int uCompileCount;
    uniform   float uTime;

    void main() {
      float translation = float(uCompileCount) * uTime + (10.0 * float(uCompileCount));
      gl_Position = uProj * uView * uModel * vec4(vec3(aPos.x + sin(translation), aPos.y - sin(translation), aPos.z), 1.);
      vPos = aPos;
    }`;


    const fragModern = `\#version 300 es
    precision highp float;
    uniform float uTime;   // TIME, IN SECONDS
    // varying input replaced with "in"  
    in vec3 vPos;     // -1 < vPos.x < +1
    // -1 < vPos.y < +1
    //      vPos.z == 0

    out vec4 fragColor; // gl_FragColor replaced with an explicit "out" vec4 that you set in the shader
      
    void main() {    // YOU MUST DEFINE main()
        
      // HERE YOU CAN WRITE ANY CODE TO
      // DEFINE A COLOR FOR THIS FRAGMENT

      float red   = max(0., vPos.x);
      float green = max(0., vPos.y);
      float blue  = max(0., sin(5. * uTime));
      
      // R,G,B EACH RANGE FROM 0.0 TO 1.0
        
      vec3 color = vec3(red, green, blue);
        
      // THIS LINE OUTPUTS THE FRAGMENT COLOR
        
      fragColor = vec4(sqrt(color), 1.0);
    }`;

    function setup(state, wrangler, session) {
        // Create shader program
        const program = GFX.createShaderProgramFromStrings(vertModern, fragModern);
        state.program = program;
        gl.useProgram(program);

        // Create a square as a triangle strip consisting of two triangles
        state.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,0, 1,1,0, -1,-1,0, 1,-1,0]), gl.STATIC_DRAW);

        // Assign aPos attribute to each vertex
        let aPos = gl.getAttribLocation(program, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

        // Assign MVP matrices
        state.modelLoc        = gl.getUniformLocation(program, 'uModel');
        state.viewLoc         = gl.getUniformLocation(program, 'uView');
        state.projLoc         = gl.getUniformLocation(program, 'uProj');
        state.timeLoc         = gl.getUniformLocation(program, 'uTime');
        state.compileCountLoc = gl.getUniformLocation(program, 'uCompileCount');

        const localCompileCount = state.persistent.localCompileCount || 1;
        gl.uniform1i(state.compileCountLoc, localCompileCount);
        state.program = program;
        state.persistent.localCompileCount = (localCompileCount + 1) % 14;
    }

    // NOTE(KTR): t is the elapsed time since system start in ms, but
    // each world could have different rules about time elapsed and whether the time
    // is reset after returning to the world
    function onStartFrame(t, state) {
        // (KTR) TODO implement option so a person could pause and resume elapsed time
        // if someone visits, leaves, and later returns
        let tStart = t;
        if (!state.tStart) {
            state.tStart = t;
            state.time = t;
        }

        tStart = state.tStart;

        let now = (t - tStart);
        // different from t, since t is the total elapsed time in the entire system, best to use "state.time"
        state.time = now;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniform1f(state.timeLoc, now / 1000.0);

        gl.enable(gl.DEPTH_TEST);
    }

    function onEndFrame(t, state) {
    }

    function onDraw(t, projMat, viewMat, state, eyeIdx) {
        const sec = state.time / 1000;

        const my = state;
      
        gl.uniformMatrix4fv(my.modelLoc, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1]));
        gl.uniformMatrix4fv(my.viewLoc, false, new Float32Array(viewMat));
        gl.uniformMatrix4fv(my.projLoc, false, new Float32Array(projMat));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function main(myWorld) {
        const def = {
            name         : 'hello world modern es3',
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
