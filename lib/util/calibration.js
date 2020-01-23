"use strict";

function calibrateTheRoom(input, state){
    if (input.LC) {
        let LP = input.LC.center();
        let RP = input.RC.center();
        let D  = CG.subtract(LP, RP);
        let d  = metersToInches(CG.norm(D));
        let getX = C => {
           m.save();
              m.identity();
              m.rotateQ(CG.matrixFromQuaternion(C.orientation()));
              m.rotateX(.75);
              let x = (m.value())[1];
           m.restore();
           return x;
        }
        let lx = getX(input.LC);
        let rx = getX(input.RC);
        let sep = metersToInches(TABLE_DEPTH - 2 * RING_RADIUS);
        if (d >= sep - 1 && d <= sep + 1 && Math.abs(lx) < .03 && Math.abs(rx) < .03) {
           if (state.calibrationCount === undefined)
              state.calibrationCount = 0;
           if (++state.calibrationCount == 30) {
              m.save();
                 m.identity();
                 m.translate(CG.mix(LP, RP, .5));
                 m.rotateY(Math.atan2(D[0], D[2]) + Math.PI/2);
                 // the tabletop surface position
                 m.translate(-2.35,1.00,-.72);
                 state.avatarMatrixInverse = m.value();
                 m.invert();
                 state.avatarMatrixForward = m.value();
              m.restore();
              state.calibrationCount = 0;
           }
        }
     }
}