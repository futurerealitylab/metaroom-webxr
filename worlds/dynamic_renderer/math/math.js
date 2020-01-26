"use strict";

export function sin01(val) {
    return (Math.sin(val) + 1.0) / 2.0;
}

export function lerp(v0, v1, t) {
    return (1 - t) * v0 + t * v1;
}