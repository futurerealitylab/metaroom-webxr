class SpatialAudioContext {

    constructor(files) {
        try {
            // it appears chrome supports up to 6 audio contexts per tab, so we either need to limit contexts created, or swap buffers and change positions
            // TODO: check how many contexts are already open
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new window.AudioContext({
                                latencyHint: 'interactive',
                                sampleRate: 44100,
                               });
        } catch(e) {
            alert('Web Audio API is not supported in this browser');
        }

        // store loaded buffers here
        this.cache = {};
        // keep track of listener objects associated with the files
        // this.listeners = {};
        this.listener = this.context.listener;

        files.forEach((f) => {
            this.loadFile(f);
        });

    }

    resume() {
        return this.context.resume();
    }

    playFileAt(url, sound_position, head_position, offset = 0.0, time = 0.0) {

        // listener.positionX.value = head_position.x;
        // listener.positionY.value = head_position.y;
        // listener.positionZ.value = head_position.z;
        this.source = this.context.createBufferSource(); // creates a sound source

        this.source.buffer = this.cache[url];
        this.source
            // .connect(this.gain)
            // .connect(this.panner)
            .connect(this.context.destination);

        this.source.start(this.context.currentTime + time, offset);

    }

    stop() {

        this.source.stop();

    }

    pause() {

    }

    setImpulseResponse() {
        // https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode
    }

    async loadFile(url) {

        console.log("fetching...", url);

        const response = await axios.get(url, {
            responseType: 'arraybuffer', // <- important param
        });

        console.log("decoding...", url);
        const audioBuffer = await this.context.decodeAudioData(response.data);

        this.cache[url] = audioBuffer;

    }

    unloadFile(url) {
        delete this.cache[url];
    }

    initPanner(innerAngle = 360, outerAngle = 360, outerGain = 0.2, refDistance = 1.0, maxDistance = 10000, rollOff = 1.0) {

        this.panner = new PannerNode(this.context, {
            // equalpower or HRTF
            panningModel: 'HRTF',
            // linear, inverse, exponential
            distanceModel: "exponential",
            positionX: 0.0,
            positionY: 0.0,
            positionZ: 0.0,
            orientationX: 0.0,
            orientationY: 0.0,
            orientationZ: 0.0,
            refDistance: refDistance,
            maxDistance: maxDistance,
            rolloffFactor: rollOff,
            coneInnerAngle: innerAngle,
            coneOuterAngle: outerAngle,
            coneOuterGain: outerGain
        });

    }

    initGain() {

        this.gain = new GainNode();

    }

    initReverb() {



    }

};