"use strict";

import {DynamicArrayBuffer} from "/lib/core/memory.js";

const MODE_TYPE_TRIANGLES = 0;
const MODE_TYPE_LINES     = 1;

class RendererState {
	constructor(ctx) {
		this.lineWidth   = 1;
		this.vertexCount = 0;
        this.byteCount   = 0;
		this.color       = new Float32Array([0.5, 0.5, 0.5, 1]);
        this.primitiveTopology = ctx.TRIANGLES;
        this.modeType = MODE_TYPE_TRIANGLES; 
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
		this.count = RendererStateSet.INIT_COUNT;

        this.stateChanged = RENDERER_STATE_INIT;
	}

	stateChange() {
		if (this.states.length == this.count) {
			this.states.push(new RendererState(ctx));
		}

		this.count += 1;

        const prev    = this.prev();
        const current = this.current();

        current.lineWidth = prev.lineWidth;
        current.color[0] = prev.color[0];
        current.color[1] = prev.color[1];
        current.color[2] = prev.color[2];
        current.color[3] = prev.color[3]

        current.primitiveTopology = prev.primitiveTopology;

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
    const program = info.shaders.get(key).program;
    ctx.useProgram(program);
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

    // shaders
    const libs = args.libs || { 
        key         : "pnoise",
        path        : "./shaders/noise/pnoise.glsl", // TODO(TR): paths not in the local world
        foldDefault : true
    };  
    let shaderLibHandle = await ShaderTextEditor.loadAndRegisterShaderLibrariesForLiveEditing(ctx, "libs", [
        libs
    ]);
    if (!shaderLibHandle) {
        throw new Error("Could not load shader library");
    }

    info.shaderLibs = shaderLibHandle;

    // color shader
    let shaderHandle = await ShaderTextEditor.loadAndRegisterShaderForLiveEditing(
        ctx,
        "line_renderer_colored",
        { 
            onAfterCompilation : (shaderProgram) => {
                
                const record = info.shaders.get(FX_MODE_COLORED);
                record.program = shaderProgram;
                
                ctx.useProgram(record.program);
                
                record.uniforms = {};
                GFX.getAndStoreIndividualUniformLocations(ctx, record.program, record.uniforms);
            }
        },
        {
            paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
            },
            // whether the editor should hide the shader sections by  default
            foldDefault : {vertex : true, fragment : true}
        }
    );
    if (!shaderHandle) {
        throw new Error("Could not load shader");
    }

    useShader(ctx, info, FX_MODE_DEFAULT);

