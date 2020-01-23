"use strict";

import * as mem  from "/lib/core/memory.js";
import * as math from "./math/math.js";
import {ShaderTextEditor} from "/lib/core/shader_text_editor.js";

// Toby's renderer / The renderer
let RenderLib; // module
let TR; // module alias
let tr; // the renderer type

async function initCommon(state) {
    RenderLib = await MR.dynamicImport(
        "/lib/render/dynamic_renderer_wgl.js"
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


const ident = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);


function onStartFrame(t, state, info) {

    const timeS = t / 1000.0;

    const sin01Time = math.sin01(timeS);
    const sinTime = Math.sin(timeS);
    const cosTime = Math.cos(timeS);
    const DEPTH = -4;

    // system examples begin: ////////////////////////////////

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const pr = state.render.pathsDynamic;

    // use the default shader (will add more to the renderer)
    // TODO(TR): make it easier to track the shader / attributes being used
    pr.fxDefault();
    // update the global time
    pr.updateGlobalTimeSeconds(timeS);

    const m = state.m;
    m.save();

    pr.modelMatrix(m.value());

    if (MR.VRIsActive()) {
        // this is a "local" view matrix, there are "global" view
        // and projection matrices that represent the final
        // transformation needed for "immersive mode". This
        // is to support rendering to texture, which may require
        // a view matrix to look at some other part of the scene
        // and blit the resulting image to a surface. Then you'd
        // use that surface in a final rendering of the scene
        // (see onDraw for those global matrix settings)
        pr.viewMatrix(ident);
    } else {
        m.save();
            m.translate(-cosTime, -0.5 * sinTime, -1 - cosTime);
            pr.viewMatrix(m.value());
        m.restore();
    }

    pr.projectionMatrix(ident);

    // the following are examples of different APIs
    // built atop the renderer. They range from high-level to explicit
    // - explicit or somewhere in-between is preferable for the bulk of rendering,
    // for real-time drawing in XR-style cases, the high-level pen API might make
    // the most sense. The renderer lets you choose whether to keep or discard
    // specific regions of data from frame-to-frame (static or dynamic)
    // multiple ways to draw (PEN is the most complete example)
    const PEN               = 0;
    const SEGMENTS          = 1;
    const EXPLICIT_TYPES    = 2;
    const EXPLICIT_VERTICES = 3;
    const EXPLICIT_DATA     = 4;

    // set the switch to one of the values above 
    // (PEN, ...)
    switch (0) {
    // using the metaphor of a pen/cursor
    default /*PEN*/ : {
        penExample(
            state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH
        );

        break;
    }
    // specify lines and triangles
    // with specific functions instead of using
    // a pen -- this is the most "explicit" and possibly
    // fastest way of doing things without just specifying individual vertices
    case SEGMENTS: {
        segmentsExample(
            state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH
        );
 
        break;
    }
    // this is a fast-track to the specific primitive you want
    // to draw with the virtual pen
    case EXPLICIT_TYPES: {
        explicitTypesExample(
            state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH
        );

        break;
    } 
    // construct a line using vertices
    // implementation hidden
    case EXPLICIT_VERTICES: {
        explicitVerticesExample(
            state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH
        );

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
        explicitDataExample(
            state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH
        );
        break;
    }
    }

    m.restore();

    // can be called multiple times with
    // the same data so you don't need to re-upload
    // static data! -- We can have multiple renderer instances
    // of the path renderer
    // e.g. one to to hold static data and one to hold dynamic data
    TR.uploadData(pr);
}



function onDraw(t, projMat, viewMat, state, info) {
    const pr = state.render.pathsDynamic;

    pr.beginRenderPass();

    pr.projectionMatrixGlobal(projMat);
    pr.viewMatrixGlobal(viewMat);

    TR.draw(pr);

    pr.endRenderPass();
}

function onEndFrame(t, state) {

    // this assumes the lines will
    // be regenerated every frame
    state.render.pathsDynamic.rewindToStart();

    // In future iterations, you'll be able to rewind
    // to a specifc spot in case you'd like to keep part of the buffer
    // static. Alternatively, you'll be able to specify entire buffers
    // to reserve for static or dynamic data, which you'll be able to
    // select via calls such as draw(layerBatchIdx, ...)
    //
    // after calls to endPath and the similar functions, you'll also be able
    // to get a handle to that region in the buffer, which you can name or
    // "rewind to". 
    // e.g.
    // const handle = TR.endPath(renderer, ..); ... TR.rewindTo(renderer, handle);

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

// example functions
function penExample(state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH) {
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
}

function segmentsExample(state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH) {
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
}

function explicitTypesExample(state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH) {
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
}

function explicitVerticesExample(state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH) {
    pr.modePrimitiveLines(); 
    // in pixels for now
    pr.lineWidth(7);
    {
        TR.beginLine(pr);
        pr.pushLineVertexEX(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
        pr.pushLineVertexEX(0.5, 0.5 - 0.5 * Math.sin(timeS), DEPTH, 0.0, 1.0, 0.0, 1.0);
        pr.pushLineVertexEX(0.5, 0.0, DEPTH, 0.0, 0.0, 1.0, 1.0);
        // TODO way to reuse a vertex
        pr.pushLineVertexEX(0, 0, DEPTH, 1.0, 0.0, 0.0, 1.0);
        pr.pushLineVertexEX(-0.5, -0.5, DEPTH, 1.0, 1.0, 1.0, 0.5);
        TR.endLine(pr);

        TR.beginLine(pr);
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

        TR.endLine(pr);
    }
}

function explicitDataExample(state, m, pr, timeS, sin01Time, sinTime, cosTime, DEPTH) {
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
}
