"use strict";

import * as path from "/lib/util/path.js";

export async function loadTextRelativePath(relativePath, opts) {
    return await fetch(path.getLocalPath(relativePath), (opts || {cache: "no-store"})).
        then(response => { if (response.status !== 200) { return null; } return response.text()}).
        catch(err => { console.error(err); });
};
export {loadTextRelativePath as loadText};

export async function loadTextAbsolutePath(absolutePath, opts) {
    return await fetch(absolutePath, (opts || {cache: "no-store"})).
        then(response => { if (response.status !== 200) { return null; } return response.text()}).
        catch(err => { console.error(err); });
};

export async function loadBinaryRelativePath(relativePath, opts) {
    return await fetch(path.getLocalPath(relativePath), (opts || {cache: "no-store"})).
        then(response => { if (response.status !== 200) { return null; } return response.arrayBuffer()}).
        catch(err => { console.error(err); });
};
export {loadBinaryRelativePath as loadBinary};

export async function loadBinaryAbsolutePath(absolutePath, opts) {
    return await fetch(absolutePath, (opts || {cache: "no-store"})).
        then(response => { if (response.status !== 200) { return null; } return response.arrayBuffer()}).
        catch(err => { console.error(err); });
};