    // buffers
    for (let i = 0; i < info.bufferCount; i += 1) {
        info.buffers[i] = {
            vao : ctx.createVertexArray(),
            vbo : ctx.createBuffer(),
            ebo : ctx.createBuffer(),
            vboByteLength : 0,
            eboByteLength : 0
        };

        ctx.bindVertexArray(info.buffers[i].vao);
        {
            ctx.bindBuffer(ctx.ARRAY_BUFFER, info.buffers[i].vbo)
        
            ctx.bufferData(
                ctx.ARRAY_BUFFER,
                info.lineVertexData.buffer,
                ctx.STREAM_DRAW
            );

            info.buffers[i].vboByteLength = info.lineVertexData.buffer.byteLength

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

    self.pushVertexColor(
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

        self.pushVertexColor(
            xyz[0], xyz[1], xyz[2], 
            rState.color[0], 
            rState.color[1], 
            rState.color[2], 
            rState.color[3]
        );
    } 

    self.cursor().updatePosition(x, y, z);    
}
export function edgeToColor(self, x, y, z, r, g, b, a) {
    const xyz = self.cursor().position;


    self.pushVertexColor(
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

        self.pushVertexColor(
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

export function pathToColor(self, x, y, z, r, g, b, a) {
    switch (self.rendererStates.current().modeType) {

    case MODE_TYPE_LINES: {
        switch (self.rendererStates.current().primitiveTopology) {
        case self.ctx.LINES: {
            self.primitiveLineToColor(x, y, z, r, g, b, a);
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

        edgeToColor(self, x, y, z, r, g, b, a);
        //BL
        break;
    }
    }
}



// lowest level functions
export function pushVertexColor(self, x, y, z, r, g, b, a) {
    //console.log("push_v: [%f,%f][%f,%f,%f,%f]", x, y, r,g,b,a);
    const buf = self.gpuState.lineVertexData;

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
export function pushVertexArrayColor(self, pointArray) {
    const buf   = self.gpuState.lineVertexData;

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
    const buf   = self.gpuState.lineVertexData;
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

    //         self.pushVertexColor(
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

    self.pushVertexColor(
        xyz[0], xyz[1], xyz[2],
        color[0], color[1], color[2], color[2]
    );

    self.cursor().active = false;  
}
export function endPathColor(self, r, g, b, a) {
    // switch (self.rendererStates.current().modeType) {
    // case MODE_TYPE_LINES: {
    //     break;
    // }
    // case MODE_TYPE_TRIANGLES: {
    //     break;
    // }
    // }

    const xyz = self.cursor().position;

    self.pushVertexColor(
        xyz[0], xyz[1], xyz[2],
        r, g, b, a
    );

    self.cursor().active = false;
}

export function closePath(self) {
    const color = self.rendererStates.current().color;
    switch (self.rendererStates.current().modeType) {
    case MODE_TYPE_LINES: {
        pathToColor(self, 
            self.firstPoint[0], self.firstPoint[1], self.firstPoint[2],
            color[0], color[1], color[2], color[3]
        );
        break;
    }
    case MODE_TYPE_TRIANGLES: {
        pathToColor(self, 
            self.firstPoint[0], self.firstPoint[1], self.firstPoint[2],
            color[0], color[1], color[2], color[3]
        )
        break;
    }
    }

    self.color(self.firstPoint[3], self.firstPoint[4], self.firstPoint[5], self.firstPoint[6]);
    
}

export function closePathColor(self, r, g, b, a) {
    switch (self.rendererStates.current().modeType) {
    case MODE_TYPE_LINES: {
        pathToColor(self, 
            self.firstPoint[0], self.firstPoint[1], self.firstPoint[2],
            r, g, b, a
        );
        break;
    }
    case MODE_TYPE_TRIANGLES: {
        pathToColor(self, 
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
    self.primitiveLineToColor(
        self.firstPoint[0], self.firstPoint[1], self.firstPoint[2],
        color[0], color[1], color[2], color[3]
    );

    self.color(self.firstPoint[3], self.firstPoint[4], self.firstPoint[5], self.firstPoint[6]);
}

export function closePrimitiveLineColor(self, r, g, b, a) {
    self.primitiveLineToColor(
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
export function pushLineVertexColor(self, x, y, z, r, g, b, a) {
    if (self.pathStarted) {
        self.pathStarted = false;
        pushVertexColor(self, x, y, z, r, g, b, a);
    } else {
        pushVertexColor(self, x, y, z, r, g, b, a);
        pushVertexColor(self, x, y, z, r, g, b, a);
    }
}
export function pushLineVertices(self, arr) {
    pushLineVertices(this, arr);
}
export function pushLineVerticesColor(self, arr) {
    pushLineVerticesColor(this, arr);
}
export function endLine(self) {
    const buf = self.gpuState.lineVertexData.bufferView;

    const posB = self.gpuState.lineVertexData - LAYOUT_COMPONENT_COUNT_DEFAULT;
    const posA = posB - LAYOUT_COMPONENT_COUNT_DEFAULT;

    if (buf[posA    ] == buf[posB    ] &&
        buf[posA + 1] == buf[posB + 1] &&
        buf[posA + 2] == buf[posB + 2]) {

        self.gpuState.lineVertexData.pop();
    }

    self.pathStarted = false;
}

export const LAYOUT_COMPONENT_COUNT_DEFAULT = 7; // 11 + 4 probably
export class PathRenderer_GL {
	async init(ctx, args = {}) {
		this.ctx = ctx;

        const initialByteSize = args.initialByteSize || Float32Array.BYTES_PER_ELEMENT * 11 * 512;


		this.gpuState = {
            vao : null,
		    buffers : [],
            bufferCount : args.bufferCount || 1,
            bufferIdx : 0, 
			lineVertexData : new DynamicArrayBuffer(
				Float32Array, 
				initialByteSize
			),
            shaders : new Map([
                [FX_MODE_COLORED, {program : null, uniforms : null}],
            ]),
            shaderLibs : null
        };

        await initGPUState(this.ctx, this.gpuState, args);

		this.rendererStates = new RendererStateSet(this.ctx);

		PathRenderer_GL.baseVertex = [
			0, 0, 0,   0, 1, 0, 1, 0, 0, 0, 0
		];

		this.lineVertexSize = PathRenderer_GL.baseVertex.length;

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
            return;
        }

        this.rendererStates.stateChange();
        this.rendererStates.current().lineWidth = w;
	}

    primitiveTopology(pt, mt) {
        if (this.rendererStates.current().primitiveTopology == pt) {
            return;
        }


        if (this.rendererStates.stateChanged != RENDERER_STATE_CHANGED) {
            this.rendererStates.current().primitiveTopology = pt;
            this.rendererStates.current().modeType = mt;
            return;
        }

        this.rendererStates.stateChange();
        this.rendererStates.current().primitiveTopology = pt;
        this.rendererStates.current().modeType = mt;
    }

    modeTriangles() {
        this.primitiveTopology(this.ctx.TRIANGLES, MODE_TYPE_TRIANGLES);
    }

    modePrimitiveLines() {
        this.primitiveTopology(this.ctx.LINES, MODE_TYPE_LINES);
    }

    modeLines() {
    }

    modePolygons() {
        // TODO arbitrary polygons
    }

    transform(preXform) {
        this.preXform = preXform;
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


    // beginPathColor(r, g, b, a) {
    //     return beginPathColor(this, r, g, b, a);
    // }

    beginPathAt(x, y, z) {
        return beginPathAt(this, x, y, z);
    }

    closePath() {
        return closePath(this);
    }

    closePathColor(r, g, b, a) {
        return closePathColor(this, r, g, b, a);
    }


    closeLine() {
        return closePrimitiveLine(this);
    }
    closePrimitiveLine() {
        return closePrimitiveLine(this);
    }

    closeLineColor(r, g, b, a) {
        return closePrimitiveLineColor(this, r, g, b, a);
    }
    closePrimitiveLineColor(r, g, b, a) {
        return closePrimitiveLineColor(this, r, g, b, a);
    }

    endPath() {
        return endPath(this);
    }

    endPathColor(r, g, b, a) {
        return endPathColor(this, r, g, b, a);
    }

    beginLine() {
        beginLine(this);
    }
    pushLineVertex(x, y, z) {
        pushLineVertex(this, x, y, z)
    }
    pushLineVertexColor(x, y, z, r, g, b, a) {
        pushLineVertexColor(this, x, y, z, r, g, b, a);
    }
    pushLineVertices(arr) {
        pushLineVertices(this, arr);
    }
    pushLineVerticesColor(arr) {
        pushLineVerticesColor(this, arr);
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

        this.pushVertexColor(
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

            this.pushVertexColor(
                xyz[0], xyz[1], xyz[2], 
                rState.color[0], 
                rState.color[1], 
                rState.color[2], 
                rState.color[3]
            );
        }

        this.cursor().updatePosition(x, y, z); 

    }
    lineToColor(x, y, z, r, g, b, a) {
        return this.primitiveLineToColor(x, y, z, r, g, b, a);
    }
    primitiveLineToColor(x, y, z, r, g, b, a) {

        const xyz = this.cursor().position;

        this.pushVertexColor(
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

            this.pushVertexColor(
                xyz[0], xyz[1], xyz[2],
                r, g, b, a
            );

        }

        this.cursor().updatePosition(x, y, z);
    }

    pathTo(x, y, z) {
        pathTo(this, x, y, z);
    }

    pathToColor(x, y, z, r, g, b, a) {
        pathToColor(this, x, y, z, r, g, b, a);
    }

    pathToRelative(x, y, z) {
        const off = this.cursor().position;
        pathTo(this, x + off[0], y + off[1], z + off[2]);
    }

    pathToRelativeColor(x, y, z, r, g, b, a) {
        const off = this.cursor().position;
        pathToColor(
            this, x + off[0], y + off[1], z + off[2],
            r, g, b, a
        );
    }

    triangleTo() {

    }
    triangleToColor() {

    }

    polygonTo() {

    }
    polygonToColor() {

    }

    pushVertexColor(x, y, z, r, g, b, a) {
        pushVertexColor(
            this, x, y, z, r, g, b, a
        );
    }

    pushVertexArrayColor(x, y, z, r, g, b, a) {
        pushVertexArrayColor(
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
	pushSegmentColor(
		x0, y0, z0, r0, g0, b0, a0, 
		x1, y1, z1, r1, g1, b1, a1) {

		this.pushVertexColor(x0, y0, z0, r0, g0, b0, a0);
		this.pushVertexColor(x1, y1, z1, r1, g1, b1, a1); 
	}

    _rawVerticesBuffer() {
        return this.gpuState.lineVertexData.buffer.slice(0, this.gpuState.lineVertexData.byteCount);
    }
	draw() {
        this.ctx.bindVertexArray(
            this.gpuState.buffers[this.gpuState.bufferIdx].vao
        );


        this.ctx.bindBuffer(gl.ARRAY_BUFFER, this.gpuState.buffers[this.gpuState.bufferIdx].vbo);

		// upload line data per-frame
		const vertices = this.gpuState.lineVertexData.buffer;
        const toUpload = new Uint8Array(vertices, 0, this.gpuState.lineVertexData.byteCount);

		this.ctx.bufferSubData(
            this.ctx.ARRAY_BUFFER, 
            0, 
            toUpload
        );  

		let offset = 0;
		let count  = 0;

		for (let i = 0; i < this.rendererStates.count; i += 1) {
			count = this.rendererStates.states[i].vertexCount;
            
            this.ctx.lineWidth(this.rendererStates.states[i].lineWidth);	

            useShader(this.ctx, this.gpuState, FX_MODE_DEFAULT);

            if (count > 0) {
                this.ctx.drawArrays(this.rendererStates.states[i].primitiveTopology, offset, count);
            }

            offset += count;
		}

	}

    reset() {
        this.rendererStates.reset();
        this.gpuState.lineVertexData.reset();
    }

    swapBuffers() {
        this.gpuState.bufferIdx = 
            (this.gpuState.bufferIdx + 1) % this.gpuState.buffers.length;
    }

    flush() {
        this.reset();
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

    endPassReset() {
        this.reset();
        this.swapBuffers();
    }

    fxDefault() {
        useShader(this.ctx, this.gpuState, FX_MODE_DEFAULT);
    }
}



export class GL_LineParam {
	static setWidth(ctx, w) {
		ctx.lineWidth(w);
	}
}

/////////////////////////////////////////////////// James

export class ParametricGrid {

	constructor(M, N, callbackType, args, collision = false) {

		this.vertices = ParametricGrid.createParametricGrid(M, N, callbackType, args);
		this.size = this.vertices.length / VERTEX_SIZE;

		this.collisionPoints = [];

		if (collision) {
			this.collisionPoints = ParametricGrid.createCollisionGrid(M * 2, N * 2, callbackType, args);
		}

	}

	static createParametricGrid(M, N, callback, args) {

		let vertices = [];

		let uv = { u: 1, v: 0 };  //Set initial corner 
		let uInc = 1.0;
		let vInc = 1.0;

		//
		for (let row = 0; row <= N; row++) {

			for (let col = 0; col <= M; col++) {

				if (col != M) {
					uv = {
						u: col / M,
						v: row / N
					};
					vertices = vertices.concat(callback(uv.u, uv.v, args));

					uv = {
						u: (col + uInc) / M,
						v: row / N
					};
					vertices = vertices.concat(callback(uv.u, uv.v, args));
				}
				if (row != M) {
					uv = {
						u: (col) / M,
						v: (row) / N
					};
					vertices = vertices.concat(callback(uv.u, uv.v, args));

					uv = {
						u: col / M,
						v: (row + vInc) / N
					};
					vertices = vertices.concat(callback(uv.u, uv.v, args));
				}
			}
		}
		return vertices;
	}
}

export function createLineVertices() {
	let V = [
		0, 0, -1, 0, 1, 0, 1, 0, 0, 0, 0,
		0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1
	]

	return { vertices: V, size: V.length / VERTEX_SIZE };
}

export const linesphere = new ParametricGrid(32, 16, CG.uvToSphere);


