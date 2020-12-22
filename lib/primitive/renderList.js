
"use strict";

export class TextureInfo {
   constructor() {
      this.textures = [];
      this.image   = null;
      this.scale   = 1;
      this.isValid = false;
   }
}

export let RenderList = function() {
   let Item = function() {
      this.move = (x,y,z) => {
         this.mx = Array.isArray(x) ? x[0] : x;
         this.my = Array.isArray(x) ? x[1] : y;
         this.mz = Array.isArray(x) ? x[2] : z;
         return this;
      };
      this.turnX = a => { this.rx = a; return this; }
      this.turnY = a => { this.ry = a; return this; }
      this.turnZ = a => { this.rz = a; return this; }
      this.size = (x,y,z) => {
         this.sx = Array.isArray(x) ? x[0] : x;
         this.sy = Array.isArray(x) ? x[1] : y === undefined ? x : y;
         this.sz = Array.isArray(x) ? x[2] : z === undefined ? x : z;
         return this;
      };
      this.sizeWithComponents = (x,y,z) => {
         this.sx = x;
         this.sy = y;
         this.sz = z;
         return this;
      };
      this.sizeWithVector = v => {
         this.sx = v[0];
         this.sy = v[1];
         this.sz = v[2];
         return this;
      };
      this.color = (r,g,b) => {
         this.rgb[0] = Array.isArray(r) ? r[0] : r;
         this.rgb[1] = Array.isArray(r) ? r[1] : g;
         this.rgb[2] = Array.isArray(r) ? r[2] : b;
         return this;
      };
      this.colorWithComponents = (r,g,b) => {
         this.rgb[0] = r;
         this.rgb[1] = g;
         this.rgb[2] = b;
         return this;
      };
      this.colorWithVector = v => {
         this.rgb[0] = v[0];
         this.rgb[1] = v[1];
         this.rgb[2] = v[2];
         return this;
      };
      this.opacity = opac => { this.opac = opac; return this; };
      this.fx = type => { this.fxMode = type; return this; };
      this.vtxMode = mode => { this.vertexMode = mode; return this; }

      this.textureView = (img, sc = 1) => {
         this.textureInfo.image = img;
         this.textureInfo.scale = sc;
         this.textureInfo.isValid = true;
         return this;
      }
      this.textureAtlas = (txtr)=> {
         this.textureInfo.textures.push(txtr);
         return this;
      }

      this.clone = () => {
         const cl = this.add(this.shape);
         cl.colorWithVector(this.rgb);
         cl.sizeWithComponents(this.sx, this.sy, this.sz);
         cl.turnX(this.rx);
         cl.turnY(this.ry);
         cl.turnZ(this.rz);
         cl.move(this.mx, this.my, this.mz);
         cl.opac = this.opac;

         for (let i = 0; i < this.matrix.length; i += 1) {
            cl.matrix[i] = this.matrix[i];
         }

         // TODO copy texture

         return cl;
      }


      this.init = () => {
         this.shape = null;
         this.list  = null;
         this.type = 0; // default shape, 1 == list
         this.matrix = CG.matrixIdentity();
         this.mx = this.my = this.mz = 0;
         this.rx = this.ry = this.rz = 0;
         this.sx = this.sy = this.sz = 1;
         this.rgb = [0,0,0];
         this.opac = 1;
         this.textureInfo = new TextureInfo();
         this.fxMode = 0;
         this.vertexMode = 0;
      }
      this.init();
   }

   this.setWorld = _w => w = _w;
   this.world = () => { return w; };
   this.beginFrame = () => n = 0;
   this.beginBuild = () => n = 0;
   this.endBuild = () => { /* do something */};
   this.add = shape => {
      if (items[n])
         items[n].init();
      else
         items[n] = new Item();
      items[n].shape = shape;
      items[n].matrix = w.m.value().slice();
      items[n].type = 0;
      return items[n++];
   }
   this.addList = list=> {
      if (items[n])
         items[n].init();
      else
         items[n] = new Item();
      items[n].list = list;
      items[n].matrix = w.m.value().slice();
      items[n].type = 1;
      return items[n++];      
   }
   this.endFrame = drawFunction => {
      for (let i = 0 ; i < n ; i++) {
         let item = items[i];
         let mat = item.matrix;
         mat = CG.matrixMultiply(mat, CG.matrixTranslate(item.mx, item.my, item.mz));
         mat = CG.matrixMultiply(mat, CG.matrixRotateX  (item.rx));
         mat = CG.matrixMultiply(mat, CG.matrixRotateY  (item.ry));
         mat = CG.matrixMultiply(mat, CG.matrixRotateZ  (item.rz));
         mat = CG.matrixMultiply(mat, CG.matrixScale    (item.sx, item.sy, item.sz));
         
         switch (item.type) {
         // render list
         case 1: {
            const list = item.list;
            
            list.drawWithGlobalMatrix(mat, drawFunction);
            break;
         }
         default: {
            drawFunction(item.shape, mat, item.rgb, item.opac, item.textureInfo, item.fxMode, item.vertexMode);
            break;
         }
         }
      }
//      console.log("there are " + n + " items in the scene");
   }
   this.drawWithGlobalMatrix = (globalMat, drawFunction) => {
      for (let i = 0 ; i < n ; i++) {
         let item = items[i];
         let mat = CG.matrixMultiply(globalMat, item.matrix);
         mat = CG.matrixMultiply(mat, CG.matrixTranslate(item.mx, item.my, item.mz));
         mat = CG.matrixMultiply(mat, CG.matrixRotateX  (item.rx));
         mat = CG.matrixMultiply(mat, CG.matrixRotateY  (item.ry));
         mat = CG.matrixMultiply(mat, CG.matrixRotateZ  (item.rz));
         mat = CG.matrixMultiply(mat, CG.matrixScale    (item.sx, item.sy, item.sz));
         
         switch (item.type) {
         // render list
         case 1: {
            const list = item.list;
            list.drawWithGlobalMatrix(mat, drawFunction);
            break;
         }
         default: {
            drawFunction(item.shape, mat, item.rgb, item.opac, item.textureInfo, item.fxMode, item.vertexMode);
            break;
         }
         }
      }
//      console.log("there are " + n + " items in the scene");
   };

   this.setTextureCatalogue = textureCatalogue => {
      this.textureCatalogue = textureCatalogue;
   }

   let w = null, n = 0, items = [];

   this.getItems = () => items;
}

