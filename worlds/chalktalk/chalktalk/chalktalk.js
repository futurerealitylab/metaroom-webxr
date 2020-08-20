"use strict";

// cannot be reloaded

function getCanvas(gl) {
	return gl.canvas;
}

export class Scene {

	constructor(options) {
		// called upon initialization

		// use this constructor to define fields (this.x),
		// for maximum performance, don't add or remove fields
		// outside this constructor

		this.gl = options.graphicsContext;

		this.time = 0.0;
	}

	async init(options) {
		// please call this immediately after `new`ing an instance,
		// we use an init method instead of the constructor because
		// constructors cannot perform asynchronous tasks,
		// which we may want to do upon initialization

		// i.e. async/await
	}

	setTime(time) {
		this.time = time;
	}

	static someClassSpecificMethod(paramList) {

	}

	someClassInstanceMethod(paramList) {

	}
}

// use free-floating functions and variables when you want to be able to reload them
// (C-style "struct as first argument")
export function freeFloatingFunction(ct, paramList) {

}

export async function freeFloatingAsyncFunction(ct, paramList) {

}

const MODULE_PRIVATE_CONSTANT = "WEE";
export const EXPORTED_MODULE_CONSTANT = "WEEHEE";

let something = 3.14159;
let somethingElse = "Aja";
const arrowFunction = (arg) => {
	return "Surely, you appreciate this syntax, programmer! " + arg;
};

// yet another way to export
export {something, somethingElse, arrowFunction};


// useful built-in data structures you may not know exist in the newer JavaScript:
let map = new Map();
let set = new Set();

// TODO: instead of using `eval()`, there's a safer way to figure-out dynamically chosen shape types,
// ask when this becomes relevant


// taking some existing code

// (Scene is the same as modeler, I think?)

// function Scene(canvas) {
//    this._fog = [0,0,0,0];
//    this._fov = Math.PI / 2.5;
//    this._iod = 0.3;
//    this._gl = canvas.getContext('experimental-webgl');
//    this._lColor = [0,0,0, 0,0,0, 0,0,0];
//    this._lDirInfo = [0,0,0, 0,0,0, 0,0,0];
//    this._objects = [];
//    this._viewMatrix = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,this.getFL(),1];
// }


// these could all be static functions in the Scene class above

// CT.Scene.prototype = {
//    add      : function(obj)   { this._objects.push(obj); return obj._scene = this; },
//    getFL    : function()      { return CT.fovToFL(this._fov); },
//    getFOV   : function()      { return this._fov; },
//    getIOD   : function()      { return this._iod; },
//    getHDir  : function()      { this._updateLightVectors(); return this._hDir; },
//    getLDir  : function()      { this._updateLightVectors(); return this._lDir; },
//    getObj   : function(i)     { return this._objects[i]; },
//    getStereo: function()      { return CT.def(this._stereo); },
//    setFog   : function(fog)   { this._fog = fog; return this; },
//    setFOV   : function(fov)   { this._fov = fov; return this; },
//    setIOD   : function(iod)   { this._iod = iod; return this; },
//    setStereo: function(y_n)   { this._stereo = y_n ? 1 : 0; return this; },
//    doDepthTest : function(yes) { // TOGGLE WHETHER TO DO A DEPTH TEST WHEN DRAWING
//       var gl = this._gl;
//       if (yes) {
//          gl.enable(gl.DEPTH_TEST);
//          gl.depthFunc(gl.LEQUAL);
//       }
//       else
//          gl.disable(gl.DEPTH_TEST);
//    },
//    getViewMatrix : function(matrix) {
//       CT.copy(matrix, this._viewMatrix);
//       return this;
//    },
//    getViewMatrixInverse : function() {
//       if (! this._viewMatrixInverse)
//          this._viewMatrixInverse = CT.matrixInverse(this._viewMatrix);
//       return this._viewMatrixInverse;
//    },
//    remove : function(obj) {
//       for (var i = 0 ; i < this._objects.length ; i++)
//          if (obj == this._objects[i]) {
// 	    this._objects.splice(i, 1);
// 	    break;
// 	 }
//    },


// NOTE: initialize gl outside instead?

//    setCanvas : function(canvas) {
//       this._gl = canvas.getContext('experimental-webgl');
//       for (var i = 0 ; i < this._objects.length ; i++)
//          this._objects[i].setGL(this._gl);
//    },
//    setLight : function(n, lDir, lColor) {


	// math functions like this could be imported from elsewhere
//       CT.normalize(lDir);
//       for (var i = 0 ; i < 3 ; i++) {
// 	 this._lDirInfo[3 * n + i] = lDir[i];
//          this._lColor  [3 * n + i] = lColor ? lColor[i] : 1;
//       }
//       delete this._lDir;
//       return this;
//    },
//    setViewMatrix : function(matrix) {
//       CT.copy(this._viewMatrix, matrix);
//       delete this._viewMatrixInverse;
//       delete this._lDir;
//       return this;
//    },
//    _updateLightVectors : function() {
//       if (! this._lDir) {


	// NOTE: WebXR gives you the inverse view matrix (camera)
//          var m = this.getViewMatrixInverse(), v = this._lDirInfo, dir, i;
//          this._lDir = [];
//          this._hDir = [];
//          for (i = 0 ; i < v.length ; i += 3) {
//             dir = CT.normalize(CT.matrixTransform(m, [ v[i], v[i+1], v[i+2], 0 ]));
// 	    this._lDir.push(dir[0], dir[1], dir[2]);
//             dir = CT.normalize([dir[0], dir[1], dir[2] + 1]);
// 	    this._hDir.push(dir[0], dir[1], dir[2]);
//          }
//       }
//    },
// }

export class Shape {

	constructor(options) {

	}
}
// static field
Shape.defaultVertexShader = "SHADER STRING";

// fake inheritance that is really the prototype inheritance
class Shape_Kind extends Shape {
   // ...
}
// X.prototype = new Shape probably still works

