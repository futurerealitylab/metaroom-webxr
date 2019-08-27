#version 300 es
precision highp float;

uniform   float uTime;
in vec3   vPos;

out vec4 fragColor; // gl_FragColor replaced with an explicit "out" vec4 that you set in the shader
    
void main() {    // YOU MUST DEFINE main()
  // HERE YOU CAN WRITE ANY CODE TO
  // DEFINE A COLOR FOR THIS FRAGMENT

  float red   = max(0., vPos.x);
  float green = max(0., vPos.y);
  float blue  = max(0., sin(5. * uTime));
  
  // R,G,B EACH RANGE FROM 0.0 TO 1.0
    
  vec3 color = vec3(red, green, blue);
    
  // THIS LINE OUTPUTS THE FRAGMENT COLOR
    
  fragColor = vec4(sqrt(color), 1.0);
}