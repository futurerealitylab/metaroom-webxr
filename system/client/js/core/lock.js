class Lock {
    constructor() {
        this.locked = false;       
    }

    request(uid) {
        console.log("send lock");
        const response = 
        {
            type: "lock",
            uid: uid,
            lockid: MR.playerid 
        };

        MR.syncClient.send(response);
        return true;
    }

    release(uid) {
        const response = 
        {
            type: "release",
            uid: uid,
            lockid: MR.playerid 
        };

        MR.syncClient.send(response);
        return true;
    }

    onLock() {
        this.locked = true;
    }
};