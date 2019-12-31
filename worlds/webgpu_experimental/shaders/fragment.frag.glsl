#version 450

layout(location = 0) out vec4 outColor;
layout(location = 0) in vec4 v_color;

void main(void) { 
    outColor = v_color; 
}
