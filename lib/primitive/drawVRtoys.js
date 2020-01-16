"use strict"

let drawAvatar = (avatar, pos, rot, scale, state) => {
    m.save();
       m.translate(pos);
       m.rotateQ(rot);
       m.scale(scale,scale,scale);
       drawShape(avatar.headset.vertices, [1,1,1], 0);
    m.restore();
 }

 let drawPlayer = (avatar) => {
   if (MR.playerid == avatar.playerid)
      continue;

   let headsetPos = avatar.headset.position;
   let headsetRot = avatar.headset.orientation;
   if(headsetPos == null || headsetRot == null)
      continue;
   if (typeof headsetPos == 'undefined') {
      console.log(id);
      console.log("not defined");
   }

   if (avatar.mode == MR.UserType.vr) {
      const rcontroller = avatar.rightController;
      const lcontroller = avatar.leftController;
      
      let hpos = headsetPos.slice();
      hpos[1] += EYE_HEIGHT;
      let lpos = lcontroller.position.slice();
      lpos[1] += EYE_HEIGHT;
      let rpos = rcontroller.position.slice();
      rpos[1] += EYE_HEIGHT;

      drawHeadset(hpos, headsetRot);
      drawController(rpos, rcontroller.orientation, 0);
      drawController(lpos, lcontroller.orientation, 1);
   }
   else {
      m.save();
         m.translate(headsetPos);
         m.rotateQ(headsetRot);
         drawCamera();
      m.restore();
   }
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