"use strict";

// this file exports the union of the symbols in the following files:
// NOTE: be careful of symbol name collisions
export * from "./webgl_interface.js";
export * from "./webgpu_interface.js";

// import symbols and ...
import * as WGL  from "./webgl_interface.js";
import * as WGPU from "./webgpu_interface.js";

// re-export sub-enums under a common enum
export const GPU_API_TYPE = {
    WEBGL  : WGL.WEBGL_API_TYPE,
    WEBGPU : WGPU.WEBGPU_API_TYPE
};

// convenience function (may or may not use, but an okay example)
export function initAPI(type, args) {
    switch (type) {
    default /* GPU_API_TYPE.WEBGL */ : {
        return new WGL.WebGLInterface(args); 
    }
    case GPU_API_TYPE.WEBGPU: {
        return new WGPU.WebGPUInterace(args);
    }
    }
};
