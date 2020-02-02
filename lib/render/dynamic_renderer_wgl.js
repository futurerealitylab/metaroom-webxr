"use strict";

import * as Shader          from "/lib/core/gpu/webgl_shader_util.js";
import {DynamicArrayBuffer} from "/lib/core/memory.js";

const MODE_TYPE_TRIANGLES = 0;
const MODE_TYPE_LINES     = 1;

// enum << 1 | 1
const STATE_CHANGE_NIL                =  0; 
const STATE_CHANGE_LINE_WIDTH         =  3;
const STATE_CHANGE_PRIMITIVE_TOPOLOGY =  5;
const STATE_CHANGE_MODEL_MATRIX       =  7;
const STATE_CHANGE_VIEW_MATRIX        =  9;
const STATE_CHANGE_PROJECTION_MATRIX  =  11;
const STATE_CHANGE_CLOCK_SECONDS      =  13;
const STATE_CHANGE_TYPE_COUNT__       =   7;   

const ident = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
const bufMat4 = new Float32Array(16);
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
function multiply(out, a, b) {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
}

function updateGPUStateData(self, rState, gpuState) {
    const ctx = gpuState.ctx;

    // TODO(TR): getting uniforms from a current shader easily
    // would get this from rState
    const activeShaderRecord = gpuState.activeShaderRecord;
    const program            = activeShaderRecord.program;
    const uniformLocations   = activeShaderRecord.uniforms;


    for (let i = 0; i < rState.changed.length; i += 1) {

        switch (rState.changed[i]) {
        case STATE_CHANGE_LINE_WIDTH: {
            ctx.lineWidth(rState.lineWidth);
            break;
        }
        case STATE_CHANGE_MODEL_MATRIX: {
            // console.log(
            //     "MODEL", multiply(bufMat4, self._modelMatrixGlobal, rState.modelMatrix))
            ctx.uniformMatrix4fv(
                uniformLocations.uModel,
                false,
                multiply(bufMat4, self._modelMatrixGlobal, rState.modelMatrix)
            );
            break;
        }
        case STATE_CHANGE_VIEW_MATRIX: {
            // console.log(
            //     "VIEW", multiply(bufMat4, self._viewMatrixGlobal, rState.viewMatrix))
            ctx.uniformMatrix4fv(
                uniformLocations.uView,
                false,
                multiply(bufMat4, self._viewMatrixGlobal, rState.viewMatrix)
            );
            break;
        }
        case STATE_CHANGE_PROJECTION_MATRIX: {
            // console.log(
            //     "PROJECTION", multiply(bufMat4, self._projectionMatrixGlobal, rState.projectionMatrix))            
            ctx.uniformMatrix4fv(
                uniformLocations.uProj,
                false,
                multiply(bufMat4, self._projectionMatrixGlobal, rState.projectionMatrix)
            );
            break;
        }
        case STATE_CHANGE_CLOCK_SECONDS: {
            ctx.uniform1f(
                uniformLocations.uTime,
                rState.clockSeconds
            );
            break;
        }
        // case STATE_CHANGE_PRIMITIVE_TOPOLOGY: {
        //     break;
        // }
        }
    }
}


