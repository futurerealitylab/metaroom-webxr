"use strict";

import {DynamicArrayBuffer} from "/lib/core/memory.js";

class LineRendererState {
	constructor() {
		this.width = 1;
		this.count = 0;
		this.color = [1, 1, 1, 1];
	}
}

class LineRendererStateSet {
	constructor(initSize = 32) {
	    initSize = Math.max(2, initSize);

		this.states = [];
		while (this.states.length < initSize) {
			this.states.push(new LineRendererState());
		}
		this.count = LineRendererStateSet.INIT_COUNT;
	}

	stateChange() {
		if (this.states.length == this.count) {
			this.states.push(new LineRendererState());
		}

		this.count += 1;
	}

	current() {
		return this.states[this.count - 1];
	}
	prev() {
		return this.states[this.count - 2];
	}

	reset() {
		this.count = LineRendererStateSet.INIT_COUNT;
	}
}
LineRendererStateSet.INIT_COUNT = 2;

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

export const LAYOUT_COMPONENT_COUNT_DEFAULT = 7; // 11 + 4 probably
export class PrimitiveLineRenderer_GL {
	constructor(ctx) {
		this.ctx = ctx;

		this.gpuState = {
			vboStream      : null,
			vboGeometry    : null,
			lineVertexData : new DynamicArrayBuffer(
				Float32Array, 
				Float32Array.BYTES_PER_ELEMENT * 11 * 512
			)
		};

		this.gpuState.vboStream   = ctx.createBuffer();
		this.gpuState.vboGeometry = ctx.createBuffer();

		this.renderStates = new LineRendererStateSet();

		PrimitiveLineRenderer_GL.baseVertex = [
			0, 0, 0,   0, 1, 0, 1, 0, 0, 0, 0
		];

		this.lineVertexSize = PrimitiveLineRenderer_GL.baseVertex.length;

		this.pathCursor = new PathCursor();

		// 0, 0, -1,   0, 1, 0, 1, 0, 0, 0, 0,
		// 0, 0,  1,   0, 1, 0, 1, 0, 0, 1, 1


	}

	width(w) {
		if (this.renderStates.current() == w) {
			return;
		}


		// TODO(TR)


		this.renderStates.current().count = 
			(this.gpuState.lineVertexData.count - this.renderStates.prev().count); 

		this.renderStates.stateChange();

		this.renderStates.current().width = w;


	}

    transform(preXform) {
        this.preXform = preXform;
    }

	color(r, g, b, a) {
		this.renderStates.current().color[0] = r;
		this.renderStates.current().color[1] = g;
		this.renderStates.current().color[2] = b;
		this.renderStates.current().color[3] = a;

		return this.color;
	}

	// draw cursor representation
	beginPath() {
		this.pathCursor.active = true;

		this.pushPointColor(
			this.pathCursor.position[0],
			this.pathCursor.position[1],
			this.pathCursor.position[2], 

			this.renderStates.current().color[0], 
			this.renderStates.current().color[1], 
			this.renderStates.current().color[2], 
			this.renderStates.current().color[3]
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
			this.renderStates.current().color[0], 
			this.renderStates.current().color[1], 
			this.renderStates.current().color[2], 
			this.renderStates.current().color[3]
		);
	}

	pushPointColor(x, y, z, r, g, b, a) {
		const buf = this.gpuState.lineVertexData;

        //console.log(x, y, z, r, g, b, a);

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
	}
	pushPointArrayColor(pointArray) {
		const buf   = this.gpuState.lineVertexData;

		buf.ensureFree(pointArray.length);

		const count = this.buf.count;
		const data  = buf.bufferView;

		data.set(pointArray, buf.count);

		buf.incrementBy(pointArray.length);
	}
	pushPoint(x, y, z) {
		const buf   = this.gpuState.lineVertexData;
		const color = this.renderStates.current().color;

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

		// upload line data per-frame
		const vertices = this.gpuState.lineVertexData.buffer;
		this.ctx.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);

		let offset = 0;
		let count  = 0;
		// iterate through all render states (widths)
		for (let i = 0; i < this.renderStates.count; i += 1) {
			count = this.renderStates.states[i].count;
			this.ctx.drawArrays(gl.LINES, offset, count / this.lineVertexSize);
		}
	}

    flush() {
        this.renderStates.reset();
        this.gpuState.lineVertexData.reset();
    }

	deinit() {
		this.ctx.deleteBuffer(this.gpuState.vboStream);
	}

    begin() {
        // bind vao or set attrib pointers 
    }

    end() {

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


