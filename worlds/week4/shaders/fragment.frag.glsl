#version 300 es
precision highp float;

in vec3 vPos;   // -1 < vPos.x < +1
                // -1 < vPos.y < +1
                //      vPos.z == 0

in vec3 vCursor; // cursor in interpolated coordinates 
                 // (by default matches vPos, 
                 // can be changed in vertex shader)

// fragment output color
out vec4 fragColor; 

uniform vec2  uResolution; // window resolution
uniform float uAspect;     // aspect ratio
uniform vec3  uCursor;     // cursor in pixel coordinates (z == 1 means down, 0 up)
uniform float uTime;       // time, in seconds

void main(void) {
    vec2 diff = vCursor.xy - vPos.xy;

    float radius = 0.05 + 0.05 * uCursor.z;
    // step(edge, x), if x is < edge, returns 0.0, 1.0 otherwise
    float withinEdge = 1.0 - step(radius * radius, dot(diff, diff));

    fragColor = vec4((1.0 - withinEdge) * vec3(0.25, 0.25, 1.0) + (withinEdge) * vPos, 1.0);
}