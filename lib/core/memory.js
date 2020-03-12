"use strict";

// TODO(TR): different data types / sizes
export class DynamicArrayBuffer {
    constructor(DataType, initialSize = 63000 * 4) {
        this.DataType = DataType;
        this.buffer     = new ArrayBuffer(initialSize);
        this.bufferView = new this.DataType(this.buffer);
        
        this.count     = 0;
        this.byteCount = 0;
    }

    grow() { 
        console.log("GROW"); console.trace();
        const nextBuffer     = new ArrayBuffer(this.byteCount * 2);
        const nextBufferView = new this.DataType(nextBuffer);

        nextBufferView.set(this.bufferView);

        this.buffer     = nextBuffer;      
        this.bufferView = nextBufferView; 
    }

    push(val) {
        if (this.count > this.bufferView.length) {
            this.grow();
        }

        this.buffer[this.count] = val;
        this.count     += 1;
        this.byteCount += this.DataType.BYTES_PER_ELEMENT;
    }

    ensureFree(by) {
        if (this.count + by > this.buffer.length) {
            this.grow();
        }
    }
    incrementBy(by) {
        this.count     += by;
        this.byteCount += by * this.DataType.BYTES_PER_ELEMENT;
    }
    decrementBy(by) {
        this.count -= by;
        this.byteCount -= by * this.DataType.BYTES_PER_ELEMENT;
    }

    pop() {
        this.count -= 1;
        this.byteCount -= this.DataType.BYTES_PER_ELEMENT;
        return this.buffer[this.count];
    }

    popMultiple(k) {
        this.count -= k;
        this.byteCount -= k * this.DataType.BYTES_PER_ELEMENT;
    }

    removeUnordered(i) {
        const toRemove = this.buffer[i];
        this.buffer[i] = this.buffer[this.count - 1];

        this.count     -= 1;
        this.byteCount -= this.DataType.BYTES_PER_ELEMENT;

        return toRemove;
    }

    reset() {
        this.count     = 0;
        this.byteCount = 0;
    }
}

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