function RendererState_initMatrices(_) {
    _.modelMatrix = new Float32Array(
        [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
    );
    _.viewMatrix = new Float32Array(
        [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
    );
    _.projectionMatrix = new Float32Array(
        [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
    );
}

class RendererState {

    static id = 0;

	constructor(ctx, id) {
        this.id = RendererState.id;
        RendererState.id += 1;

		this.lineWidth         = 1;
		this.vertexCount       = 0;
        this.byteCount         = 0;
		this.color             = new Float32Array([1.0, 1.0, 1.0, 1]);
        this.primitiveTopology = ctx.TRIANGLES;
        this.modeType          = MODE_TYPE_TRIANGLES;
    
        // array views
        this.modelMatrix = new Float32Array(
            [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
        );
        this.viewMatrix = new Float32Array(
            [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
        );
        this.projectionMatrix = new Float32Array(
            [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
        );

        this.clockSeconds = 0;

        this.changed = [];
	}

    markStateChanged(type) {
        this.changed.push(type);
    }

    static lineWidthCopy(src, dst) {
        dst.lineWidth = src.lineWidth;
    }
    static colorCopy(src, dst) {
        dst.color[0] = src.color[0];
        dst.color[1] = src.color[1];
        dst.color[2] = src.color[2];
        dst.color[3] = src.color[3];
    }
    static primitiveTopologyCopy(src, dst) {
        dst.primitiveTopology = src.primitiveTopology;
    }
    static modeTypeCopy(src, dst) {
        dst.modeType = src.modeType;
    }
    static matricesCopy(src, dst) {
        dst.modelMatrix.set(src.modelMatrix);
        dst.viewMatrix.set(src.viewMatrix);
        dst.projectionMatrix.set(src.projectionMatrix);
    }
    static modelMatrixCopy(src, dst) {
        dst.modelMatrix.set(src.modelMatrix);
    }
    static viewMatrixCopy(src, dst) {
        dst.viewMatrix.set(src.viewMatrix);
    }
    static projectionMatrixCopy(src, dst) {
        dst.projectionMatrix.set(src.projectionMatrix);
    }
}

const RENDERER_STATE_INIT      = 0;
const RENDERER_STATE_CHANGED   = 1;
const RENDERER_STATE_UNCHANGED = 2;

export class RenderArgs {
    static id = 0;

    static create() {
        
    }
}



class RendererStateSet {
	constructor(ctx, initSize = 32) {
	    initSize = Math.max(1, initSize);

		this.states = [];
		while (this.states.length < initSize) {
			this.states.push(new RendererState(ctx));
		}

        RendererState_initMatrices(this.states[0]);

		this.count = RendererStateSet.INIT_COUNT;

        this.stateChanged = RENDERER_STATE_INIT;
	}

	stateChange(type) {
		if (this.states.length == this.count) {
			this.states.push(new RendererState(ctx));
		}

		this.count += 1;

        this.stateChanged = RENDERER_STATE_UNCHANGED;
	}

	current() {
		return this.states[this.count - 1];
	}
	prev() {
		return this.states[this.count - 2];
	}

	reset() {
        for (let i = 0; i < this.count; i += 1) {
            this.states[i].vertexCount = 0;
            this.states[i].byteCount   = 0;
            this.states[i].changed     = [];
        }
		this.count = RendererStateSet.INIT_COUNT;

        this.stateChanged = RENDERER_STATE_INIT;
	}
}
RendererStateSet.INIT_COUNT = 1;

export class PathCursor {


	constructor() {
        this.init();
	}

	updatePosition(x, y, z) {
        this.prevPosition[0] = this.position[0];
        this.prevPosition[1] = this.position[1];
        this.prevPosition[2] = this.position[2];

		this.position[0] = x;
		this.position[1] = y;
		this.position[2] = 
            this.position[2] * this.autoRestoreZ + 
                (z * (1 - this.autoRestoreZ));
	}

    init() {
        this.active       = false;
        this.position     = [0, 0, 0];
        this.prevPosition = [0, 0, 0];
        this.prevColor    = [0, 0, 0, 1];

        this.autoRestoreZ = false;        
        this.autoRestoreDepth = false;
    }
}

function useShader(ctx, info, key) {
    const shaderRecord = info.shaders.get(key);
    const program = shaderRecord.program; 
    ctx.useProgram(program);

    info.activeShaderRecord = shaderRecord;
    return shaderRecord;
}

const fmt_f32  = "float"
const fmt_vec2 = "float2";
const fmt_vec3 = "float3";
const fmt_vec4 = "float4";

const attribFormatToComponentCount = new Map([
    [fmt_f32,  1],
    [fmt_vec2, 2],
    [fmt_vec3, 3],
    [fmt_vec4, 4]
]);

async function initGPUState(ctx, info, args) {

    const program = useShader(ctx, info, FX_MODE_DEFAULT).program;

    // buffers
    for (let i = 0; i < info.bufferCount; i += 1) {
        info.buffers[i] = {
            vao : ctx.createVertexArray(),
            vbo : ctx.createBuffer(),
            vboByteLength : info.vertexData.buffer.byteLength,
            ebo : ctx.createBuffer(),
            eboByteLength : 0,
            vboByteLength : 0,
            eboByteLength : 0
        };

        ctx.bindVertexArray(info.buffers[i].vao);
        {
            ctx.bindBuffer(ctx.ARRAY_BUFFER, info.buffers[i].vbo);
        
            ctx.bufferData(
                ctx.ARRAY_BUFFER,
                info.vertexData.buffer,
                ctx.STREAM_DRAW
            );

            info.buffers[i].vboByteLength = info.vertexData.buffer.byteLength

            // specify vertex layout
            const vertexState = {
                vertexBuffers : [
                {   
                    arrayStride : 28,
                    attributes  : [ 
                        {shaderLocation : 0, offset : 0,  normalized : false, format : fmt_vec3, type : ctx.FLOAT, name : "aPos"},
                        {shaderLocation : 1, offset : 12, normalized : false, format : fmt_vec4, type : ctx.FLOAT, name : "aColor"} 
                    ]
                }
                ]
            }
            info.vertexState = vertexState;

            // assign attributes
            const attributes = vertexState.vertexBuffers[0].attributes;
            for (let i = 0; i < attributes.length; i += 1) {

                // console.log(
                //     attributes[i].shaderLocation,
                //     attribFormatToComponentCount.get(attributes[i].format),
                //     attributes[i].type,
                //     attributes[i].normalized,
                //     vertexState.vertexBuffers[0].arrayStride,
                //     attributes[i].offset
                // );
                //const loc = gl.getAttribLocation(program, attributes[i].name);
                ctx.enableVertexAttribArray(attributes[i].shaderLocation);

                ctx.vertexAttribPointer(
                    attributes[i].shaderLocation,
                    attribFormatToComponentCount.get(attributes[i].format),
                    attributes[i].type,
                    attributes[i].normalized,
                    vertexState.vertexBuffers[0].arrayStride,
                    attributes[i].offset
                );
            }
        }
    }

    info.primitiveLineTopologyWidthRange = ctx.getParameter(ctx.ALIASED_LINE_WIDTH_RANGE);
}

export const FX_MODE_COLORED = 0;
export const FX_MODE_DEFAULT = FX_MODE_COLORED;



///////////////////////////////////////////////////////////////////

export function edgeTo(self, x, y, z, r, g, b, a) {
    const xyz    = self.cursor().position;
    const rState = self.rendererStates.current();

    self.pushVertexEX(
        xyz[0], xyz[1], xyz[2], 
        rState.color[0], 
        rState.color[1], 
        rState.color[2], 
        rState.color[3]
    );

    if (self.pathStarted) {
        self.pathStarted = false;  

        const xyz   = self.cursor().position;
        const color = self.rendererStates.current().color;
        self.firstPoint = [
            xyz[0], xyz[1], xyz[2],
            color[0], color[1], color[2], color[3]
        ];
    } else if (self.rendererStates.current().vertexCount - self.pathVertexCountOffset == 3) {
        self.pathVertexCountOffset = self.rendererStates.current().vertexCount;

        self.pushVertexEX(
            xyz[0], xyz[1], xyz[2], 
            rState.color[0], 
            rState.color[1], 
            rState.color[2], 
            rState.color[3]
        );
    } 

    self.cursor().updatePosition(x, y, z);    
}
export function edgeToEX(self, x, y, z, r, g, b, a) {
    const xyz = self.cursor().position;


    self.pushVertexEX(
        xyz[0], xyz[1], xyz[2], 
        r, g, b, a
    );

    if (self.pathStarted) {

        self.pathStarted = false;  

        const xyz = self.cursor().position;

        self.firstPoint = [
            xyz[0], xyz[1], xyz[2],
            r, g, b, a
        ];
    } else if (self.rendererStates.current().vertexCount - self.pathVertexCountOffset == 3) {
        self.pathVertexCountOffset = self.rendererStates.current().vertexCount;

        self.pushVertexEX(
            xyz[0], xyz[1], xyz[2], 
            r, g, b, a
        );
    } 

    self.cursor().updatePosition(x, y, z); 
}

export function beginTriangles(self) {
    self.pathStarted = true;
    self.pathVertexCount = 0;

    const xyz    = self.cursor().position;
    const color = self.rendererStates.current().color;

    self.firstPoint = [
        xyz[0], xyz[1], xyz[2],
        color[0], color[1], color[2], color[3]
    ];
}
export function beginTrianglesAt(self, x, y, z) {
    self.moveTo(x, y, z);
    self.pathStarted = true;
    self.pathVertexCount = 0;

    const color = self.rendererStates.current().color;

    self.firstPoint = [
        x, y, z,
        color[0], color[1], color[2], color[3]
    ];
}

export function triangleTo(self, x1, y1, z1, x2, y2, z2) {
    const xyz    = self.cursor().position;
    const rState = self.rendererStates.current();

    self.pushVertexEX(
        xyz[0], xyz[1], xyz[2], 
        rState.color[0], 
        rState.color[1], 
        rState.color[2], 
        rState.color[3]
    );
    self.cursor().updatePosition(x1, y1, z1);

    self.pushVertexEX(
        xyz[0], xyz[1], xyz[2], 
        rState.color[0], 
        rState.color[1], 
        rState.color[2], 
        rState.color[3]
    );
    self.cursor().updatePosition(x2, y2, z2);

    self.pushVertexEX(
        xyz[0], xyz[1], xyz[2], 
        rState.color[0], 
        rState.color[1], 
        rState.color[2], 
        rState.color[3]
    );
}
export function triangleToEX(self, 
    x1, y1, z1,
    x2, y2, z2,
    r0, g0, b0, a0,
    r1, g1, b1, a1,
    r2, g2, b2, a2
) {
    const xyz    = self.cursor().position;

    self.pushVertexEX(
        xyz[0], xyz[1], xyz[2], 
        r0, 
        g0, 
        b0, 
        a0
    );
    self.cursor().updatePosition(x1, y1, z1);

    self.pushVertexEX(
        xyz[0], xyz[1], xyz[2], 
        r1, 
        g1, 
        b1, 
        a1
    );
    self.cursor().updatePosition(x2, y2, z2);

    self.pushVertexEX(
        xyz[0], xyz[1], xyz[2], 
        r2, 
        g2, 
        b2, 
        a2
    );
}
export function endTriangles(self) {
    self.pathStarted = false;
}

export function beginBox(self) {
    self.pathStarted = true;

    const xyz    = self.cursor().position;
    const color = self.rendererStates.current().color;

    self.firstPoint = [
        x, y, z,
        color[0], color[1], color[2], color[3]
    ];
}
export function beginBoxAt(self, x, y, z) {
    self.moveTo(x, y, z);    
    self.pathStarted = true;

    const xyz    = self.cursor().position;
    const color = self.rendererStates.current().color;

    self.firstPoint = [
        x, y, z,
        color[0], color[1], color[2], color[3]
    ];
}

// these draw a box with a diagonal running through 2 points,
// base parallel with the floor
export function boxTo(self, x, y, z) {
    const xyz = self.cursor().position;
    const dx = x - xyz[0];
    const dy = y - xyz[1];
    const dz = x - xyz[2];

    let x0 = 0;
    let x1 = 0;
    let y0 = 0;
    let y1 = 0;
    let z0 = xyz[2];
    let z1 = z;

    const color = self.rendererStates.current().color;


    if (dx > 0) {
        x0 = x;
        x1 = xyz[0];            
    } else {
        x0 = xyz[0];
        x1 = x;
    }
    if (dy > 0) {
        y0 = xyz[1];
        y1 = y;
    } else {
        y0 = y;
        y1 = xyz[1];
    }
    if (dz > 0) {
        z0 = xyz[2];
        z1 = z;
    } else {
        z0 = z;
        z1 = xyz[2];        
    }

    // 0 -- 3
    // | \  |
    // |  \ |
    // |   \|
    // 1 -- 2
    ////////////// front face
    const v0x = x0;
    const v0y = y0;
    const v0z = z0;

    const v1x = x0;
    const v1y = y1;
    const v1z = z0;

    const v2x = x1;
    const v2y = y1;
    const v2z = z0;

    const v3x = x1;
    const v3y = y0;
    const v3z = z0;

    self.pushVertexEX(
        v0x, v0y, v0z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v1x, v1y, v1z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v2x, v2y, v2z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v2x, v2y, v2z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v3x, v3y, v3z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v0x, v0y, v0z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    ////////////// right face
    const v4x = x1;
    const v4y = y0;
    const v4z = z0;

    const v5x = x1;
    const v5y = y1;
    const v5z = z0;

    const v6x = x1;
    const v6y = y1;
    const v6z = z1;

    const v7x = x1;
    const v7y = y0;
    const v7z = z1;

    self.pushVertexEX(
        v4x, v4y, v4z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v5x, v5y, v5z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v6x, v6y, v6z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v6x, v6y, v6z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v7x, v7y, v7z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v4x, v4y, v4z,
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    ////////////// back face
    const v11x = x0;
    const v11y = y0;
    const v11z = z1;

    const v10x = x0;
    const v10y = y1;
    const v10z = z1;

    const v9x = x1;
    const v9y = y1;
    const v9z = z1;

    const v8x = x1;
    const v8y = y0;
    const v8z = z1;

    self.pushVertexEX(
        v8x, v8y, v8z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v9x, v9y, v9z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v10x, v10y, v10z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v10x, v10y, v10z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v11x, v11y, v11z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v8x, v8y, v8z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    ////////////// left face
    const v12x = x0;
    const v12y = y0;
    const v12z = z1;

    const v13x = x0;
    const v13y = y1;
    const v13z = z1;

    const v14x = x0;
    const v14y = y1;
    const v14z = z0;

    const v15x = x0;
    const v15y = y0;
    const v15z = z0;

    self.pushVertexEX(
        v12x, v12y, v12z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v13x, v13y, v13z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v14x, v14y, v14z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v14x, v14y, v14z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v15x, v15y, v15z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v12x, v12y, v12z,
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    ////////////// top face
    const v16x = x0;
    const v16y = y1;
    const v16z = z0;

    const v17x = x0;
    const v17y = y1;
    const v17z = z1;

    const v18x = x1;
    const v18y = y1;
    const v18z = z1;

    const v19x = x1;
    const v19y = y1;
    const v19z = z0;

    self.pushVertexEX(
        v16x, v16y, v16z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v17x, v17y, v17z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v18x, v18y, v18z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v18x, v18y, v18z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v19x, v19y, v19z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v16x, v16y, v16z,
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    ////////////// bottom face
    const v20x = x0;
    const v20y = y0;
    const v20z = z1;

    const v21x = x0;
    const v21y = y0;
    const v21z = z0;

    const v22x = x1;
    const v22y = y0;
    const v22z = z0;

    const v23x = x1;
    const v23y = y0;
    const v23z = z1;

    self.pushVertexEX(
        v20x, v20y, v20z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v21x, v21y, v21z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v22x, v22y, v22z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v22x, v22y, v22z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v23x, v23y, v23z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v20x, v20y, v20z,
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    self.cursor().updatePosition(x, y, z);

}
// these draw a box with a diagonal running through 2 points,
// base parallel with the floor
export function boxToRelative(self, x, y, z) {
    const xyz = self.cursor().position;
    const dx = x;
    const dy = y;
    const dz = x;

    x = xyz[0] + x;
    y = xyz[1] + y;
    z = xyz[2] + z;

    let x0 = 0;
    let x1 = 0;
    let y0 = 0;
    let y1 = 0;
    let z0 = xyz[2];
    let z1 = z;

    const color = self.rendererStates.current().color;


    if (dx > 0) {
        x0 = x;
        x1 = xyz[0];            
    } else {
        x0 = xyz[0];
        x1 = x;
    }
    if (dy > 0) {
        y0 = xyz[1];
        y1 = y;
    } else {
        y0 = y;
        y1 = xyz[1];
    }
    if (dz > 0) {
        z0 = xyz[2];
        z1 = z;
    } else {
        z0 = z;
        z1 = xyz[2];        
    }

    // 0 -- 3
    // | \  |
    // |  \ |
    // |   \|
    // 1 -- 2
    ////////////// front face
    const v0x = x0;
    const v0y = y0;
    const v0z = z0;

    const v1x = x0;
    const v1y = y1;
    const v1z = z0;

    const v2x = x1;
    const v2y = y1;
    const v2z = z0;

    const v3x = x1;
    const v3y = y0;
    const v3z = z0;

    self.pushVertexEX(
        v0x, v0y, v0z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v1x, v1y, v1z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v2x, v2y, v2z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v2x, v2y, v2z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v3x, v3y, v3z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v0x, v0y, v0z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    ////////////// right face
    const v4x = x1;
    const v4y = y0;
    const v4z = z0;

    const v5x = x1;
    const v5y = y1;
    const v5z = z0;

    const v6x = x1;
    const v6y = y1;
    const v6z = z1;

    const v7x = x1;
    const v7y = y0;
    const v7z = z1;

    self.pushVertexEX(
        v4x, v4y, v4z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v5x, v5y, v5z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v6x, v6y, v6z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v6x, v6y, v6z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v7x, v7y, v7z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v4x, v4y, v4z,
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    ////////////// back face
    const v11x = x0;
    const v11y = y0;
    const v11z = z1;

    const v10x = x0;
    const v10y = y1;
    const v10z = z1;

    const v9x = x1;
    const v9y = y1;
    const v9z = z1;

    const v8x = x1;
    const v8y = y0;
    const v8z = z1;

    self.pushVertexEX(
        v8x, v8y, v8z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v9x, v9y, v9z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v10x, v10y, v10z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v10x, v10y, v10z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v11x, v11y, v11z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v8x, v8y, v8z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    ////////////// left face
    const v12x = x0;
    const v12y = y0;
    const v12z = z1;

    const v13x = x0;
    const v13y = y1;
    const v13z = z1;

    const v14x = x0;
    const v14y = y1;
    const v14z = z0;

    const v15x = x0;
    const v15y = y0;
    const v15z = z0;

    self.pushVertexEX(
        v12x, v12y, v12z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v13x, v13y, v13z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v14x, v14y, v14z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v14x, v14y, v14z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v15x, v15y, v15z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v12x, v12y, v12z,
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    ////////////// top face
    const v16x = x0;
    const v16y = y1;
    const v16z = z0;

    const v17x = x0;
    const v17y = y1;
    const v17z = z1;

    const v18x = x1;
    const v18y = y1;
    const v18z = z1;

    const v19x = x1;
    const v19y = y1;
    const v19z = z0;

    self.pushVertexEX(
        v16x, v16y, v16z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v17x, v17y, v17z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v18x, v18y, v18z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v18x, v18y, v18z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v19x, v19y, v19z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v16x, v16y, v16z,
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    ////////////// bottom face
    const v20x = x0;
    const v20y = y0;
    const v20z = z1;

    const v21x = x0;
    const v21y = y0;
    const v21z = z0;

    const v22x = x1;
    const v22y = y0;
    const v22z = z0;

    const v23x = x1;
    const v23y = y0;
    const v23z = z1;

    self.pushVertexEX(
        v20x, v20y, v20z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v21x, v21y, v21z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v22x, v22y, v22z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v22x, v22y, v22z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v23x, v23y, v23z, 
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    self.pushVertexEX(
        v20x, v20y, v20z,
        color[0], 
        color[1], 
        color[2], 
        color[3]
    );
    //////////////
    self.cursor().updatePosition(x, y, z);

}
export function boxToEX(self, 
    x, y, z,
    r0, g0, b0, a0,
    r1, g1, b1, a1
) {
    const xyz = self.cursor().position;

    const dx = x - xyz[0];
    const dy = y - xyz[1];
    const dz = x - xyz[2];

    // TODO
}
export function endBox(self) {
    self.pathStarted = false;    
}


export function pathTo(self, x, y, z) {
    switch (self.rendererStates.current().modeType) {

    case MODE_TYPE_LINES: {
        switch (self.rendererStates.current().primitiveTopology) {
        case self.ctx.LINES: {
            self.primitiveLineTo(x, y, z);
            break;
        }
        case self.ctx.TRIANGLES: {
            break;
        }
        }
        break;
    }
    case MODE_TYPE_TRIANGLES: {
        edgeTo(self, x, y, z);
        break;
    }
    }
}

export function pathToEX(self, x, y, z, r, g, b, a) {
    switch (self.rendererStates.current().modeType) {

    case MODE_TYPE_LINES: {
        switch (self.rendererStates.current().primitiveTopology) {
        case self.ctx.LINES: {
            self.primitiveLineToEX(x, y, z, r, g, b, a);
            break;
        }
        case self.ctx.TRIANGLES: {
            console.error("NOT IMPLEMENTED YET");
            console.assert(false);
            break;
        }
        }
        break;
    }
    case MODE_TYPE_TRIANGLES: {

        edgeToEX(self, x, y, z, r, g, b, a);
        //BL
        break;
    }
    }
}


function guardParams(r, g, b, a) {
    console.assert(
        r != undefined && 
        g != undefined && 
        g != undefined && 
        a != undefined
    );
}

// lowest level functions
export function pushVertexEX(self, x, y, z, r, g, b, a) {
    const buf = self.gpuState.vertexData;
    //console.log("[%f,%f,%f,%f,%f,%f,%f]", x, y, z, r, g, b, a);
    guardParams(r, g, b, a);

    buf.ensureFree(LAYOUT_COMPONENT_COUNT_DEFAULT);

    const data  = buf.bufferView;
    const count = buf.count;

    data[count]     = x;
    data[count + 1] = y;
    data[count + 2] = z;
    data[count + 3] = r;
    data[count + 4] = g;
    data[count + 5] = b;
    data[count + 6] = a;

    // necessary since this is direct access into the data
    buf.incrementBy(LAYOUT_COMPONENT_COUNT_DEFAULT);

    self.rendererStates.current().byteCount += 
        LAYOUT_COMPONENT_COUNT_DEFAULT * Float32Array.BYTES_PER_ELEMENT;

    self.rendererStates.current().vertexCount += 1;

    self.rendererStates.stateChanged = RENDERER_STATE_CHANGED;
}
export function pushVertexArrayEX(self, pointArray) {
    const buf   = self.gpuState.vertexData;

    buf.ensureFree(pointArray.length);

    const count = self.buf.count;
    const data  = buf.bufferView;

    data.set(pointArray, buf.count);

    buf.incrementBy(pointArray.length);

    self.rendererStates.current().byteCount += 
        pointArray.length * Float32Array.BYTES_PER_ELEMENT; // TODO support not only floats

    self.rendererStates.current().vertexCount += pointArray.length / self.lineVertexSize;

    self.rendererStates.stateChanged = RENDERER_STATE_CHANGED;
}

export function pushVertex(self, x, y, z) {
    //console.log("push_v: ", x, y, z);

    const buf   = self.gpuState.vertexData;
    const color = self.rendererStates.current().color;

    buf.ensureFree(LAYOUT_COMPONENT_COUNT_DEFAULT);

    const data  = buf.bufferView;
    const count = buf.count;

    data[count]     = x;
    data[count + 1] = y;
    data[count + 2] = z;
    data[count + 3] = color[0];
    data[count + 4] = color[1];
    data[count + 5] = color[2];
    data[count + 6] = color[3];

    // necessary since this is direct access into the data
    buf.incrementBy(LAYOUT_COMPONENT_COUNT_DEFAULT);

    self.rendererStates.current().byteCount += 
        LAYOUT_COMPONENT_COUNT_DEFAULT * Float32Array.BYTES_PER_ELEMENT;

    self.rendererStates.current().vertexCount += 1;

    self.rendererStates.stateChanged = RENDERER_STATE_CHANGED;
}

export function beginPath(self) {
    self.pathStarted = true;
    self.pathVertexCountOffset = self.rendererStates.current().vertexCount;
    self.pathVertexCount = 0;

    // switch (self.rendererStates.current().modeType) {
    // case MODE_TYPE_LINES: {
    //     break;
    // }
    // case MODE_TYPE_TRIANGLES: {
    //     break;
    // }
    // }

    self.cursor().active = true;
}
export function beginPathAt(self, x, y, z) {
    self.moveTo(x, y, z);
    self.pathStarted = true;
    self.pathVertexCountOffset = self.rendererStates.current().vertexCount;
    self.pathVertexCount = 0;
    // switch (self.rendererStates.current().modeType) {
    // case MODE_TYPE_LINES: {
    //     break;
    // }
    // case MODE_TYPE_TRIANGLES: {
    //     break;
    // }
    // }

    self.cursor().active = true;
}
export function endPath(self) {

    const color = self.rendererStates.current().color;

    // switch (self.rendererStates.current().modeType) {

    // case MODE_TYPE_LINES: {
    //     switch (self.rendererStates.current().primitiveTopology) {
    //     case self.ctx.LINES: {
    //         const xyz = self.cursor().position;
    //         const color = self.rendererStates.current().color;

    //         self.pushVertexEX(
    //             xyz[0], xyz[1], xyz[2],
    //             color[0], color[1], color[2], color[3]
    //         );
    //         break;
    //     }
    //     case self.ctx.TRIANGLES: {
    //         console.error("NOT IMPLEMENTED YET");
    //         console.assert(false);
    //         break;
    //     }
    //     }
    //     break;
    // }
    // case MODE_TYPE_TRIANGLES: {
    //     break;
    // }
    // }

    const xyz = self.cursor().position;

    self.pushVertexEX(
        xyz[0], xyz[1], xyz[2],
        color[0], color[1], color[2], color[2]
    );

    self.cursor().active = false;  
    self.pathStarted = false;
}
export function endPathEX(self, r, g, b, a) {
    // switch (self.rendererStates.current().modeType) {
    // case MODE_TYPE_LINES: {
    //     break;
    // }
    // case MODE_TYPE_TRIANGLES: {
    //     break;
    // }
    // }

    const xyz = self.cursor().position;

    self.pushVertexEX(
        xyz[0], xyz[1], xyz[2],
        r, g, b, a
    );

    self.cursor().active = false;
    self.pathStarted = false;
}

export function closePath(self) {
    const color = self.rendererStates.current().color;
    switch (self.rendererStates.current().modeType) {
    case MODE_TYPE_LINES: {
        pathToEX(self, 
            self.firstPoint[0], self.firstPoint[1], self.firstPoint[2],
            color[0], color[1], color[2], color[3]
        );
        break;
    }
    case MODE_TYPE_TRIANGLES: {
        pathToEX(self, 
            self.firstPoint[0], self.firstPoint[1], self.firstPoint[2],
            color[0], color[1], color[2], color[3]
        )
        break;
    }
    }

    self.color(self.firstPoint[3], self.firstPoint[4], self.firstPoint[5], self.firstPoint[6]);
    
}

export function closePathEX(self, r, g, b, a) {
    switch (self.rendererStates.current().modeType) {
    case MODE_TYPE_LINES: {
        pathToEX(self, 
            self.firstPoint[0], self.firstPoint[1], self.firstPoint[2],
            r, g, b, a
        );
        break;
    }
    case MODE_TYPE_TRIANGLES: {
        pathToEX(self, 
            self.firstPoint[0], self.firstPoint[1], self.firstPoint[2],
            r, g, b, a
        )
        break;
    }
    }

    self.color(
        self.firstPoint[3],
        self.firstPoint[4],
        self.firstPoint[5],
        self.firstPoint[6]
    );
    
}

export function closePrimitiveLine(self) {
    const color = self.rendererStates.current().color;
    self.primitiveLineToEX(
        self.firstPoint[0], self.firstPoint[1], self.firstPoint[2],
        color[0], color[1], color[2], color[3]
    );

    self.color(self.firstPoint[3], self.firstPoint[4], self.firstPoint[5], self.firstPoint[6]);
}

export function closePrimitiveLineEX(self, r, g, b, a) {
    self.primitiveLineToEX(
        self.firstPoint[0], self.firstPoint[1], self.firstPoint[2],
        r, g, b, a
    );

    self.color(
        self.firstPoint[3],
        self.firstPoint[4],
        self.firstPoint[5],
        self.firstPoint[6]
    );
    
}

export function beginLine(self) {
    self.pathStarted = true;
}
export function beginLineAt(self, x, y, z) {
    self.moveTo(x, y, z);
    self.pathStarted = true;
    self.pathVertexCount = 0;

}
export function pushLineVertex(self, x, y, z) {
    if (self.pathStarted) {
        self.pathStarted = false;
        pushVertex(self, x, y, z);
    } else {
        pushVertex(self, x, y, z);
        pushVertex(self, x, y, z);
    }
}
export function pushLineVertexEX(self, x, y, z, r, g, b, a) {
    if (self.pathStarted) {
        self.pathStarted = false;
        pushVertexEX(self, x, y, z, r, g, b, a);
    } else {
        pushVertexEX(self, x, y, z, r, g, b, a);
        pushVertexEX(self, x, y, z, r, g, b, a);
    }
}
export function pushArrayLineVertexInterleavedEX(self, arr) {

    if (self.pathStarted) {
        self.pathStarted = false;
        pushVertexEX(self, 
            arr[0], arr[1], arr[2], 
            arr[3], arr[4], arr[5], arr[6]
        );
        for (let i = 7; i < arr.length; i += LAYOUT_COMPONENT_COUNT_DEFAULT) {
            pushVertexEX(self,
                arr[i], arr[1 + i], arr[i + 2], 
                arr[i + 3], arr[i + 4], arr[i + 5], arr[i + 6]                
            )
            pushVertexEX(self,
                arr[i], arr[1 + i], arr[i + 2], 
                arr[i + 3], arr[i + 4], arr[i + 5], arr[i + 6]                
            )
        }
    } else {
        for (let i = 0; i < arr.length; i += LAYOUT_COMPONENT_COUNT_DEFAULT) {
            pushVertexEX(self,
                arr[i], arr[1 + i], arr[i + 2], 
                arr[i + 3], arr[i + 4], arr[i + 5], arr[i + 6]                
            )
        }
    }
}

export function endLine(self) {
    const buf = self.gpuState.vertexData.bufferView;

    const posB = self.gpuState.vertexData.count - LAYOUT_COMPONENT_COUNT_DEFAULT;
    const posA = posB - LAYOUT_COMPONENT_COUNT_DEFAULT;

    // check if endpoints are duplicated
    if (buf[posA    ] == buf[posB    ] &&
        buf[posA + 1] == buf[posB + 1] &&
        buf[posA + 2] == buf[posB + 2]) {

        self.gpuState.vertexData.popMultiple(LAYOUT_COMPONENT_COUNT_DEFAULT);
    }

    self.pathStarted = false;
}



export const SHADER_CATALOGUE_DEFAULT = 0;
export class ShaderCatalogue {
    static catalogues = new Map();

    static activeInstance = null;
    static shaders        = null;
    static shaderLibs     = null;

    static makeCurrent(key, catalogue) {
        ShaderCatalogue.catalogues.set(key, catalogue);

        ShaderCatalogue.activeInstance = catalogue;
        ShaderCatalogue.shaders        = catalogue.shaders;
        ShaderCatalogue.shaderLibs     = catalogue.shaderLibs;
    }

    constructor() {
        this.shaders    = null;
        this.shaderLibs = null;
    }

    static async init(args) {

        const ShaderTextEditor = (
            await import("/lib/core/shader_text_editor.js")
        ).ShaderTextEditor;

        const ctx = args.ctx;

        const defaultCatalogue = new ShaderCatalogue();

        defaultCatalogue.shaders = new Map([
            [FX_MODE_COLORED, {program : null, uniforms : null}]
        ]);

        ShaderCatalogue.makeCurrent(SHADER_CATALOGUE_DEFAULT, defaultCatalogue);

        const ROOT_SHADERS = "assets/shaders/";
        // default shaders;
        const libs = args.libs || [
        {
            key         : "pnoise",
            path        : ROOT_SHADERS + "noise/pnoise.glsl",
            foldDefault : true,
        },
        {
            key         : "trig",
            path        : ROOT_SHADERS + "math/trig.glsl",
            foldDefault : true
        }
        ];  
        let shaderLibHandle = await ShaderTextEditor.loadLibs(ctx, "dynamic_renderer_libs",
            libs,
            {
                useAbsolutePaths : true,
                readonly : true
            }
        );
        if (!shaderLibHandle) {
            throw new Error("Could not load shader library");
        }
        defaultCatalogue.shaderLibs = shaderLibHandle;

        // color shader
        let shaderHandle = await ShaderTextEditor.loadAndRegisterShader(
            ctx,
            "vertex_colors_default",
            { 
                onAfterCompilation : (shaderProgram) => {
                    
                    const record = ShaderCatalogue.shaders.get(FX_MODE_COLORED);
                    record.program = shaderProgram;
                    
                    ctx.useProgram(record.program);
                    
                    record.uniforms = {};
                    Shader.getUniformLocations(ctx, record.program, record.uniforms, "");
                }
            },
            {
                paths : {
                    vertex   : ROOT_SHADERS + "dynamic_renderer/vertex_colors_default/vertex.vert.glsl",
                    fragment : ROOT_SHADERS + "dynamic_renderer/vertex_colors_default/fragment.frag.glsl"
                },
                // whether the editor should hide the shader sections by  default
                foldDefault : {vertex : true, fragment : true},

                useAbsolutePaths : true,
                readonly         : true
            }
        );
        if (!shaderHandle) {
            throw new Error("Could not load shader");
        }
    } 
}


export function uploadData(self) {

    const buffers = self.gpuState.
        buffers[self.gpuState.bufferIdx];
    const ctx     = self.ctx;
    
    ctx.bindVertexArray(
        buffers.vao
    );

    if (self.gpuState.vertexData.byteCount > 
        buffers.vboByteLength) 
    {
        buffers.vboByteLength = self.gpuState.
            vertexData.byteCount;

        ctx.bindBuffer(ctx.ARRAY_BUFFER, buffers.vbo);
        ctx.bufferData(
            ctx.ARRAY_BUFFER,
            self.gpuState.vertexData.buffer,
            ctx.STREAM_DRAW
        );

    } else {
        const byteCount = self.gpuState.vertexData.byteCount;
        if (byteCount > 0) {
            const vertices = self.gpuState.vertexData.buffer;
            const toUpload = new Uint8Array(vertices, 0, byteCount);

            ctx.bindBuffer(ctx.ARRAY_BUFFER, buffers.vbo);
            ctx.bufferSubData(
                ctx.ARRAY_BUFFER, 
                0, 
                toUpload
            );         
        }
    }  
}

export function draw(self) {
    // temp since only one shader
    const record = useShader(self.ctx, self.gpuState, FX_MODE_DEFAULT);
    self.ctx.uniform1f(record.uniforms.uTime, self.globalTimeSeconds);
    const buffers = self.gpuState.buffers[self.gpuState.bufferIdx];

    self.ctx.bindVertexArray(
        buffers.vao
    );

    let offset = 0;
    let count  = 0;
    for (let i = 0; i < self.rendererStates.count; i += 1) {
        count = self.rendererStates.states[i].vertexCount;  

        // TODO(TR): use specific shader in "updateGPUStateData"
        //useShader(self.ctx, self.gpuState, FX_MODE_DEFAULT);

        updateGPUStateData(self, self.rendererStates.states[i], self.gpuState);

        if (count > 0) {
            self.ctx.drawArrays(self.rendererStates.states[i].primitiveTopology, offset, count);
        }

        offset += count;
    }
    
}

////
export const LAYOUT_COMPONENT_COUNT_DEFAULT = 7; // 11 + 4 probably
export class Renderer_GL {

    static ctx = null;

    static async initSystem(args) {
        Renderer_GL.ctx = args.ctx;

        await ShaderCatalogue.init(args);
    }

	async init(ctx, args = {}) {
		this.ctx = ctx;

        const initialByteSize = args.initialByteSize || Float32Array.BYTES_PER_ELEMENT * 11 * 1024;

        this._projectionMatrixGlobal = new Float32Array(ident);
        this._viewMatrixGlobal = new Float32Array(ident);
        this._modelMatrixGlobal = new Float32Array(ident);

		this.gpuState = {
            ctx : ctx,
            vao : null,
		    buffers : [],
            bufferCount : args.bufferCount || 1,
            bufferIdx : 0, 
			vertexData : new DynamicArrayBuffer(
				Float32Array, 
				initialByteSize
			),
            shaders    : ShaderCatalogue.shaders,
            shaderLibs : ShaderCatalogue.shaderLibs
        };

        await initGPUState(this.ctx, this.gpuState, args);

		this.rendererStates = new RendererStateSet(this.ctx);

		Renderer_GL.baseVertex = [
			0, 0, 0,   0, 1, 0, 1, 0, 0, 0, 0
		];

		this.lineVertexSize = Renderer_GL.baseVertex.length;

		this.pathCursors = [new PathCursor()];
        this.pathCursorIdx = 0;
		// 0, 0, -1,   0, 1, 0, 1, 0, 0, 0, 0,
		// 0, 0,  1,   0, 1, 0, 1, 0, 0, 1, 1


	}

    makePathCursorCurrent() {
        // TODO
    }

    cursor() {
        return this.pathCursors[this.pathCursorIdx];
    }


    updateGlobalTimeSeconds(t) {
        this.globalTimeSeconds = t;
    }

    clockSeconds(t) {

        // TODO: different times for slowing/speeding-up
        //this.rendererStates.current().markStateChanged(STATE_CHANGE_CLOCK_SECONDS);
    }

	lineWidth(w) {
		if (!w || this.rendererStates.current().lineWidth == w) {
			return;
		}

        if (this.rendererStates.stateChanged != RENDERER_STATE_CHANGED) {
            this.rendererStates.current().lineWidth = w;

            this.rendererStates.current().markStateChanged(STATE_CHANGE_LINE_WIDTH);

            return;
        }

        this.rendererStates.stateChange();

        // copy state forward
        {
            const prev    = this.rendererStates.prev();
            const current = this.rendererStates.current();

            RendererState.colorCopy(prev, current);
            RendererState.primitiveTopologyCopy(prev, current);
            RendererState.modeTypeCopy(prev, current);
            RendererState.matricesCopy(prev, current);

            current.lineWidth = w;

            current.markStateChanged(STATE_CHANGE_LINE_WIDTH);
        }

	}

    primitiveTopology(pt, mt) {
        if (this.rendererStates.current().primitiveTopology == pt) {
            return;
        }

        if (this.rendererStates.stateChanged != RENDERER_STATE_CHANGED) {
            this.rendererStates.current().primitiveTopology = pt;
            this.rendererStates.current().modeType = mt;

            // NOTE: Not necessary for now
            // this.rendererStates.current().markStateChanged(STATE_CHANGE_PRIMITIVE_TOPOLOGY);
            return;
        }

        this.rendererStates.stateChange();

        {
            const prev    = this.rendererStates.prev();
            const current = this.rendererStates.current();

            RendererState.colorCopy(prev, current);
            RendererState.matricesCopy(prev, current);
            RendererState.lineWidthCopy(prev, current);
        
            current.primitiveTopology = pt;
            current.modeType          = mt;

            // NOTE: Not necessary for now
            // current.markStateChanged(STATE_CHANGE_PRIMITIVE_TOPOLOGY);
        }
    }

    modelMatrixGlobal(m) {
        this._modelMatrixGlobal.set(m);
    }
    modelMatrix(m) {
        if (this.rendererStates.stateChanged != RENDERER_STATE_CHANGED) {
            //console.log("ID", this.rendererStates.current(), this.rendererStates.current().id, this.rendererStates.current().modelMatrix);
            this.rendererStates.current().modelMatrix.set(m);

            this.rendererStates.current().markStateChanged(STATE_CHANGE_MODEL_MATRIX);
            return;
        }

        this.rendererStates.stateChange();

        {
            const prev    = this.rendererStates.prev();
            const current = this.rendererStates.current();

            RendererState.colorCopy(prev, current);
            RendererState.primitiveTopologyCopy(prev, current);
            RendererState.modeTypeCopy(prev, current);
            RendererState.lineWidthCopy(prev, current);

            RendererState.viewMatrixCopy(prev, current);
            RendererState.projectionMatrixCopy(prev, current);
        
            current.modelMatrix.set(m);

            current.markStateChanged(STATE_CHANGE_MODEL_MATRIX);
        }
    }

    viewMatrixGlobal(m) {
        this._viewMatrixGlobal.set(m);
    }
    viewMatrix(m) {
        if (this.rendererStates.stateChanged != RENDERER_STATE_CHANGED) {
            this.rendererStates.current().viewMatrix.set(m);

            this.rendererStates.current().markStateChanged(STATE_CHANGE_VIEW_MATRIX);
            return;
        }

        this.rendererStates.stateChange();

        {
            const prev    = this.rendererStates.prev();
            const current = this.rendererStates.current();

            RendererState.colorCopy(prev, current);
            RendererState.primitiveTopologyCopy(prev, current);
            RendererState.modeTypeCopy(prev, current);
            RendererState.lineWidthCopy(prev, current);

            RendererState.modelMatrixCopy(prev, current);
            RendererState.projectionMatrixCopy(prev, current);
        
            current.viewMatrix.set(m);

            current.markStateChanged(STATE_CHANGE_VIEW_MATRIX);
        }
    }

    projectionMatrixGlobal(m) {
        this._projectionMatrixGlobal.set(m);
    }
    projectionMatrix(m) {
        if (this.rendererStates.stateChanged != RENDERER_STATE_CHANGED) {
            this.rendererStates.current().projectionMatrix.set(m);

            this.rendererStates.current().markStateChanged(STATE_CHANGE_PROJECTION_MATRIX);
            return;
        }

        this.rendererStates.stateChange();

        {
            const prev    = this.rendererStates.prev();
            const current = this.rendererStates.current();

            RendererState.colorCopy(prev, current);
            RendererState.primitiveTopologyCopy(prev, current);
            RendererState.modeTypeCopy(prev, current);
            RendererState.lineWidthCopy(prev, current);

            RendererState.modelMatrixCopy(prev, current);
            RendererState.viewMatrixCopy(prev, current);
        
            current.projectionMatrix.set(m);

            current.markStateChanged(STATE_CHANGE_PROJECTION_MATRIX);
        }
    }

    modeTriangles() {
        this.primitiveTopology(this.ctx.TRIANGLES, MODE_TYPE_TRIANGLES);
    }

    modePrimitiveLines() {
        this.primitiveTopology(this.ctx.LINES, MODE_TYPE_LINES);
    }

    modeLines() {
        // TODO
    }

    modeQuads() {
        // TODO
    }

    modeBoxes() {
        // TODO
    }

    modePolygons() {
        // TODO arbitrary polygons
    }

	color(r, g, b, a) {
		this.rendererStates.current().color[0] = r;
		this.rendererStates.current().color[1] = g;
		this.rendererStates.current().color[2] = b;
		this.rendererStates.current().color[3] = a;

		return this.color;
	}
    colorArray(arr) {
        this.rendererStates.current().color.set(arr);

        return this.color;
    }


	// draw cursor representation

    beginPath() {
        return beginPath(this);
    }


    // beginPathEX(r, g, b, a) {
    //     return beginPathEX(this, r, g, b, a);
    // }

    beginPathAt(x, y, z) {
        return beginPathAt(this, x, y, z);
    }

    closePath() {
        return closePath(this);
    }

    closePathEX(r, g, b, a) {
        return closePathEX(this, r, g, b, a);
    }


    closeLine() {
        return closePrimitiveLine(this);
    }
    closePrimitiveLine() {
        return closePrimitiveLine(this);
    }

    closeLineEX(r, g, b, a) {
        return closePrimitiveLineEX(this, r, g, b, a);
    }
    closePrimitiveLineEX(r, g, b, a) {
        return closePrimitiveLineEX(this, r, g, b, a);
    }

    endPath() {
        return endPath(this);
    }

    endPathEX(r, g, b, a) {
        return endPathEX(this, r, g, b, a);
    }

    beginLine() {
        beginLine(this);
    }
    pushLineVertex(x, y, z) {
        pushLineVertex(this, x, y, z)
    }
    pushLineVertexEX(x, y, z, r, g, b, a) {
        pushLineVertexEX(this, x, y, z, r, g, b, a);
    }
    pushArrayLineVertexInterleavedEX(arr) {
        pushArrayLineVertexInterleavedEX(this, arr);
    }
    endLine() {
        endLine(this);
    }


	moveTo(x, y, z) {
		this.cursor().updatePosition(x, y, z);
	}

    lineTo(x, y, z) {
        return this.primitiveLineTo(x, y, z);
    }
    primitiveLineTo(x, y, z) {

        const xyz    = this.cursor().position;
        const rState = this.rendererStates.current();

        this.pushVertexEX(
            xyz[0], xyz[1], xyz[2], 
            rState.color[0], 
            rState.color[1], 
            rState.color[2], 
            rState.color[3]
        );

        if (this.pathStarted) {
            this.pathStarted = false;  

            const xyz   = this.cursor().position;
            const color = this.rendererStates.current().color;
            this.firstPoint = [
                xyz[0], xyz[1], xyz[2],
                color[0], color[1], color[2], color[3]
            ];

        } else {

            this.pushVertexEX(
                xyz[0], xyz[1], xyz[2], 
                rState.color[0], 
                rState.color[1], 
                rState.color[2], 
                rState.color[3]
            );
        }

        this.cursor().updatePosition(x, y, z); 

    }
    lineToEX(x, y, z, r, g, b, a) {
        return this.primitiveLineToEX(x, y, z, r, g, b, a);
    }
    primitiveLineToEX(x, y, z, r, g, b, a) {

        const xyz = this.cursor().position;

        this.pushVertexEX(
            xyz[0], xyz[1], xyz[2],
            r, g, b, a
        );

        if (this.pathStarted) {
            this.pathStarted = false;

            const xyz = this.cursor().position;

            this.firstPoint = [
                xyz[0], xyz[1], xyz[2], 
                r, g, b, a
            ];      
        } else {

            this.pushVertexEX(
                xyz[0], xyz[1], xyz[2],
                r, g, b, a
            );

        }

        this.cursor().updatePosition(x, y, z);
    }

    pathTo(x, y, z) {
        pathTo(this, x, y, z);
    }

    pathToEX(x, y, z, r, g, b, a) {
        pathToEX(this, x, y, z, r, g, b, a);
    }

    pathToRelative(x, y, z) {
        const off = this.cursor().position;
        pathTo(this, x + off[0], y + off[1], z + off[2]);
    }

    pathToRelativeEX(x, y, z, r, g, b, a) {
        const off = this.cursor().position;
        pathToEX(
            this, x + off[0], y + off[1], z + off[2],
            r, g, b, a
        );
    }

    pushVertexEX(x, y, z, r, g, b, a) {
        pushVertexEX(
            this, x, y, z, r, g, b, a
        );
    }

    pushVertexArrayEX(x, y, z, r, g, b, a) {
        pushVertexArrayEX(
            this, x, y, z, r, g, b, a
        );
    }

    pushVertex(x, y, z) {
        pushVertex(
            this, x, y, z
        );
    }

	pushSegment(
		x0, y0, z0, 
		x1, y1, z1) {

		this.pushVertex(x0, y0, z0);
		this.pushVertex(x1, y1, z1);
	}
	pushSegmentEX(
		x0, y0, z0, r0, g0, b0, a0, 
		x1, y1, z1, r1, g1, b1, a1) {

		this.pushVertexEX(x0, y0, z0, r0, g0, b0, a0);
		this.pushVertexEX(x1, y1, z1, r1, g1, b1, a1); 
	}

    rawVertexDataBuffer() {
        return this.gpuState.vertexData.buffer.slice(0, this.gpuState.vertexData.byteCount);
    }

    draw() {
        return draw(this);
    }

    rewindToStart() {
        rewindToStart(this)
    }

    swapBuffers() {
        swapBuffers(this);
    }

    flush() {
        this.rewindToStart();
    }

	deinit() {
        this.ctx.bindVertexArray(null);
        

        for(let i = 0; i < this.gpuState.bufferCount; i += 1) {
		    this.ctx.deleteBuffer(this.gpuState.buffers[i].vbo);
            this.ctx.deleteVertexArray(this.gpuState.buffers[i].vao);
        }
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, null);
	}

    beginRenderPass() {
        beginRenderPass(this);
    }

    endRenderPass() {
        endRenderPass(this);
    }

    endPassRewindToStart() {
        endPassRewindToStart(this);
    }

    fxDefault() {
        fxDefault(this);
    }
}

export function endPassRewindToStart(self) {
    rewindToStart(self);
    swapBuffers(self);
}

export function fxDefault(self) {
    useShader(self.ctx, self.gpuState, FX_MODE_DEFAULT);
}

export function beginRenderPass(self) {

}
export function endRenderPass(self) {
    swapBuffers(self);
}
export function swapBuffers(self) {
    self.gpuState.bufferIdx = 
    (self.gpuState.bufferIdx + 1) % self.gpuState.buffers.length;
}

export function rewindToStart(self) {
    self.rendererStates.reset();
    self.gpuState.vertexData.reset();
}

export {Renderer_GL as Renderer};

export class GL_LineParam {
	static setWidth(ctx, w) {
		ctx.lineWidth(w);
	}
}

