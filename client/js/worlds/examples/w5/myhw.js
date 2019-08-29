
function setup(state, wrangler, session) {

    MREditor.registerShaderForLiveEditing(
        gl,
        "mainShader", 
        {
            vertex : vertModern, 
            fragment : fragModern
        }, 
        { 
            onAfterCompilation : (program) => {
                state.program = program;

                gl.useProgram(program);

                // Assign MVP matrices
                state.uModelLoc = gl.getUniformLocation(program, 'uModel');
                state.uViewLoc  = gl.getUniformLocation(program, 'uView');
                state.uProjLoc  = gl.getUniformLocation(program, 'uProj');
                state.uTimeLoc  = gl.getUniformLocation(program, 'uTime');
            } 
        }
    );

    // Create a square as a triangle strip consisting of two triangles
    state.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,0, 1,1,0, -1,-1,0, 1,-1,0]), gl.STATIC_DRAW);

    // Assign aPos attribute to each vertex
    let aPos = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
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
