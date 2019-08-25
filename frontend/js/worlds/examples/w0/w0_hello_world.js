"use strict"

// TODO(KTR): Need to assign user IDs and communicate with the server/relay
MR.registerWorld((function() {
    const vert = `
    precision highp float;
    attribute vec3 aPos;
    varying   vec3 vPos;
    uniform   mat4 uModel;
    uniform   mat4 uView;
    uniform   mat4 uProj;
    uniform   float uTime;

    void main() {
        gl_Position = uProj * uView * uModel * vec4(aPos * vec3(0.25, 0.25, 1.0), 1.);
        vPos = aPos;
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
        state.uModelLoc        = gl.getUniformLocation(program, 'uModel');
        state.uViewLoc         = gl.getUniformLocation(program, 'uView');
        state.uProjLoc         = gl.getUniformLocation(program, 'uProj');
        state.uTimeLoc         = gl.getUniformLocation(program, 'uTime');
        state.uCompileCountLoc = gl.getUniformLocation(program, 'uCompileCount');

        const localCompileCount = state.persistent.localCompileCount || 0;
        gl.uniform1i(state.uCompileCountLoc, localCompileCount);
        state.program = program;
        state.persistent.localCompileCount = (localCompileCount + 1) % 14;

        // register for editing TODO(KTR): do some of the re-compilation behind-the-scenes perhaps,
        // or do uniform setting only once and immediately call this function to reduce code lines
        // GFX.registerShaderForLiveEditing(gl, "mainShader", {
        //     vertex    : vert, 
        //     fragment  : frag,
        // }, (args, libMap) => {
        //     const vertex    = args.vertex;
        //     const fragment  = args.fragment;

        //     // (KTR): TODO here you could do some string parsing to incorporate 
        //     // the shared shared library into the main shader code,
        //     // we'd like to be able to edit that shader code separately
            
        //     const errRecord = {};
        //     const program = GFX.createShaderProgramFromStrings(args.vertex, args.fragment, errRecord);
        //     if (!program) {
        //         console.error("Could not compile shader");
        //         console.error(errRecord);

        //         args.clearLogErrors();
        //         args.logError(errRecord);

        //         gl.useProgram(null);
        //         state.program = null;

        //         return;
        //     }
        //     args.clearLogErrors();

        //     const prevProgram = state.program;
        //     gl.deleteProgram(prevProgram);
        //     state.program = program;

        //     // bind the newly compiled program
        //     gl.useProgram(state.program);

        //     // re-initialize uniforms
        //     // Assign MVP matrices
        //     state.uModelLoc        = gl.getUniformLocation(program, 'uModel');
        //     state.uViewLoc         = gl.getUniformLocation(program, 'uView');
        //     state.uProjLoc         = gl.getUniformLocation(program, 'uProj');
        //     state.uTimeLoc         = gl.getUniformLocation(program, 'uTime');
        //     state.uCompileCountLoc = gl.getUniformLocation(program, 'uCompileCount');

        //     const localCompileCount = state.persistent.localCompileCount;
        //     gl.uniform1i(state.uCompileCountLoc, localCompileCount);
        // },
        // null);



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

        gl.uniform1f(state.uTimeLoc, now / 1000.0);

        gl.enable(gl.DEPTH_TEST);
    }

    function onEndFrame(t, state) {
    }

    function onDraw(t, projMat, viewMat, state, eyeIdx) {
        const sec = state.time / 1000;

        const my = state;
      
        gl.uniformMatrix4fv(my.uModelLoc, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1]));
        gl.uniformMatrix4fv(my.uViewLoc, false, new Float32Array(viewMat));
        gl.uniformMatrix4fv(my.uProjLoc, false, new Float32Array(projMat));
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
                myWorld.simulateWorldTransition();
            },
            onSelect : function(t, state) {
            },
            onSelectEnd : function(t, state) {
            },
        };

        // myWorld.beginSetup(def);
        return def;
    }

    return main;
}()),
0);
