"use strict"

// import * from 

const workspace = 'metaroom';
const frequency = 9;

const leftBuffer = []
const rightBuffer = []
const blocksize = 1024
let bufferNumber = 0
let mute = false
let clean = false
let analyser = null
const audioCtx = new AudioContext({
    latencyHint: 'interactive',
    sampleRate: 44100,
})

// Making the number of bufs based off blocksize to 1 seconds
const bufs = Math.floor(44100 / blocksize)
const syncTestBufferInput = new Float32Array(blocksize * bufs)
const syncTestBufferOutput = new Float32Array(blocksize * bufs)
let latency = 0
let k = 0

export class VoIP_holodeck {
    constructor(username, password) {
        if (username === undefined)
            username = "Testuser1";
        if (password === undefined)
            password = "Testpassword";

        this.username = username;
        this.password = password;

        this.num = 1;
        this.packetnum = 0;
        this.received = 0;
        this.max = 0;
        this.min = 10000000000;
        this.avg = 0;
        this.dataCount = 0;
        this.speed = 0;
        this.delay = 0;
        this.lost = 0;
        this.recnum = 0;
        this.next = true;

        this.audioStreamIDs = [];
        // SETUP VIDEO ELEMENTS
        // Sets .mediaDevices.getUserMedia depending on browser
        this.setUserMediaVariable();
        this.audio = document.getElementById("local");

        corelink.setDebug(false);
        this.handlePingSetup();
    }

    async handlePingSetup() {
        this.config = {};
        this.config.host = 'corelink.hpc.nyu.edu';
        this.config.port = 20012;
        this.config.payload = 4096;

        const protocol = "ws";
        const datatype = "ping";
        await corelink.connect({ username: this.username, password: this.password },
            { ControlIP: this.config.host, ControlPort: this.config.port }).catch((e) => console.log("corelink.connect error"))
        corelink.on('receiver', (e) => console.log('[ping] receiver callback', e))
        corelink.on('sender', (e) => console.log('[ping] sender callback', e))
        corelink.on('stale', (e) => console.log('[ping] stale callback', e))
        corelink.on('dropped', (e) => console.log('[ping] dropped callback', e))

        this.senderPingId = await corelink.createSender({
            workspace, protocol, type: datatype,
        }).catch((err) => { console.log(err) });

        this.receiver = await corelink.createReceiver({
            workspace, protocol, type: datatype, echo: true, alert: false,
        }).catch((err) => { console.log(err) });

        this.unsubscribeStreams = [];
        for (var i = 0; i < this.receiver.length; i += 1) {
            if (this.receiver[i].streamID !== this.senderPingId)
                this.unsubscribeStreams.push(this.receiver[i].streamID);
        }
        if (this.unsubscribeStreams.length > 0)
            await corelink.unsubscribe({ streamIDs: this.unsubscribeStreams });

        this.startTime = Date.now();

        corelink.on('data', (streamID, data) => {
            console.log(data.byteLength)
            this.dataCount += (data.byteLength - 8)
            this.speed = (this.dataCount / ((Date.now() - this.startTime) / 1000)) / 131072

            const view = new DataView(data)
            this.packetnum = view.getUint32(0, true)
            if (this.recnum != this.packetnum - 1) {
                this.lost += 1
            }
            this.recnum = this.packetnum;

            this.delay = window.performance.now() - view.getUint32(4, true);
            if (this.delay < 0) { this.delay = 0 - this.delay; }
            if (this.delay > this.max) { this.max = this.delay; }
            if (this.delay < this.min && this.delay > 0) { this.min = this.delay; }
            this.avg += this.delay;

            //console.log(`Paket: ${num},${packetnum}, Latency: ${nC(delay)}ms, Min: ${nC(min)}ms, Max: ${nC(max)}ms, Avg: ${nC(avg / (num + 1))}ms, Lost packets: ${packetnum - received}, Speed: ${nC(speed)}MBit/s`)

            this.received += 1;
        })

        this.sendPing(this);

        setTimeout(this.handlePingUpdate, 1000, this);
    };

