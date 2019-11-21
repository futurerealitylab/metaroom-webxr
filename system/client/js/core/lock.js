class Lock {
    constructor() {
        this.locked = false;
        this.owner = -1;

        //TODO: Is uid  the object id? Should we put a reference here to the actual
        //object. How do we want to do this?
        this.uid = -1;
       
    }
    // const response = {
    //   type: "lock",
    //   uid: 0,
    //   lockid: 0
    // };

    request() {
        const response = 
        {
            type: "lock",
            uid: this.uid,
            lockid: this.owner 
        };
        MR.syncClient.send(response);
        return true;
    }

    // const response = {
    //   type: "release",
    //   uid: 0,
    //   lockid: 0
    // };

    release() {
         const response = 
        {
            type: "release",
            uid: this.uid,
            lockid: this.owner 
        };
        MR.syncClient.send(response);
    }

    onLock() {
        this.locked = true;
    }
};