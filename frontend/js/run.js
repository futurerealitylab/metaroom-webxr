"use strict";

////



const libMap = new Map();
// libMap.set("mylib.glsl", `
//   #ifndef MYLIB_H
//   #define MYLIB_H

//   #define NOISE2(a, b) // Making noise
//   void do_procedural_graphics(void);
  
//   #ifdef MYLIB_IMPL
//     void do_procedural_graphics(void) {
//       // TODO;
//     }
//   #endif
// `);

libMap.set("pnoise.glsl",
`
   vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
   vec4 mod289(vec4 x) { return x - floor(x * (1. / 289.)) * 289.; }
   vec4 permute(vec4 x) { return mod289(((x*34.)+1.)*x); }
   vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - .85373472095314 * r; }
   vec3 fade(vec3 t) { return t*t*t*(t*(t*6.-15.)+10.); }
   float noise(vec3 P) {
      vec3 i0 = mod289(floor(P)), i1 = mod289(i0 + vec3(1.)),
           f0 = fract(P), f1 = f0 - vec3(1.), f = fade(f0);
      vec4 ix = vec4(i0.x, i1.x, i0.x, i1.x), iy = vec4(i0.yy, i1.yy),
           iz0 = i0.zzzz, iz1 = i1.zzzz,
           ixy = permute(permute(ix) + iy), ixy0 = permute(ixy + iz0), ixy1 = permute(ixy + iz1),
           gx0 = ixy0 * (1. / 7.), gy0 = fract(floor(gx0) * (1. / 7.)) - .5,
           gx1 = ixy1 * (1. / 7.), gy1 = fract(floor(gx1) * (1. / 7.)) - .5;
      gx0 = fract(gx0); gx1 = fract(gx1);
      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0), sz0 = step(gz0, vec4(0.)),
           gz1 = vec4(0.5) - abs(gx1) - abs(gy1), sz1 = step(gz1, vec4(0.));
      gx0 -= sz0 * (step(0., gx0) - .5); gy0 -= sz0 * (step(0., gy0) - .5);
      gx1 -= sz1 * (step(0., gx1) - .5); gy1 -= sz1 * (step(0., gy1) - .5);
      vec3 g0 = vec3(gx0.x,gy0.x,gz0.x), g1 = vec3(gx0.y,gy0.y,gz0.y),
           g2 = vec3(gx0.z,gy0.z,gz0.z), g3 = vec3(gx0.w,gy0.w,gz0.w),
           g4 = vec3(gx1.x,gy1.x,gz1.x), g5 = vec3(gx1.y,gy1.y,gz1.y),
           g6 = vec3(gx1.z,gy1.z,gz1.z), g7 = vec3(gx1.w,gy1.w,gz1.w);
      vec4 norm0 = taylorInvSqrt(vec4(dot(g0,g0), dot(g2,g2), dot(g1,g1), dot(g3,g3))),
           norm1 = taylorInvSqrt(vec4(dot(g4,g4), dot(g6,g6), dot(g5,g5), dot(g7,g7)));
      g0 *= norm0.x; g2 *= norm0.y; g1 *= norm0.z; g3 *= norm0.w;
      g4 *= norm1.x; g6 *= norm1.y; g5 *= norm1.z; g7 *= norm1.w;
      vec4 nz = mix(vec4(dot(g0, vec3(f0.x, f0.y, f0.z)), dot(g1, vec3(f1.x, f0.y, f0.z)),
                         dot(g2, vec3(f0.x, f1.y, f0.z)), dot(g3, vec3(f1.x, f1.y, f0.z))),
                    vec4(dot(g4, vec3(f0.x, f0.y, f1.z)), dot(g5, vec3(f1.x, f0.y, f1.z)),
                         dot(g6, vec3(f0.x, f1.y, f1.z)), dot(g7, vec3(f1.x, f1.y, f1.z))), f.z);
      return 2.2 * mix(mix(nz.x,nz.z,f.y), mix(nz.y,nz.w,f.y), f.x);
   }
   float turbulence(vec3 P) {
      float f = 0., s = 1.;
      for (int i = 0 ; i < 9 ; i++) {
         f += abs(noise(s * P)) / s;
         s *= 2.;
         P = vec3(.866 * P.x + .5 * P.z, P.y + 100., -.5 * P.x + .866 * P.z);
      }
      return f;
   }
   float ray_sphere(vec3 V, vec3 W, vec4 sphere) {
      V -= sphere.xyz;
      float r = sphere.w;
      float WV = dot(W, V);
      float discr = WV * WV - dot(V, V) + r * r;
      return discr >= 0. ? -WV - sqrt(discr) : -1.;
   }`
);
GFX.shaderPreprocessor(`#version 300 es
    precision highp float;

    // Passed in from the vertex shader.
    in vec3 vNor;
    in vec2 vUV;
    in vec2 vUV2;
    in vec3 vPos;

      #  include <pnoise.glsl>      


    /*
      // wee wee
    */

    // wee
      // text #include <pnoise.glsl>

    #if

    #end


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

    #define MYLIB_IMPL
    # include<pnoise.glsl>

    # include <pnoise.glsl    >

    #include < pnoise.glsl >
`, libMap);



