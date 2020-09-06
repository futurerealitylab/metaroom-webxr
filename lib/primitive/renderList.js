
"use strict"

let RenderList = function() {
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
      this.color = (r,g,b) => {
         this.rgb[0] = Array.isArray(r) ? r[0] : r;
         this.rgb[1] = Array.isArray(r) ? r[1] : g;
         this.rgb[2] = Array.isArray(r) ? r[2] : b;
	 return this;
      };
      this.opacity = opac => { this.opac = opac; return this; }
      this.texture = file => { /* not yet implemented */ return this; }
      this.init = () => {
	 this.shape = null;
         this.matrix = CG.matrixIdentity();
         this.mx = this.my = this.mz = 0;
         this.rx = this.ry = this.rz = 0;
         this.sx = this.sy = this.sz = 1;
	 this.rgb = [0,0,0];
	 this.opac = 1;
	 this.txtr = null;
      }
      this.init();
   }

   this.setWorld = _w => w = _w;
   this.beginFrame = () => n = 0;
   this.add = shape => {
      if (items[n])
         items[n].init();
      else
         items[n] = new Item();
      items[n].shape = shape;
      items[n].matrix = w.m.value().slice();
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
         drawFunction(item.shape, mat, item.rgb, item.opac, item.txtr);
      }
   }

   let w = null, n = 0, items = [];
}

let renderList = new RenderList();

let mCube            = () => renderList.add(CG.cube);
let mPoly4           = V  => renderList.add(CG.createPoly4Vertices(V));
let mPolyhedron      = V  => renderList.add(CG.createPoly4Vertices(V));
let mQuad            = () => renderList.add(CG.quad);
let mSquare          = () => renderList.add(CG.quad);
let mSphere          = () => renderList.add(CG.sphere);
let mCylinder        = () => renderList.add(CG.cylinder);
let mRoundedCylinder = () => renderList.add(CG.roundedCylinder);
let mTorus           = r  => renderList.add(r == 0.3 ? CG.torus
                                                     : CG.createTorusVertices(32, 16, CG.uvToTorus, r));


