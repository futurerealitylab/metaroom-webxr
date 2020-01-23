let drawAvatar = (state) => {
    const input = state.input;
    m.save();
       m.multiply(state.avatarMatrixForward);
       drawHeadset(state, input.HS.position(), input.HS.orientation());
    m.restore();
    m.save();
       let P = state.position;
       m.translate(-P[0],-P[1],-P[2]);
       m.rotateY(-state.turnAngle);
       m.rotateX(-state.tiltAngle);
       m.save();
          m.multiply(state.avatarMatrixForward);
          drawController(state, input.LC.position(), input.LC.orientation(), 0, input.LC.isDown());
          drawController(state, input.RC.position(), input.RC.orientation(), 1, input.RC.isDown());
       m.restore();
    m.restore();
 }