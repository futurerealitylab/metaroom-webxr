"use strict"

// expose this class in the declaration
export class WebGLInterface {
    initContext(args) {
        this.version = 0;
        this.target  = null;
        this.ctx     = null;

        const target = args.target;
        this.contextOptions = args.options;
        const contextNames = args.contextNames;
        const len = contextNames.length;
        for (let i = 0; i < len; i += 1) {
            const ctx = target.getContext(contextNames[i], contextOptions);
            if (ctx != null) {
                this.version = contextNames[i];
                this.target = target;
                return true;
            }
        }

        return false;
    }
}

// enums
export const WEBGL_API_TYPE = 'webgl';
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
    CONTEXT_TYPE         as WEBGL_CONTEXT_TYPE, 
    CONTEXT_TYPE_TO_NAME as WEBGL_CONTEXT_TYPE_TO_NAME
};