let renderList = new RenderList();
let activeList = renderList;

export function list() { return renderList; }

export let mCube            = () => activeList.add(CG.cube);
export let mPoly4           = V  => activeList.add(CG.createPoly4Vertices(V));
export let mPolyhedron      = V  => activeList.add(CG.createPoly4Vertices(V));
export let mQuad            = () => activeList.add(CG.quad);
export let mSquare          = () => activeList.add(CG.quad);
export let mSphere          = () => activeList.add(CG.sphere);
export let mCylinder        = () => activeList.add(CG.cylinder);
export let mRoundedCylinder = () => activeList.add(CG.roundedCylinder);
export let mTorus           = () => activeList.add(CG.torus);
export let mDisk            = () => activeList.add(CG.disk);
export let mCone            = () => activeList.add(CG.cone);
export let mTube            = () => activeList.add(CG.tube);
export let mTube3           = () => activeList.add(CG.tube3);
export let mGluedCylinder   = () => activeList.add(CG.gluedCylinder);

export function mList(list) {
   activeList.addList(list);
};

export function mBeginBuild() {
   activeList = new RenderList();
   activeList.setWorld(renderList.world());
}
export function mEndBuild() {
   const out  = activeList;
   activeList = renderList;
   return out;
}

// TO DO:

/*
let mBegin           = ()  => ...
let mEnd             = ()  => ...

// USAGE:

   // EXAMPLE OF CONSTRUCTING OBJECT:

   mFoo = mBegin();
      m.identity();
      m.rotateX(Math.PI/4);
      mCube().size(.5).color(1,0,0);
      mCube().move(0,0,.6).size(.1).color(0,0,1);
   mEnd();

   // TO RENDER OBJECT:

   mFoo();
*/

/*

   // Implementation:

   mBegin = () => {
      renderList.object = new Function('renderList.add(this.__buffer__)');
      renderList.buffer = [];
      return renderList.object;
   }

   mEnd = () => renderList.mObject.__buffer__ = renderList.buffer;

*/
