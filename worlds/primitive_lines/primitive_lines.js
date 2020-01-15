"use strict";


async function initCommon(state) {

    const mod = await MR.dynamicImport(
        "/lib/graphics/primitive_line_renderer.js"
    );
    console.log(mod.PrimitiveLineRenderer_GL);
    state.render = {
        lines : new mod.PrimitiveLineRenderer_GL(gl)
    };
}

async function onReload(state) {
    state.render.lines.deinit();

    await initCommon(state);
}

async function onExit(state) {
}

async function setup(state) {
    hotReloadFile(getPath('primitive_lines.js'));


    await initCommon(state);

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());
}

function onStartFrame(t, state) {

    const lr = state.render.lines;

    lr.moveTo(-1, 1, 1);
    lr.beginPath();

    lr.moveTo(-1, -1, 1);
    lr.moveTo( 1, -1, 1);
    lr.moveTo( 1,  1, 1);
    lr.moveTo(-1,  1, 1);
    
    lr.endPath();

    //console.log(lr.gpuState.lineVertexData.bufferView.subarray(0, lr.gpuState.lineVertexData.count));
}

function updateViewProjection(projMat, viewMat, state, info) {
    gl.uniformMatrix4fv(state.uViewLoc, false, viewMat);
    gl.uniformMatrix4fv(state.uProjLoc, false, projMat);
}
function onDraw(t, projMat, viewMat, state, info) {
    updateViewProjection(projMat, viewMat, state, info);

    const lr = state.render.lines;

    lr.draw();
}

function onEndFrame(t, state) {
    state.render.lines.flush();
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
