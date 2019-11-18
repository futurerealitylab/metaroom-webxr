
'use strict';

class Avatar {
    constructor(verts, id, leftController, rightController){
        this.playerid = id;
        this.vertices = verts;
        this.translate = [0,0,0];
        this.rotate = [0,0,0,0];
        this.leftController = leftController;
        this.rightController = rightController;
        //TODO: Do we really want this to be the default?
        this.mode = MR.UserType.browser; 
    }
}

class Controller {
  constructor(verts) {
    this.vertices = verts;
    this.translate = [0,0,0];
    this.rotate = [0,0,0,0];
  }
}
