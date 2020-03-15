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
import * as Input         from "/lib/input/input.js";
import * as _             from "/lib/third-party/gl-matrix-min.js";
let la = glMatrix;

const mat4 = glMatrix.mat4;
const quat = glMatrix.quat;
const vec3 = glMatrix.vec3;
const vec4 = glMatrix.vec4;

import {
    WorldCamera as Camera,
    axis_up,
    axis_right,
    axis_forward,
    quaternion_forward,
    quaternion_right,
    quaternion_up,
    quaternion_angle_axis,
    quaternion_multiply_vec3
} from "./movement/camera.js";

// variables for dynamic imports 
let TR; // module (Toby's renderer / The renderer)
let tr; // the renderer type
let math;
let m;

const FRICTION    = 0.002;

async function onReload(state) {
    state.renderer.rewindToStart();
    await initCommon(state);

    views = state.views;

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

function updateViewport() {
    const main = views.main;
    const mini = views.mini;

    const cvs = MR.getCanvas();

    const w = cvs.width;
    const h = cvs.height;

    main[0] = 0;
    main[1] = 0;
    main[2] = w;
    main[3] = h;

    mini[0] = 0;
    mini[1] = 0;
    mini[2] = w * orthoWindowScale;
    mini[3] = h * orthoWindowScale;
}

let views;
async function setup(state) {

    ld.hotReloadFile(
        path.getMainFilePath(),
        [   
            {path : "lib/math/math.js"},
            {path : "lib/render/dynamic_renderer_wgl.js"},
        ]
    );

    ShaderTextEditor.hideEditor();

    state.views = {
        main : [0, 0, 0, 0],
        mini : [0, 0, 0, 0]
    }
    views = state.views;

    canvasutil.resize(MR.getCanvas(), 1280, 720);

    updateViewport();
    canvasutil.setOnResizeEventHandler(updateViewport);

    state.m = new Matrix();

    await initCommon(state);

    state.input = {
        turnAngle : 0,
        tiltAngle : 0,
        cursor    : ScreenCursor.trackCursor(MR.getCanvas())
    };
    state.input.cursor.hide();


    state.viewCam = new Camera({
        startPosition  : [0.0, 0.5, 10],
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

    state.transform = {
        projection : null,
        view       : null,
        model      : null
    };



    await initRenderer(state);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthFunc(gl.LEQUAL);
    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);


    state.pen = new Pen(); 
}

// distance between two vectors
function distance(x1,y1,x2,y2) {
    var dx = x1-x2
    var dy = y1-y2 
    return Math.sqrt(dx*dx+dy*dy)
}

// cosine of angle between two vectors
function costh(x1,y1,x2,y2) {
    var n1 = distance(x1,y1,0,0)
    var n2 = distance(x2,y2,0,0)

    // NOTE I changed this to be a lot higher (remember: given in pixels, so still not very high); also: added abs around it
    if (Math.abs(n1) < 2 || Math.abs(n2) < 2) return 1.0
        
    return -(x1*x2 + y1*y2)/n1/n2;
}


class Pen {
    constructor() {
        this.pointA       = null;
        this.pointB       = null;
        this.pointC       = null;
        this.buffers      = [];
        this.vertexBuffer = null;
        this.deleted      = false;
        this.repositioned = false;
    }
}
Pen.init = function(self) {
    self.pointA       = null;
    self.pointB       = null;
    self.pointC       = null;
    self.buffers      = [];
    self.vertexBuffer = null;
    self.deleted      = false;
    self.repositioned = false;
}

Pen.update = function(self, pos, justDown) {
    if (justDown) {
        self.vertexBuffer = [{x : pos[0], y : pos[1]}];
        self.buffers.push(self.vertexBuffer);
        return;
    }

    Pen.updateInternal(self, pos[0], pos[1])
}
Pen.updateInternal = function(self, x, y) {
    Pen.syntheticUpdate(self, x, y);
}
Pen.syntheticUpdate = function(self, sx, sy) {
    if (!self.deleted) {
        self.pointA = self.pointB;
    }
    
    self.pointB = self.pointC;
    self.pointC = [sx, sy];
    
    self.deleted = false;
  
    // the 0th one is already set -.-
    if (self.vertexBuffer.length == 1) {
        self.pointB = [self.vertexBuffer[0].x, self.vertexBuffer[0].y];
        self.vertexBuffer.push({x : sx, y : sy});
        return;
    }
    
    var BA_length = distance(
        self.pointB[0], self.pointB[1], self.pointA[0], self.pointA[1]
    );
    var BC_length = distance(
        self.pointB[0], self.pointB[1], self.pointC[0], self.pointC[1]
    );
    
    var CTH = costh(
        self.pointA[0] - self.pointB[0], 
        self.pointA[1] - self.pointB[1], 
        self.pointC[0] - self.pointB[0], 
        self.pointC[1] - self.pointB[1]
    );
   
    // we want each side of the vertex to be at least this long
    // NOTE: Play with this
    var MIN_L = 3
    
    // we want at most this value for cosine (cos = 1 means straight)
    // NOTE: Play with this
    var MAX_CTH = 0.5
    
    // NOTE: Maybe even define a function that changes the MAX_CTH depending on the lengths, so the longer the segments are, the smaller the angle is allowed to be or something like that
    
    
    var lastIndex = self.vertexBuffer.length - 1;
    
    // do we meet all criteria for a vertex candidate?
    if (CTH < MAX_CTH && BA_length >= MIN_L && BC_length >= MIN_L) {
        // NOTE: before adding a vertex, I check if it is too near to the previous vertex
        var MIN_VERTEX_DISTANCE = 20; // in Pixel
        var lastX = self.vertexBuffer[lastIndex].x;
        var lastY = self.vertexBuffer[lastIndex].y;

        if (distance(sx, sy, lastX, lastY) < MIN_VERTEX_DISTANCE) {
            self.repositioned = true;
            //vertexBuffer[lastIndex] = {x : (lastX), y : (lastY)};
        } else { // normal addition
            self.vertexBuffer.push({x : sx, y : sy});
        }
      
    } else {
        if (self.repositioned) {
            // NOTE: Repositioning means that I moved a vertex since it wanted to create two very close to each other
            // Now this part of the code could actually move this vertex along the draw path and no vertex would be created anymore
            // therefore after doing the reposition I can't do that, so I just create a new point
            // This point will most likely be moved along the path
            self.vertexBuffer.push({x : sx, y : sy});
            self.repositioned = false;
        } else {
            // we overwrite the last written point
            self.vertexBuffer[lastIndex] = {x : sx, y : sy};
            self.deleted = true;
        }
      
    } 
}

const ident = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

function updateWorld(clock, state, info) {
    // state.viewCam.update(
    //     clock.timestep,
    //     FRICTION,
    //     -Input.keyIsDown(Input.KEY_LEFT),
    //      Input.keyIsDown(Input.KEY_RIGHT),
    //     -Input.keyIsDown(Input.KEY_UP),
    //      Input.keyIsDown(Input.KEY_DOWN),
    //      Input.keyIsDown(Input.KEY_SHIFT),
    // );

    Camera.move(
        state.viewCam,
        clock.timestep,
        FRICTION,
        -Input.keyIsDown(Input.KEY_A),
         Input.keyIsDown(Input.KEY_D),
        -Input.keyIsDown(Input.KEY_W),
         Input.keyIsDown(Input.KEY_S),
         Input.keyIsDown(Input.KEY_SHIFT),
         (Input.keyIsDown(Input.KEY_CONTROL)) ? state.input.cursor.position()[0] - state.input.cursor.prevPosition()[0] : 0,
         (Input.keyIsDown(Input.KEY_CONTROL)) ? state.input.cursor.position()[1] - state.input.cursor.prevPosition()[1] : 0,
         200.0
    );
}
const dim = 70;
function updateRenderData(clock, state, info, rd) {
    
    rd.fxDefault();
    rd.updateGlobalTimeSeconds(state.time);
    m.save();
        m.identity();

        rd.viewMatrixGlobal(Camera.calculate_matrix_transform(
            state.viewCam
        ));

        state.transform.view = new Float32Array(m.value());
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
                m.translate(0, 0, 0);
                rd.modelMatrix(m.value());
            m.restore();

            TR.beginTriangles(rd);

                const H = 0;
                rd.moveTo(-dim, H, -dim);

                const alpha = 1.0;
                TR.triangleToEX(rd, -dim,H, dim,  dim,H,dim,  1.0,0.0,0.0,alpha, 0.0,1.0,0.0,alpha, 0.0,0.0,1.0,alpha);
                TR.triangleToEX(rd,  dim,H,-dim, -dim,H,-dim, 0.0,0.0,1.0,alpha, 0.0,1.0,0.0,alpha, 1.0,0.0,0.0,alpha);

                rd.moveTo(0, H, 0);
                rd.color(0.4, 0, 1, 1.0);
                rd.cursor().autoRestoreZ = true;
                const stairCount = 12;
                for (let i = 0; i < stairCount; i += 1) {
                    //TR.boxToRelative(rd, -1, 1, 1);
                }
                rd.cursor().autoRestoreZ = false; 

                if (state.pen.buffers.length > 0) {
                    for (let i = 0; i < state.pen.buffers.length; i += 1) {
                        const pts = state.pen.buffers[i];
                        if (pts && pts.length != 0) {
                            const cvs = MR.getCanvas();
                            const W = cvs.width;
                            const halfW = W / 2;
                            const H = cvs.height;
                            const halfH = H / 2;
                            const aspect = cvs.width / cvs.height;


                            const ptsN = [];
                            for (let i = 0; i < pts.length; i += 1) {
                                ptsN.push({
                                    x : (((pts[i].x - halfW) / halfW) * aspect) * viewScale,
                                    y : (((H - pts[i].y) - halfH) / halfH) * viewScale
                                });
                            }

                            rd.moveTo(ptsN[0].x, ptsN[0].y, 0);
                            rd.cursor().autoRestoreZ = true;
                            let I = 2;
                            for (; I < ptsN.length; I += 2) {
                                TR.boxTo(rd, ptsN[I].x, ptsN[I].y, 1);
                            }

                            rd.cursor().autoRestoreZ = false; 
                        }
                    }
                }    
           
            TR.endTriangles(rd);

            rd.modePrimitiveLines();

            if (true) {

                rd.color(0.0, 0.0, 0.0, 0.5);
                rd.moveTo(0.0, 0.0, 0.0);
                TR.beginLines(rd)
                    let xmin = -20;
                    let xmax =  20;
                    let zmin =  0;
                    let zmax =  0;
                    let ymin =  -20;
                    let ymax =  20;

                    for (let z = zmin; z <= zmax; z += 1) {
                        for (let y = ymin; y <= ymax; y += 1) {
                            TR.beginPathAt(rd, xmin, y, z);
                            rd.lineTo(xmax, y, z);
                            TR.endPath(rd);
                        }

                        for (let x = xmin; x <= xmax; x += 1) {
                            TR.beginPathAt(rd, x, ymin, z);
                            rd.lineTo(x, ymax, z);
                            TR.endPath(rd);
                        }
                    }
                }

                m.save();
                    m.identity();
                    rd.modelMatrix(m.value())
                m.restore();

            if (mouse[2] && state.pen.buffers.length > 0) {    
                rd.color(0.0, 0.0, 0.0, 1.0);
                for (let i = 0; i < state.pen.buffers.length; i += 1) {
                    const pts = state.pen.buffers[i];
                    if (pts && pts.length != 0) {
                        const cvs = MR.getCanvas();
                        const W = cvs.width;
                        const halfW = W / 2;
                        const H = cvs.height;
                        const halfH = H / 2;
                        const aspect = cvs.width / cvs.height;


                        let xn = 0;
                        let yn = 0;

                        xn = (((pts[0].x - halfW) / halfW) * aspect) * viewScale;
                        yn = (((H - pts[0].y) - halfH) / halfH) * viewScale;

                        TR.beginPathAt(rd, xn, yn, 0.0);
                        for (let i = 1; i < pts.length; i += 1) {
                            xn = (((pts[i].x - halfW) / halfW) * aspect) * viewScale;
                            yn = (((H - pts[i].y) - halfH) / halfH) * viewScale;
                            rd.lineTo(xn, yn, 0.0);
                        }
                        TR.endPath(rd);
                    }
                }
            }

            TR.endLines(rd);
        }
 
        TR.uploadData(rd);

    m.restore();
}

const mouse = new Float32Array(3);
const cposbuf          = [0, 0, 0];
const pcposbuf         = [0, 0, 0];
const orthoWindowScale = .56;
const viewScale        = 8;

function onStartFrame(t, state, info) {
    window.time = t;
    const clock = state.clock;

    clock.timeMS = t;
    clock.time   = t / 1000.0;
    clock.acc    += t - clock.timePrevMS;

    window.diff = t - clock.timePrevMS;

    clock.timePrevMS = t;

    const input  = state.input;
    const cursor = input.cursor;

    const cvs = MR.getCanvas();
    const w = cvs.width;
    const h = cvs.height;

    const pos  = cursor.position();
    mouse.set(pos);
    cposbuf[0] = pos[0] / w * 2 - 1;
    cposbuf[1] = 1 - pos[1] / h * 2;
    const ppos = cursor.prevPosition();
    pcposbuf[0] = ppos[0] / w * 2 - 1;
    pcposbuf[1] = 1 - ppos[1] / h * 2;

    if (cursor.z() && cursor.prevPosition()[2]) {
        input.turnAngle -= Math.PI/2 * (cposbuf[0] - pcposbuf[0]);
        input.tiltAngle += Math.PI/2 * (cposbuf[1] - pcposbuf[1]);
    }
        
    // const LERP_TIME = 0;
    // if (Input.keyWentDown(Input.KEY_RIGHT)) {
    //     Camera.rotate(state.viewCam, -Math.PI/4, axis_up, state.viewCam._position, LERP_TIME);
    // }
    // if (Input.keyWentDown(Input.KEY_LEFT)) {
    //     Camera.rotate(state.viewCam, Math.PI/4, axis_up, state.viewCam._position, LERP_TIME);
    // }
    // if (Input.keyWentDown(Input.KEY_UP)) {
    //     Camera.rotate(state.viewCam, Math.PI/4, axis_right, state.viewCam._position, LERP_TIME);
    // }
    // if (Input.keyWentDown(Input.KEY_DOWN)) {
    //     Camera.rotate(state.viewCam, -Math.PI/4, axis_right, state.viewCam._position, LERP_TIME);
    // }
    // if (Input.keyWentDown(Input.KEY_0)) {
    //     Camera.reset_transform(state.viewCam, state.viewCam.startPosition, glMatrix.quat.create());
    // }
    const LERP_TIME = 0.7;
    function printRet(arg) {
        console.log(arg);
        return arg;
    }

    if (Input.keyWentDown(Input.KEY_RIGHT)) {
        console.log(state.viewCam._position)
        Camera.rotate(state.viewCam,
            quaternion_angle_axis(
                -Math.PI/4,
                quaternion_multiply_vec3(state.viewCam.rotation, axis_up)
            ),
            state.viewCam._position, LERP_TIME
        );
    }
    if (Input.keyWentDown(Input.KEY_LEFT)) {
        Camera.rotate(state.viewCam, 
            quaternion_angle_axis(
                Math.PI/4,
                quaternion_multiply_vec3(state.viewCam.rotation, axis_up)
            ),
            state.viewCam._position, LERP_TIME
        );
    }
    if (Input.keyWentDown(Input.KEY_UP)) {
        Camera.rotate(state.viewCam, 
            quaternion_angle_axis(
                Math.PI/4,
                quaternion_multiply_vec3(state.viewCam.rotation, axis_right)
            ),
            state.viewCam._position, LERP_TIME
        );    
    }
    if (Input.keyWentDown(Input.KEY_DOWN)) {
        Camera.rotate(state.viewCam, 
            quaternion_angle_axis(
                -Math.PI/4,
                quaternion_multiply_vec3(state.viewCam.rotation, axis_right)
            ),
            state.viewCam._position, LERP_TIME
        );    
    }
    if (Input.keyWentDown(Input.KEY_0)) {
        Camera.reset_transform(state.viewCam, state.viewCam.startPosition, glMatrix.quat.create());
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

    if (pos[2] == 1) {
        const justDown = (pos[2] == 1 && (pos[2] != ppos[2]));

        const cvs    = MR.getCanvas();
        const aspect = cvs.width / cvs.height;

        Pen.update(state.pen,
            [pos[0] / orthoWindowScale, 
            ((cvs.height) - 
            ((cvs.height - pos[1]) / orthoWindowScale)) + (((state.viewCam.translationY() * cvs.height * 0.5 * orthoWindowScale) / orthoWindowScale) / viewScale)], justDown
        );
    }

    updateRenderData(clock, state, info, state.renderer);

    gl.clearColor(0.529, 0.808, 0.922, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function updateWorldXR(clock, state, info) {
}
function onStartFrameXR(t, state, info) {
}

function onDraw(t, projMat, viewMat, state, info) {
    const rd = state.renderer;

    TR.beginRenderPass(rd);
    for (let i = 0; i < 2; i += 1) {
        
            bindRenderPipeline(myRenderPipeline);
            {

                const cvs = MR.getCanvas();

                const aspect = cvs.width / cvs.height;
                const orthoMat = la.mat4.ortho(
                    la.mat4.create(),
                    -viewScale * aspect, viewScale * aspect,
                    -viewScale, viewScale, 0.01, 1024
                );

                projMat = la.mat4.perspective(
                    la.mat4.create(),
                    Math.PI / 4,
                    aspect,
                    0.01, 1024
                );

                rd.modelMatrixGlobal(ident);
                state.transform.model = new Float32Array(ident);
                switch (i) {
                case 0: {
                    rd.projectionMatrixGlobal(projMat);
                    state.transform.projection = new Float32Array(projMat);




                    break;
                }
                case 1: {
                    rd.projectionMatrixGlobal(orthoMat);
                    state.transform.projection = new Float32Array(orthoMat);

            const unprojectOut = new Float32Array(4);
            const ok = math.unproject(
                mouse[0], cvs.height - mouse[1], 0.0, 
                state.transform.view,
                state.transform.projection,
                views.mini,
                unprojectOut
            )

            if (ok) {
                rd.modeTriangles();
                TR.beginTriangles(rd);
                const pointerHalfWidth  = 0.15;
                const pointerHalfHeight = 0.15;
                rd.color(0, 0, 0, 1)

                            //console.log(unprojectOut[0]);   

                rd.moveTo(
                    unprojectOut[0] - pointerHalfWidth,
                    unprojectOut[1] - pointerHalfHeight,
                    unprojectOut[2]
                );
                TR.boxTo(rd, 
                    unprojectOut[0] + pointerHalfWidth,
                    unprojectOut[1] + pointerHalfHeight,
                    unprojectOut[2]
                )
                TR.endTriangles(rd);
            }
                              
                    gl.enable(gl.SCISSOR_TEST);
                    gl.viewport(views.mini[0], views.mini[1], views.mini[2], views.mini[3]);
                    gl.scissor(views.mini[0], views.mini[1], views.mini[2], views.mini[3]);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    gl.disable(gl.SCISSOR_TEST);





                 
                    break;
                }
                }
                
            }
            TR.uploadData(rd);
 
            TR.draw(rd);
    }
    TR.endRenderPass(rd);

}
function onDrawXR(t, projMat, viewMat, state, info) {
}

function onEndFrame(t, state) {
    state.renderer.rewindToStart();

    Input.setGamepadStateChanged(false);

    state.input.cursor.updateState();
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