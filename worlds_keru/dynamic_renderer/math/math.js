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
export function smoothstepzd(edge0, edge1, x) {
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
