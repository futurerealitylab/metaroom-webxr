    const vertModern = `#version 300 es
    in vec3 aPos; // attributes replaced with "in"
    out   vec3 vPos; // varying output replaced with "out"
    uniform   mat4 uModel;
    uniform   mat4 uView;
    uniform   mat4 uProj;

    uniform   int uCompileCount;
    uniform   float uTime;

    void main() {
      float translation = float(uCompileCount) * uTime + (10.0 * float(uCompileCount));
      gl_Position = uProj * uView * uModel * vec4(vec3(0.25 * (aPos.x + sin(translation)), 0.25 * (aPos.y - sin(translation)), aPos.z), 1.);
      vPos = aPos;
    }`;


    const fragModern = `\#version 300 es
    precision highp float;
    uniform float uTime;   // TIME, IN SECONDS
    // varying input replaced with "in"  
    in vec3 vPos;     // -1 < vPos.x < +1
    // -1 < vPos.y < +1
    //      vPos.z == 0

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
    }`;