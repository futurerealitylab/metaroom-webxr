"use strict";

let isEnabled = true;
export function enable() {
    isEnabled = true;
}
export function disable() {
    isEnabled = false;
}

export function toggle() {
    isEnabled = !isEnabled;
}

function noFuncErr() { 
    throw new Error("This function no longer exists! Need to refactor"); 
}

function noPropErr() { 
    throw new Error("This property no longer exists! Need to refactor"); 
}

function makeTypeError(procName, argName) {
    return new TypeError(
        "Failed to execute [" + procName + "] : missing required arg"
    );
}

// only use this during initialization, not for validation during program execution
export function guardArgs(callerName, ...args) {
    args.forEach(arg => { 
        if (!arg) { 
            throw makeTypeError(callerName, arg); 
        }
    });
}

export const FAILFAST = "failfast";
export const ERROR = FAILFAST;
export const WARNING  = "warning";

// call in-line when the function still exists, but there are plans to remove it,
// proceed to execute the to-be-removed function
export function functionToBeRemoved(originalName, substituteName, opts = {}) {
    if (!isEnabled) {
        return;
    }

    const urgency = (opts.urgency       != undefined) ? opts.urgency : FAILFAST;
    const makeObnoxious  = (opts.makeObnoxious != undefined) ? opts.makeObnoxious : true;
    const reason = (opts.reason) ? ("\nreason=[ " + opts.reason + " ]\n") : "";

    const stackTrace = new Error().stack;
    if (makeObnoxious) {
        if (substituteName) {
            prompt("function=[ " + originalName + " ] is deprecated. " + reason + "Please use function=[ " + substituteName + " ], trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
        } else {
            prompt("function=[ " + originalName + " ] is deprecated. " + reason + "trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
        }
    }

    if (urgency == FAILFAST) {
        if (substituteName) {
            if (opts.onError) {
                opts.onError();
            }
            throw new Error("function=[ " + originalName + " ] is deprecated. " + reason + "Please use function=[ " + substituteName + " ], trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
        } else {
            if (opts.onError) {
                opts.onError();
            }
            throw new Error("function=[ " + originalName + " ] is deprecated. " + reason + "trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
        }
    } else {
        if (substituteName) {
            console.warn("function=[", originalName, "] is deprecated. " + reason + "Please use function=[", substituteName, "], trace=[", stackTrace, "]", "\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");
        } else {
            console.warn("function=[", originalName, "] is deprecated. " + reason + "trace=[", stackTrace, "]", "\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");
        }
    }
}

// call in-line when the method still exists, but there are plans to remove it,
// proceed to execute the to-be-removed method
export function methodToBeRemoved(originalName, substituteName, opts = {}) {
    if (!isEnabled) {
        return;
    }

    const urgency = (opts.urgency       != undefined) ? opts.urgency : FAILFAST;
    const makeObnoxious  = (opts.makeObnoxious != undefined) ? opts.makeObnoxious  : true;
    const reason = (opts.reason) ? ("\nreason=[ " + opts.reason + " ]\n") : "";

    const stackTrace = new Error().stack;
    if (makeObnoxious) {
        if (substituteName) {
            prompt("method=[ " + originalName + " ] is deprecated. " + reason + "Please use function=[ " + substituteName + " ], trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
        } else {
            prompt("method=[ " + originalName + " ] is deprecated. " + reason + "trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
        }
    }

    if (urgency == FAILFAST) {
        if (substituteName) {
            if (opts.onError) {
                opts.onError();
            }            
            throw new Error("method=[ " + originalName + " ] is deprecated. " + reason + "Please use function=[ " + substituteName + " ], trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
        } else {
            if (opts.onError) {
                opts.onError();
            }
            throw new Error("method=[ " + originalName + " ] is deprecated. " + reason + "trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
        }
    } else {
        if (substituteName) {
            console.warn("method=[", originalName, "] is deprecated. " + reason + "Please use function=[", substituteName, "], trace=[", stackTrace, "]", "\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");
        } else {
            console.warn("method=[", originalName, "] is deprecated. " + reason + "trace=[", stackTrace, "]", "\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");
        }
    } 
}

/////////////////////////////////////////////////////

// call globally to mark a function completely removed,
// optionally provide a redirect to an existing method you'd like
// the user to call instead, if the option is available in your program,
// otherwise fail
export function functionUndefined(parentScope, originalName, substituteName, opts = {}) {
    if (!isEnabled) {
        return;
    }
    guardArgs(this.name, parentScope, originalName);

    if (parentScope == window) {
        throw new TypeError("parentScope cannot be [window] for our sanity");
    }

    const urgency = (opts.urgency       != undefined) ? opts.urgency : 
                           ((parentScope[substituteName] != undefined) ? WARNING : FAILFAST);

    const makeObnoxious  = (opts.makeObnoxious != undefined) ? opts.makeObnoxious  : true;
    const substitute     = parentScope[substituteName] || noFuncErr;
    const reason = (opts.reason) ? ("\nreason=[ " + opts.reason + " ]\n") : "";

    function handler() {
        const stackTrace = new Error().stack;
        if (makeObnoxious) {
            if (substituteName) {
                prompt("function=[ " + originalName + " ] is deprecated. " + reason + "Please use function=[ " + substituteName + " ], trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
            } else {
                prompt("function=[ " + originalName + " ] is deprecated. " + reason + "trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
            }
        }

        if (urgency == FAILFAST) {
            if (substituteName) {
                if (opts.onError) {
                    opts.onError();
                }                
                throw new Error("function=[ " + originalName + " ] is deprecated. " + reason + "Please use function=[ " + substituteName + " ], trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
            } else {
                if (opts.onError) {
                    opts.onError();
                }
                throw new Error("function=[ " + originalName + " ] is deprecated. " + reason + "trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
            }
        } else {
            if (substituteName) {
                console.warn("function=[", originalName, "] is deprecated. " + reason + "Please use function=[", substituteName, "], trace=[", stackTrace, "]", "\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");
            } else {
                console.warn("function=[", originalName, "] is deprecated. " + reason + "trace=[", stackTrace, "]", "\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");
            }
        }        
    }
        
    parentScope[originalName] = (...args) => { 
        handler(); 
        parentScope[substituteName](...args); 
    };
}



// call globally (after a type has been defined) to mark a method completely removed,
// optionally provide a redirect to an existing method you'd like
// the user to call instead, if the option is available in your program,
// otherwise fail
export function methodUndefined(parentObj, originalName, substituteName, opts = {}) {
    if (!isEnabled) {
        return;
    }
    guardArgs(this.name, parentObj, originalName);

    if (parentObj == window) {
        throw new TypeError("parentObj cannot be [window] for our sanity");
    }

    const proto = Object.getPrototypeOf(parentObj);


    const urgency = (opts.urgency       != undefined) ? opts.urgency : 
                           ((proto[substituteName] != undefined) ? WARNING : FAILFAST);

    const makeObnoxious  = (opts.makeObnoxious != undefined) ? opts.makeObnoxious  : true;
    const reason = (opts.reason) ? ("\nreason=[ " + opts.reason + " ]\n") : "";

    const typename = (parentObj.constructor) ? (parentObj.constructor.name + ".") : "";
    
    function handler() {
        const stackTrace = new Error().stack;
        if (makeObnoxious) {
            if (substituteName) {
                prompt("method=[ " + typename + originalName + " ] is deprecated. " + reason + "Please use function=[ " + substituteName + " ], trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
            } else {
                prompt("method=[ " + typename + originalName + " ] is deprecated. " + reason + "trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
            }
        }

        if (urgency == FAILFAST) {
            if (substituteName) {
                if (opts.onError) {
                    opts.onError();
                }                
                throw new Error("method=[ " + typename + originalName + " ] is deprecated. " + reason + "Please use function=[ " + substituteName + " ], trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
            } else {
                if (opts.onError) {
                    opts.onError();
                }
                throw new Error("method=[ " + typename + originalName + " ] is deprecated. " + reason + "trace=[ " + stackTrace + " ], \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
            }
        } else {
            if (substituteName) {
                console.warn("method=[ " + typename + originalName + " ] is deprecated. " + reason + "Please use function=[", substituteName, "], trace=[", stackTrace, "]", "\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");
            } else {
                console.warn("method=[ " + typename + originalName + " ] is deprecated. " + reason + "trace=[", stackTrace, "]", "\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");
            }
        }        
    }

        
    proto[originalName] = (...args) => { 
        handler(); 
        parentObj[substituteName](...args); 
    }; 
}

// call in the parent object's constructor to mark an already-removed or changed
// property as deprecated, optionally redirect to a new property temporarily
// if a substitute exists
export function propertyUndefined(parentObj, originalName, substituteName, opts = {}) {
    if (!isEnabled) {
        return;
    }
    guardArgs(this.name, parentObj, originalName);

    if (parentObj == window) {
        throw new TypeError("parentObj cannot be [window] for our sanity");
    }

    const urgency = (opts.urgency != undefined) ? opts.urgency : 
       (
            (opts.substituteGetter != undefined && opts.substituteSetter != undefined) ? 
            WARNING : FAILFAST
       );

    const makeObnoxious  = (opts.makeObnoxious != undefined)  ? opts.makeObnoxious  : true;
    const substituteGetter = opts.substituteGetter || noPropErr;
    const substituteSetter = opts.substituteSetter || noPropErr;
    const reason = (opts.reason) ? ("\nreason=[ " + opts.reason + " ]\n") : "";

    function handler() { 
        const stackTrace = new Error().stack;

        if (makeObnoxious) {
            if (substituteName) {
                prompt("property=[ " + originalName + " ] is deprecated. " + reason + "Please use property=[ " + substituteName + " ], trace=[ " + stackTrace + " ] \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
            } else {
                prompt("property=[ " + originalName + " ] is deprecated. " + reason + "trace=[ " + stackTrace + " ] \n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()", stackTrace);
            }
        }

        if (urgency == FAILFAST) {
            if (substituteName) {
                if (opts.onError) {
                    opts.onError();
                }
                throw new Error("property=[ " + originalName + " ] is deprecated. " + reason + "Please use property=[ " + substituteName + " ]\n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");    
            } else {
                if (opts.onError) {
                    opts.onError();
                }                
                throw new Error("property=[ " + originalName + " ] is deprecated. " + reason + "\n\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");                    
            }
        } else {
            if (substituteName) {
                console.warn("property=[", originalName, "] is deprecated. " + reason + "lease use property=[", substituteName, "], trace=[", stackTrace, "]", "\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");
            } else {
                console.warn("property=[", originalName, "] is deprecated. " + reason + "trace=[", stackTrace, "]", "\nDisable these messages by importing the deprecate.js module and calling deprecateModule.disable()");
            }
        } 
    }

    // don't use getters or setters for final non-deprecated
    //
    // code, I am using callbacks here because it's possible 
    // to see a property turned into a method or function call
    Object.defineProperty(parentObj, originalName, {
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

export function runExamples(deprecate) {
    {
        function sub() {
            console.log("substitute");
        }

        function original() {
            deprecate.functionToBeRemoved("original", "sub", {
                urgency       : deprecate.WARNING,
                makeObnoxious : true,
                reason        : "The universe depends on it." 
            });
        };

        original();
    }
    {
        function sub() {
            console.log("substitute");
        }

        function original() {
            deprecate.functionToBeRemoved("original", "sub", {
                urgency       : deprecate.WARNING,
                makeObnoxious : true,
                reason        : "It's one of those days."
            });
        };

        original();
    }

    {
        const wee = {

        sub : function(a, b, c) {
            console.log(
                "substitute:", 
                a * 2, b * 2, c * 2
            );
        }
        }

        deprecate.functionUndefined(wee, "original", "sub", {
            makeObnoxious : true,
            urgency : deprecate.WARNING,
            reason  : "The only constant is change."
        });

        wee.original(1, 2, 3);
    }

    {
        class Deputy {
            constructor(a, b, c) {
                this.a = a;
                this.b = b;
                this.c = c;

                console.log(this);
                deprecate.methodUndefined(this, "original", "sub", {
                    makeObnoxious : true,
                    urgency : deprecate.WARNING,
                    reason  : "Power lust."
                });           
            }

            sub(a, b, c) {
                console.log(
                    "substitute:", 
                    this.a * a, this.b * b, this.c * c
                );
            }
        }

        let d = new Deputy(1, 2, 3);
        d.original(1, 2, 3);
    }

    {
        class Deputy {
            constructor() {        
            }

            static sub(a, b, c) {
                console.log("substitute:", 
                    a * a, b * b, c * c
                );
            }
        }

        deprecate.functionUndefined(Deputy, "original", "sub", {
            makeObnoxious : true,
            urgency : deprecate.WARNING,
            reason  : "Static electricity did it."
        });   

        Deputy.original(1, 2, 3);
    }

    try {
        class Deputy {
            constructor(a, b, c) {
                this.a = a;
                this.b = b;
                this.c = c;
                this.newD = 18;

                deprecate.propertyUndefined(this, "d", "newD", {
                    makeObnoxious : true,
                    substituteGetter : () => {
                        return this.newD;
                    },
                    substituteSetter : (value) => {
                        this.newD = value;
                    },
                    reason : "None needed.",
                    urgency : deprecate.ERROR
                });           
            }

            sub(a, b, c) {
                console.log(
                    "substitute:", 
                    this.a * a, this.b * b, this.c * c
                );
            }
        }

        let d = new Deputy(1, 2, 3);

        d.d = 5;
    } catch (err) {
        console.error(err.message);
    }  
}


////// Development helper, do not enable for release!



class Dev {
    static init(args) {
        Dev.enabled = args.preventUndefined || false;
    }
    static enable() {
        Dev.enabled = true;
    }
    static disable() {
        Dev.enabled = false;
    }

    // Proxy object wrappers introduce
    // a lot of overhead -- only use
    // when debugging!
    static preventUndefined(obj) {
        if (!Dev.enabled) {
            return;
        }

        const handler = {
            get(target, property) {
                if (property in target) {
                    return target[property];
                }

                throw new TypeError(`Property '${property}' is not defined`);
            },
            set(target, property, value) {
                if (property in target) {
                    target[property] = value;
                }

                throw new TypeError(`Property '${property}' is not defined`);
            },
        };

        return new Proxy(obj, handler);    
    }
}

// e.g.
// Dev.init();

// class Wee {
//     constructor(a, b, c) {
//         this.a = a;
//         this.b = b;
//         this.c = c;

//         return Dev.preventUndefined(this);
//     }

//     sum() {
//         return this.a + this.b + this.c;
//     }
// }
// let w = new Wee(1, 2, 3);
// w.undefinedField = 6; // ERROR


