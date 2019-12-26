"use strict";

export class TypedScratchMemory {

    constructor(ArrayType, count) {
        this.buf = new ArrayType(count);
        this.idx = 0;
        this.type = ArrayType;
    } 

    reset() {
        this.idx = 0;
    }

    getCountElements(count) {
        if (this.idx === this.buf.length) {
            console.warn("buffer length exceeded, resizing");
            this.buf = new [this.type](this.buf.length * 2);
        }
        
        this.idx += count;
        
        return this.buf.subarray(this.idx - count, count);
    }
}

// TODO memory that can be reinterpreted as another type of array buffer
