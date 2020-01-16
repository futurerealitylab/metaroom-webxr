"use strict";

import {DynamicArrayBuffer} from "/lib/core/memory.js";

class RendererState {
	constructor(ctx) {
		this.width       = 1;
		this.vertexCount = 0;
        this.byteCount   = 0;
		this.color       = [0.5, 0.5, 0.5, 1];
        this.primitiveTopology = ctx.TRIANGLES;
	}
}

const RENDERER_STATE_INIT      = 0;
const RENDERER_STATE_CHANGED   = 1;
const RENDERER_STATE_UNCHANGED = 2; 

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

        current.width = prev.width;
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

class PathCursor {
	constructor() {
		this.active   = false;
		this.position = [0, 0, 0];
	}

	xyz(x, y, z) {
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

    const lineWidthRange = ctx.getParameter(ctx.ALIASED_LINE_WIDTH_RANGE);

    console.log("Line Width Valid Range [%f, %f]", lineWidthRange[0], lineWidthRange[1]);
}

export const FX_MODE_COLORED = 0;
export const FX_MODE_DEFAULT = FX_MODE_COLORED;

function clamp(min, max) { 
    Math.min(Math.max(this, min), max) 
};

export const LAYOUT_COMPONENT_COUNT_DEFAULT = 7; // 11 + 4 probably
export class PrimitivePathRenderer_GL {
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

		PrimitivePathRenderer_GL.baseVertex = [
			0, 0, 0,   0, 1, 0, 1, 0, 0, 0, 0
		];

		this.lineVertexSize = PrimitivePathRenderer_GL.baseVertex.length;

		this.pathCursor = new PathCursor();

		// 0, 0, -1,   0, 1, 0, 1, 0, 0, 0, 0,
		// 0, 0,  1,   0, 1, 0, 1, 0, 0, 1, 1


	}

	width(w) {
		if (!w || this.rendererStates.current().width == w) {
			return;
		}

        if (this.rendererStates.stateChanged != RENDERER_STATE_CHANGED) {
            this.rendererStates.current().width = w;
            return;
        }

        this.rendererStates.stateChange();
        this.rendererStates.current().width = w;
	}

    primitiveTopology(pt) {
        if (this.rendererStates.current().primitiveTopology == pt) {
            return;
        }


        if (this.rendererStates.stateChanged != RENDERER_STATE_CHANGED) {
            this.rendererStates.current().primitiveTopology = pt;
            return;
        }

        this.rendererStates.stateChange();
        this.rendererStates.current().primitiveTopology = pt;
    }

    modeTriangles() {
        this.primitiveTopology(this.ctx.TRIANGLES);
    }

    modeLines() {
        this.primitiveTopology(this.ctx.LINES);
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

	// draw cursor representation
	beginPath() {
		this.pathCursor.active = true;

		this.pushPointColor(
			this.pathCursor.position[0],
			this.pathCursor.position[1],
			this.pathCursor.position[2], 

			this.rendererStates.current().color[0], 
			this.rendererStates.current().color[1], 
			this.rendererStates.current().color[2], 
			this.rendererStates.current().color[3]
		);
	}

    beginPathColor(r, g, b, a) {
        this.pathCursor.active = true;

        this.pushPointColor(
            this.pathCursor.position[0],
            this.pathCursor.position[1],
            this.pathCursor.position[2], 

            r, 
            g, 
            b, 
            a
        );        
    }
	endPath() {
		this.pathCursor.active = false;
	}

	moveTo(x, y, z) {
		this.pathCursor.xyz(x, y, z);

		if (!this.pathCursor.active) {
			return;
		}

		this.pushPointColor(
			x, y, z, 
			this.rendererStates.current().color[0], 
			this.rendererStates.current().color[1], 
			this.rendererStates.current().color[2], 
			this.rendererStates.current().color[3]
		);
	}
    moveToColor(x, y, z, r, g, b, a) {
        this.pathCursor.xyz(x, y, z);

        if (!this.pathCursor.active) {
            return;
        }

        this.pushPointColor(
            x, y, z, 
            r, 
            g, 
            b, 
            a
        );        
    }

	pushPointColor(x, y, z, r, g, b, a) {
		const buf = this.gpuState.lineVertexData;

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

        this.rendererStates.current().byteCount += 
            LAYOUT_COMPONENT_COUNT_DEFAULT * Float32Array.BYTES_PER_ELEMENT;

        this.rendererStates.current().vertexCount += 1;

        this.rendererStates.stateChanged = RENDERER_STATE_CHANGED;
	}
	pushPointArrayColor(pointArray) {
		const buf   = this.gpuState.lineVertexData;

		buf.ensureFree(pointArray.length);

		const count = this.buf.count;
		const data  = buf.bufferView;

		data.set(pointArray, buf.count);

		buf.incrementBy(pointArray.length);

        this.rendererStates.current().byteCount += 
            pointArray.length * Float32Array.BYTES_PER_ELEMENT;

        this.rendererStates.current().vertexCount += pointArray.length / this.lineVertexSize;
	
        this.rendererStates.stateChanged = RENDERER_STATE_CHANGED;
    }
	pushPoint(x, y, z) {
		const buf   = this.gpuState.lineVertexData;
		const color = this.rendererStates.current().color;

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

        this.rendererStates.current().byteCount += 
            LAYOUT_COMPONENT_COUNT_DEFAULT * Float32Array.BYTES_PER_ELEMENT;

        this.rendererStates.current().vertexCount += 1;
	
        this.rendererStates.stateChanged = RENDERER_STATE_CHANGED;
    }
	pushSegment(
		x0, y0, z0, 
		x1, y1, z1) {

		this.pushPoint(x0, y0, z0);
		this.pushPoint(x1, y1, z1);
	}
	pushSegmentColor(
		x0, y0, z0, r0, g0, b0, a0, 
		x1, y1, z1, r1, g1, b1, a1) {

		this.pushPointColor(x0, y0, z0, r0, g0, b0, a0);
		this.pushPointColor(x1, y1, z1, r1, g1, b1, a1); 
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
            
            this.ctx.lineWidth(this.rendererStates.states[i].width);	

            useShader(this.ctx, this.gpuState, FX_MODE_DEFAULT);

            this.ctx.drawArrays(this.rendererStates.states[i].primitiveTopology, offset, count);

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


