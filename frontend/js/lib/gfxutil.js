"use strict";



const GFX = (function() {
    const _util = {};

    // shader and GL utilities

    class GLContextResult {
        constructor(isValid, _gl, _version) {
            this.isValid = isValid;
            this.gl      = _gl;
            this.version = _version;
        }
    }

    function initGLContext(target, contextNames, contextOptions) {
        for (let i = 0; i < contextNames.length; ++i) {
            const glCtx = target.getContext(contextNames[i], contextOptions);
            if (glCtx != null) { // non-null indicates success
                return new GLContextResult(true, glCtx, contextNames[i]);
            }
        }
        return new GLContextResult(false);
    }
    _util.initGLContext = initGLContext;

    function addShader(program, type, src) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const msg = gl.getShaderInfoLog(shader);

            let shaderTypename = '';
            switch (type) {
            case gl.VERTEX_SHADER: {
                shaderTypename = "vertex";
                break;
            }
            case gl.FRAGMENT_SHADER: {
                shaderTypename = "fragment";
                break;
            }
            default:
                break;
            }
            console.error("Cannot compile " + shaderTypename + " shader:\n\n" + msg);
            return null;
        } else {
            gl.attachShader(program, shader);
            return shader;
        }
    }
    _util.addShader = addShader;

    function createShaderProgramFromStrings(vertSrc, fragSrc) {
        const program = gl.createProgram();
        const vshader = GFX.addShader(program, gl.VERTEX_SHADER, vertSrc);
        const fshader = GFX.addShader(program, gl.FRAGMENT_SHADER, fragSrc);

        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const msg = gl.getProgramInfoLog(program);
            console.error("Cannot link program:\n\n" + msg);
        } else {
            gl.detachShader(program, vshader);
            gl.detachShader(program, fshader);
            gl.deleteShader(vshader);
            gl.deleteShader(fshader);
        }

        return program;
    }
    _util.createShaderProgramFromStrings = createShaderProgramFromStrings;

    function createShaderProgramFromCompiledShaders(vshader, fshader) {
        const program = gl.createProgram();

        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const msg = gl.getProgramInfoLog(program);
            console.error("Cannot link program:\n\n" + msg);
        }

        return program;
    }
    _util.createShaderProgramFromCompiledShaders = createShaderProgramFromCompiledShaders;

    function createShaderProgramFromStringsAndGetIndivShaders(vertSrc, fragSrc) {
        const program = gl.createProgram();
        const vshader = GFX.addShader(program, gl.VERTEX_SHADER, vertSrc);
        const fshader = GFX.addShader(program, gl.FRAGMENT_SHADER, fragSrc);

        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const msg = gl.getProgramInfoLog(program);
            console.error("Cannot link program:\n\n" + msg);
        }

        return {program : program, vshader : vshader, fshader : fshader};
    }
    _util.createShaderProgramFromStringsAndGetIndivShaders = createShaderProgramFromStringsAndGetIndivShaders;

    function glAttachResourceTracking(GL, version) {

        let funcNames = null;
        let deleteFuncNames = null;
        GL.deletionProcMap = new Map();

        if (version = 'webgl2') {
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
              GL.deletionProcMap.set(funcNames[i], deleteFuncNames[i]);
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
              GL.deletionProcMap.set(funcNames[i], deleteFuncNames[i]);
            }

        }

        const len = funcNames.length;

        GFX.resourceDeletionQueue = [];

        for (let i = 0; i < len; i += 1) {
            const funcName = funcNames[i];
            GL['_' + funcName] = GL[funcName];
            GL[funcName] = function(arg) {
                const out = GL['_' + funcName](arg);

                GFX.resourceDeletionQueue.push(function() {
                    //console.log("calling " + GL.deletionProcMap.get(funcName));
                    GL[GL.deletionProcMap.get(funcName)](out);
                });

                return out;

            }.bind(GL);
        }
    }
    _util.glAttachResourceTracking = glAttachResourceTracking;

    function glFreeResources(GL) {

        GL.disable(GL.CULL_FACE);
        GL.disable(GL.DEPTH_TEST);
        GL.disable(GL.BLEND);

        //console.log("-unbinding texture units ...");
        const maxTextureUnitCount = GL.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS);
        for (let unit = 0; unit < maxTextureUnitCount; unit += 1) {
            GL.activeTexture(GL.TEXTURE0 + unit);
            GL.bindTexture(GL.TEXTURE_2D, null);
            GL.bindTexture(GL.TEXTURE_CUBE_MAP, null);
        }

        // unbind all binding points
        //console.log("-unbinding buffers ...");
        GL.bindBuffer(GL.ARRAY_BUFFER, null);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null)
        GL.bindRenderbuffer(GL.RENDERBUFFER, null);
        GL.bindFramebuffer(GL.FRAMEBUFFER, null);

        if (this._version = 'webgl2') {
            GL.bindBuffer(GL.COPY_READ_BUFFER, null);
            GL.bindBuffer(GL.COPY_WRITE_BUFFER, null);
            GL.bindBuffer(GL.TRANSFORM_FEEDBACK_BUFFER, null);
            GL.bindBuffer(GL.UNIFORM_BUFFER, null);
            GL.bindBuffer(GL.PIXEL_PACK_BUFFER, null);
            GL.bindBuffer(GL.PIXEL_UNPACK_BUFFER, null);
            GL.bindVertexArray(null);
        }

        // free resources
        //console.log("-freeing resources ...");
        const Q = GFX.resourceDeletionQueue;
        const len = Q.length;
        for (let i = 0; i < len; i += 1) {
            const deletionProc = Q.pop();
            deletionProc();
        }

        // clear attributes
        //console.log("-clearing attributes ...");
        const tempBuf = GL._createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, tempBuf);
        const maxAttributeCount = GL.getParameter(GL.MAX_VERTEX_ATTRIBS);
        for (let a = 0; a < maxAttributeCount; a += 1) {
            GL.vertexAttribPointer(a, 1, GL.FLOAT, false, 0, 0);
        }
        GL.deleteBuffer(tempBuf);
        //console.log("Done!");
    }
    _util.glFreeResources = glFreeResources;

    return _util;

}());
