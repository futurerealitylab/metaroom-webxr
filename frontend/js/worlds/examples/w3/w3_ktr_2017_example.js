"use strict"
MR.registerWorld((function() {
    const vert = `
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
    }`;

    const frag = `
    varying vec3 vPos;                             // Position in image
    varying vec3 vPosInterp;                            
    uniform float uTime;                           // Time
    uniform float uBG;
    vec4 C;
    vec3 V, W, P, E, N;                                     
    #define EPSILON .01  // Surface Correction When Casting Shadow Rays

    vec2 raytraceSphere(vec3 V, vec3 W, vec4 S) {
       V -= S.xyz;
       float B = 2. * dot(V, W);
       float C = dot(V, V) - S.w * S.w;
       float discrim = B*B - 4.*C;
       vec2 t = vec2(1000., 1000.);
       if (discrim > 0.)
          t = vec2(-B - discrim, -B + discrim) / 2.;
       return t.x > 0. ? t : vec2(1000., 1000.);
    }

    vec3 reflection(vec3 L, vec3 N) {
       return 2. * dot(N, L) * N - L;
    }

    vec3 backgroundColor(vec3 dir) {
       float t = .5 - .5 * dir.y;
       return mix(vec3(.2,.01,.01), vec3(.01,.01,.1), 1. - t * t);
    }

    vec3 phong(vec3 N, vec3 E, vec3 A, vec3 D, vec4 S) {
       vec3 c = A * backgroundColor(N);            // Ambient color

       for (int i = 0 ; i < uLDirs_length ; i++) { // Loop through lights
          bool is_shadowed = false;
          vec3  LDir = normalize(uLDirs[i]);
          
          for (int s = 0; s < uSpheres_length; s++) {
              vec4 sphere_comp = uSpheres[s];
              vec2 collision = raytraceSphere(P + (N * EPSILON),
                                  LDir,
                sphere_comp);
              if (collision.x < 1000.) {
                  is_shadowed = true;
            break;
              }
          }
          
          if (!is_shadowed) {
              float d = max(0., dot(N, LDir));           // Diffuse value
              vec3  R = reflection(LDir, N);
              float s = pow(max(0., dot(E, R)), S.a);    // Specular value
              c += uLColors[i] * (d * D + s * S.rgb * .1*S.a);
          }
       }
       return c;
    }

    bool raytrace() {
       float distance = 1000.;
       for (int i = 0 ; i < uSpheres_length ; i++) {
          vec2 t = raytraceSphere(V, W, uSpheres[i]);
          if (t.x < distance) {
             C = uSColors[i];
             P = V + t.x * W;                      // Point on sphere
             E = -normalize(P);                    // Direction to eye
             N = normalize(P - uSpheres[i].xyz);   // Surface normal
             distance = t.x;
          }
       }
       return distance < 1000.;
    }

    void main() {
      if (uBG > 0.) {
        if (vPos.y > 0.0) {
          gl_FragColor = vec4(0., 1., 1., 1.);
          return;
        }
        else {
          if (vPos.y < -0.5 && vPos.y > -.75) {
            gl_FragColor = vec4(0., 0.0, 1.0, 1.0);
          }
          else {
          gl_FragColor= vec4(0.0, 0.0, 0.0, 1.0);
        }
          //gl_FragColor = vec4(sqrt(vec3(0.0, 0.0, 1.0 + (vPos.y / 1000.0) )), 1.);
          return;
        }

        return;
      }
       vec3 c = vec3(0.,0.,0.);

       V = vec3(0.,0.,0.);                         // Ray origin
       W = normalize(vec3(vPos.xy, -3.));          // Ray direction
       if (! raytrace())
          c = backgroundColor(vPos);
       else
          for (int bounce = 0 ; bounce < 5 ; bounce++) {
       c += phong(N, E, .1*C.rgb, .5*C.rgb, C);
       V = P + .001 * W;
       W = reflection(-W, N);
             if (! raytrace()) {
                c += .05 * backgroundColor(W);
          break;
             }
          }
             
       gl_FragColor = vec4(sqrt(c), 1.);           // Final pixel color
    }`;


    function declareUniform(uniformData, name, type, size) {
        uniformData[name] = {type : type, size : size};
    }

    function setUniform(uniformData, name, data) {
        uniformData[name].data = data;
    }

    function setup(state, wrangler, session) {
        const uniformData = {};
        state.uniformData = uniformData;

        declareUniform(state.uniformData, 'uSpheres', 'vec4', 3);
        declareUniform(state.uniformData, 'uSColors', 'vec4', 3);
        declareUniform(state.uniformData, 'uLDirs', 'vec3', 2);
        declareUniform(state.uniformData, 'uLColors', 'vec3', 2);

        // Create shader program
        let fragmentShaderHeader = 'precision highp float;\n';

        for (let name in uniformData) {
          let u = uniformData[name];
          fragmentShaderHeader += '#define ' + name + '_length ' + u.size + '\n' +
                                  '   uniform ' + u.type + ' ' + name + (u.size > 0 ? '[' + u.size + ']' : '') + ';\n';
        }

        let newFShader = fragmentShaderHeader + frag;

        const program = GFX.createShaderProgramFromStrings(vert, newFShader);
        state.program = program;
        gl.useProgram(program);

        // Create a square as a triangle strip consisting of two triangles
        state.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,0, 1,1,0, -1,-1,0, 1,-1,0]), gl.STATIC_DRAW);

        // Assign aPos attribute to each vertex
        let aPos = gl.getAttribLocation(program, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

        // Assign MVP matrices
        state.modelLoc = gl.getUniformLocation(program, 'uModel');
        state.viewLoc = gl.getUniformLocation(program, 'uView');
        state.projLoc = gl.getUniformLocation(program, 'uProj');
        state.timeLoc = gl.getUniformLocation(program, 'uTime');
    }


    // NOTE(KTR): t is the elapsed time since system start in ms, but
    // each world could have different rules about time elapsed and whether the time
    // is reset after returning to the world
    function onStartFrame(t, state) {
        // (KTR) TODO implement option so a person could pause and resume elapsed time
        // if someone visits, leaves, and later returns
        let tStart = t;
        if (!state.tStart) {
            state.tStart = t;
            state.time = t;
        }

        tStart = state.tStart;

        let now = (t - tStart);

        // save delta time
        state.deltaTime = now - state.time;
        // different from t, since t is the total elapsed time in the entire system, best to use "state.time"
        state.time = now;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniform1f(state.timeLoc, now / 1000.0);

        gl.enable(gl.DEPTH_TEST);
    }

    function onEndFrame(t, state) {
    }

    function onDraw(t, projMat, viewMat, state, eyeIdx) {
        const sec = state.time / 1000;

        const my = state;
        const program = my.program;

        gl.uniform1f(gl.getUniformLocation(program, "uBG"), 0.0);

        //gl.uniformMatrix4fv(model, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1]));
        gl.uniformMatrix4fv(my.modelLoc, false, new Float32Array([.05,0,0,0, 0,.05,0,0, 0,0,.05,0, -.04,-.04,0-1,1]));
        gl.uniformMatrix4fv(my.viewLoc, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1]));
        gl.uniformMatrix4fv(my.projLoc, false, new Float32Array(projMat));

        let s = .5 * Math.sin(2 * sec);
        setUniform(my.uniformData, 'uSpheres', [-.5,.4,-4+s,.5, .5,.4,-4-s,.5, s,-.5,-4,.5]);
        setUniform(my.uniformData, 'uSColors', [1,.3,.3,2, .3,.3,1,6, 1,.7,0,10]);
        setUniform(my.uniformData, 'uLDirs', [1,1,1, -1,-1,-1]);
        setUniform(my.uniformData, 'uLColors', [.5,.5,1, .2,.1,.1]);

        const uniformData = my.uniformData;

        for (let name in uniformData) {
            let u = uniformData[name];
            switch (u.type) {
            case 'float': gl.uniform1fv(gl.getUniformLocation(program, name), u.data); break;
            case 'vec2' : gl.uniform2fv(gl.getUniformLocation(program, name), u.data); break;
            case 'vec3' : gl.uniform3fv(gl.getUniformLocation(program, name), u.data); break;
            case 'vec4' : gl.uniform4fv(gl.getUniformLocation(program, name), u.data); break;
            }
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.uniformMatrix4fv(my.modelLoc, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-3.9,1]));
        gl.uniformMatrix4fv(my.viewLoc, false, new Float32Array(viewMat));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.uniform1f(gl.getUniformLocation(program, "uBG"), 1.0);
        gl.uniformMatrix4fv(my.modelLoc, false, new Float32Array([1000,0,0,0, 0,1000,0,0, 0,0,1,0, 0,0,-4,1]));
        gl.uniformMatrix4fv(my.viewLoc, false, new Float32Array(viewMat));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function main(myWorld) {
        const def = {
            name         : 'ktr_2017_example',
            setup        : setup,
            onStartFrame : onStartFrame,
            onEndFrame   : onEndFrame,
            onDraw       : onDraw,

            // TEMP use these handlers for simulating world transitions
            onSelectStart : function(t, state) {
                wrangler.simulateWorldTransition();
            },
            onSelect : function(t, state) {
            },
            onSelectEnd : function(t, state) {
            },
        };

        myWorld.beginSetup(def);
        myWorld.start();
    }

    return main;
}())
);
