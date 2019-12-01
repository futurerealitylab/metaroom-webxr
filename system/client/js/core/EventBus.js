// TODO:
// multiple subcriptions per event type
// handle scope with subscription
// make this a global, i.e. MR.EventBus
// potential priority levels to enforce ordering: [system | world | user]
// this + networking - linearizability...

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

    unsubscribe(eventName) {
        delete this.callbacks[eventName];
    }

    subscribe(eventName, callback) {
        if (eventName in this.callbacks) {
            console.warn("event handler already exists for ", eventName);
            return false;
        }

        this.callbacks[eventName] = callback;

        return true;
    }

    // useful for one-time events,
    // removes the callback after only one use
    subscribeOneShot(eventName, callback) {
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