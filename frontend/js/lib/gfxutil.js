"use strict";

const GFX = (function() {
    const _util = {};

    // (KTR) TODO
    // shader and GL utilities

    function addShader(program, type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        let msg = gl.getShaderInfoLog(shader);

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

    return _util;

}());
