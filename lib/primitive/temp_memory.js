

export class TempObjectAllocator {
	constructor() {
		this.freeList = [];
		this.freeIdx = 0;
	}

	freeAll() {
		this.freeIdx = 0;
	}

	reset() {
		this.freeAll();
		this.freeList = [];
	}
}

const DEFAULT_COUNTS = 256;


let allocatorList = [];

// create one of thee following for each per-frame temporary type you'd like

////////////////////////////////////////////

// v2 js array
const vec2arena = new TempObjectAllocator();
allocatorList.push(vec2arena);
export function vec2Preallocate(count) {
	const arena = vec2arena;
	for (let i = 0; i < count; i += 1) {
		arena.freeList.push([0,0]);
	}
}
vec2Preallocate(DEFAULT_COUNTS);
export function vec2(x, y) {
	const arena = vec2arena;
	let el = null;
	
	if (arena.freeIdx < arena.freeList.length) {
		el = arena.freeList[arena.freeIdx];
		el[0] = x;
		el[1] = y;
	} else {
		el = [x,y];
		arena.freeList.push(el);
	}

	arena.freeIdx += 1;

	return el;
}

// v2 f32 array
const vec2F32arena = new TempObjectAllocator();
allocatorList.push(vec2F32arena);
export function vec2F32Preallocate(count) {
	const arena = vec2F32arena;
	for (let i = 0; i < count; i += 1) {
		arena.freeList.push(new Float32Array(2));
	}
}
vec2F32Preallocate(DEFAULT_COUNTS);
export function vec2F32(x, y) {
	const arena = vec2F32arena;
	let el = null;
	
	if (arena.freeIdx < arena.freeList.length) {
		el = arena.freeList[arena.freeIdx];
		el[0] = x;
		el[1] = y;
	} else {
		el = new Float32Array(2);
		el[0] = x;
		el[1] = y;
		arena.freeList.push(el);
	}

	arena.freeIdx += 1;

	return el;
}

////////////////////////////////////////////

// v3 js array
const vec3arena = new TempObjectAllocator();
allocatorList.push(vec3arena);
export function vec3Preallocate(count) {
	const arena = vec3arena;
	for (let i = 0; i < count; i += 1) {
		arena.freeList.push([0,0,0]);
	}
}
vec3Preallocate(DEFAULT_COUNTS);
export function vec3(x, y, z) {
	const arena = vec3arena;
	let el = null;

	
	if (arena.freeIdx < arena.freeList.length) {
		el = arena.freeList[arena.freeIdx];
		el[0] = x;
		el[1] = y;
		el[2] = z;
	} else {
		el = [x,y,z];
		arena.freeList.push(el);
	}

	arena.freeIdx += 1;

	return el;
}

// v3 f32 array
const vec3F32arena = new TempObjectAllocator();
allocatorList.push(vec3F32arena);
export function vec3F32Preallocate(count) {
	const arena = vec3F32arena;
	for (let i = 0; i < count; i += 1) {
		arena.freeList.push(new Float32Array(3));
	}
}
vec3F32Preallocate(DEFAULT_COUNTS);
export function vec3F32(x, y, z) {
	const arena = vec3F32arena;
	let el = null;
	
	if (arena.freeIdx < arena.freeList.length) {
		el = arena.freeList[arena.freeIdx];
		el[0] = x;
		el[1] = y;
		el[2] = z;
	} else {
		el = new Float32Array(3);
		el[0] = x;
		el[1] = y;
		el[2] = z;
		arena.freeList.push(el);
	}

	arena.freeIdx += 1;

	return el;
}

////////////////////////////////////////////

// v4 js array
const vec4arena = new TempObjectAllocator();
allocatorList.push(vec4arena);
export function vec4Preallocate(count) {
	const arena = vec4arena;
	for (let i = 0; i < count; i += 1) {
		arena.freeList.push([0,0,0,0]);
	}
}
vec4Preallocate(DEFAULT_COUNTS);
export function vec4(x, y, z, w) {
	const arena = vec4arena;
	let el = null;

	
	if (arena.freeIdx < arena.freeList.length) {
		el = arena.freeList[arena.freeIdx];
		el[0] = x;
		el[1] = y;
		el[2] = z;
		el[3] = w;
	} else {
		el = [x,y,z,w];
		arena.freeList.push(el);
	}

	arena.freeIdx += 1;

	return el;
}

// v4 f32 array
const vec4F32arena = new TempObjectAllocator();
allocatorList.push(vec4F32arena);
export function vec4F32Preallocate(count) {
	const arena = vec4F32arena;
	for (let i = 0; i < count; i += 1) {
		arena.freeList.push(new Float32Array(4));
	}
}
vec4F32Preallocate(DEFAULT_COUNTS);
export function vec4F32(x, y, z, w) {
	const arena = vec4F32arena;
	let el = null;
	
	if (arena.freeIdx < arena.freeList.length) {
		el = arena.freeList[arena.freeIdx];
		el[0] = x;
		el[1] = y;
		el[2] = z;
		el[3] = w;
	} else {
		el = new Float32Array(4);
		el[0] = x;
		el[1] = y;
		el[2] = z;
		el[3] = w;
		arena.freeList.push(el);
	}

	arena.freeIdx += 1;

	return el;
}

////////////////////////////////////////////

// m4 js array
const mat4arena = new TempObjectAllocator();
allocatorList.push(mat4arena);
export function mat4Preallocate(count) {
	const arena = mat4arena;
	for (let i = 0; i < count; i += 1) {
		arena.freeList.push([0,0,0,0,
					0,0,0,0,
					0,0,0,0,
					0,0,0,0]);
	}
}
mat4Preallocate(DEFAULT_COUNTS);
export function mat4() {
	const arena = mat4arena;
	let el = null;

	
	if (arena.freeIdx < arena.freeList.length) {
		el = arena.freeList[arena.freeIdx];
	} else {
		el = [0,0,0,0,
			  0,0,0,0,
			  0,0,0,0,
			  0,0,0,0];
		arena.freeList.push(el);
	}

	arena.freeIdx += 1;

	return el;
}

// m4 f32 array
const mat4F32arena = new TempObjectAllocator();
allocatorList.push(mat4F32arena);
export function mat4F32Preallocate(count) {
	const arena = mat4F32arena;
	for (let i = 0; i < count; i += 1) {
		arena.freeList.push(new Float32Array(16));
	}
}
mat4F32Preallocate(DEFAULT_COUNTS);
export function mat4F32() {
	const arena = mat4F32arena;
	let el = null;
	
	if (arena.freeIdx < arena.freeList.length) {
		el = arena.freeList[arena.freeIdx];
	} else {
		el = new Float32Array(16);
		arena.freeList.push(el);
	}

	arena.freeIdx += 1;

	return el;
}

export function freeAll() {
	for (let i = 0; i < allocatorList.length; i += 1) {
		allocatorList[i].freeAll();
	}
}

export function resetAll() {
	for (let i = 0; i < allocatorList.length; i += 1) {
		allocatorList[i].reset();
	}
}

