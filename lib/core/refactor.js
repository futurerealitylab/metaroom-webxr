"use strict";

let isEnabled = true;
export function enableDeprecationMessages() {
    isEnabled = true;
}
export function disableDeprecationMessages() {
    isEnabled = false;
}

// Example:
//refactor.disableDeprecationMessages();

// class Wee {
//     constructor() {
//         // removed property
//         //this.oldProp = "oldProp";
//     }
//     old() {
//         // originalName   : name of the deprecated function 
//         // substituteName : name of the replacement function 
//         // opts           : optional args, shouldFailFast = true, makeObnoxious = true
//         refactor.deprecateThisFunction(
//             this.old.name,
//             this.new.name
//         );
//         console.log("old");
//     }
//     new() {
//         console.log("new");
//     }
// }
// const wee = new Wee();
// refactor.setPropDeprecated(wee, "oldProp", "newProp");
// wee.oldProp = "new prop"; // error / message
// wee.old()                 // error / message

// originalName   : name of the deprecated function 
// substituteName : name of the replacement function 
// opts           : optional args, shouldFailFast = true, makeObnoxious = true
export function deprecateThisFunction(originalName, substituteName, opts = {}) {
    if (!isEnabled) {
        return;
    }

    const shouldFailFast = (opts.shouldFailFast != undefined) ? opts.shouldFailFast : true;
    const makeObnoxious  = (opts.makeObnoxious != undefined)  ? opts.makeObnoxious  : true;

    const stackTrace = new Error().stack;
    if (makeObnoxious) {
        prompt("function=[ " + originalName + " ] is deprecated. Please use function=[ " + substituteName + " ], trace=[ " + stackTrace + " ], \nDisable these messages by importing the refactor.js module and calling refactorModule.disableDeprecationMessages()", stackTrace);
    }
    if (shouldFailFast) {
        throw new Error("function=[ " + originalName + " ] is deprecated. Please use function=[ " + substituteName + " ]\nDisable these messages by importing the refactor.js module and calling refactorModule.disableDeprecationMessages()");
    } else {
        console.warn("function=[", originalName, "] is deprecated. Please use function=[", substituteName, "], trace=[", stackTrace, "]", "Disable these messages by importing the refactor.js module and calling refactorModule.disableDeprecationMessages()");
    }
}

function noPropErr() { 
    throw new Error("This property no longer exists! Need to refactor"); 
};

export function setPropDeprecated(
    parentObj, propName, substitutePropName, opts = {}
) {

    if (!isEnabled) {
        return;
    }

    const shouldFailFast = (opts.shouldFailFast != undefined) ? opts.shouldFailFast : true;
    const makeObnoxious  = (opts.makeObnoxious != undefined)  ? opts.makeObnoxious  : true;
    const substituteGetter = opts.substituteGetter || noPropErr;
    const substituteSetter = opts.substituteSetter || noPropErr;

    function handler() { 

        const stackTrace = new Error().stack;

        if (makeObnoxious) {
            prompt("property=[ " + propName + " ] is deprecated. Please use property=[ " + substitutePropName + " ], trace=[ " + stackTrace + " ] \nDisable these messages by importing the refactor.js module and calling refactorModule.disableDeprecationMessages()", stackTrace);
        }

        if (shouldFailFast) {
            throw new Error("property=[ " + propName + " ] is deprecated. Please use property=[ " + substitutePropName + " ]\nDisable these messages by importing the refactor.js module and calling refactorModule.disableDeprecationMessages()");    
        } else {
            console.warn("property=[", propName, "] is deprecated. Please use property=[", substitutePropName, "], trace=[", stackTrace, "]", "Disable these messages by importing the refactor.js module and calling refactorModule.disableDeprecationMessages()");
        } 
    }

    Object.defineProperty(parentObj, propName, {
        get : function() {
            handler();
            return substituteGetter();
        },
        set : function(val) {
            handler();
            substituteSetter(val);
        }
    });
}