    sendPing(that) {
        if (that.config == undefined) {
            console.log("config is not ready");
            setTimeout(that.sendPing, frequency);
            return;
        }

        let buffer = new ArrayBuffer(parseInt(that.config.payload) + 8);
        new DataView(buffer).setUint32(0, that.num, true);
        new DataView(buffer).setUint32(4, window.performance.now(), true);

        corelink.send(that.senderPingId, buffer);
        that.num += 1;

        if (Date.now() - that.startTime > 10000) {
            console.log('test');
        } else {
            setTimeout(that.sendPing, frequency, that);
        }
    }

    async handlePingUpdate(that) {
        if (Date.now() - that.startTime > 10000) {
            corelink.disconnect();
            const results = {
                maxlatency: that.nC(that.max),
                minlatency: that.nC(that.min),
                avglatency: that.nC((that.avg / (that.num + 1))),
                lost: that.nC(that.lost),
                speed: that.nC(that.speed),
            }
            localStorage.setItem('speedtest', JSON.stringify(results))
            if (results.speed < 2.5) {
                console.log('Available network speed too slow.');
                // document.querySelectorAll('.result').forEach((e) => { e.style.visibility = 'visible' })
                that.next = false;
            }
            if (results.lost > 1) {
                console.log('Too many packets lost.');
                // document.querySelectorAll('.result').forEach((e) => { e.style.visibility = 'visible' })
                that.next = false;
            }
            if (results.maxlatency > 500) {
                console.log('Latency to high.');
                // document.querySelectorAll('.result').forEach((e) => { e.style.visibility = 'visible' })
                that.next = false;
            }
            if (that.next) {
                // document.location.href = "calibrate.html";
                console.log("ready to next page");
                await corelink.disconnect();
                await that.handleAudioCalibrate();
            }
        }
        else
            setTimeout(that.handlePingUpdate, 1000, that);
    }

    nC(x) {
        return x.toFixed(3)
    }

    ////////
    /// audio context
    ////////
    handleAudioSetup() {
        // // Create audio context
        // const audioCtx = new AudioContext({
        //     latencyHint: 'interactive',
        //     sampleRate: 44100,
        // })

        let lastBufNum = 0
        let bufferCounter = 0
        this.numSources = 0

        const icon = ['|', '/', '-', '\\']
        let receivingRotation = 0
        let sendingRotation = 0
        this.senderAudioStreamID = "";
        this.running = true
        corelink.setDebug(false);

        this.audioSetup();

        this.metadata = {
            channels: [
                {
                    id: '1',
                    name: 'Channel 1',
                },
                {
                    id: '2',
                    name: 'Channel 2',
                },
            ],
            deviceName: 'Web Browser',
            sampleRate: 44100,
            sampleFormat: 32,
            bufferSize: 1024,
            interleaved: false,
        }
    }

    unsubscribeAll() {
        const streamIDs = []
        // if (buttons.hasChildNodes) {
        //   for (let i = 0; i < buttons.childNodes.length; i += 1) {
        //     const btn = buttons.childNodes[i]
        //     streamIDs.push(btn.id)
        //   }
        // }
        corelink.unsubscribe({ streamIDs })
    }

    async subscribe(streamID, user) {
        // const subscribed = document.getElementsByClassName("subscribed");
        // const btn = document.getElementById(streamID)
        // if (this.audioStreamIDs.length > 0 && subscribed[0].id === btn.id) {
        // subscribed[0].className = 'users'
        //     this.numSources -= 1
        //     await corelink.unsubscribe({ streamIDs: [streamID] })
        //     console.log('drain buffer')
        //     this.bufferQueue.drain = true
        // } else {
        this.numSources += 1
        // if (subscribed.length > 0) {
        //     await corelink.unsubscribe({ streamIDs: [subscribed[0].id] })
        //     console.log('drain buffer')
        //     this.bufferQueue.drain = true
        //     subscribed[0].className = 'users'
        // }
        // btn.className = 'users subscribed'
        await corelink.subscribe({ streamIDs: [streamID] })
        // }
    }

