"use strict"

let drawStool = id => {
    m.save();
       m.translate(0, STOOL_HEIGHT/2, 0);
       m.rotateX(Math.PI/2);
       m.scale(STOOL_RADIUS, STOOL_RADIUS, STOOL_HEIGHT/2);
       drawShape(CG.roundedCylinder, [.2,.2,.2]);
    m.restore();
 }

 /*-----------------------------------------------------------------
  
   drawTable() just happens to model the physical size and shape of the
   tables in my lab (measured in meters). If you want to model physical
   furniture, you will probably want to do something different.

   -----------------------------------------------------------------*/
   
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