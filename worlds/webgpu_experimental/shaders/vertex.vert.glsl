#version 450
precision highp float;

layout(location = 0) in vec2 position;
layout(location = 1) in vec4 color;

layout(location = 0) out vec4 v_color;

layout(set = 0, binding = 0) uniform Uniforms {
    float angle;
    float aspect;
} uniforms;

vec2 vec2_rot(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

void main(void) {
    gl_Position = vec4(vec2_rot(position, uniforms.angle), 0.0, 1.0);
    gl_Position.x *= uniforms.aspect;

    v_color = color;
}
