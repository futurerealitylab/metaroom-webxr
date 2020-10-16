'use strict';

export function init(MR) {
    MR.EventBus.subscribe("platform", (json) => {

    });

    MR.EventBus.subscribe("initialize", (json) => {

        if (!MR.avatars) {
            MR.avatars = {};
        }

        const id = json["id"];

        let headset = new Headset(CG.cylinder);
        let leftController = new Controller(CG.cube);
        let rightController = new Controller(CG.cube);
        let playerAvatar = new Avatar(headset, id, leftController, rightController);

        for (let key in json["avatars"]) {
            const avid = json["avatars"][key]["user"];
            let avatar = new Avatar(headset, avid, leftController, rightController);
            MR.avatars[avid] = avatar;
        }

        // MR.avatars[id] = playerAvatar;
        MR.playerid = id;
        console.log("player id is", id);
        console.log("MR.avatars");
        console.log(MR.avatars);
    });

    MR.EventBus.subscribe("join", (json) => {
        console.log(json);
        const id = json["id"];

        if (id in MR.avatars) {

        } else {
            let headset = new Headset(CG.cylinder);
            let leftController = new Controller(CG.cube);
            let rightController = new Controller(CG.cube);
            let avatar = new Avatar(headset, id, leftController, rightController);
            MR.avatars[id] = avatar;
        }
        console.log("join MR.avatars");
        console.log(MR.avatars);

        MR.updatePlayersMenu();
    });

    MR.EventBus.subscribe("leave", (json) => {
        console.log(json);
        delete MR.avatars[json["user"]];

        MR.updatePlayersMenu();
    });

    MR.EventBus.subscribe("tick", (json) => {
        // console.log("world tick: ", json);
    });

    MR.EventBus.subscribe("avatar", (json) => {
        //if (MR.VRIsActive()) {
        const payload = json["data"];
        //console.log(json);
        //console.log(payload);
        for (let key in payload) {
            //TODO: We should not be handling visible avatars like this.
            //TODO: This is just a temporary bandaid.
            if (payload[key]["user"] in MR.avatars && payload[key]["state"]["mode"] == MR.UserType.vr) {
                MR.avatars[payload[key]["user"]].headset.position = payload[key]["state"]["pos"];
                MR.avatars[payload[key]["user"]].headset.orientation = payload[key]["state"]["rot"];
                //console.log(payload[key]["state"]);
                MR.avatars[payload[key]["user"]].leftController.position = payload[key]["state"].controllers.left.pos;
                MR.avatars[payload[key]["user"]].leftController.orientation = payload[key]["state"].controllers.left.rot;
                MR.avatars[payload[key]["user"]].rightController.position = payload[key]["state"].controllers.right.pos;
                MR.avatars[payload[key]["user"]].rightController.orientation = payload[key]["state"].controllers.right.rot;
                MR.avatars[payload[key]["user"]].mode = payload[key]["state"]["mode"];
            } else {
                // never seen, create
                //ALEX: AVATARS WHO ARE ALSO IN BROWSER MODE GO HERE...
                //console.log("previously unseen user avatar");
                // let avatarCube = createCubeVertices();
                // MR.avatars[payload[key]["user"]] = new Avatar(avatarCube, payload[key]["user"]);
            }
        }
        //}
    });

    MR.EventBus.subscribe("webrtc", (json) => {
        //if (MR.VRIsActive()) {
        // const payload = json["data"];
        //console.log(json);
        // console.log(payload);
        // for (let key in payload) {
        //     //TODO: We should not be handling visible avatars like this.
        //     //TODO: This is just a temporary bandaid.
        //     if (payload[key]["user"] in MR.avatars) {
        //         MR.avatars[payload[key]["user"]].webrtc.position = payload[key]["state"]["pos"];
        //         MR.avatars[payload[key]["user"]].headset.orientation = payload[key]["state"]["rot"];
        //         MR.avatars[payload[key]["user"]].mode = payload[key]["state"]["mode"];
        //     } else {
        //         // never seen, create
        //         //ALEX: AVATARS WHO ARE ALSO IN BROWSER MODE GO HERE...
        //         //console.log("previously unseen user avatar");
        //         // let avatarCube = createCubeVertices();
        //         // MR.avatars[payload[key]["user"]] = new Avatar(avatarCube, payload[key]["user"]);
        //     }
        // }

        var signal = json["state"];
        console.log(signal);
        if (!signal.room)
            return;

        var MRVoip = MR.voip;

        var peerUuid = signal.uuid;

        // Ignore messages that are not for us or from ourselves
        if (peerUuid == MRVoip.localUuid || (signal.dest != MRVoip.localUuid && signal.dest != 'all' && signal.room != MRVoip.roomID)) return;

        if (signal.displayName && signal.dest == 'all' && signal.room == MRVoip.roomID) {
            // set up peer connection object for a newcomer peer
            console.log("set up peer connection object for a newcomer peer:" + peerUuid);
            MRVoip.setUpPeer(peerUuid, signal.displayName);
            MR.syncClient.send(
                {
                    type: "webrtc",
                    uid: MR.playerid,
                    state: {
                        uuid: MR.voip.localUuid,
                        room: MR.voip.roomID,
                        displayName: MR.playerid,
                        dest: peerUuid
                    }
                });
            // JSON.stringify({ 'MR_Message': "Broadcast_All", 'displayName': MRVoip.username, 'uuid': MRVoip.localUuid, 'dest': peerUuid, 'room': MRVoip.roomID }));

        } else if (signal.displayName && signal.dest == MRVoip.localUuid && signal.room == MRVoip.roomID) {
            // initiate call if we are the newcomer peer
            console.log("initiate call if we are the newcomer peer:" + peerUuid);
            MRVoip.setUpPeer(peerUuid, signal.displayName, true);

        } else if (signal.sdp) {
            if ("nego" in MRVoip.peerConnections[peerUuid]) {
                console.log("already setRemoteDescription in MRVoip.peerConnections[" + peerUuid + "]");
            } else {
                MRVoip.peerConnections[peerUuid].nego = true;
                MRVoip.peerConnections[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {                    
                    // Only create answers in response to offers
                    if (signal.sdp.type == 'offer') {
                        MRVoip.peerConnections[peerUuid].pc.createAnswer().then(description => MRVoip.createdDescription(MRVoip, description, peerUuid)).catch(MRVoip.errorHandler);
                    }
                }).catch(MRVoip.errorHandler);
            }

        } else if (signal.ice) {
            MRVoip.peerConnections[peerUuid].pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(MRVoip.errorHandler);
        }
        //}
    });

    /*
    // expected format of message
    const response = {
        "type": "lock",
        "uid": key,
        "success": boolean
    };

     */

    // TODO:
    // deal with logic and onlock
    MR.EventBus.subscribe("lock", (json) => {

        const success = json["success"];
        const key = json["uid"];

        if (success) {
            console.log("acquire lock success: ", key);
            MR.objs[key].lock.locked = true;
        } else {
            console.log("acquire lock failed : ", key);
        }

    });

    /*
    // expected format of message
    const response = {
            "type": "release",
            "uid": key,
            "success": boolean
    };

     */

    // TODO:
    // deal with logic and onlock
    MR.EventBus.subscribe("release", (json) => {

        const success = json["success"];
        const key = json["uid"];

        if (success) {
            console.log("release lock success: ", key);
        } else {
            console.log("release lock failed : ", key);
        }

    });

    /*
    //on success:

    const response = {
        "type": "object",
        "uid": key,
        "state": json,
        "lockid": lockid,
        "success": true
    };

    //on failure:

    const response = {
        "type": "object",
        "uid": key,
        "success": false
    };
    */

    // TODO:
    // update to MR.objs
    /*
    MR.EventBus.subscribe("object", (json) => {

        const success = json["success"];

        if (success) {
            console.log("object moved: ", json);
            // update MR.objs
        } else {
            console.log("failed object message", json);
        }

    });*/

    // TODO:
    // add to MR.objs
    MR.EventBus.subscribe("spawn", (json) => {

        const success = json["success"];

        if (success) {
            console.log("object created ", json);
            // add to MR.objs
        } else {
            console.log("failed spawn message", json);
        }

    });

    MR.EventBus.subscribe("object", (json) => {
        const success = json["success"];
        if (success) {
            console.log("object moved: ", json);
            // update update metadata for next frame's rendering
            let current = MR.objs[json["uid"]];
            console.log(json);
            current.position = [json["state"]["position"][0], json["state"]["position"][1], json["state"]["position"][2]];
            //current.orientation = MR.objs[json["state"]["orientation"]];
        }
        else {
            console.log("failed object message", json);
        }
    });

    // on success
    // const response = {
    //   "type": "calibrate",
    //   "x": ret.x,
    //   "z": ret.z,
    //   "theta": ret.theta,
    //   "success": true
    // };

    // on failure:
    //   const response = {
    //     "type": "calibrate",
    //     "success": false
    // };

    MR.EventBus.subscribe("calibration", (json) => {
        console.log("world tick: ", json);
    });
}
