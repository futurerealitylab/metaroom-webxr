/*-------------------------------------------------------------

        IMPLEMENTATION OF A VIRTUAL 4D TRACKBALL

The user in VR sees a floating transparent sphere.
The interior volume of this sphere represents the upper
hyper-hemisphere (ie: W > 0) of a unit hypersphere,
which has been visually flattened into our XYZ subspace.

When the user drags a controller anywhere within the interior
volume of this sphere, the effect is to rotate a 4D trackball.

The outline of the algorithm is as follows:

   During a drag event between two successive animation frames,
   let P0 and P1 be the two successive controller positions.

   Motion involving only rotation from P0 to P1 is used to
   compute a rotation within our XYZ hyperplane.

   Motion involving only length change from P0 to P1 is used to
   compute a rotation between our XYZ hyperplane and the W axis.

ALGORITHM:

        X  = normalize(P0)      // Compute axes of rotation
        X' = normalize(P1)
        Z  = normalize(cross(X, X'))
        Y  = normalize(cross(Z, X))
        
        c0 = dot(X, X')         // How much to rotate in XY
        s0 = sqrt(1 - c0 * c0)
        
        a  = acos(norm(P0))     // How much to rotate in XW
        b  = acos(norm(P1))
        c1 = cos(b - a)
        s1 = (b < a ? 1 : -1) * sqrt(1 - c1 * c1)
        
             X.x Y.x Z.x  0
        A  = X.y Y.y Z.y  0     // Rotate P0 to the X axis
             X.z Y.z Z.z  0     // and P1-P0 to the Y axis
              0   0   0   1
        
             X.x X.y X.z  0
        AI = Y.x Y.y Y.z  0     // The inverse of A
             Z.x Z.y Z.z  0
              0   0   0   1
         
             c0 -s0   0   0
        B  = s0  c0   0   0     // Rotate in XY
              0   0   1   0
              0   0   0   1
        
             c1   0   0 -s1
        C  =  0   1   0   0     // Rotate in XW
              0   0   1   0
             s1   0   0  c1
        
        Rotation = A * C * B * AI

-------------------------------------------------------------*/

let Rot4 = function() {
   let M = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
       cross = (a,b) => [ a[1]*b[2] - a[2]*b[1],
                          a[2]*b[0] - a[0]*b[2],
			  a[0]*b[1] - a[1]*b[0] ],
       dot = (a,b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
       multiply = (A,B) => {
          let C = [];
          for (let n = 0 ; n < 16 ; n++)
             C.push( A[n&3     ] * B[    n&12] +
                     A[n&3 |  4] * B[1 | n&12] +
                     A[n&3 |  8] * B[2 | n&12] +
                     A[n&3 | 12] * B[3 | n&12] );
          return C;
       },
       norm = v => Math.sqrt(dot(v,v)),
       normalize = v => {
          let s = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
          return [v[0] / s, v[1] / s, v[2] / s];
       };

   this.rotate = (P0,P1) => {
      let X  = normalize(P0),
          Xp = normalize(P1),
          Z  = normalize(cross(X, Xp));
	  if (isNaN(Z[0]))
	     Z = normalize([X[1],X[2],X[0]]);
      let Y  = normalize(cross(Z, X)),
          c0 = dot(X, Xp),
          s0 = Math.sqrt(1 - c0 * c0),
          a  = Math.acos(Math.min(1,norm(P0))),
          b  = Math.acos(Math.min(1,norm(P1))),
          c1 = Math.cos(b - a),
          s1 = (b > a ? 1 : -1) * Math.sqrt(1 - c1 * c1),
          A  = [ X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, 0,0,0,1 ],
          AI = [ X[0],Y[0],Z[0],0, X[1],Y[1],Z[1],0, X[2],Y[2],Z[2],0, 0,0,0,1 ],
          B  = [ c0,s0,0,0, -s0,c0,0,0, 0,0,1,0, 0,0,0,1 ],
          C  = [ c1,0,0,s1, 0,1,0,0, 0,0,1,0, -s1,0,0,c1 ];
      M = multiply(A, multiply(C, multiply(B, multiply(AI, M))));
   }

   this.transform = v => [ v[0] * M[0] + v[1] * M[4] + v[2] * M[ 8] + v[3] * M[12],
                           v[0] * M[1] + v[1] * M[5] + v[2] * M[ 9] + v[3] * M[13],
                           v[0] * M[2] + v[1] * M[6] + v[2] * M[10] + v[3] * M[14],
                           v[0] * M[3] + v[1] * M[7] + v[2] * M[11] + v[3] * M[15] ];

   let H = (() => {
      let V = [];
      for (let w = -1 ; w <= 1 ; w += 2)
      for (let z = -1 ; z <= 1 ; z += 2)
      for (let y = -1 ; y <= 1 ; y += 2)
      for (let x = -1 ; x <= 1 ; x += 2)
         V.push([x,y,z,w]);

      let E = [], k;
      for (let i = 0   ; i < 15 ; i++)
      for (let j = i+1 ; j < 16 ; j++)
	 if ((k = i ^ j) == 1 || k == 2 || k == 4 || k == 8)
	    E.push([i,j]);

      return { vertices: V, edges: E };
   })();

   this.hypercube = () => H;

   this.transformedHypercube = () => {
      let V = [];
      for (let n = 0 ; n < H.vertices.length ; n++)
         V.push(this.transform(H.vertices[n]));
      return { vertices: V, edges: H.edges };
   }
}

//let r = new Rot4();
//r.rotate([0,0,1], [.1,0,1]);
//console.log(r.transformedHypercube());

