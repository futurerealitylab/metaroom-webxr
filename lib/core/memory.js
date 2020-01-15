"use strict";

export class DynamicArrayBuffer {
   constructor(DataType, initialSize = 512) {
      this.DataType = DataType;
      this.buffer     = new ArrayBuffer(initialSize);
      this.bufferView = new this.DataType(this.buffer);
      this.count = 0;
   }

   grow() {
      const nextBuffer     = new ArrayBuffer(this.count * 2);
      const nextBufferView = new this.DataType(nextBuffer);

      nextBufferView.set(this.bufferView);

      this.buffer     = nextBuffer;      
      this.bufferView = nextBufferView; 
   }

   push(val) {
      if (this.count > this.buffer.length) {
         this.grow();
      }

      this.buffer[this.count] = val;
      this.count += 1;
   }

   ensureFree(by) {
      if (this.count + by > this.buffer.length) {
         this.grow();
      }
   }
   incrementBy(by) {
      this.count += by;
   }

   pop() {
      this.count -= 1;
      return this.buffer[this.count + 1];
   }

   removeUnordered(i) {
      const toRemove = this.buffer[i];
      this.buffer[i] = this.buffer[this.count - 1];
      this.count -= 1;

      return toRemove;
   }

   reset() {
      this.count = 0;
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
