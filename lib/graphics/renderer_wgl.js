"use strict";

import {DynamicArrayBuffer} from "/lib/core/memory.js";

const MODE_TYPE_TRIANGLES = 0;
const MODE_TYPE_LINES     = 1;


const STATE_CHANGE_LINE_WIDTH         = 0;
const STATE_CHANGE_PRIMITIVE_TOPOLOGY = 1;
const STATE_CHANGE_MODEL_MATRIX       = 2;
const STATE_CHANGE_VIEW_MATRIX        = 3;
const STATE_CHANGE_PROJECTION_MATRIX  = 4;
const STATE_CHANGE_CLOCK_SECONDS      = 5;

function updateGPUStateData(rState, gpuState) {
    const ctx = gpuState.ctx;

    // TODO(TR): getting uniforms from a current shader easily
    // would get this from rState
    const activeShaderRecord = gpuState.activeShaderRecord;
    const program            = activeShaderRecord.program;
    const uniformLocations   = activeShaderRecord.uniforms;

    while (rState.changed.length != 0) {

        switch (rState.changed.pop()) {
        case STATE_CHANGE_LINE_WIDTH: {
            ctx.lineWidth(rState.lineWidth);
            break;
        }
        case STATE_CHANGE_MODEL_MATRIX: {
            ctx.uniformMatrix4fv(
                uniformLocations.uModel,
                false,
                rState.modelMatrix
            );
            break;
        }
        case STATE_CHANGE_VIEW_MATRIX: {
            ctx.uniformMatrix4fv(
                uniformLocations.uView,
                false,
                rState.viewMatrix
            );
            break;
        }
        case STATE_CHANGE_PROJECTION_MATRIX: {
            ctx.uniformMatrix4fv(
                uniformLocations.uProj,
                false,
                rState.projectionMatrix
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
        }
		this.count = RendererStateSet.INIT_COUNT;

        this.stateChanged = RENDERER_STATE_INIT;
	}
}
RendererStateSet.INIT_COUNT = 1;

export class PathCursor {
	constructor() {
		this.active       = false;
		this.position     = [0, 0, 0];
        this.prevPosition = [0, 0, 0];
        this.prevColor    = [0, 0, 0, 1];
	}

	updatePosition(x, y, z) {
        this.prevPosition[0] = this.position[0];
        this.prevPosition[1] = this.position[1];
        this.prevPosition[2] = this.position[2];

		this.position[0] = x;
		this.position[1] = y;
		this.position[2] = z;
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

    useShader(ctx, info, FX_MODE_DEFAULT);

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
            ctx.bindBuffer(ctx.ARRAY_BUFFER, info.buffers[i].vbo)
        
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
                        {shaderLocation : 0, offset : 0,  normalized : false, format : fmt_vec3, type : ctx.FLOAT},
                        {shaderLocation : 1, offset : 12, normalized : false, format : fmt_vec4, type : ctx.FLOAT} 
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

function clamp(min, max) { 
    Math.min(Math.max(this, min), max) 
};


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

    const posB = self.gpuState.vertexData - LAYOUT_COMPONENT_COUNT_DEFAULT;
    const posA = posB - LAYOUT_COMPONENT_COUNT_DEFAULT;

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
            path        : ROOT_SHADERS + "noise/pnoise.glsl", // TODO(TR): paths not in the local world
            foldDefault : true
        },
        {
            key         : "trig",
            path        : ROOT_SHADERS + "math/trig.glsl",
            foldDefault : true
        }
        ];  
        let shaderLibHandle = await ShaderTextEditor.loadLibs(ctx, "libs",
            libs,
            {
                useAbsolutePaths : true
            }
        );
        if (!shaderLibHandle) {
            throw new Error("Could not load shader library");
        }
        defaultCatalogue.shaderLibs = shaderLibHandle;

        // color shader
        let shaderHandle = await ShaderTextEditor.loadShader(
            ctx,
            "line_list_primitive_colored",
            { 
                onAfterCompilation : (shaderProgram) => {
                    
                    const record = ShaderCatalogue.shaders.get(FX_MODE_COLORED);
                    record.program = shaderProgram;
                    
                    ctx.useProgram(record.program);
                    
                    record.uniforms = {};
                    GFX.getAndStoreIndividualUniformLocations(ctx, record.program, record.uniforms, "");
                }
            },
            {
                paths : {
                    vertex   : "shaders/vertex.vert.glsl",
                    fragment : "shaders/fragment.frag.glsl"
                },
                // whether the editor should hide the shader sections by  default
                foldDefault : {vertex : true, fragment : true},

                useAbsolutePaths : false
            }
        );
        if (!shaderHandle) {
            throw new Error("Could not load shader");
        }
    } 
}


