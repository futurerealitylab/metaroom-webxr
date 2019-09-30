"use strict"

let uResolutionLoc;
let uCursorLoc;
let uAspectLoc;

let cursor;

async function setup(state) {
    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { 
            key : "pnoise", path : "shaders/noise.glsl", foldDefault : true
        }    
    ]);

    if (!libSources) {
        throw new Error("Could not load shader library");
    }


    // load vertex and fragment shaders from the server, register with the editor
    // NOTE: you can repeat this process for multiple shaders!
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
        gl,
        "mainShader",
        { 
            // this implicitly adds the noise functions for you to use
            onNeedsCompilation : (args, libMap, userData) => {
                const stages = [args.vertex, args.fragment];
                const output = [args.vertex, args.fragment];

                const implicitNoiseInclude = true;
                if (implicitNoiseInclude) {
                    let libCode = MREditor.libMap.get("pnoise");

                    for (let i = 0; i < 2; i += 1) {
                        const stageCode = stages[i];
                        const hdrEndIdx = stageCode.indexOf(';');
                    
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        
                        output[i] = hdr + "\n#line 2 1\n" + 
                                    "#include<pnoise>\n#line " + (hdr.split('\n').length + 1) + " 0" + 
                            stageCode.substring(hdrEndIdx + 1);
                    }
                }

                // this does some custom preprocessing of the shader strings
                // so the implicit addition of the noise functions works 
                // (not part of the GLSL language)
                MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
                    output[0],
                    output[1],
                    libMap
                );
            },
            onAfterCompilation : (program) => {
                state.program = program;

                gl.useProgram(program);

                // Assign MVP matrices
                state.uModelLoc        = gl.getUniformLocation(program, 'uModel');
                state.uViewLoc         = gl.getUniformLocation(program, 'uView');
                state.uProjLoc         = gl.getUniformLocation(program, 'uProj');
                state.uTimeLoc         = gl.getUniformLocation(program, 'uTime');
            
                const cvs = MR.getCanvas();

                // you can also use global variables if you want -- state is just
                // a convenience object package for your convenience, 
                // though you might want to store objects
                // that deal with logic
                uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
                uAspectLoc     = gl.getUniformLocation(program, 'uAspect');
                
                // pass the surface resolution
                gl.uniform2fv(uResolutionLoc, new Float32Array([cvs.clientWidth, cvs.clientHeight]));
                // pass the surface aspect ratio width / height (you could do height / width too)
                gl.uniform1f(uAspectLoc, cvs.clientWidth / cvs.clientHeight);


                // define a callback for when the canvas resizes
                // so you can act accordingly
                CanvasUtil.setOnResizeEventHandler(
                    (target, width, height) => {
                        // update the resolution if the target is resized
                        gl.uniform2fv(uResolutionLoc, new Float32Array([width, height]));
                        gl.uniform1f(uAspectLoc, width / height);
                    }
                );

                // get a cursor
                //
                // cursor.position() gives you an array [x, y, z]
                // cursor.x(), cursor.y(), cursor.z() give you the components
                // cursor.prevPosition gives you a Float32Array [x, y, z] of the coordinates from
                // last frame that you can pass directly as a uniform
                //
                // NOTE: the cursor coordinates are in screen pixel coordinates, 
                //      based on the actual resolution.
                // you need to transform these points into a different space depending on
                // what you want (matching with vPos for example requires a transformation)
                cursor = ScreenCursor.trackCursor(
                    // pass the canvas or target for the cursor
                    MR.getCanvas(), 
                    /* optionally define callbacks precisely when the mouse triggers an event,
                    for example if you want the in-between mouse positions for more accuracy and
                    you'd like to add events to your own queue
                    {
                        up : (c) => {
                            // do something specific with the cursor c
                        },
                        down : (c) => {
                            // do something specific with the cursor c
                        },
                        move : (c) => {
                            // do something specific with the cursor c
                        }
                    }
                    */);

                // call hide to hide the mouse cursor graphic (e.g. make your own in your graphics application)
                cursor.hide();
                // or show it
                // cursor.show();

                uCursorLoc = gl.getUniformLocation(program, 'uCursor');
            } 
        },
        {
            // local paths to your shaders
            paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
            },
            // whether to hide the shader stage by default
            foldDefault : {
                vertex   : false,
                fragment : false
            }
        }
    );

    if (!shaderSource) {
        throw new Error("Could not load shader");
    }


    // Create a square as a triangle strip consisting of two triangles
    state.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,0, 1,1,0, -1,-1,0, 1,-1,0]), gl.STATIC_DRAW);

    // Assign aPos attribute to each vertex
    let aPos = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
}

// NOTE: t is the elapsed time since system start in ms, but
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

    // update the cursor position
    gl.uniform3fv(uCursorLoc, cursor.position());

    gl.enable(gl.DEPTH_TEST);
}


function onDraw(t, projMat, viewMat, state) {
    const sec = state.time / 1000;

    const my = state;
  
    gl.uniformMatrix4fv(my.uModelLoc, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1]));
    gl.uniformMatrix4fv(my.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(my.uProjLoc, false, new Float32Array(projMat));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function onEndFrame(t, state) {
}

export default function main() {
    const def = {
        name         : 'week4',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}
