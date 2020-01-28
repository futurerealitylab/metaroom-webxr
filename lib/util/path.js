"use strict";

let MY_ROOT_PATH = "";
export function fromLocalPath(path) {
    if (!path || path.length < 1) {
        return;
    }

    return MY_ROOT_PATH + path;
}
export function setLocalPath(path) {
    MY_ROOT_PATH = path;

    return path;
}

let _mainFileName = "";
export function genMainFileName(path) {
    let slashIdx = path.lastIndexOf('/');
    if (slashIdx === -1) {
        slashIdx = path.lastIndexOf('\\');
    }
    _mainFileName = path.substring(slashIdx + 1);
    
    return _mainFileName;
}

export function setMainFileName(name) {
    _mainFileName = name;
}
export function getMainFileName() {
    return _mainFileName;
}
let _mainFilePath = "";
export function setMainFilePath(path) {
    _mainFilePath = path;
}
export function getMainFilePath() {
    return _mainFilePath;
}

export function setPathInfo(absolutePath, localPath, mainFileName) {
    _mainFilePath = absolutePath;
    MY_ROOT_PATH  = localPath;
    _mainFileName = mainFileName;
} 

export function getCurrentPath(path) {
    let slashIdx = path.lastIndexOf('/');
    if (slashIdx === -1) {
        slashIdx = path.lastIndexOf('\\');
    }

    return path.substring(0, slashIdx + 1);
}

// export function fileName() {
//     return new URL(import.meta.url).pathname.split('/').pop();
// }
