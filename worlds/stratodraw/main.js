"use strict";

// static imports
import * as path          from "/lib/util/path.js";
import * as assetutil     from "/lib/util/asset.js";
import * as canvasutil    from "/lib/util/canvas.js";
import * as mem           from "/lib/core/memory.js";
import * as Shader        from "/lib/core/gpu/webgl_shader_util.js";
import {ShaderTextEditor} from "/lib/core/shader_text_editor.js";
import {ScreenCursor}     from "/lib/input/cursor.js";
import * as ld            from "/lib/core/code_loader.js";
import * as Input            from "/lib/input/input.js";

import {
    BasicFirstPerson as FPSViewController
} from "./movement/simple_movement_controller.js";
// variables for dynamic imports 
let TR; // module (Toby's renderer / The renderer)
let tr; // the renderer type
let math;
let m;

const FRICTION    = 0.002;

async function onReload(state) {
    state.renderer.rewindToStart();
    await initCommon(state);

    myRenderPipeline = state.myRenderPipeline;
}

async function onExit(state) {
    state.renderer.rewindToStart();
    state.renderer.deinit();
}

let myRenderPipeline;
// temp, will be internal state
function bindRenderPipeline(pip) {
   gl.cullFace(pip.cull_mode);
}
async function initRenderer(state) {
    await tr.initSystem({ctx : gl});

    state.renderer = new tr();

    await state.renderer.init(gl);

    myRenderPipeline = {
        cull_mode : gl.BACK
    };
    state.myRenderPipeline = myRenderPipeline;
}

async function initCommon(state) {
    // re-import dynamic imports
    TR = await MR.dynamicImport(
        "/lib/render/dynamic_renderer_wgl.js"
    );
    tr    = TR.Renderer;
    math  = await MR.dynamicImport("/lib/math/math.js");

    m = state.m;
}

async function setup(state) {
    ld.hotReloadFile(
        path.getMainFilePath(),
        [   
            {path : "lib/math/math.js"},
            {path : "lib/render/dynamic_renderer_wgl.js"},
        ]
    );

    ShaderTextEditor.hideEditor();
    canvasutil.resize(MR.getCanvas(), 1280 / 2, 720 / 2);

    state.m = new Matrix();

    await initCommon(state);

    state.input = {
        turnAngle : 0,
        tiltAngle : 0,
        cursor    : ScreenCursor.trackCursor(MR.getCanvas())
    };


    state.viewCam = new FPSViewController({
        startPosition  : [0.0, 2, 0.0],
        acceleration   : 100.0,
        maxSpeed       : 7
    });
    Input.initKeyEvents();

    state.clock = {
        timeMS     : 0,
        time       : 0.0,
        timeSimMS  : 0,
        timeSim    : 0.0,
        timePrevMS : 0,
        acc        : 0,
        interval   : 1000 / 120,
        timestep   : 1 / 120
    };

    await initRenderer(state);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
}

const ident = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

function updateWorld(clock, state, info) {
    state.viewCam.update(
        clock.timestep,
        FRICTION,
        -Input.keyIsDown(Input.KEY_LEFT),
         Input.keyIsDown(Input.KEY_RIGHT),
        -Input.keyIsDown(Input.KEY_UP),
         Input.keyIsDown(Input.KEY_DOWN),
         Input.keyIsDown(Input.KEY_SHIFT),
    );
}
function updateRenderData(clock, state, info, rd) {
    
    rd.fxDefault();
    rd.updateGlobalTimeSeconds(state.time);
    m.save();
        m.identity();

        m.rotateX(state.viewCam.rotationX());
        m.rotateY(state.viewCam.rotationY());
        m.translate(
            state.viewCam.translationX(),
            state.viewCam.translationY(),
            state.viewCam.translationZ(),
        );

        rd.viewMatrixGlobal(m.value());
    m.restore();

    m.save();
        m.identity();

        rd.projectionMatrix(m.value());
        rd.viewMatrix(m.value());
        rd.modelMatrix(m.value());

        {
            rd.modeTriangles();

            rd.moveTo(0, 0, 0);

            m.save();
                m.identity();
                m.translate(0, 0, -10);
                rd.modelMatrix(m.value());
            m.restore();

            TR.beginTriangles(rd);
                rd.moveTo(-1000, 0, -1000);
                TR.triangleToEX(rd, -1000,0,1000, 1000,0,1000, 0,0,0,1, 1,0,0,1, 1,0,0,1);
                TR.triangleToEX(rd,  1000,0,-1000, -1000,0,-1000, 1,0,0,1, 0,0,0,1, 0,0,0,1);

                rd.moveTo(0, 0, 0);
                rd.color(0.4, 0, 1, 1.0);
                rd.cursor().autoRestoreZ = true;
                const stairCount = 12;
                for (let i = 0; i < stairCount; i += 1) {
                    TR.boxToRelative(rd, -0.2, 0.12, 1);
                }
                rd.cursor().autoRestoreZ = false;            
            TR.endTriangles(rd);
        }
 
        TR.uploadData(rd);

    m.restore();
}
const cposbuf  = [0, 0, 0];
const pcposbuf = [0, 0, 0];

function onStartFrame(t, state, info) {
    const clock = state.clock;

    clock.timeMS = t;
    clock.time   = t / 1000.0;
    clock.acc    += t - clock.timePrevMS;

    window.diff = t - clock.timePrevMS;

    clock.timePrevMS = t;

    const input  = state.input;
    const cursor = input.cursor;
    {
        if (Input.keyWentDown(Input.KEY_ZERO)) {
            state.viewCam.reset();
        }

        const cvs = MR.getCanvas();
        const w = cvs.width;
        const h = cvs.height;

        const pos  = cursor.position();
        cposbuf[0] = pos[0] / w * 2 - 1;
        cposbuf[1] = 1 - pos[1] / h * 2;
        const ppos = cursor.prevPosition();
        pcposbuf[0] = ppos[0] / w * 2 - 1;
        pcposbuf[1] = 1 - ppos[1] / h * 2;

        if (cursor.z() && cursor.prevPosition()[2]) {
            input.turnAngle -= Math.PI/2 * (cposbuf[0] - pcposbuf[0]);
            input.tiltAngle += Math.PI/2 * (cposbuf[1] - pcposbuf[1]);
        }
        cursor.updateState();
    }


    // trying to do a fixed-timestep simulation,
    // prevent floating point errors by using
    // "integer" arithmetic
    while (clock.acc >= clock.interval) {
        clock.acc -= clock.interval;

        clock.timeSimMS += clock.interval;
        clock.timeSim    = clock.timeSim / 1000.0;

        updateWorld(clock, state, info);
    }

    updateRenderData(clock, state, info, state.renderer);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function updateWorldXR(clock, state, info) {
}
function onStartFrameXR(t, state, info) {
}

function onDraw(t, projMat, viewMat, state, info) {
    const rd = state.renderer;

    TR.beginRenderPass(rd);
        bindRenderPipeline(myRenderPipeline);

        rd.projectionMatrixGlobal(projMat);
        rd.modelMatrixGlobal(ident);

        TR.draw(rd);

    TR.endRenderPass(rd);

}
function onDrawXR(t, projMat, viewMat, state, info) {
}

function onEndFrame(t, state) {
    state.renderer.rewindToStart();

    Input.setGamepadStateChanged(false);
}
function onEndFrameXR() {
}


export default function main() {
    const def = {
        name           : 'sd',
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