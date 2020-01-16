"use strict";

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