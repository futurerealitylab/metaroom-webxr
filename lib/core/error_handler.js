"use strict"

export function notImplemented(version) {
    console.warn(`Version ${version}: Not yet implemented`);
    document.body.insertBefore(
        document.createTextNode(`Version ${version}: Not yet implemented`),
        document.body.firstChild
    );
}

export function initFailed(msg) {
    document.body.insertBefore(
        document.createTextNode(msg), document.body.firstChild
    );   
}
