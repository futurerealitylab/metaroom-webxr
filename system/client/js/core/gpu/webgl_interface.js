"use strict"

// expose this class in the declaration
export class GPUInterface {

    init(args) {
        this.version = null;
        this.ctx     = null;

        const target         = args.target;
        const contextOptions = args.options;
        const contextNames   = args.contextNames;
        const len = contextNames.length;
        for (let i = 0; i < len; i += 1) {
            const ctx = target.getContext(contextNames[i], contextOptions);
            if (ctx != null) {
                this.version = contextNames[i];
                this.ctx     = ctx;

                return true;
            }
        }

        return false;
    }

    enableResourceTracking() {
        enableResourceTracking({
            info    : this, 
            ctx     : this.ctx, 
            version : this.version
        });
    }

    freeResources() {
        freeResources({
            info    : this, 
            ctx     : this.ctx, 
            version : this.version
        });
    }
}

export function enableResourceTracking(args) {
    console.log("tracking gl resources");
    const info    = args.info;
    const GL      = args.ctx;
    const version = args.version;

    let funcNames = null;
    let deleteFuncNames = null;

    info.deletionProcMap = new Map();

    if (version == 'webgl2') {
        /* WebGL2
        createBuffer: ƒ createBuffer()
        createFramebuffer: ƒ createFramebuffer()
        createProgram: ƒ createProgram()
        createQuery: ƒ createQuery()
        createRenderbuffer: ƒ createRenderbuffer()
        createSampler: ƒ createSampler()
        createShader: ƒ createShader()
        createTexture: ƒ createTexture()
        createTransformFeedback: ƒ createTransformFeedback()
        createVertexArray: ƒ createVertexArray()
        */

        funcNames = [
          'createBuffer',
          'createFramebuffer',
          'createProgram',
          'createQuery',
          'createRenderbuffer',
          'createSampler',
          'createShader',
          'createTexture',
          'createTransformFeedback',
          'createVertexArray'
        ];

        deleteFuncNames = [
          'deleteBuffer',
          'deleteFramebuffer',
          'deleteProgram',
          'deleteQuery',
          'deleteRenderbuffer',
          'deleteSampler',
          'deleteShader',
          'deleteTexture',
          'deleteTransformFeedback',
          'deleteVertexArray'
        ];

        for (let i = 0; i < funcNames.length; i += 1) {
            info.deletionProcMap.set(funcNames[i], deleteFuncNames[i]);
        }

    }
    else {

        /* WebGL1
        createBuffer: ƒ createBuffer()
        createFramebuffer: ƒ createFramebuffer()
        createProgram: ƒ createProgram()
        createRenderbuffer: ƒ createRenderbuffer()
        createShader: ƒ createShader()
        createTexture: ƒ createTexture()
        */

        funcNames = [
          'createBuffer',
          'createFramebuffer',
          'createProgram',
          'createRenderbuffer',
          'createShader',
          'createTexture'
        ];

        deleteFuncNames = [
          'deleteBuffer',
          'deleteFramebuffer',
          'deleteProgram',
          'deleteRenderbuffer',
          'deleteShader',
          'deleteTexture'
        ];

        for (let i = 0; i < funcNames.length; i += 1) {
            info.deletionProcMap.set(funcNames[i], deleteFuncNames[i]);
        }

    }

    const len = funcNames.length;

    info.resourceDeletionQueue = [];

    for (let i = 0; i < len; i += 1) {
        const funcName = funcNames[i];
        GL['_' + funcName] = GL[funcName];
        GL[funcName] = function(arg) {
            const out = GL['_' + funcName](arg);

            info.resourceDeletionQueue.push(function() {
                //console.log("calling " + GL.deletionProcMap.get(funcName));
                GL[info.deletionProcMap.get(funcName)](out);
            });

            return out;

        }.bind(GL);
    }
}

export function freeResources(args) {
    console.group("freeing gl resources");

    const info    = args.info;
    const GL      = args.ctx;
    const version = args.version;

    GL.disable(GL.CULL_FACE);
    GL.disable(GL.DEPTH_TEST);
    GL.depthMask(true);
    GL.disable(GL.BLEND);

    console.log("-unbinding texture units ...");
    const maxTextureUnitCount = GL.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS);
    for (let unit = 0; unit < maxTextureUnitCount; unit += 1) {
        GL.activeTexture(GL.TEXTURE0 + unit);
        GL.bindTexture(GL.TEXTURE_2D, null);
        GL.bindTexture(GL.TEXTURE_CUBE_MAP, null);
    }

    //unbind all binding points
    console.log("-unbinding buffers ...");
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null)
    GL.bindRenderbuffer(GL.RENDERBUFFER, null);
    GL.bindFramebuffer(GL.FRAMEBUFFER, null);

    if (version == 'webgl2') {
        GL.bindBuffer(GL.COPY_READ_BUFFER, null);
        GL.bindBuffer(GL.COPY_WRITE_BUFFER, null);
        GL.bindBuffer(GL.TRANSFORM_FEEDBACK_BUFFER, null);
        GL.bindBuffer(GL.UNIFORM_BUFFER, null);
        GL.bindBuffer(GL.PIXEL_PACK_BUFFER, null);
        GL.bindBuffer(GL.PIXEL_UNPACK_BUFFER, null);
        GL.bindVertexArray(null);
    }

    //free resources
    console.log("-freeing resources ...");
    const Q = info.resourceDeletionQueue;
    const len = Q.length;
    for (let i = 0; i < len; i += 1) {
        const deletionProc = Q.pop();
        deletionProc();
    }

    // clear attributes
    console.log("-clearing attributes ...");
    const tempBuf = GL._createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, tempBuf);
    const maxAttributeCount = GL.getParameter(GL.MAX_VERTEX_ATTRIBS);
    for (let a = 0; a < maxAttributeCount; a += 1) {
        GL.vertexAttribPointer(a, 1, GL.FLOAT, false, 0, 0);
    }
    GL.deleteBuffer(tempBuf);
    console.log("Done!");
    console.groupEnd();
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

export function getWebXRLayerConstructor() {
    return window.XRWebGLLayer;
}
