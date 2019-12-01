class EventBus {
    constructor() {
        this.callbacks = {};
    }

    clearEventHandlers() {
        this.callbacks = {};
    }

    clearEventHandler(eventName) {
        delete this.callbacks[eventName];
    }

    registerEventHandler(eventName, callback) {
        if (eventName in this.callbacks) {
            console.warn("event handler already exists for ", eventName);
            return false;
        }

        this.callbacks[eventName] = callback;
        return true;
    }

    // useful for one-time events,
    // removes the callback after only one use
    registerEventHandlerOneShot(eventName, callback) {
        if (eventName in this.callbacks) {
            console.warn("event handler already exists for ", eventName);
            return false;
        }

        this.callbacks[eventName] = (args) => {
            delete this.callbacks[eventName];
            return callback(args);
        }

        return true;
    }

    fire(event) {
        // execute registered callback
        // if (!(event["type"] in this.callbacks)) {
        //     console.log("no handler registered for type [" + event["type"] + "]");
        //     return;
        // }
        if (event["type"] in this.callbacks) {
            this.callbacks[event["type"]](event);
        } else {
            console.warn("message of type %s is not supported yet", event["type"]);
        }
    }
};