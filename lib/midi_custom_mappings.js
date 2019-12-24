"use strict";

// custom handlers
export class KorgPadKONTROL {

    constructor() {
        // TODO(TR)

        this.ports = {
            inputs : {
                "padKONTROL MIDI IN" : 0,
                "padKONTROL PORT A"  : 1,
                "padKONTROL PORT B"  : 2,
            }
            outputs : {
                "padKONTROL MIDI OUT" : 0,
                "padKONTROL CTRL"     : 1
            }
        };

        this.inputHandlers = [
            null,
            null,
            null
        ];

        this.outputHandlers = [
            null,
            null
        ];
    }
}

export class YamahaP155 {

    constructor() {
        // TODO(TR)
    }
}

export class Generic {
    
    constructor() {
        // TODO(TR)
    }
}
