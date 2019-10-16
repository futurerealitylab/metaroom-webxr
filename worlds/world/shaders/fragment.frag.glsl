#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec3 vNor;
in vec2 vUV;
in vec2 vUV2;
in vec3 vPos;
in vec3 vWorld;

#define COLORI2F(c_) (c_/255.0)
// The texture(s).
uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform int uTextureActive;
uniform float uTime;

uniform mat4 uView;

out vec4 fragColor;

void main() {
    if (uTextureActive == 1) {
        vec4 color0 = texture(uTex0, vUV + sin(uTime));
        vec4 color1 = texture(uTex1, vUV2);

        color1 = mix(color1, vec4(0.0), cos(uTime) * cos(uTime));
    
        fragColor = mix(color0, color1, sin(uTime));
    } else {
        if(fract(vUV.x / 0.001f) > 0.1f && fract(vUV.y / 0.001f) > 0.1f) {
            fragColor = vec4(sqrt(0.5 * COLORI2F(vec3(71.0,182.0,37.0)) / vWorld.xyz), 1.0);
        } else {
            fragColor = vec4(vec3(0.0), 1.0);
        }
    }
}
