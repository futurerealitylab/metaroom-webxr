"use strict"

export class MIDIInterface {
    static InitState = {
        off     : 0,
        waiting : 1,
        ready   : 2
    };
    static initState = MIDIInterface.InitState.off;
    
    static access = {};

    static onStateChangeProc  = null;
    static onInitProc         = null;
    static eventQueue         = null;
    static interactEventQueue = null;


    static inputs() {
        return MIDIInterface.access.inputs;
    }
    static outputs() {
        return MIDIInterface.access.outputs;
    }
    static setInputHandler(input, proc) {
        output.onmidimessage = proc;
    }
    static setInputHandler(output, proc) {
        input.onmidimessage = proc;
    }

    static isInit() {
        return MIDIInterface.initState == 
               MIDIInterface.InitState.ready;
    }

    static init(args) {
        if (MIDIInterface.initState != 
            MIDIInterface.InitState.off) {
            return;
        }

        if (!navigator.requestMIDIAccess) {
            console.warn("MIDI unsupported");
            return null;
        }
        MIDIInterface.initState = MIDIInterface.InitState.waiting;

        MIDIInterface.onInitProc = args.onInitProc;

        MIDIInterface.eventQueue = new Queue();

        MIDIInterface.onStateChange = args.onStateChangeProc;

        return navigator.requestMIDIAccess().then((midiAccess) => {
            MIDIInterface.access  = midiAccess;

            if (MIDIInterface.onInitProc) {
                MIDIInterface.onInitProc();
            }

            MIDIInterface.access.onstatechange = (e) => {
                console.log("MIDI state change", 
                    e.port.name,
                    e.port.manufacturer,
                    e.port.state,
                );

                MIDIInterface.eventQueue.enqueue(e);

                if (MIDIInterface.onStateChangeProc) {
                    MIDIInterface.onStateChangeProc(e);
                }
            }

            MIDIInterface.initState = MIDIInterface.InitState.ready;
        },
        (err) => {
            console.error("MIDI inaccessible", err);
            MIDIInterface.initState = MIDIInterface.InitState.off;
        });

    }
}

