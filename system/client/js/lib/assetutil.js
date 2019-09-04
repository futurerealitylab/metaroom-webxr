"use strict"

const assetutil = (function() {
	
	const _out = {};

	async function loadTextRelativePath(relativePath) {
		return await fetch(getPath(relativePath)).
    		then(response => response.text()).catch(err => { console.error(err); });
	};
	_out.loadText = loadTextRelativePath;
	_out.loadTextRelativePath = loadTextRelativePath;

	async function loadTextAbsolutePath(absolutePath) {
		return await fetch(absolutePath).
    		then(response => response.text()).catch(err => { console.error(err); });
	};
	_out.loadTextAbsolutePath = loadTextAbsolutePath;

	return _out;

}());