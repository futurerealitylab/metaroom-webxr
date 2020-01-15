"use strict";

import * as gpulib from "./gpu_lib.js";

//##########################################################
// Creating a Mesh is the same concept, Get a Typed Array of
// Flat Vertex/Index data, create a buffer, pass data to it.
// Keep Track of how many ELEMENTS in the buffer, not the byte size.
// Like How many Vertices exist in this float32array
export class Mesh {
    constructor(){
        this.buf_vert   = null;     // Reference to GPU Buffer
        this.elm_cnt    = 0;        // How many Vertices in buffer
    }

    static make(Api, vert_ary, elm_len = 2) {
        /* old
        let mesh = new Mesh();

        mesh.buf_vert = Api.device.createBuffer({
            size  : vert_ary.byteLength,
            usage : GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        mesh.buf_vert.setSubData(0, vert_ary);
        mesh.elm_cnt = vert_ary.length / elm_len;   // How Many Vertices

        */

        let mesh = new Mesh();
        mesh.buf_vert = gpulib.createBufferMappedWithData(
            Api.device, 
            {size : vert_ary.byteLength, usage : GPUBufferUsage.VERTEX}, 
            vert_ary.buffer
        );

        mesh.elm_cnt = vert_ary.length / elm_len;

        return mesh;
    }
}
