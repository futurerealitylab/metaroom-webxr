"use strict";

export const GPU_API_TYPE = {
    WEBGL  : 'webgl',
    WEBGPU : 'webgpu'
};

// convenience function (may or may not use, but an okay example)
export async function loadAPI(type, args) {
    switch (type) {
    default /* GPU_API_TYPE.WEBGL */ : {
        return loadAPI_WebGL();
    }
    case GPU_API_TYPE.WEBGPU: {
        return loadAPI_WebGPU();
    }
    }
};

export async function loadAPI_WebGL() {
    return import("./webgl_interface.js");
}

export async function loadAPI_WebGPU() {
    return import("./webgpu_interface.js");
}

export const CTX_CREATE_STATUS_SUCCESS             = 0;
export const CTX_CREATE_STATUS_FAILURE_UNKNOWN_API = 1;
export const CTX_CREATE_STATUS_FAILURE_TO_INIT     = 2;

export async function initWebGL(info, options, targetSurface) {
    const GPUAPI      = await loadAPI_WebGL();
    const GPUCtxInfo  = new GPUAPI.GPUCtxInfo();
    
    const ok = GPUCtxInfo.init({
        targetSurface  : targetSurface, 
        contextNames   : options.contextNames, 
        contextOptions : options.contextOptions                
    });

    return {
        isValid    : ok,
        GPUAPI     : GPUAPI,
        GPUCtxInfo : GPUCtxInfo
    };
}

export async function initWebGPU(info, options, targetSurface) {
    const GPUAPI      = await loadAPI_WebGPU();
    const GPUCtxInfo  = new GPUAPI.GPUCtxInfo();
    
    const ok = GPUCtxInfo.init({
        targetSurface  : targetSurface, 
        contextNames   : options.contextNames, 
        contextOptions : options.contextOptions                
    });

    return {
        isValid    : ok,
        GPUAPI     : GPUAPI,
        GPUCtxInfo : GPUCtxInfo
    };
}

