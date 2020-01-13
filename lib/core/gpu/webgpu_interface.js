"use strict"

// https://github.com/gpuweb/gpuweb is the place to watch for specification development. Chromium development is somewhat scattered, but:

// Mailing list (with occasional updates):
// https://groups.google.com/forum/#!forum/dawn-graphics
// Bugs:
// https://crbug.com/?q=component%3ABlink%3EWebGPU%20OR%20component%3AInternals%3EGPU%3EDawn
// https://crbug.com/dawn
// Changes:
// https://dawn-review.googlesource.com/
// https://chromium-review.googlesource.com/q/file:webgpu

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