"use strict";


async function initCommon(state) {
    PR = await MR.dynamicImport(
        "/lib/graphics/path_renderer.js"
    );
}

async function onReload(state) {
    state.render.paths.reset();

    await initCommon(state);
}

async function onExit(state) {
    state.render.paths.reset();
    state.render.paths.deinit();
}

let PR;
async function setup(state) {
    hotReloadFile(getPath('primitive_lines.js'));

    await initCommon(state);


    state.render = {
        paths : new PR.PathRenderer_GL()
    };
    await state.render.paths.init(gl);

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());
}

function sin01(val) {
    return (Math.sin(val) + 1.0) / 2.0;
}

function onStartFrame(t, state) {
    const timeS = t / 1000.0;

    gl.viewport(0, 0, MR.getCanvas().width, MR.getCanvas().height);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0.0, 0.3, 0.3, 1.0);

    gl.depthFunc(gl.LEQUAL);

    gl.enable(gl.CULL_FACE);
    

    const pr = state.render.paths;

    pr.beginPass();
    pr.fxDefault();

    const DEPTH = sin01(timeS);

    // multiple ways to do the same thing:
    const PATHS             = 0;
    const SEGMENTS          = 1;
    const EXPLICIT_TYPES    = 2;
    const EXPLICIT_VERTICES = 3;
    const EXPLICIT_DATA     = 4;

    const example = PATHS;



    switch (example) {
    // using the metaphor of a pen/cursor
    case PATHS: {
        // this sets a default global color
        pr.color(1, 0, 0, 1);


        {
            pr.modePrimitiveLines(); 

            // in pixels for now
            pr.lineWidth(1);

            //pr.moveTo(0, 0, DEPTH); // start cursor at A
            //pr.beginPath();

            // this does the commented-out steps above
            pr.beginPathAt(0, 0, DEPTH); 

            pr.pathToColor(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 1.0, 0.0, 0.0, 1.0); // [A, B)

            pr.pathToColor(0.5, 0.0, DEPTH, 0.0, 1.0, 0.0, 1.0); // [B, C)
            pr.closePathColor(0.0, 0.0, 1.0, 1.0);
            pr.pathToColor(-0.5, -0.5, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.endPathColor(1.0, 1.0, 1.0, 0.5); // C] must include the endpoint
        }
        {
            pr.modeTriangles();

            pr.beginPath();
            pr.pathToColor(-0.5, -1.0 + DEPTH / 4, DEPTH, 1.0, 1.0, 1.0, 0.27);
            pr.pathToColor(0.5, -1.0, DEPTH, 0.0, 1.0, 0.0, 1.0);

            pr.color(0.7, 0.0, 1.0, 1.0);

            pr.pathTo(0.5, -.2, DEPTH);

            pr.color(0.2, 0.0, 1.0, 1.0);
            
            pr.pathTo(0.0, -.2 - DEPTH / 7, DEPTH);

            pr.endPathColor(1.0, 0.0, 0.0, 1.0);
        }
        {
            pr.modePrimitiveLines();

            pr.beginPath();
            pr.pathToColor(-0.5, -0.5, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.endPathColor(1.0, 1.0, 1.0, 0.5);
        }
        break;
    }
    // specify lines and triangles
    // with specific functions instead of using
    // a pen -- this is the most "explicit" and possibly
    // fastest way of doing things without just specifying individual vertices
    case SEGMENTS: {
        // this sets a default global color
        pr.color(1, 0, 0, 1);

        pr.modePrimitiveLines(); 
        // in pixels for now
        pr.lineWidth(1);
        {
            pr.pushSegmentColor(
                0.0, 0.0, DEPTH,                             1.0, 0.0, 0.0, 1.0,
                0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH,     0.0, 1.0, 0.0, 1.0
            );
            pr.pushSegmentColor(
                0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH,     0.0, 1.0, 0.0, 1.0,
                0.5, 0.0, DEPTH,                             0.0, 0.0, 1.0, 1.0
            );
            pr.pushSegmentColor(
                0.5, 0.0, DEPTH,                             0.0, 0.0, 1.0, 1.0,
                0, 0, DEPTH,                                 1.0, 0.0, 0.0, 1.0
            );
            pr.pushSegmentColor(
                0, 0, DEPTH,                                 1.0, 0.0, 0.0, 1.0,
                -0.5, -0.5, DEPTH,                           1.0, 1.0, 1.0, 0.5
            );
        }
        break;
    }
    // this is a fast-track to the specific primitive you want
    // to draw with the virtual pen
    case EXPLICIT_TYPES: {
        // this sets a default global color
        pr.color(1, 0, 0, 1);

        pr.modePrimitiveLines(); 
        // in pixels for now
        pr.lineWidth(1);
        {
            pr.beginPathAt(0, 0, DEPTH); 

            pr.lineToColor(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 1.0, 0.0, 0.0, 1.0); // [A, B)

            pr.lineToColor(0.5, 0.0, DEPTH, 0.0, 1.0, 0.0, 1.0); // [B, C)
            pr.closeLineColor(0.0, 0.0, 1.0, 1.0);
            pr.lineToColor(-0.5, -0.5, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.endPathColor(1.0, 1.0, 1.0, 0.5); // C] must include the endpoint
        }
        break;
    } 
    // construct a line using vertices
    // implementation hidden
    case EXPLICIT_VERTICES: {
        pr.modePrimitiveLines(); 
        // in pixels for now
        pr.lineWidth(1);
        {
            pr.beginLine();
            pr.pushLineVertexColor(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.pushLineVertexColor(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 0.0, 1.0, 0.0, 1.0);
            pr.pushLineVertexColor(0.5, 0.0, DEPTH, 0.0, 0.0, 1.0, 1.0);
            // TODO way to reuse a vertex
            pr.pushLineVertexColor(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.pushLineVertexColor(-0.5, -0.5, DEPTH, 1.0, 1.0, 1.0, 0.5);
            pr.endLine();
        }
        break;
    }
    // push vertex data into the buffer,
    // with full knowledge of the underlying
    // implementation -- least scalable, most explicit
    //
    // In this case we're using the GL_LINES primitive,
    // which requires that we duplicate the vertices between segments...
    // typically we'd want to hide this detail to allow for nicer
    // triangle- or SDF-based lines without changing the API
    // STILL it's useful to have this option
    case EXPLICIT_DATA: {
        pr.modePrimitiveLines(); 
        // in pixels for now
        pr.lineWidth(1);
        {
            pr.pushVertexColor(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.pushVertexColor(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 0.0, 1.0, 0.0, 1.0);
                pr.pushVertexColor(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 0.0, 1.0, 0.0, 1.0);
            pr.pushVertexColor(0.5, 0.0, DEPTH, 0.0, 0.0, 1.0, 1.0);
                pr.pushVertexColor(0.5, 0.0, DEPTH, 0.0, 0.0, 1.0, 1.0);
            pr.pushVertexColor(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
                pr.pushVertexColor(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.pushVertexColor(-0.5, -0.5, DEPTH, 1.0, 1.0, 1.0, 0.5);
        }
        break;
    }
    }
}

function updateViewProjection(projMat, viewMat, state, info) {
    gl.uniformMatrix4fv(state.uViewLoc, false, viewMat);
    gl.uniformMatrix4fv(state.uProjLoc, false, projMat);
}
function onDraw(t, projMat, viewMat, state, info) {
    updateViewProjection(projMat, viewMat, state, info);

    const pr = state.render.paths;

    // can be called multiple times with
    // the same data so you don't need to re-upload
    // static data! -- We can have multiple renderer instances
    // of the path renderer
    // e.g. one to to hold static data and one to hold dynamic data
    pr.draw();
}

function onEndFrame(t, state) {
    // this assumes the lines will
    // be regenerated every frame
    state.render.paths.endPassReset();

    // this doesn't (use this for static data)
    // state.render.paths.end()
}

export default function main() {
    const def = {
        name: 'primitive lines',
        setup: setup,
        onStartFrame: onStartFrame,
        onStartFrameXR : onStartFrame,
        onEndFrame: onEndFrame,
        onEndFrameXR : onEndFrame,
        onDraw: onDraw,
        onDrawXR: onDraw,
        onReload: onReload,
        onExit: onExit
    };

    return def;
}