    async handleAudioCalibrate() {
        // Create audio context
        this.calibrated = false;
        const audioCtx = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 44100,
        })
        //  Generate a sine sweep
        const f0 = 100
        const f1 = 16000
        const T = bufs * blocksize / 44100
        for (let i = 0; i < bufs * blocksize; i += 1) {
            const t = i / 44100
            syncTestBufferOutput[i] = Math.sin(2 * Math.PI * f0 * T
                * ((Math.pow(f1 / f0, t / T) - 1) / Math.log(f1 / f0)))
            syncTestBufferOutput[i] /= 2
        }

        console.log('starting calibration')
        if (navigator.mediaDevices) {
            console.log('getUserMedia supported.')
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then((stream) => {
                    this.audio.srcObject = stream
                    this.audio.onloadedmetadata = (e) => {
                        this.audio.play()
                        this.audio.muted = true
                    }
                    const processor = audioCtx.createScriptProcessor(blocksize, 2, 2)
                    //                                        bufsize, in channels, out channels
                    processor.onaudioprocess = (audioProcessingEvent) => this.audioCalibrateProcess(audioProcessingEvent)
                    const source = audioCtx.createMediaStreamSource(stream)
                    source.connect(processor)
                    processor.connect(audioCtx.destination)
                    console.log(source)
                })
                .catch((err) => {
                    console.log(`The following audio error occured: ${err}`)
                })
        }
    }

    audioCalibrateProcess(e) {
        if (this.calibrated)
            return;
        const input0 = e.inputBuffer.getChannelData(0)
        const input1 = e.inputBuffer.getChannelData(1) //  Unused for now
        const output0 = e.outputBuffer.getChannelData(0)
        const output1 = e.outputBuffer.getChannelData(1)
        if (k >= 0 && k < bufs) {
            for (let sample = 0; sample < input0.length; sample += 1) {
                output0[sample] = syncTestBufferOutput[k * blocksize + sample]
                output1[sample] = syncTestBufferOutput[k * blocksize + sample]
                syncTestBufferInput[k * blocksize + sample] = input0[sample]
            }
        } else if (k === bufs) {
            // Using cross correlation to estimate the latency amount
            const length = blocksize * bufs
            const pad_length = Math.pow(2, Math.ceil(Math.log2(length)))
            const fft_length = Math.floor(pad_length / 2) + 1
            const ref = new Float32Array(pad_length)
            const input = new Float32Array(pad_length)
            ref.fill(0, bufs * blocksize, -1)
            input.fill(0, bufs * blocksize, -1)

            for (let i = 0; i < bufs * blocksize; i += 1) {
                ref[i] = syncTestBufferOutput[i]
                input[i] = syncTestBufferInput[i]
            }

            const ref_fft = RFFT(ref, pad_length)
            const in_fft = RFFT(input, pad_length)

            // Conjugating the reference
            for (let i = 0; i < fft_length; i += 1) {
                ref_fft[i * 2 + 1] *= -1
            }

            // complex pointwise multiplication into ref_fft
            for (let i = 0; i < fft_length; i += 1) {
                const a = in_fft[i * 2]
                const b = in_fft[i * 2 + 1]
                const c = ref_fft[i * 2]
                const d = ref_fft[i * 2 + 1]
                ref_fft[i * 2] = a * c - b * d
                ref_fft[i * 2 + 1] = a * d + b * c
            }

            const cross_correlation = IRFFT(ref_fft, pad_length)
            let max_idx = 0
            let max = 0
            // Skipping every other because it's a complex array
            for (let i = 0; i < pad_length; i += 1) {
                if (cross_correlation[i * 2] > max) {
                    max = cross_correlation[i * 2]
                    max_idx = i
                }
            }
            if (max < 10.0) {
                // eyeballed this number by plotting it.
                // It can technically go down to 1, but a clean take has a peak at ~400
                // A super loud take has a peak at ~3k
                // Force repeating calibration
                k = 0
                console.log('Your microphone cannot hear the speaker. Either turn up your volume or move your microphone closer to your speaker');
                // document.querySelectorAll('.result').forEach((e) => { e.style.visibility = 'visible' })
                console.log(`XC Peak: ${max}`)
            } else {
                // In case the peak is rolled around the end
                if (max_idx > length) {
                    latency = max_idx - length
                } else {
                    latency = max_idx
                }
                console.log('Measured latency in samples:', latency)
                console.log('Blocks:', Math.round(latency / blocksize))
                this.delay = Math.round(latency / blocksize)
                localStorage.setItem('delayBlocks', this.delay)
                // Done calibrating. Move to room
                // document.location.href = "room.html";
                console.log("calibrate finished");
                this.calibrated = true;
                this.handleAudioSetup();
                this.handleAudioUpdate();
            }
            // Plotly.newPlot('tester', [{ y: cross_correlation }])
        } else {
            stream.getTracks().forEach((track) => track.stop())
            for (let sample = 0; sample < input0.length; sample += 1) {
                output0[sample] = 0
                output1[sample] = 0
            }
        }
        k += 1
    }

    async handleAudioUpdate() {
        this.bufferQueue = new BufferQueue()

        let protocol = "udp";
        let datatype = "audio";
        await corelink.connect({ username: this.username, password: this.password },
            { ControlIP: this.config.host, ControlPort: this.config.port }).catch((e) => console.log("corelink.connect error:", e))
        corelink.on('receiver', async (e) => {
            console.log("[audio] receive a new stream ID:" + e.streamID, e);
            // this.subscribe(e.streamID, e.user);
            if (e.type == datatype) {
                this.audioStreamIDs.push(e.streamID);
            }
        })
        corelink.on('sender', (e) => console.log('[audio]sender callback', e))
        corelink.on('stale', (e) => {
            var idx = this.audioStreamIDs.indexOf(e.streamID);
            if (idx != -1) {
                this.audioStreamIDs.splice(idx, 1);
            }
            console.log("[audio]remove stale stream ID:" + e.streamID);
        })
        corelink.on('dropped', (e) => {
            console.log("[audio]TODO: drop stream ID:" + e.streamID);
        })

        corelink.on('data', (streamID, data) => {
            //   receiveFrom.innerHTML = streamID
            this.bufferQueue.enqueue(data)
            //   receivingRotation += 1
            //   receivingIcon.innerHTML = icon[receivingRotation % 4]
        }).catch((err) => { console.log(err) })

        this.senderAudioStreamID = await corelink.createSender({
            workspace, protocol, type: datatype, metadata: JSON.stringify(this.metadata), alert: true,
        }).catch((err) => { console.log(err) })

        this.receiver = await corelink.createReceiver({
            workspace, protocol, type: datatype, echo: false, alert: true,
        }).catch((err) => { console.log(err) })

        if (this.receiver.length > 0) {
            // Forcing unsubscribe for now
            //   original logic: only receive one stream
            // this.receiver.forEach(element => this.audioStreamIDs.push(element.streamID));
            //   corelink.unsubscribe({ streamIDs: streamIDs })
            this.receiver.forEach((e, i) => {
                console.log(e);
                if (e.type == datatype) {
                    this.numSources += 1;                    
                    this.audioStreamIDs.push(e.streamID);
                }

                // const btn = document.createElement('BUTTON') // Create a <button> element
                // btn.innerHTML = `${e.user}<br><br>(${e.streamID})` // Insert text
                // btn.className = 'users'
                // buttons.appendChild(btn)
                // streamIDs.push(e.streamID)
                // btn.setAttribute('id', e.streamID)
                // btn.onclick = () => subscribe(e.streamID, e.user)
                // manually control now
                // this.subscribe(e.streamID, e.user);
            })
        }
    }

    // audio.js

    // const senderIDSpan = document.getElementById('senderID')
    // const muteButton = document.getElementById('mute')
    // const cleanButton = document.getElementById('clean')
    // const canvas = document.getElementById('canvas')
    // const canvasCtx = canvas.getContext('2d')

    /**
     * Initializes navigator.mediaDevices.getUserMedia
     * depending on the browser capabilities
     */
    setUserMediaVariable() {

        if (navigator.mediaDevices === undefined) {
            navigator.mediaDevices = {};
        }

        if (navigator.mediaDevices.getUserMedia === undefined) {
            navigator.mediaDevices.getUserMedia = function (constraints) {

                // gets the alternative old getUserMedia is possible
                var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

                // set an error message if browser doesn't support getUserMedia
                if (!getUserMedia) {
                    return Promise.reject(new Error("Unfortunately, your browser does not support access to the webcam through the getUserMedia API. Try to use the latest version of Google Chrome, Mozilla Firefox, Opera, or Microsoft Edge instead."));
                }

                // uses navigator.getUserMedia for older browsers
                return new Promise(function (resolve, reject) {
                    getUserMedia.call(navigator, constraints, resolve, reject);
                });
            }
        }
    }

    audioSetup() {
        if (navigator.mediaDevices) {
            console.log('getUserMedia supported.')
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then((stream) => {
                    this.audio.srcObject = stream
                    this.audio.onloadedmetadata = (e) => {
                        this.audio.play()
                        this.audio.muted = true
                    }
                    const source = audioCtx.createMediaStreamSource(stream)
                    const processor = audioCtx.createScriptProcessor(blocksize, 2, 2)
                    source.connect(processor)
                    processor.onaudioprocess = (audioProcessingEvent) => this.process(audioProcessingEvent)
                    // processor.connect(audioCtx.destination)
                    analyser = audioCtx.createAnalyser()
                    analyser.minDecibels = -90
                    analyser.maxDecibels = -10
                    analyser.smoothingTimeConstant = 0.85
                    processor.connect(analyser)
                    analyser.connect(audioCtx.destination)
                })
        } else {
            console.log("navigator.mediaDevices", navigator.mediaDevices);
        }
    }

    async muteToggle() {
        mute = !mute;
        this.audioStreamIDs.mute = mute;
        console.log("mute:" + mute);
    }

    async sendType(val) {
        clean = val
    }

    sendData(data, streamID) {
        // console.log('sending...')
        const left = data.getChannelData(0)
        const right = data.getChannelData(1)
        // Adding + 4 for a uint32 number at the end of the buffer indicating the packet number
        const buffersize = left.byteLength + right.byteLength + 4
        const view = new ArrayBuffer(buffersize)
        const dataView = new DataView(view)
        for (let i = 0; i < left.length; i += 1) {
            if (mute) {
                dataView.setFloat32((i * 2) * 4, 0.0, true)
                dataView.setFloat32((i * 2 + 1) * 4, 0.0, true)
            } else {
                dataView.setFloat32(i * 4, left[i], true)
                dataView.setFloat32(i * 4 + left.byteLength, right[i], true)
            }
        }
        dataView.setUint32(buffersize - 4, bufferNumber, true)
        // sendingRotation += 1
        // sendingIcon.innerHTML = icon[sendingRotation % 4]
        corelink.send(streamID, view)
        // senderIDSpan.innerHTML = streamID
        bufferNumber += 1
    }

    process(e) {
        const { left: speakerLeft, right: speakerRight } = this.bufferQueue.getSpeakerBuf()
        const leftBuf = e.inputBuffer.getChannelData(0)
        const rightBuf = e.inputBuffer.getChannelData(1)
        if (leftBuf.length !== speakerLeft.length) {
            console.log('ERROR: lengths are different sizes')
            console.log(`leftBuf.length == ${leftBuf.length}, left.length == ${speakerLeft.length} `)
            console.log(`rightBuf.length == ${rightBuf.length}, right.length == ${speakerRight.length} `)
        }

        // Sending to speakers
        const leftOutput = e.outputBuffer.getChannelData(0)
        const rightOutput = e.outputBuffer.getChannelData(1)
        // TODO: Implement summing based on position in the stream
        for (let i = 0; i < speakerLeft.length; i += 1) {
            leftOutput[i] = speakerLeft[i] // + leftBuf[i]
            rightOutput[i] = speakerRight[i] // + rightBuf[i]
        }

        // Sending to CoreLink
        const { left: senderLeft, right: senderRight } = this.bufferQueue.getSenderBuf()
        if (leftBuf.length !== senderLeft.length) {
            console.log('ERROR: lengths are different sizes')
            console.log(`leftBuf.length == ${leftBuf.length}, left.length == ${senderLeft.length} `)
            console.log(`rightBuf.length == ${rightBuf.length}, right.length == ${senderRight.length} `)
        }
        if (clean && this.running) {
            this.sendData(e.inputBuffer, this.senderAudioStreamID)
            return
        }
        if (clean) {
            for (let i = 0; i < senderLeft.length; i += 1) {
                leftBuf[i] = senderLeft[i]
                rightBuf[i] = senderRight[i]
            }

        } else {
            for (let i = 0; i < senderLeft.length; i += 1) {
                leftBuf[i] += senderLeft[i]
                rightBuf[i] += senderRight[i]
            }
        }
        if (this.running)
            this.sendData(e.inputBuffer, this.senderAudioStreamID)
    }
}

window.subscribe = function (idx) {
    MR.voip.subscribe(MR.voip.audioStreamIDs[idx]);
    console.log("subscribe " + MR.voip.audioStreamIDs[idx]);
}

window.onunload = function(){
    corelink.disconnect();
    corelink.exit();
}