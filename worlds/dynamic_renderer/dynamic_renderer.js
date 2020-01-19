"use strict";

import * as mem from "/lib/core/memory.js";

// Toby's renderer / The renderer
let RenderLib; // module
let TR; // module alias
let tr; // the renderer type

async function initCommon(state) {
    RenderLib = await MR.dynamicImport(
        "/lib/graphics/renderer_wgl.js"
    );
    TR = RenderLib;
    tr = RenderLib.Renderer;
}

async function onReload(state) {
    state.render.pathsDynamic.rewindToStart();

    await initCommon(state);
}

async function onExit(state) {
    state.render.pathsDynamic.rewindToStart();
    state.render.pathsDynamic.deinit();
}

async function initRenderer(state) {
    // initialize shared info between
    // all instances of the renderer TODO(TR): make
    // it unnecessary to have multiple instances

    await tr.initSystem({ctx : gl});

    state.render = {
        pathsDynamic : new tr(),
        pathsStatic  : new tr()
    };
    await state.render.pathsDynamic.init(gl);

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());
}

async function setup(state) {
    hotReloadFile(getPath('dynamic_renderer.js'));

    await initCommon(state);

    await initRenderer(state);
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
    

    const pr = state.render.pathsDynamic;

    pr.beginPass();
    pr.fxDefault();

    const DEPTH = sin01(timeS);

    // multiple ways to do the same thing:
    const PEN               = 0;
    const SEGMENTS          = 1;
    const EXPLICIT_TYPES    = 2;
    const EXPLICIT_VERTICES = 3;
    const EXPLICIT_DATA     = 4;

    const example = 0;


    switch (example) {
    // using the metaphor of a pen/cursor
    case PEN: {
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

            pr.pathTo(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 1.0, 0.0, 0.0, 1.0); // [A, B)

            // "EX" variants of functions require the caller to pass
            // all arguments explicitly - this overrides the global
            // settings such as "color". I prefer this to the global
            // settings since I don't need to track what the global state
            // actually is. All the information is here in-place
            pr.pathToEX(0.5, 0.0, DEPTH, 0.0, 1.0, 0.0, 1.0); // [B, C)
            pr.closePathEX(0.0, 0.0, 1.0, 1.0);
            pr.pathToEX(-0.5, -0.5, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.endPathEX(1.0, 1.0, 1.0, 0.5); // C] must include the endpoint
        }
        {
            pr.modeTriangles();

            pr.beginPath();
            pr.pathToEX(-0.5, -1.0 + DEPTH / 4, DEPTH, 1.0, 1.0, 1.0, 0.27);
            pr.pathToEX(0.5, -1.0, DEPTH, 0.0, 1.0, 0.0, 1.0);

            pr.color(0.7, 0.0, 1.0, 1.0);

            pr.pathTo(0.5, -.2, DEPTH);

            pr.color(0.2, 0.0, 1.0, 1.0);
            
            pr.pathTo(0.0, -.2 - DEPTH / 7, DEPTH);

            pr.endPathEX(1.0, 0.0, 0.0, 1.0);
        }
        {
            pr.modePrimitiveLines();

            pr.beginPath();
            pr.pathToEX(-0.5, -0.5, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.endPathEX(1.0, 1.0, 1.0, 0.5);
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
            pr.pushSegmentEX(
                0.0, 0.0, DEPTH,                             1.0, 0.0, 0.0, 1.0,
                0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH,     0.0, 1.0, 0.0, 1.0
            );
            pr.pushSegmentEX(
                0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH,     0.0, 1.0, 0.0, 1.0,
                0.5, 0.0, DEPTH,                             0.0, 0.0, 1.0, 1.0
            );
            pr.pushSegmentEX(
                0.5, 0.0, DEPTH,                             0.0, 0.0, 1.0, 1.0,
                0, 0, DEPTH,                                 1.0, 0.0, 0.0, 1.0
            );
            pr.pushSegmentEX(
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

            pr.lineToEX(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 1.0, 0.0, 0.0, 1.0); // [A, B)

            pr.lineToEX(0.5, 0.0, DEPTH, 0.0, 1.0, 0.0, 1.0); // [B, C)
            pr.closeLineEX(0.0, 0.0, 1.0, 1.0);
            pr.lineToEX(-0.5, -0.5, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.endPathEX(1.0, 1.0, 1.0, 0.5); // C] must include the endpoint
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
            pr.pushLineVertexEX(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.pushLineVertexEX(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 0.0, 1.0, 0.0, 1.0);
            pr.pushLineVertexEX(0.5, 0.0, DEPTH, 0.0, 0.0, 1.0, 1.0);
            // TODO way to reuse a vertex
            pr.pushLineVertexEX(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            pr.pushLineVertexEX(-0.5, -0.5, DEPTH, 1.0, 1.0, 1.0, 0.5);
            pr.endLine();

            pr.beginLine();
            pr.pushArrayLineVertexInterleavedEX([
                -0.5,  0.5, DEPTH,  0.0, 0.0, 1.0, 1.0,
                -0.5, -0.5, DEPTH,  0.0, 1.0, 0.0, 1.0,
                 0.5, -0.5, DEPTH,  1.0, 0.0, 0.0, 1.0,
                 0.5,  0.5, DEPTH,  0.0, 0.0, 1.0, 1.0,
                 0.0,  0.0, DEPTH,  1.0, 1.0, 1.0, 1.0,
            ]);

            // pr.pushLineVertexEX(-0.5,0.5,DEPTH, 0,0,1,1);
            // pr.pushLineVertexEX( -.5,-.5,DEPTH, 0,1,0,1);
            // pr.pushLineVertexEX(.5,-.5,DEPTH, 1,0,0,1);
            // pr.pushLineVertexEX(.5,.5,DEPTH, 0,0,1,1);
            // pr.pushLineVertexEX(0,0,DEPTH, 1,1,1,1);

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
            // methods:
            // pr.pushVertexEX(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            // pr.pushVertexEX(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 0.0, 1.0, 0.0, 1.0);
            //     pr.pushVertexEX(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 0.0, 1.0, 0.0, 1.0);
            // pr.pushVertexEX(0.5, 0.0, DEPTH, 0.0, 0.0, 1.0, 1.0);
            //     pr.pushVertexEX(0.5, 0.0, DEPTH, 0.0, 0.0, 1.0, 1.0);
            // pr.pushVertexEX(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            //     pr.pushVertexEX(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            // pr.pushVertexEX(-0.5, -0.5, DEPTH, 1.0, 1.0, 1.0, 0.5);

            // free-floating function version (reloadable, easier to iterate):
            TR.pushVertexEX(pr, 0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            TR.pushVertexEX(pr, 0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 0.0, 1.0, 0.0, 1.0);
                TR.pushVertexEX(pr, 0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 0.0, 1.0, 0.0, 1.0);
            TR.pushVertexEX(pr, 0.5, 0.0, DEPTH, 0.0, 0.0, 1.0, 1.0);
                TR.pushVertexEX(pr, 0.5, 0.0, DEPTH, 0.0, 0.0, 1.0, 1.0);
            TR.pushVertexEX(pr, 0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
                TR.pushVertexEX(pr, 0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
            TR.pushVertexEX(pr, -0.5, -0.5, DEPTH, 1.0, 1.0, 1.0, 0.5);

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
    const timeS = t / 1000.0;

    // TODO need to set transformations in the renderer
    viewMat = [1,0,0,0, 0,1,0,0, 0,0,1,0, Math.cos(timeS),Math.sin(timeS),0,1];
    gl.uniformMatrix4fv(state.uModelLoc, false, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    updateViewProjection([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]/*projMat*/, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], state, info);

    const pr = state.render.pathsDynamic;

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
    state.render.pathsDynamic.endPassRewindToStart();

    // this doesn't (use this for static data)
    // state.render.paths.endPass()
}

export default function main() {
    const def = {
        name           : 'dynamic renderer',
        setup          : setup,
        onStartFrame   : onStartFrame,
        onStartFrameXR : onStartFrame,
        onEndFrame     : onEndFrame,
        onEndFrameXR   : onEndFrame,
        onDraw         : onDraw,
        onDrawXR       : onDraw,
        onReload       : onReload,
        onExit         : onExit
    };

    return def;
}
