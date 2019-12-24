"use strict";

export const GPU_API_TYPE = {
    WEBGL  : 0,
    WEBGPU : 1
};

// convenience function (may or may not use, but an okay example)
export async function loadAPI(type, args) {
    switch (type) {
    default /* GPU_API_TYPE.WEBGL */ : {
        return import("./webgl_interface.js");
    }
    case GPU_API_TYPE.WEBGPU: {
        return import("./webgpu_interface.js");
    }
    }
};
