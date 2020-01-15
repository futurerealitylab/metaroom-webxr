"use strict";

import {
    PrimitiveLineRenderer as LineRenderer
} from "/lib/graphics/primitive_line_renderer.js";

async function initCommon(state) {
}

async function onReload(state) {
    await initCommon(state);
}

async function onExit(state) {
}

async function setup(state) {
   hotReloadFile(getPath('primitive_lines.js'));

   await initCommon(state);
}

function onStartFrame(t, state) {
}

function onDraw(t, projMat, viewMat, state, info) {
}

function onEndFrame(t, state) {
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
