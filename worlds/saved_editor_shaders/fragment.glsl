#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec3 vNor;
in vec2 vUV;
in vec2 vUV2;
in vec3 vPos;


// The texture(s).
uniform sampler2D uTex0;
uniform sampler2D uTex1;

uniform float uTime;

out vec4 fragColor;

void main() {
    vec4 color0 = texture(uTex0, vUV + sin(uTime));
    vec4 color1 = texture(uTex1, vUV2);

    color1 = mix(color1, vec4(0.0), cos(uTime) * cos(uTime));

    fragColor = mix(color0, color1, sin(uTime));
}
