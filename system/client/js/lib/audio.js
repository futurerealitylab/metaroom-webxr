class SpatialAudioContext {

    constructor(files) {

        try {
            // it appears chrome supports up to 6 audio contexts per tab, so we either need to limit contexts created, or swap buffers and change positions
            // TODO: check how many contexts are already open
            const ctx = window.AudioContext || window.webkitAudioContext;
            this.context = new ctx({
                                latencyHint: 'interactive',
                                sampleRate: 44100,
                               });
        } catch(e) {
            alert('Web Audio API is not supported in this browser');
        }

        // store loaded buffers here
        this.cache = {};

        this.reverbCache = {};
        // keep track of listener objects associated with the files
        // this.listeners = {};
        this.listener = this.context.listener;

        files.forEach((f) => {
            this.loadFile(f);
        });

        this.initGain();
        this.initReverb('assets/audio/IRsample.wav');
        this.initPanner();
        this.pausedAt = 0;
        this.startedAt = 0;
        this.playing = false;

    };

    isPlaying() { return this.playing; };

    getDuration(url) {
        return this.cache[url].duration;
    };

    resume() {
        this.playing = true;
        return this.context.resume();
    };

    playFileAt(url, sound_position, head_position, head_orientation, offset = 0.0, time = 0.0) {

        let listener = this.context.listener;

        listener.setOrientation(head_orientation.x, head_orientation.y, head_orientation.z , 0, 1, 0);

        listener.positionX.value = head_position.x;
        listener.positionY.value = head_position.y;
        listener.positionZ.value = head_position.z;

        const source = this.context.createBufferSource();
        source.buffer = this.cache[url];

        this.panner.setPosition(sound_position.x, sound_position.y, sound_position.z);

        source
            .connect(this.panner)
            // .connect(this.reverbNode)
            // .connect()
            .connect(this.gainNode)
            .connect(this.context.destination);

        source.start(this.context.currentTime + time, offset);

    };

    stop(url) {
        this.cache[url].stop();
        this.playing = false;
    };

    pause(url) {
        // TODO: track 
    };

    async loadFile(url) {

        console.log("fetching...", url);

        const response = await axios.get(url, {
            responseType: 'arraybuffer', // <- important param
        });

        console.log("decoding...", url);
        const audioBuffer = await this.context.decodeAudioData(response.data);
        this.cache[url] = audioBuffer;

    };

    unloadFile(url) {
        delete this.cache[url];
    };

    async loadReverbFile(url) {

        console.log("fetching...", url);

        const response = await axios.get(url, {
            responseType: 'arraybuffer', // <- important param
        });

        console.log("decoding...", url);
        const audioBuffer = await this.context.decodeAudioData(response.data);
        this.reverbCache[url] = this.context.createBufferSource();
        this.reverbCache[url].buffer = audioBuffer;

    };

    unloadReverbFile(url) {
        delete this.reverbCache[url];
    };

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

    };

    initGain() {
        this.gainNode = this.context.createGain();
    };

    setGain(level) {
        this.gainNode.gain.value = level;
    };

    initReverb(url) {
        this.loadReverbFile(url);

        this.reverbNode = this.context.createConvolver();
        this.reverbNode.buffer = this.reverbCache[url];
    };

    setImpulseResponse(url) {
        if (!(url in this.reverbCache)) {
            console.log("invalid url, not currently loaded");
        }

        this.reverbNode.buffer = this.reverbCache[url];
    };

};