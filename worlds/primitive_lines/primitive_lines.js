"use strict";


async function initCommon(state) {


}

async function onReload(state) {
    state.render.paths.reset();

    await initCommon(state);
}

async function onExit(state) {
    state.render.paths.reset();
    state.render.paths.deinit();
}

async function setup(state) {
    hotReloadFile(getPath('primitive_lines.js'));

    await initCommon(state);

    const mod = await MR.dynamicImport(
        "/lib/graphics/path_renderer.js"
    );
    state.render = {
        paths : new mod.PrimitivePathRenderer_GL()
    };
    await state.render.paths.init(gl);

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());
}

function onStartFrame(t, state) {
    gl.viewport(0, 0, MR.getCanvas().width, MR.getCanvas().height);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0.0, 0.3, 0.3, 1.0);

    gl.depthFunc(gl.LEQUAL);

    gl.enable(gl.CULL_FACE);
    

    const pr = state.render.paths;

    // start for this frame
    pr.beginPass();

    // shader for per-vertex colors
    pr.fxDefault();

    const DEPTH = -1;

    // this sets a global color,
    // but having thought about it more,
    // I think it's less confusing
    // to force the user to specify the color
    // with each function call.
    // That way, he/she does not need
    // to remember "oh what did I set the state to before"?
    // which is often a source of bugs...
    // yet it's convenient to have this sort of global
    // state ... need to think about it -- TR
    pr.color(1, 0, 0, 1);

    pr.modeTriangles();

    pr.moveTo(0, 0, DEPTH);

    // first side of triangle

    // "beginPath" implicitly
    // sets a point at the current
    // cursor position, but I think this
    // might be a source of confusing bugs
    // -- need to revisit

    // TODO(TR): automatically handle adding a vertex
    // between segments so you don't need to add
    // one explicitly to join [a, b], [b, a]!
    pr.beginPathColor(1, 0, 0, 1);
    pr.moveToColor(0.5, 0, DEPTH, 0, 1, 0, 1);
    pr.moveToColor(0.5, Math.sin(t / 1000.0), DEPTH, 0, 0, 1, 1);
    // second side of triangle
    pr.moveToColor(0.5, Math.sin(t / 1000.0), DEPTH, 0, 0, 1, 1);
    pr.moveToColor(0.5, 0, DEPTH, 0, 1, 0, 1);
    pr.moveTo(0, 0, DEPTH);
    pr.endPath();

    // begin next path at other triangle tip
    pr.moveToColor(0.5, Math.sin(t / 1000.0), DEPTH, 0, 0, 1, 1);
    
    // draw a line from the triangle tip
    pr.modeLines();

    pr.beginPathColor(0, 0, 1, 1);
    pr.moveToColor(-0.5, -0.5, DEPTH, 1, 1, 1, 1);
    pr.endPath();

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
    // static data! -- We can have one path renderer
    // to hold static data and one to hold dynamic data
    pr.draw();
}

function onEndFrame(t, state) {
    // this assumes the lines will
    // be regenerated every frame
    state.render.paths.endPassReset();

    // this doesn't
    // state.render.paths.end()
}

export default function main() {
    const def = {
        name: 'primitive lines',
        setup: setup,
        onStartFrame: onStartFrame,
        onEndFrame: onEndFrame,
        onDraw: onDraw,
        onDrawXR: onDraw,
        onReload: onReload,
        onExit: onExit
    };

    return def;
}
