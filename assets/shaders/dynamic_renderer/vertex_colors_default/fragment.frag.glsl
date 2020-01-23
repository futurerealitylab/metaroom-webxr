#version 300 es
precision highp float;
#include<pnoise>

in vec3 vPos;
in vec3 vWorldPos;
in vec4 vColor;

uniform float uTime;

out vec4 fragColor;

void main(void) 
{
    fragColor = vColor;
}
