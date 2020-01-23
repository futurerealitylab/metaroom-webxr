#version 300 es
precision highp float;

// input vertex
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec4 aColor;

// interpolated vertex position
out vec3 vPos;
out vec3 vWorldPos;
out vec4 vColor;

// matrices
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

uniform float uTime;

void main(void) 
{
    vec4 worldPos = uModel * vec4(aPos, 1.0);
    vec4 pos      = uProj * uView * worldPos;
    
    vPos      = pos.xyz;
    vWorldPos = worldPos.xyz;
    vColor    = aColor;

    gl_Position = pos;
}
