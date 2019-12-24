"use strict"

// expose this class in the declaration
export class WebGLInterface {
    
}

// enums

export const CONTEXT_TYPE_WEBGL  = 0;
export const CONTEXT_TYPE_WEBGL2 = 1;

const CONTEXT_TYPE = {
    webgl  : CONTEXT_TYPE_WEBGL,
    webgl2 : CONTEXT_TYPE_WEBGL2
};

const CONTEXT_TYPE_TO_NAME = {
    CONTEXT_TYPE_WEBGL  : 'webgl',
    CONTEXT_TYPE_WEBGL2 : 'webgl2'
};

export {
    CONTEXT_TYPE as WEBGL_CONTEXT_TYPE, 
    CONTEXT_TYPE_TO_NAME as WEBGL_CONTEXT_TYPE_TO_NAME
};
