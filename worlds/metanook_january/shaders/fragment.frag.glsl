#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform vec4  uColor;
uniform vec3  uCursor; // CURSOR: xy=pos, z=mouse up/down
uniform float uTime;   // TIME, IN SECONDS

in vec2 vXY;           // POSITION ON IMAGE
in vec3 vP;
in vec3 vPos;          // POSITION
in vec3 vNor;          // NORMAL
in vec3 vTan;          // TANGENT
in vec3 vBin;          // BINORMAL
in vec2 vUV;           // U,V

vec3 Ldir[2];
vec3 Lrgb[2];

uniform int uBumpIndex;
uniform float uBumpScale;
uniform float uToon;

uniform int uTexIndex;
uniform float uTexScale;
uniform float uBrightness;

uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform sampler2D uTex2;

out vec4 fragColor;    // RESULT WILL GO HERE

vec3 bumpTexture(vec3 normal, vec4 bump) {
   return normalize((.5-bump.x) * normalize(vTan) + (.5-bump.y) * normalize(vBin) + (.5-bump.z) * normal);
}

vec3 phong(vec3 Ldir, vec3 Lrgb, vec3 normal, vec3 diffuse, vec3 specular, float p) {
    vec3 color = vec3(0.,0.,0.);
    float d = dot(Ldir, normal);
    if (d > 0.)
       color += diffuse * d * Lrgb;
    vec3 R = 2. * normal * dot(Ldir, normal) - Ldir;
    float s = dot(R, normal);
    if (s > 0.)
       color += specular * pow(s, p) * Lrgb;
    return color;
}

void main() {
    vec4 texture0 = texture(uTex0, vUV * uTexScale);
    vec4 texture1 = texture(uTex1, vUV * uTexScale);
    vec4 texture2 = texture(uTex2, vUV * uTexScale);

    vec3 ambient = .1 * uColor.rgb;
    vec3 diffuse = .5 * uColor.rgb;
    vec3 specular = vec3(.4,.4,.4);
    float p = 30.;

    Ldir[0] = normalize(vec3(1.,1.,2.));
    Ldir[1] = normalize(vec3(-1.,-1.,-1.));
    Lrgb[0] = vec3(.6,.6,1.);
    Lrgb[1] = vec3(.8,.4,.1);

    vec3 normal = normalize(vNor);

    if (uBumpIndex == 0) normal = bumpTexture(normal, texture(uTex0, vUV * uBumpScale));
    if (uBumpIndex == 1) normal = bumpTexture(normal, texture(uTex1, vUV * uBumpScale));
    if (uBumpIndex == 2) normal = bumpTexture(normal, texture(uTex2, vUV * uBumpScale));

    vec3 color = ambient;
    color += phong(Ldir[0], Lrgb[0], normal, diffuse, specular, p);
    color += phong(Ldir[1], Lrgb[1], normal, diffuse, specular, p);

    fragColor = vec4(sqrt(color.rgb) * (uToon == 0. ? 1. : 0.), uColor.a) * uBrightness;
    if (uTexIndex == 0) fragColor *= texture(uTex0, vUV * uTexScale);
    if (uTexIndex == 1) fragColor *= texture(uTex1, vUV * uTexScale);
    if (uTexIndex == 2) fragColor *= texture(uTex2, vUV * uTexScale);
}


