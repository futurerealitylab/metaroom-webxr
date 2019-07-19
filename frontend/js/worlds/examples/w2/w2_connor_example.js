"use strict"
MR.registerWorld((function() {
    const vertConnor = `
    precision highp float;
    attribute vec3 aPos;
    varying   vec3 vPosition;
    uniform   mat4 uModel;
    uniform   mat4 uView;
    uniform   mat4 uProj;
    uniform   float uTime;

    void main() {
        vec3 aPosition = aPos;
        gl_Position = uProj * uView * uModel * vec4(aPosition, 1.0);
        vPosition = aPosition;
    }`;

    const fragConnor = `
    precision highp float;
    uniform float uTime;
    uniform float uIntensity;
    varying vec3  vPosition;
    #define M_PI 3.1415926535897932384626433832795
    // is v within a circle of center c and radius r?
    bool circle(vec2 v, vec2 c, float r) {
        return distance(v, c) <= r;
    }
    vec3 func(vec2 pos, float t, vec3 c) {
        vec3 color = vec3(0);
        for (int i = 0; i < 10; i++) {
            for (int j = 0; j < 10; j++) {
                float minx = float(i) / 5.0 - 1.0;
                float maxx = float(i+1) / 5.0 - 1.0;
                float miny = 2.0 * sin((t + float(i) / 20. - float(j) / 20.0) * M_PI / 3.) / 2.0 + float(j) / 5.0 - 2.0;
                float maxy = 4.0 * sin((t + float(i) / 20. - float(j) / 20.0) * M_PI / 3.) / 2.0 + float(j) / 5.0 - 2.0;
                if (pos.x >= minx && pos.x < maxx && pos.y >= miny && pos.y < maxy) {
                    color = vec3(1.0 - float(i) / 10.0, float(j) / 10.0, float(i+j) / 20.0);
                }
            }
        }
        return color;
    }
    void main() {
        vec2 pos = vPosition.xy;
        vec3 color = vec3(0.0);
        
        float t = uTime;
        color += func(pos, t, color);
        gl_FragColor = vec4(color, 1.0);
    }`;

    function setup(state, wrangler, session) {
        // Create shader program
        const program = GFX.createShaderProgramFromStrings(vertConnor, fragConnor);
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
        state.modelLoc = gl.getUniformLocation(program, 'uModel');
        state.viewLoc = gl.getUniformLocation(program, 'uView');
        state.projLoc = gl.getUniformLocation(program, 'uProj');
        state.timeLoc = gl.getUniformLocation(program, 'uTime');

        gl.useProgram(program);
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

        // save delta time
        state.deltaTime = now - state.time;
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
            name         : 'connor_example',
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
            onSelectEnd : function(t, state) {;
            },
        };

        myWorld.configure(def);
        myWorld.start();
    }

    return main;
}())
);
