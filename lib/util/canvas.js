"use strict";

let _onResizeEventHandler;

export let baseCanvasDimensions = {};

let _systemModifyResizeHandler = function(outResolution, resx, resy) {
	outResolution[0] = resx;
	outResolution[1] = resy;
}

export function init(args) {

}
export function resizeToDisplaySize(canvas, scale = 1) {
	const realToCSSPixels = window.devicePixelRatio;

	const displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels * scale);
	const displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels * scale);

	if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
	  canvas.width = displayWidth;
	  canvas.height = displayHeight;
	}
}

const outResolution = [1280.0, 720.0];
export function resize(canvas, resx, resy) {
	const oldWidth = canvas.width;
	const oldHeight = canvas.height;


	_systemModifyResizeHandler(outResolution, resx, resy);

	canvas.width  = outResolution[0];
	canvas.height = outResolution[1];

	baseCanvasDimensions.width  = resx;
	baseCanvasDimensions.height = resy;

	handleResizeEvent(canvas, resx, resy, oldWidth, oldHeight);
}


export function createOnElement(
	canvasName, parentName = 'output-surface', 
	width = 400, height = 400
) {
	const parent = document.querySelector('#' + parentName);
	if (!parent) {
		return null;
	}

	const canvas = document.createElement("canvas");
	canvas.setAttribute('id', canvasName);

	parent.appendChild(canvas);

	canvas.width = width;
	canvas.height = height;

	baseCanvasDimensions.width = width;
	baseCanvasDimensions.height = height;
	// TODO: figure out proper display size
	//resizeToDisplaySize(canvas);

	return {
		parent : parent, 
		canvas : canvas
	};
}

export function setOnResizeEventHandler(handler) {
	_onResizeEventHandler = handler;
}
export function systemSetHandlerModifyResize(handler) {
	_systemModifyResizeHandler = handler;
}

export function rightAlignCanvasContainer(target, container) {
    const P = container || document.getElementById('output-container');
    const bodyWidth = document.body.getBoundingClientRect().width;

    P.style.left = Math.max(0.0, (bodyWidth - target.clientWidth)) + "px";
};

export function handleResizeEvent(target, width, height, container) {
	if (!_onResizeEventHandler) {
		return;
	}

	_onResizeEventHandler(target, width, height);
}



