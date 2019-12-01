// TODO:
// multiple subcriptions per event type
// handle scope with subscription
// return unsubscribe "token"
// make this a global, i.e. MR.EventBus
// convert every event bus in metaroom to use this
// potential priority levels to enforce ordering: [system | world | user]
// this + networking - linearizability...
// browser + node compatibility

class EventBus {
    constructor() {
        this.callbacks = {};
        this.currentId = 0;
    }

    uniqueId() {
        return this.currentId++;
    }

    unsubscribeAll() {
        this.callbacks = {};
    }

    unsubscribe(channel) {
        delete this.callbacks[channel];
    }

    subscribe(channel, callback) {
        if (channel in this.callbacks) {
            console.warn("event handler already exists for ", channel);
            return false;
        }

        this.callbacks[channel] = callback;

        return true;
    }

    // useful for one-time events,
    // removes the callback after only one use
    subscribeOneShot(channel, callback) {
        if (channel in this.callbacks) {
            console.warn("event handler already exists for ", channel);
            return false;
        }

        this.callbacks[channel] = (args) => {
            delete this.callbacks[channel];
            return callback(args);
        }

        return true;
    }

    publish(type, event) {
        // execute registered callback
        // if (!(type in this.callbacks)) {
        //     console.log("no handler registered for type [" + type + "]");
        //     return;
        // }
        if (type in this.callbacks) {
            this.callbacks[type](event);
        } else {
            console.warn("message of type %s is not supported yet", type);
        }
    }
};