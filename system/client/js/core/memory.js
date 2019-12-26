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
        if (this.idx + count >= this.buf.length) {
            console.warn("buffer length exceeded, resizing");
            let newSize = (this.buf.length * 2);
            while (newSize < this.idx + count) {
                newSize *= 2;
            }

            this.buf = new [this.type](newSize);
        }
        
        this.idx += count;
        
        return this.buf.subarray(this.idx - count, count);
    }
}

// TODO memory that can be reinterpreted as another type of array buffer
