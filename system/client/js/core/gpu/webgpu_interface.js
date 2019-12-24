"use strict"

// highly experimental web graphics API for future experimentation
class GPUInterface {
    init(args) {
        console.error("NOT IMPLEMENTED");
    }
}

// enums
export const WEBGPU_API_TYPE = 'webgpu';
export const CONTEXT_TYPE_WEBGPU  = 0;

const CONTEXT_TYPE = {
    webgpu : CONTEXT_TYPE_WEBGPU
};

const CONTEXT_TYPE_TO_NAME = {
    CONTEXT_TYPE_WEBGPU : 'webgpu',
};

export {
    CONTEXT_TYPE         as WEBGPU_CONTEXT_TYPE, 
    CONTEXT_TYPE_TO_NAME as WEBGPU_CONTEXT_TYPE_TO_NAME
};

export {WebGPUInterface}
