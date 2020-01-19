#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vWorldPos;
in vec4 vColor;

out vec4 fragColor;

void main(void) 
{
    fragColor = vColor;
}
