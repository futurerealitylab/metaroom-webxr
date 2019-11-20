
'use strict';

class Avatar {
    constructor(head, id, leftController, rightController){
        this.playerid = id;
        this.headset = head;
        this.leftController = leftController;
        this.rightController = rightController;
        //TODO: Do we really want this to be the default?
        this.mode = MR.UserType.browser; 
    }
}

class Headset {
    constructor(verts) {
        this.vertices = verts;
        this.position = [0,0,0];
        this.orientation = [0,0,0,0];
    }
}

class Controller {
  constructor(verts) {
    this.vertices = verts;
    this.position = [0,0,0];
    this.orientation = [0,0,0,0];
    this.analog = new Button();
    this.trigger = new Button();
    this.side = new Button();
    this.x = new Button();
    this.y = new Button();
  }  
}

class Button {
     //buttons have a 'pressed' variable that is a boolean.
        /*A quick mapping of the buttons:
          0: analog stick
          1: trigger
          2: side trigger
          3: x button
          4: y button
          5: home button
        */
    constructor(){
        this.pressed = false;
    }
}

//ALEX: We might want to restructure this, but for now I feel
//like this is the best file this fits in.

function ControllerHandler(controller, m) {
   this.m = m;
   this.controller = controller;
   this.isDown      = () => controller.buttons[1].pressed;
   this.onEndFrame  = () => wasDown = this.isDown();
   this.orientation = () => controller.pose.orientation;
   this.position    = () => controller.pose.position;
   this.press       = () => ! wasDown && this.isDown();
   this.release     = () => wasDown && ! this.isDown();
   this.tip         = () => {
      const m = this.m;
      let P = this.position();          // THIS CODE JUST MOVES
      m.identity();                     // THE "HOT SPOT" OF THE
      m.translate(P[0], P[1], P[2]);    // CONTROLLER TOWARD ITS
      m.rotateQ(this.orientation());    // FAR TIP (FURTHER AWAY
      m.translate(0,0,-.03);            // FROM THE USER'S HAND).
      let v = m.value();
      return [v[12],v[13],v[14]];
   }
   this.center = () => {
      const m = this.m;
      let P = this.position();
      m.identity();
      m.translate(P[0], P[1], P[2]);
      m.rotateQ(this.orientation());
      m.translate(0,.02,-.005);
      let v = m.value();
      return [v[12],v[13],v[14]];
   }
   let wasDown = false;
}




