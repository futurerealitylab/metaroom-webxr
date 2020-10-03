"use strict"

import { MR } from "./metaroom.js";

var peerConnectionConfig = {
    'iceServers': [
        { 'urls': 'stun:stun.stunprotocol.org:3478' },
        { 'urls': 'stun:stun.l.google.com:19302' },
    ]
};

export class VoIP_webrtc {
    constructor(wsClient, username, roomID) {
        if (username === undefined)
            username = "hehe";
        if (roomID === undefined)
            roomID = "chalktalk";
        if (wsClient === undefined)
            wsClient = MR.server.sock;

        this.serverConn = wsClient;
        this.username = username;
        this.roomID = roomID;
        this.localUuid = this.createUUID();
        this.localStream = null;
        this.peerConnections = [];
        this.constraints = { audio: true, };
        this.setUserMediaVariable();

        this.init();
    }

    init() {
        // set up local video stream
        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia(this.constraints)
                .then(stream => {
                    this.localStream = stream;
                    // document.getElementById('localVideo').srcObject = stream;
                }).catch(this.errorHandler)
                // set up [websocket] and message all existing clients
                .then(() => {
                    // TODO: integrate to eventbus or not
                    MR.server.sock.onmessage = this.gotMessageFromServer;
                    // this.serverConnection.onopen = event => {
                    MR.server.sock.send(JSON.stringify({ 'MR_Message': "Broadcast_All", 'displayName': this.username, 'uuid': this.localUuid, 'room': this.roomID, 'dest': 'all' }));
                    // }
                }).catch(this.errorHandler);

        } else {
            alert('Your browser does not support getUserMedia API');
        }
    }

    mute() {
        // or unmute
        var hasAudio = false;
        this.localStream.getTracks().forEach((t) => {
            if (t.kind === 'audio') {
                t.enabled = !t.enabled;
                hasAudio = t.enabled;
            }
        });
        return hasAudio;
    }

    gotMessageFromServer(message) {
        var signal = JSON.parse(message.data);
        if (!signal.room)
            return;

        var MRVoip = MR.voip;

        var peerUuid = signal.uuid;

        // Ignore messages that are not for us or from ourselves
        if (peerUuid == MRVoip.localUuid || (signal.dest != MRVoip.localUuid && signal.dest != 'all' && signal.room != MRVoip.roomID)) return;

        if (signal.displayName && signal.dest == 'all' && signal.room == MRVoip.roomID) {
            // set up peer connection object for a newcomer peer
            MRVoip.setUpPeer(peerUuid, signal.displayName);
            MR.server.sock.send(JSON.stringify({ 'MR_Message': "Broadcast_All", 'displayName': MRVoip.username, 'uuid': MRVoip.localUuid, 'dest': peerUuid, 'room': MRVoip.roomID }));

        } else if (signal.displayName && signal.dest == MRVoip.localUuid && signal.room == MRVoip.roomID) {
            // initiate call if we are the newcomer peer
            MRVoip.setUpPeer(peerUuid, signal.displayName, true);

        } else if (signal.sdp) {
            MRVoip.peerConnections[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
                // Only create answers in response to offers
                if (signal.sdp.type == 'offer') {
                    MRVoip.peerConnections[peerUuid].pc.createAnswer().then(description => MRVoip.createdDescription(MRVoip, description, peerUuid)).catch(MRVoip.errorHandler);
                }
            }).catch(MRVoip.errorHandler);

        } else if (signal.ice) {
            MRVoip.peerConnections[peerUuid].pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(MRVoip.errorHandler);
        }
    }

    setUpPeer(peerUuid, displayName, initCall = false) {
        this.peerConnections[peerUuid] = { 'displayName': displayName, 'pc': new RTCPeerConnection(peerConnectionConfig) };
        this.peerConnections[peerUuid].pc.onicecandidate = event => this.gotIceCandidate(this, event, peerUuid);
        this.peerConnections[peerUuid].pc.ontrack = event => this.gotRemoteStream(event, peerUuid);
        this.peerConnections[peerUuid].pc.oniceconnectionstatechange = event => this.checkPeerDisconnect(this, event, peerUuid);
        this.peerConnections[peerUuid].pc.addStream(this.localStream);

        if (initCall) {
            this.peerConnections[peerUuid].pc.createOffer().then(description => this.createdDescription(this, description, peerUuid)).catch(this.errorHandler);
        }
    }

    gotIceCandidate(that, event, peerUuid) {
        if (event.candidate != null) {
            MR.server.sock.send(JSON.stringify({ 'MR_Message': "Broadcast_All", 'ice': event.candidate, 'uuid': this.localUuid, 'dest': peerUuid, 'room': this.roomID }));
        }
    }

    createdDescription(that, description, peerUuid) {
        console.log(`got description, peer ${peerUuid}`);
        that.peerConnections[peerUuid].pc.setLocalDescription(description).then(function () {
            MR.server.sock.send(JSON.stringify({
                'MR_Message': "Broadcast_All", 'sdp': that.peerConnections[peerUuid].pc.localDescription,
                'uuid': that.localUuid, 'dest': peerUuid, 'room': that.roomID
            }));
        }).catch(that.errorHandler);
    }

    gotRemoteStream(event, peerUuid) {
        console.log(`got remote stream, peer ${peerUuid}`);
        //assign stream to new HTML video element
        var vidElement = document.createElement('video');
        vidElement.setAttribute('autoplay', '');
        vidElement.setAttribute('muted', '');
        vidElement.srcObject = event.streams[0];

        var vidContainer = document.createElement('div');
        vidContainer.setAttribute('id', 'remoteVideo_' + peerUuid);
        vidContainer.appendChild(vidElement);
        // vidContainer.appendChild(makeLabel(peerConnections[peerUuid].displayName));
        var videosElement = document.getElementById('videos');
        if (videosElement == null) {
            videosElement = document.createElement('div');
            videosElement.setAttribute("id", "videos");
            document.body.appendChild(videosElement);
        }

        document.getElementById('videos').appendChild(vidContainer);
    }

    checkPeerDisconnect(that, event, peerUuid) {
        var state = that.peerConnections[peerUuid].pc.iceConnectionState;
        console.log(`connection with peer ${peerUuid} ${state}`);
        if (state === "failed" || state === "closed" || state === "disconnected") {
            delete that.peerConnections[peerUuid];
            document.getElementById('videos').removeChild(document.getElementById('remoteVideo_' + peerUuid));
            //   updateLayout();
        }
    }

    errorHandler(error) {
        console.log(error);
    }
    // Taken from http://stackoverflow.com/a/105074/515584
    // Strictly speaking, it's not a real UUID, but it gets the job done here
    createUUID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    /**
     * Initializes navigator.mediaDevices.getUserMedia
     * depending on the browser capabilities
     */
    setUserMediaVariable() {
        if (navigator.mediaDevices === undefined) {
            navigator.mediaDevices = {};
        }

        if (navigator.mediaDevices.getUserMedia === undefined) {
            navigator.mediaDevices.getUserMedia = function (constraints) {

                // gets the alternative old getUserMedia is possible
                var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

                // set an error message if browser doesn't support getUserMedia
                if (!getUserMedia) {
                    return Promise.reject(new Error("Unfortunately, your browser does not support access to the webcam through the getUserMedia API. Try to use the latest version of Google Chrome, Mozilla Firefox, Opera, or Microsoft Edge instead."));
                }

                // uses navigator.getUserMedia for older browsers
                return new Promise(function (resolve, reject) {
                    getUserMedia.call(navigator, constraints, resolve, reject);
                });
            }
        }
    }

}

window.mute = function () {
    return MR.voip.mute();
}

MR.voip = new VoIP_webrtc(MR.server.sock);