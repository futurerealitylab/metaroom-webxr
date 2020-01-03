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

 
 let drawAvatar = (avatar, pos, rot, scale, state) => {
    m.save();
       m.translate(pos);
       m.rotateQ(rot);
       m.scale(scale,scale,scale);
       drawShape(avatar.headset.vertices, [1,1,1], 0);
    m.restore();
 }

 
    /*-----------------------------------------------------------------

    In my little toy geometric modeler, the pop-up menu of objects only
    appears while the right controller trigger is pressed. This is just
    an example. Feel free to change things, depending on what you are
    trying to do in your homework.

    -----------------------------------------------------------------*/

    let showMenu = p => {
        for (let n = 0 ; n < 4 ; n++) {
           m.save();
              m.multiply(state.avatarMatrixForward);
              m.translate(p);
              m.rotateQ(input.RC.orientation());
              m.translate(menuX[n], menuY[n], 0);
              m.scale(.03, .03, .03);
              drawShape(menuShape[n], n == menuChoice ? [1,.5,.5] : [1,1,1]);
           m.restore();
        }
     }
  
      /*-----------------------------------------------------------------
  
      drawTable() just happens to model the physical size and shape of the
      tables in my lab (measured in meters). If you want to model physical
      furniture, you will probably want to do something different.
  
      -----------------------------------------------------------------*/
  
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
  
     let drawStool = id => {
        m.save();
           m.translate(0, STOOL_HEIGHT/2, 0);
           m.rotateX(Math.PI/2);
           m.scale(STOOL_RADIUS, STOOL_RADIUS, STOOL_HEIGHT/2);
           drawShape(CG.roundedCylinder, [.2,.2,.2]);
        m.restore();
     }
  
     let drawTable = id => {
        m.save();
           m.translate(0, TABLE_HEIGHT - TABLE_THICKNESS/2, 0);
           m.scale(TABLE_DEPTH/2, TABLE_THICKNESS/2, TABLE_WIDTH/2);
           drawShape(CG.cube, [1,1,1], 0);
        m.restore();
        m.save();
           let h  = (TABLE_HEIGHT - TABLE_THICKNESS) / 2;
           let dx = (TABLE_DEPTH  - LEG_THICKNESS  ) / 2;
           let dz = (TABLE_WIDTH  - LEG_THICKNESS  ) / 2;
           for (let x = -dx ; x <= dx ; x += 2 * dx)
           for (let z = -dz ; z <= dz ; z += 2 * dz) {
              m.save();
                 m.translate(x, h, z);
                 m.scale(LEG_THICKNESS/2, h, LEG_THICKNESS/2);
                 drawShape(CG.cube, [.5,.5,.5]);
              m.restore();
           }
        m.restore();
     }
  
     let drawHeadset = (position, orientation) => {
        m.save();
           m.translate(position);
           m.rotateQ(orientation);
           m.scale(.1);
           m.save();
              m.scale(1,1.5,1);
              drawShape(CG.sphere, [0,0,0]);
           m.restore();
           for (let s = -1 ; s <= 1 ; s += 2) {
              m.save();
                 m.translate(s*.4,.2,-.8);
                 m.scale(.4,.4,.1);
                 drawShape(CG.sphere, [10,10,10]);
              m.restore();
           }
        m.restore();
     }
  
     /*-----------------------------------------------------------------
  
     The below is just my particular visual design for the size and
     shape of a controller. Feel free to create a different appearance
     for the controller. You might also want the controller appearance,
     as well as the way it animates when you press the trigger or other
     buttons, to change with different functionality.
  
     For example, you might want to have different appearances when using
     a controller as a selection tool, a resizing tool, a tool for drawing
     in the air, and so forth.
  
     -----------------------------------------------------------------*/
      
     let drawController = (pos, rot, hand, isPressed) => {
        m.save();
           m.translate(pos);
           m.rotateQ(rot);
           m.translate(0,.02,-.005);
           m.rotateX(.75);
           m.save();
                 m.translate(0,0,-.0095).scale(.004,.004,.003);
                 drawShape(CG.sphere, isPressed ? [10,0,0] : [.5,0,0]);
           m.restore();
           m.save();
                 m.translate(0,0,-.01).scale(.04,.04,.13);
                 drawShape(CG.torus1, [0,0,0]);
           m.restore();
           m.save();
                 m.translate(0,-.0135,-.008).scale(.04,.0235,.0015);
                 drawShape(CG.cylinder, [0,0,0]);
           m.restore();
           m.save();
                 m.translate(0,-.01,.03).scale(.012,.02,.037);
                 drawShape(CG.cylinder, [0,0,0]);
           m.restore();
           m.save();
                 m.translate(0,-.01,.067).scale(.012,.02,.023);
                 drawShape(CG.sphere, [0,0,0]);
           m.restore();
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