"use strict";

import * as mem  from "/lib/core/memory.js";
import * as math from "./math/math.js";

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

    CanvasUtil.resize(MR.getCanvas(), 1280 / 2, 720 / 2);

    await initCommon(state);

    await initRenderer(state);

    state.m = new Matrix();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    gl.clearColor(0.0, 0.3, 0.3, 1.0);
}

function onStartFrame(t, state, info) {

    const timeS = t / 1000.0;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const pr = state.render.pathsDynamic;

    // call this when you want to start a drawing pass
    pr.beginPass();
    // use the default shader (will add more to the renderer)
    pr.fxDefault();
    // update the global time
    pr.updateGlobalTimeSeconds(timeS);
}

function onDraw(t, projMat, viewMat, state, info) {
    const timeS = t / 1000.0;

    const sin01Time = math.sin01(timeS);
    const sinTime = Math.sin(timeS);
    const cosTime = Math.cos(timeS);

    const pr = state.render.pathsDynamic;

    const DEPTH = -4;

    // multiple ways to draw (PEN is the most complete example)
    const PEN               = 0;
    const SEGMENTS          = 1;
    const EXPLICIT_TYPES    = 2;
    const EXPLICIT_VERTICES = 3;
    const EXPLICIT_DATA     = 4;

    // set "example" to one of the constants above
    const example = PEN;

    const m = state.m;

    m.save();

    pr.modelMatrix(m.value());

    if (MR.VRIsActive()) {
        pr.viewMatrix(viewMat);
    } else {
        m.save();
            m.translate(-cosTime, -0.5 * sinTime, -1 - cosTime);
            pr.viewMatrix(m.value());
        m.restore();
    }

    pr.projectionMatrix(projMat);
    
    switch (example) {
    // using the metaphor of a pen/cursor
    case PEN: {
        // this sets a default global color
        pr.color(1, 0, 0, 1);

        {
            pr.modePrimitiveLines(); 

            // in pixels for now
            pr.lineWidth(7);

            //pr.moveTo(0, 0, DEPTH); // start cursor at A
            //pr.beginPath();

            // this is equivalent to the commented-out steps above
            pr.beginPathAt(0, 0, DEPTH); 

            pr.pathTo(0.5, 0.5 - 0.5 * sinTime, DEPTH, 1.0, 0.0, 0.0, 1.0); // [A, B)

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

            m.save();
                m.translate(-0.5, -0.5, DEPTH);
                m.rotateZ(timeS);
                m.translate(0.5, 0.5, -DEPTH);
                pr.modelMatrix(m.value());
            m.restore();

            pr.beginPath();
            pr.pathToEX(-0.5, -1.0 + DEPTH / 4, DEPTH, 1.0, 1.0, 1.0, 0.27);
            pr.pathToEX(0.5, -1.0, DEPTH, 0.0, 1.0, 0.0, 1.0);
            
            pr.color(0.7, 0.0, 1.0, 1.0);
            pr.endPath();

            m.save();
                m.translate(-0.5, -0.5, DEPTH);
                m.rotateY(timeS * 2);
                m.translate(0.5, 0.5, -DEPTH);
                pr.modelMatrix(m.value());
            m.restore();

            // two sides (instead of disabling culling): 
            // (TODO: option to generate both sides upon call to endPath?)
            pr.beginPath();

                pr.pathTo(0.5 + 2 * sin01Time, -0.2, DEPTH);
                pr.color(0.2, 0.0, 1.0, 1.0);
                pr.pathTo(0.0, -0.2 - DEPTH / 7, DEPTH);

            pr.endPathEX(1.0, 0.0, 0.0, 1.0);
            pr.beginPath();

                pr.pathToEX(0.5 + 2 * sin01Time, -0.2, DEPTH, 1.0, 0.0, 0.0, 1.0);
                pr.color(0.2, 0.0, 1.0, 1.0);
                pr.pathTo(0.5, -1.0, DEPTH);

            pr.endPathEX(0.7, 0.0, 1.0, 1.0);
            
            // TODO coordinate stack to return here
            pr.moveTo(0.0, -0.2 - DEPTH / 7, DEPTH);
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
        pr.lineWidth(7);
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
        pr.lineWidth(7);
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
        pr.lineWidth(7);
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
        pr.lineWidth(7);
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

    // can be called multiple times with
    // the same data so you don't need to re-upload
    // static data! -- We can have multiple renderer instances
    // of the path renderer
    // e.g. one to to hold static data and one to hold dynamic data
    TR.draw(pr);
    pr.rewindToStart();

    m.restore();
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
