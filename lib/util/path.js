"use strict";

let MY_ROOT_PATH = "";
export function getLocalPath(path) {
    if (!path || path.length < 1) {
        return;
    }

    return MY_ROOT_PATH + path;
}
export function setLocalPath(path) {
    MY_ROOT_PATH = path;
}

export function getCurrentPath(path) {
    let slashIdx = path.lastIndexOf('/');
    if (slashIdx === -1) {
        slashIdx = path.lastIndexOf('\\');
    }

    return path.substring(0, slashIdx + 1);
}
