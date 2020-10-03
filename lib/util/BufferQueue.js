/* eslint-disable radix */
/* eslint-disable no-mixed-operators */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/**
 * BufferQueue class is a large singular buffer that combines a
 * system delay buffer with a jitter buffer.
 * The concept is that the buffers move from the right to the left
 * at audio rate in this diagram:
 * ___________System Delay__________  ____________Jitter Buffer_______________
 * |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | <- incoming audio
 *   ^                                ^
 *   |                                |
 * Dequeue, sum with input,   | Take this buffer and send
 * and send to corelink       | to speakers
 *
 * By default, the system delay is 8 buffers and the jitter buffer is 20 buffers
 */
var bufferNum = 0;
class BufferQueue {
  /**
   * Constructor with default parameters for severeral member variables.
   * The bufferSize and latencyBufferOffset should be reset by callers
   * according to the program. The rest will be handled by the class
   */
  constructor() {
    this.leftBuffer = []
    this.rightBuffer = []
    this.bufferSize = 1024

    this.latencyBufferOffset = localStorage.getItem('delayBlocks')
    const results = localStorage.getItem('speedtest')
    if (results === null) {
      // document.location.href = 'speedtest.html'
      console.log("no speedtest result");
    }
    const scaleFactor = 10
    let samples = Math.round(JSON.parse(results).maxlatency * scaleFactor * 44100 / 1000)
    samples = parseInt(samples)
    this.jitterBuffer = parseInt(Math.round(samples / this.bufferSize))
    console.log(`this.jitterBuffer: ${this.jitterBuffer}`)
    this.bufferCounter = 0
    this.highWaterMark = this.jitterBuffer + this.latencyBufferOffset
    console.log(`this.highWaterMark: ${this.highWaterMark}`)
    this.lastBufNum = 0
    this.buffering = true
    this.drain = false
  }

  /**
   * Queues an incoming CoreLink buffer
   * @param  {ArrayBuffer} data  Raw input from CoreLink. Must contain
   * the left channel data, right channel data, and an unsigned int representing the
   * buffer number in a contiguous ArrayBuffer
   */
  enqueue(data) {
    // look at buffer number in the packet
    const view = new DataView(data)
    const bufNum = view.getUint32(this.bufferSize * 4 * 2, true)
    if (this.lastBufNum + 1 !== bufNum) {
      console.log(`ERROR: Dropped ${bufNum - this.lastBufNum} packets`)
    }
    this.lastBufNum = bufNum

    const left = new Float32Array(data.slice(0, this.bufferSize * 4))
    const right = new Float32Array(data.slice(this.bufferSize * 4, this.bufferSize * 4 * 2))
    this.leftBuffer.push(left)
    this.rightBuffer.push(right)

    // Checking if buffering or draining
    if (this.leftBuffer.length > this.highWaterMark - this.latencyBufferOffset && this.buffering) {
      this.buffering = false
      console.log('Done buffering')
    }
    if (this.leftBuffer.length > this.highWaterMark) {
      console.log('ERROR: Draining buffer because it got too big')
      this.leftBuffer.shift()
      this.rightBuffer.shift()
    }
    this.bufferCounter += 1
  }

  /**
   * @return {Float32Array, Float32Array} Returns the buffer for the speakers
   * to compensate for the system delay.
   *
   * If the queue was just created, then the queue will buffer for this.highWaterMark number
   * of buffers before starting playback. This is indicated by this.buffering
   */

  getSpeakerBuf() {
    let retval
    if (this.leftBuffer.length <= this.latencyBufferOffset || this.buffering) {
      const buf = new Float32Array(this.bufferSize)
      buf.fill(0)
      retval = {
        left: buf,
        right: buf,
      }
    } else {
      retval = {
        left: this.leftBuffer[this.latencyBufferOffset],
        right: this.rightBuffer[this.latencyBufferOffset],
      }
    }
    return retval
  }

  /**
   * @return {Float32Array, Float32Array} Returns the buffer that will get summed
   * with the incoming microphone signal and sent to CoreLink.
   *
   * If the queue was just created, then the queue will buffer for this.highWaterMark number
   * of buffers before starting playback. This is indicated by this.buffering
   *
   * This function should also write to screen how many buffers are in the queue.
   */
  getSenderBuf() {
    let retval
    bufferNum = this.leftBuffer.length * this.bufferSize / 44100;
    // fill with zeros
    if (!this.drain && // if we're not draining and 
      (this.leftBuffer.length <= this.latencyBufferOffset || // if below the latency buffer
      this.buffering) // if we're buffering
      ) {
      const buf = new Float32Array(this.bufferSize)
      buf.fill(0)
      retval = {
        left: buf,
        right: buf,
      }
    } else {
      retval = {
        left: this.leftBuffer.shift(),
        right: this.rightBuffer.shift(),
      }
    }
    if (this.drain && this.leftBuffer.length === 0) {
      this.drain = false
      this.buffering = true
      console.log('stop draining')
    }
    return retval
  }
}
