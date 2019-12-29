"use strict"

// highly experimental web graphics API for future experimentation
class GPUCtxInfo {
    async init(args) {

        try {

            this.version = 'webgpu';

            const target = args.targetSurface;
        
            const glslang = await import("https://unpkg.com/@webgpu/glslang@0.0.12/dist/web-devel/glslang.js");
        
            this.adapter = await navigator.gpu.requestAdapter();

            this.ctx = target.getContext("gpupresent");
        } catch (err) {
            console.error(err.message);
            return false;
        }

        return true;
    }
}

export const XRIsSupported = false;

// undefined for now
export const XRLayer = window.XRWebGPULayer;

export {GPUCtxInfo}
