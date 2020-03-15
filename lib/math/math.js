"use strict";

export function cos01(val) {
    return (Math.cos(val) + 1.0) / 2.0;    
}
export function sin01(val) {
    return (Math.sin(val) + 1.0) / 2.0;
}

export function lerp(v0, v1, t) {
    return (1 - t) * v0 + t * v1;
}

export function clamp(val, lower, upper) {
    return (val < lower) ? lower : 
           (val < upper) ? val : upper;
}

export function smoothstep(edge0, edge1, x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * (3 - 2 * x);
}
// version with zero derivatives at 0 and 1
export function smoothstep_0d(edge0, edge1, x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * x * (x * (x * 6 - 15) + 10);    
}

export function dist2vec2(va, vb) {
    const dx = vb[0] - va[0]
    const dy = vb[1] - va[1]; 
    return (dx * dx) + (dy * dy);
}
export function dist2vec3(va, vb) {
    const dx = vb[0] - va[0]
    const dy = vb[1] - va[1];
    const dz = vb[2] - va[2]; 

    return (dx * dx) + (dy * dy) + (dz * dz);
}

// https://www.khronos.org/opengl/wiki/GluProject_and_gluUnProject_code


const A   = new Float32Array(16);
const m   = new Float32Array(16);
const _in  = new Float32Array(4);
const _out = new Float32Array(4);

export function unproject(winx, winy, winz, modelview, projection, viewport, objectCoordinate) {
    glMatrix.mat4.multiply(A, projection, modelview);
    glMatrix.mat4.invert(m, A);

    // Transformation of normalized coordinates between -1 and 1
    _in[0] = (winx-viewport[0])/viewport[2]*2.0-1.0;
    _in[1] = (winy-viewport[1])/viewport[3]*2.0-1.0;
    _in[2] = 2.0*winz-1.0;
    _in[3] = 1.0;

    //console.log("IN", _in);
    if (_in[0] > 1 || _in[0] < -1 || _in[1] < -1 || _in[1] > 1) {
        return 0;
    }

    // Objects coordinates
    glMatrix.vec4.transformMat4(_out, _in, m);
    if (_out[3] == 0.0) {
        return 0;
    }

    _out[3]=1.0/_out[3];
    objectCoordinate[0]=_out[0]*_out[3];
    objectCoordinate[1]=_out[1]*_out[3];
    objectCoordinate[2]=_out[2]*_out[3];
    return 1;
}

export function project(out, m, v) {
    out = out || v;

    const x = v[0],
          y = v[1],
          z = v[2],
          a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3],
          a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
          a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11],
          a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    const l_w = 1 / (x * a03 + y * a13 + z * a23 + a33);

    out[0] = (x * a00 + y * a10 + z * a20 + a30) * l_w; 
    out[1] = (x * a01 + y * a11 + z * a21 + a31) * l_w; 
    out[2] = (x * a02 + y * a12 + z * a22 + a32) * l_w;
    return out;
};

const quat = glMatrix.quat;
const vec3 = glMatrix.vec3;
const mat4 = glMatrix.mat4;

export const axis_right   = vec3.fromValues(1, 0,  0);
export const axis_up      = vec3.fromValues(0, 1,  0);
export const axis_forward = vec3.fromValues(0, 0, -1);

export const vec3_one = vec3.fromValues(1, 1, 1);

export const buf_quat = quat.create();
export const buf_vec3 = vec3.create();

export function quaternion_forward(rotation) {
    return vec3.transformQuat(buf_vec3, axis_forward, rotation);
}
export function quaternion_right(rotation) {
    return vec3.transformQuat(buf_vec3, axis_right, rotation);
}
export function quaternion_up(rotation) {
    return vec3.transformQuat(buf_vec3, axis_up, rotation);
}
export function quaternion_angle_axis(rad, axis) {
    return quat.setAxisAngle(buf_quat, axis, rad);
}
export function quaternion_multiply_vec3(rotation, v) {
    return vec3.transformQuat(vec3.create(), v, rotation);
}
