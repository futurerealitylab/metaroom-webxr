"use strict";

const CanvasUtil = (function() {

	let _onResizeEventHandler;
	
	function resizeToDisplaySize(canvas, scale = 1) {
	  const realToCSSPixels = window.devicePixelRatio;

	  const displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels * scale);
	  const displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels * scale);

	  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
	      canvas.width = displayWidth;
	      canvas.height = displayHeight;
	  }
	}

	function createCanvasOnElement(canvasName, parentName = 'output-element', width = 400, height = 400) {
	  const parent = document.querySelector('#' + parentName);
	  if (!parent) {
	    return null;
	  }

	  const canvas = document.createElement("canvas");
	  canvas.setAttribute('id', canvasName);

	  parent.appendChild(canvas);

	  canvas.width = width;
	  canvas.height = height;

	  // TODO: figure out proper display size
	  //resizeToDisplaySize(canvas);

	  return {
	    parent : parent, 
	    canvas : canvas
	  };
	}

	function setOnResizeEventHandler(handler) {
		_onResizeEventHandler = handler;
	}

	function handleResizeEvent(target, width, height) {
		_onResizeEventHandler(target, width, height);
	}

	const _out = {
	  resizeToDisplaySize : resizeToDisplaySize,
	  createCanvasOnElement : createCanvasOnElement,
	  setOnResizeEventHandler : setOnResizeEventHandler,
	  handleResizeEvent : handleResizeEvent
	};

	return _out;

}());
window.CanvasUtil = CanvasUtil;
