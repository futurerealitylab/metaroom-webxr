"use strict"

// TODO(KTR): Need to assign user IDs and communicate with the server/relay
MR.registerWorld((function() {
    const vert = `
    precision highp float;
    attribute vec3 aPos;
    varying   vec3 vPos;
    varying   vec3 vPosInterp;
    uniform   mat4 uModel;
    uniform   mat4 uView;
    uniform   mat4 uProj;

    void main() {
        gl_Position = uProj * uView * uModel * vec4(aPos, 1.);
        vPos = aPos;
        vPosInterp = gl_Position.xyz;
    }`;

    const frag = `
    precision highp float;
    uniform float uTime;   // TIME, IN SECONDS
      
    varying vec3 vPos;     // -1 < vPos.x < +1
    // -1 < vPos.y < +1
    //      vPos.z == 0
      
    void main() {    // YOU MUST DEFINE main()
        
        // HERE YOU CAN WRITE ANY CODE TO
        // DEFINE A COLOR FOR THIS FRAGMENT

        float red   = max(0., vPos.x);
        float green = max(0., vPos.y);
        float blue  = max(0., sin(5. * uTime));
      
        // R,G,B EACH RANGE FROM 0.0 TO 1.0
          
        vec3 color = vec3(red, green, blue);
        
        // THIS LINE OUTPUTS THE FRAGMENT COLOR
        
        gl_FragColor = vec4(sqrt(color), 1.0);
    }`;

    function setup(state, wrangler, session) {
        // Create shader program
        const program = GFX.createShaderProgramFromStrings(vert, frag);
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

        const localCompileCount = state.persistent.localCompileCount || 0;
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
    };

    // TODO(KTR) Might not pass the wrangler like this
    function main(myWorld) {
        const def = {
            name         : 'hello world',
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