export function draw(self) {
    const buffers = self.gpuState.buffers[self.gpuState.bufferIdx];
    self.ctx.bindVertexArray(
        buffers.vao
    );

    self.ctx.bindBuffer(gl.ARRAY_BUFFER, 
        buffers.vbo
    );

    // upload line data per-frame

    if (self.gpuState.vertexData.byteCount > buffers.vboByteLength) {
        buffers.vboByteLength = self.gpuState.vertexData.byteCount;

        self.ctx.bufferData(
            self.ctx.ARRAY_BUFFER,
            self.gpuState.vertexData.buffer,
            self.ctx.STREAM_DRAW
        );

    } else {
        const vertices = self.gpuState.vertexData.buffer;
        const toUpload = new Uint8Array(vertices, 0, self.gpuState.vertexData.byteCount);
        self.ctx.bufferSubData(
            self.ctx.ARRAY_BUFFER, 
            0, 
            toUpload
        );         
    }

 
    // temp since only one shader
    const record = useShader(self.ctx, self.gpuState, FX_MODE_DEFAULT);
    self.ctx.uniform1f(record.uniforms.uTime, self.globalTimeSeconds);

    let offset = 0;
    let count  = 0;
    for (let i = 0; i < self.rendererStates.count; i += 1) {
        count = self.rendererStates.states[i].vertexCount;  

        // TODO(TR): use specific shader in "updateGPUStateData"
        //useShader(self.ctx, self.gpuState, FX_MODE_DEFAULT);

        updateGPUStateData(self.rendererStates.states[i], self.gpuState);

        if (count > 0) {
            self.ctx.drawArrays(self.rendererStates.states[i].primitiveTopology, offset, count);
        }

        offset += count;
    }
    
}


export const LAYOUT_COMPONENT_COUNT_DEFAULT = 7; // 11 + 4 probably
export class Renderer_GL {

    static ctx = null;

    static async initSystem(args) {
        Renderer_GL.ctx = args.ctx;

        await ShaderCatalogue.init(args);
    }

	async init(ctx, args = {}) {
		this.ctx = ctx;

        const initialByteSize = args.initialByteSize || Float32Array.BYTES_PER_ELEMENT * 11 * 512;


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

        w = clamp(
            this.gpuState.primitiveLineTopologyWidthRange[0],
            this.gpuState.primitiveLineTopologyWidthRange[1]
        );

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

    triangleTo() {

    }
    triangleToEX() {

    }

    polygonTo() {

    }
    polygonToEX() {

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
        this.rendererStates.reset();
        this.gpuState.vertexData.reset();
    }

    swapBuffers() {
        this.gpuState.bufferIdx = 
            (this.gpuState.bufferIdx + 1) % this.gpuState.buffers.length;
    }

    flush() {
        this.rewindToStart();
    }

	deinit() {
        this.ctx.bindVertexArray(null);
        this.ctx.bindBuffer(gl.ARRAY_BUFFER, null);

        for(let i = 0; i < this.gpuState.bufferCount; i += 1) {
		    this.ctx.deleteBuffer(this.gpuState.buffers[i].vbo);
            this.ctx.deleteBuffer(this.gpuState.buffers[i].vao);
        }
	}

    beginPass() {

    }

    endPass() {
        this.swapBuffers();
    }

    endPassRewindToStart() {
        this.rewindToStart();
        this.swapBuffers();
    }

    fxDefault() {
        useShader(this.ctx, this.gpuState, FX_MODE_DEFAULT);
    }
}

export {Renderer_GL as Renderer};

export class GL_LineParam {
	static setWidth(ctx, w) {
		ctx.lineWidth(w);
	}
}

