precision highp float;
attribute vec3 aPos;
varying   vec3 vPos;
varying   vec3 vPosInterp;
uniform   mat4 uModel;
uniform   mat4 uView;
uniform   mat4 uProj;

void main() {
  gl_Position = uProj * uView * uModel * vec4(aPos, 1.);
  vPos = aPos;
  vPosInterp = gl_Position.xyz;
}