"use strict";

const MREditor = (function() {
	
	const _outEnabled = {};
	const _outDisabled = {};
	const _out = {};

	function hookIntoGFXLib(gfxLib__) {

	}
	_out.hookIntoGFXLib = hookIntoGFXLib;


	function disable() {

	}
	_out.disable = disable;

	function enable() {

	}
	_out.enable = enable;

	_out.shaderMap = null;

	function resetState() {

	}
	_out.resetState = resetState;

	function autoExpand(field) {
	  // field.style.height = "inherit";

	  // var computed = window.getComputedStyle(field);

	  // var height = parseInt(computed.getPropertyValue('border-top-width'), 10) +
	  //              parseInt(computed.getPropertyValue('padding-top'), 10) +
	  //              field.scrollHeight +
	  //              parseInt(computed.getPropertyValue('padding-bottom'), 10) +
	  //              parseInt(computed.getPropertyValue('border-bottom-width'), 10);


	  // field.style.height = height + 'px';

	  let text = field.value.split('\n');
	  let cols = 0;
	  for (let i = 0; i < text.length; i += 1) {
	      cols = Math.max(cols, text[i].length);
	  }

	  field.rows = text.length + 1;
	  field.cols = cols;
	}
 

	function resetState() {
		{
		  _out.shaderMap = new Map();
		  const _tareas = document.getElementById("text-areas");
		  if (!_tareas) {
		    return;
		  }
		  const _children = _tareas.children;
		  for (let i = 0; i < _children.length; i += 1) {
		    let _subtareas = _children[i];
		    while (_subtareas && _subtareas.firstChild) {
		        _subtareas.removeChild(_subtareas.firstChild);
		    }
		  }
		}
		{
		  if (wrangler.externalWindow) {
		    const _tareas = wrangler.externalWindow.document.getElementById("text-areas");
		    if (!_tareas) {
		      return;
		    }
		    const _children = _tareas.children;
		    for (let i = 0; i < _children.length; i += 1) {
		      let _subtareas = _children[i];
		      while (_subtareas && _subtareas.firstChild) {
		          _subtareas.removeChild(_subtareas.firstChild);
		      }
		    }
		  }
		}
	}
	_out.resetState = resetState;
	function init() {
		document.addEventListener('input', function (event) {
	  		if (event.target.tagName.toLowerCase() !== 'textarea') return;
	  		autoExpand(event.target);
		}, false);

		resetState();
	}
	_out.init = init;

	function createShaderProgramFromStringsAndHandleErrors(vertSrc, fragSrc) {
		GFX.tempCompiledShader = GFX.createShaderProgramFromStrings(
			vertSrc,
			fragSrc
		);
		GFX.tempCompiledShaderDirty = true;

		console.log(GFX.tempCompiledShader);
		console.log(GFX.tempCompiledShaderDirty);
	}
	_out.createShaderProgramFromStringsAndHandleErrors = createShaderProgramFromStringsAndHandleErrors;

	return _out;
}());