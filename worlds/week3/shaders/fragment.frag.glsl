#version 300 es
precision highp float;

in      vec3  vPos;     // -1 < vPos.x < +1
                        // -1 < vPos.y < +1
                        //      vPos.z == 0

// fragment output color
out vec4 fragColor; 

uniform vec2  uResolution;   // window resolution
uniform vec3  uCursor;       // cursor in pixel coordinates (z == 1 means down, 0 up)
uniform vec3  uCursorInterp; // cursor in -1 to 1 coordinates (z == 1.0 means down, 0.0 up)
uniform vec3  uCursorDir;
uniform float uTime;         // time, in seconds



void main() {
    vec3 cursors = vec3(0.0);
    for (int i = 0; i < 5; i += 1) {
       vec2 diff = ((uCursorInterp.xy - (float(i) * uCursorDir.xy * 0.25)) - vPos.xy);
    
       const float radius = 0.025;
       // step(edge, x), if x is < edge, returns 0.0, 1.0 otherwise
       float withinEdge = 1.0 - step(radius * radius, dot(diff, diff));

       cursors = max(cursors, vec3(0.25, 0.76, 0.99) * withinEdge);
   }

    float dtprod = dot(uCursorDir.xy, vPos.xy - uCursorInterp.xy);
    
    fragColor = vec4(cursors + dtprod, 1.0);
}