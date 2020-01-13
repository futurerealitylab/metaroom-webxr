"use strict"

// highly experimental web graphics API for future experimentation
class GPUCtxInfo {
    async init(args) {
        this.version = 'webgpu';

        if (!navigator.gpu) {
            return false;
        }

        try {

            const target = args.targetSurface;
                
            this.adapter = await navigator.gpu.requestAdapter();

            this.device  = await this.adapter.requestDevice();

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