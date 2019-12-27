"use strict"

// highly experimental web graphics API for future experimentation
class GPUCtxInfo {
    init(args) {
        console.warn("NOT IMPLEMENTED");

        this.version = 'webgpu';

        const target = args.targetSurface;
        
        this.ctx = target.getContext("gpupresent");
    }
}

export const XRIsSupported = false;

// undefined for now
export const XRLayer = window.XRWebGPULayer;

export {GPUCtxInfo}
