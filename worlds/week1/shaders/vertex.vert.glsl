in        vec3 aPos;
out       vec3 vPos;
uniform   mat4 uModel;
uniform   mat4 uView;
uniform   mat4 uProj;

uniform   float uTime;

void main() {
  gl_Position = uProj * uView * uModel * vec4(aPos * 0.5, 1.);
  vPos = aPos;
}