////

let autoExpand = function(field) {
  // field.style.height = "inherit";

  // var computed = window.getComputedStyle(field);

  // var height = parseInt(computed.getPropertyValue('border-top-width'), 10) +
  //              parseInt(computed.getPropertyValue('padding-top'), 10) +
  //              field.scrollHeight +
  //              parseInt(computed.getPropertyValue('padding-bottom'), 10) +
  //              parseInt(computed.getPropertyValue('border-bottom-width'), 10);


  // field.style.height = height + 'px';

  let text = field.value.split('\n');
  let cols = 0;
  for (let i = 0; i < text.length; i += 1) {
      cols = Math.max(cols, text[i].length);
  }

  field.rows = text.length + 1;
  field.cols = cols;
}
document.addEventListener('input', function (event) {
  if (event.target.tagName.toLowerCase() !== 'textarea') return;
  autoExpand(event.target);
}, false);   


function tempShaderEditingInit() {
    // TODO(KTR): make cleaner
    MR.shaderMap = new Map();
    const _tareas = document.getElementById("text-areas");
    while (_tareas && _tareas.firstChild) {
        _tareas.removeChild(_tareas.firstChild);
    }
}


MR.wrangler.init({
  outputSurfaceName : 'output-element',
  outputWidth : 1280,
  outputHeight : 720,
  glUseGlobalContext : true,
  // frees gl resources upon world switch
  glDoResourceTracking : true,
  // main() is the system's entry point
  main : () => {

    tempShaderEditingInit();

    // call the main function of the selected world
    MR.wrangler.beginSetup(MR.worlds[MR.worldIdx](MR.wrangler));

    // this is just a temporary function
    wrangler.simulateWorldTransition = function() {
      let ok = false;

      // try to transition to the next world
      while (!ok) {
        MR.worldIdx = (MR.worldIdx + 1) % MR.worlds.length;

        console.log("transitioning to world: [" + MR.worldIdx + "]");

        // TODO(KTR): TEMP, the wrangler will handle these lines
        gl.useProgram(null);
        MR.wrangler._reset();
        MR.wrangler._glFreeResources();
        //

        try {
          // call the main function of the selected world

          tempShaderEditingInit();

          MR.wrangler.beginSetup(MR.worlds[MR.worldIdx](MR.wrangler));

          ok = true;
        } catch (e) {
          console.error(e);

          if (typeof MR.worlds[MR.worldIdx] !== "function") {
            console.error("must return a main initialization function");
          }


          setTimeout(function(){ 
            console.log("Trying another world");
          }, 2000);

          // TODO(KTR) some sort of shader animation to indicate error?
        }
      }
    }
  }
});
