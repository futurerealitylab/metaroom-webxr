"use strict"

const assetutil = (function() {
    
    const _out = {};

    async function loadTextRelativePath(relativePath, opts) {
        return await fetch(getPath(relativePath), (opts || {cache: "no-store"})).
            then(response => { if (response.status !== 200) { return null; } return response.text()}).
            catch(err => { console.error(err); });
    };
    _out.loadText = loadTextRelativePath;
    _out.loadTextRelativePath = loadTextRelativePath;

    async function loadTextAbsolutePath(absolutePath, opts) {
        return await fetch(absolutePath, (opts || {cache: "no-store"})).
            then(response => { if (response.status !== 200) { return null; } return response.text()}).
            catch(err => { console.error(err); });
    };
    _out.loadTextAbsolutePath = loadTextAbsolutePath;

    async function loadBinaryRelativePath(relativePath, opts) {
        return await fetch(getPath(relativePath), (opts || {cache: "no-store"})).
            then(response => { if (response.status !== 200) { return null; } return response.arrayBuffer()}).
            catch(err => { console.error(err); });
    };
    _out.loadBinary = loadBinaryRelativePath;
    _out.loadBinaryRelativePath = loadBinaryRelativePath;

    async function loadBinaryAbsolutePath(absolutePath, opts) {
        return await fetch(absolutePath, (opts || {cache: "no-store"})).
            then(response => { if (response.status !== 200) { return null; } return response.arrayBuffer()}).
            catch(err => { console.error(err); });
    };
    _out.loadBinaryAbsolutePath = loadBinaryAbsolutePath;

    return _out;

}());
window.assetutil = assetutil;
window.asset = window.assetutil;
