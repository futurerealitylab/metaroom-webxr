#version 450

layout(location = 0) out vec4 outColor;
layout(location = 0) in vec4 v_color;

layout(set = 0, binding = 0) uniform Uniforms {
    float angle;
    float aspect;
    float time;
} uniforms;

void main(void) { 
    outColor = v_color; 
}
