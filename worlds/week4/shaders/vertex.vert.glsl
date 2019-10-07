#version 300 es
precision highp float;

// input vertex
in  vec3 aPos;
uniform vec3  uCursor; // CURSOR: xy=pos, z=mouse up/down

// interpolated position
out vec3 vPos;
// interpolated cursor
out vec2 vCursor;


// matrices
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

// time in seconds
uniform float uTime;

void main(void) {
    gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);
    // vPos will be interpolated across fragmented
    vPos = aPos;
    vCursor = (uProj * uView * uModel * vec4(uCursor.xy, gl_Position.z, 1.0)).xy;
}
