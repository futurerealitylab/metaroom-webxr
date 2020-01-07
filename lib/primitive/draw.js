"use strict";

 /*-----------------------------------------------------------------

   The drawShape() function below is optimized in that it only downloads
   new vertices to the GPU if the vertices (the "shape" argument) have
   changed since the previous call.

   Also, currently we only draw gl.TRIANGLES if this is a cube. In all
   other cases, we draw gl.TRIANGLE_STRIP. You might want to change
   this if you create other kinds of shapes that are not triangle strips.

   -----------------------------------------------------------------*/

let drawShape = (shape, color, texture, textureScale) => {
   let drawArrays = () => gl.drawArrays(shape == CG.cube ||
                                       shape == CG.quad ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
   if (ENABLE_BRIGHTNESS_CHECK) {
      gl.uniform1f(state.uBrightnessLoc, input.brightness === undefined ? 1 : input.brightness);
   }
   gl.uniform4fv(state.uColorLoc, color.length == 4 ? color : color.concat([1]));
   gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
   gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
   gl.uniform1f(state.uTexScale, textureScale === undefined ? 1 : textureScale);
   if (shape != prev_shape)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( shape ), gl.STATIC_DRAW);
   if (state.isToon) {
      gl.uniform1f (state.uToonLoc, .3 * CG.norm(m.value().slice(0,3)));
      gl.cullFace(gl.FRONT);
      drawArrays();
      gl.cullFace(gl.BACK);
      gl.uniform1f (state.uToonLoc, 0);
   }
   if (state.isMirror) gl.cullFace(gl.FRONT);
   drawArrays();
   gl.cullFace(gl.BACK);
   prev_shape = shape;
}    
  
let drawCamera = id => {
   m.save();
      m.translate(0,0,.1).scale(.1);
      drawShape(CG.cube, [.5,.5,.5]);
   m.restore();
   m.save();
      m.translate(0,0,-.05).scale(.05);
      drawShape(CG.cylinder, [.5,.5,.5]);
   m.restore();
   m.save();
      m.translate(0,0,-.1).scale(.04,.04,.001);
      drawShape(CG.cylinder, [-1,-1,-1]);
   m.restore();
}

let drawInMirror = (z, drawProc) => {
   m.save();
      m.translate(0,0,2 * z);
      m.scale(1,1,-1);
      state.isMirror = true;
      drawProc();
      state.isMirror = false;
   m.restore();
}