"use strict"

// highly experimental web graphics API for future experimentation
class GPUCtxInfo {
    init(args) {
        console.warn("NOT IMPLEMENTED");
    }
}

export function getWebXRLayerConstructor() {
    return window.XRWebGPULayer; // will return undefined for now
}

export {GPUCtxInfo}
