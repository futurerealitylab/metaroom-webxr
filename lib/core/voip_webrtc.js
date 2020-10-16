"use strict"

import { MR } from "./metaroom.js";
import { SpatialAudioContext } from "/lib/media/audio.js";
//    this.audioContext1 = new SpatialAudioContext(['assets/audio/blop.wav']);
// this.audioContext1.updateListener(input.HS.position(), input.HS.orientation());
// this.audioContext1.playFileAt('assets/audio/blop.wav', input.LC.position());

var peerConnectionConfig = {
    'iceServers': [
        { 'urls': 'stun:stun.stunprotocol.org:3478' },
        { 'urls': 'stun:stun.l.google.com:19302' },
    ]
};

var biquadFilter;

export class VoIP_webrtc {
    constructor(wsClient, username, roomID) {
        if (username === undefined)
            username = "hehe";
        if (roomID === undefined)
            roomID = "chalktalk"; // todo use the world name
        if (wsClient === undefined)
            wsClient = MR.syncClient;

        this.serverConn = wsClient;
        this.username = username;
        this.roomID = roomID;
        this.localUuid = this.createUUID();
        this.localStream = null;
        this.peerConnections = [];
        this.constraints = { audio: true, };
        this.audio = document.getElementById("local_webrtc");

        this.setUserMediaVariable();

        this.init();
    }

    checkSyncClientReady(that) {
        if (MR.syncClient && MR.syncClient.ws && MR.syncClient.ws.readyState == 1) {
            console.log("sync client ready");
            MR.syncClient.send(
                {
                    type: "webrtc",
                    uid: MR.playerid,
                    state: {
                        uuid: that.localUuid,
                        room: that.roomID,
                        displayName: MR.playerid,
                        dest: 'all'
                    }
                });
                // clearTimeout(that.checkSyncClientReady(that));
        } else {
            console.log("sync client not ready");
            setTimeout(that.checkSyncClientReady(that), 5000);
        }
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
                    // MR.syncClient.onmessage = this.gotMessageFromServer;
                    // this.serverConnection.onopen = event => {
                    this.checkSyncClientReady(this);
                }).catch(this.errorHandler);

        } else {
            alert('Your browser does not support getUserMedia API');
        }
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = null;
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

    initAudio(that, peerUuid) {
        if (that.peerConnections[peerUuid].audioContext != null){
            console.log("avatar[" + that.peerConnections[peerUuid].displayName + "] already setup");
            return true;
        }
            

        if (!(that.peerConnections[peerUuid].displayName in MR.avatars)) {
            console.log("avatar[" + that.peerConnections[peerUuid].displayName + "] is not ready yet");
            console.log(MR.avatars);
            
            setTimeout(that.initAudio(that, peerUuid), 1000);
            return false;            
        }

        console.log("avatar[" + that.peerConnections[peerUuid].displayName + "] now setting up");

        that.peerConnections[peerUuid].audioContext = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 44100,
        });

        var pos = MR.avatars[that.peerConnections[peerUuid].displayName].headset.position;
        that.peerConnections[peerUuid].audioContext.listener.setPosition(pos[0], pos[1], pos[2]
        );
        // 0.1, 0, 0);
        // that.audioContext.listener.orientationY(0);
        // that.audioContext.listener.orientationZ(-1);
        that.peerConnections[peerUuid].panner = new PannerNode(that.peerConnections[peerUuid].audioContext, {
            // equalpower or HRTF
            panningModel: 'HRTF',
            // linear, inverse, exponential
            distanceModel: 'exponential',
            positionX: 0.0,
            positionY: 0.1,
            positionZ: 0.0,
            orientationX: 1.0,
            orientationY: 0.0,
            orientationZ: 0.0,
            refDistance: .1,
            maxDistance: 10000,
            rolloffFactor: 1.5,
            coneInnerAngle: 360,
            coneOuterAngle: 360,
            coneOuterGain: 0.2
        });
        return true;
    }

    updateListener(that, position, orientation) {
        // udpate self listener
        that.peerConnections[peerUuid].audioContext.listener.setPosition(
            MR.avatars[that.peerConnections[peerUuid].displayName].headset.position);
        var headOrientation = MR.avatars[that.peerConnections[peerUuid].displayName].headset.orientation;
        console.log("update listener", headOrientation);
        that.peerConnections[peerUuid].audioContext.listener.setOrientation(
            headOrientation[0], headOrientation[1], headOrientation[2], 0, 1, 0);
        // that.audioContext.listener.setPosition(position[0], position[1], position[2]);
        // that.audioContext.listener.setOrientation(orientation[0], orientation[1], orientation[2],            0, 1, 0);
    }

    gotMessageFromServer(message) {
        var signal = JSON.parse(message.data.state);
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
            MR.server.sock.send(JSON.stringify({ 'MR_Message': "Broadcast_All", 'displayName': MRVoip.username, 'uuid': MRVoip.localUuid, 'dest': peerUuid, 'room': MRVoip.roomID }));

        } else if (signal.displayName && signal.dest == MRVoip.localUuid && signal.room == MRVoip.roomID) {
            // initiate call if we are the newcomer peer
            console.log("initiate call if we are the newcomer peer:" + peerUuid);
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
        this.peerConnections[peerUuid].pc.ontrack = event => this.gotRemoteStream(this, event, peerUuid);
        this.peerConnections[peerUuid].pc.oniceconnectionstatechange = event => this.checkPeerDisconnect(this, event, peerUuid);
        this.peerConnections[peerUuid].pc.addStream(this.localStream);

        if (initCall) {
            this.peerConnections[peerUuid].pc.createOffer().then(description => this.createdDescription(this, description, peerUuid)).catch(this.errorHandler);
        }
    }

    gotIceCandidate(that, event, peerUuid) {
        if (event.candidate != null) {
            MR.syncClient.send(
                {
                    type: "webrtc",
                    uid: MR.playerid,
                    state: {
                        uuid: that.localUuid,
                        ice: event.candidate,
                        room: that.roomID,
                        dest: peerUuid
                    }
                });
            // server.sock.send(JSON.stringify({ 'MR_Message': "Broadcast_All", 'ice': event.candidate, 'uuid': this.localUuid, 'dest': peerUuid, 'room': this.roomID }));
        }
    }

    createdDescription(that, description, peerUuid) {
        console.log(`got description, peer ${peerUuid}`);
        that.peerConnections[peerUuid].pc.setLocalDescription(description).then(function () {
            MR.syncClient.send(
                {
                    type: "webrtc",
                    uid: MR.playerid,
                    state: {
                        uuid: that.localUuid,
                        sdp: that.peerConnections[peerUuid].pc.localDescription,
                        room: that.roomID,
                        dest: peerUuid
                    }
                });
            // server.sock.send(JSON.stringify({
            // 'MR_Message': "Broadcast_All", 'sdp': that.peerConnections[peerUuid].pc.localDescription,
            // 'uuid': that.localUuid, 'dest': peerUuid, 'room': that.roomID
            // }));
        }).catch(that.errorHandler);
    }

    gotRemoteStream(that, event, peerUuid) {
        console.log(`got remote stream, peer ${peerUuid}`);
        //assign stream to new HTML video element
        var vidElement = document.createElement('video');
        vidElement.setAttribute('autoplay', '');
        vidElement.setAttribute('muted', '');
        vidElement.srcObject = event.streams[0];
        vidElement.onloadedmetadata = function (e) {
            vidElement.muted = true;
        };

        // 
        that.playAudio(that, event.streams[0], peerUuid);

        var vidContainer = document.createElement('div');
        vidContainer.setAttribute('id', 'remoteVideo_' + peerUuid);
        vidContainer.appendChild(vidElement);

        var videosElement = document.getElementById('videos');
        if (videosElement == null) {
            videosElement = document.createElement('div');
            videosElement.setAttribute("id", "videos");
            document.body.appendChild(videosElement);
        }

        document.getElementById('videos').appendChild(vidContainer);
    }

    process(event) {
        console.log(event.inputBuffer);
    }

    playAudio(that, stream, peerUuid) {
        // that.inputPoint = that.audioContext.createGain();
        // Create an AudioNode from the stream.
        // that.realAudioInput = that.audioContext.createMediaStreamSource(stream);
        // that.processor = that.audioContext.createScriptProcessor(1024, 2, 2);
        // that.realAudioInput.connect(that.processor);
        // that.processor.onaudioprocess = (audioProcessingEvent) => that.process(audioProcessingEvent);
        // that.processor.connect(that.audioContext.destination);


        // that.audioInput.connect(that.panner)
        //      .connect(that.inputPoint)
        //     .connect(that.audioContext.destination);

        // Create a biquadfilter
        // that.biquadFilter = that.audioContext.createBiquadFilter();
        // that.biquadFilter.type = "lowshelf";
        // that.biquadFilter.frequency.value = 1000;
        // that.biquadFilter.gain.value = 1;
        // // connect the AudioBufferSourceNode to the gainNode
        // // and the gainNode to the destination, so we can play the
        // // music and adjust the volume using the mouse cursor
        // that.audioInput.connect(that.biquadFilter);
        // that.biquadFilter.connect(that.audioContext.destination);

        // 
        if (that.initAudio(that, peerUuid)) {
            // how many times this got called?
            // shall we update listener here?
            // Create a MediaStreamAudioSourceNode
            var realAudioInput = new MediaStreamAudioSourceNode(that.peerConnections[peerUuid].audioContext, {
                mediaStream: stream
            });
            that.peerConnections[peerUuid].audioInputStream = realAudioInput;

            realAudioInput.connect(that.peerConnections[peerUuid].panner);
            that.peerConnections[peerUuid].panner.connect(that.peerConnections[peerUuid].audioContext.destination);
            // realAudioInput.connect(that.audioContext.destination);
            // realAudioInput.connect(that.biquadFilter);
            // that.biquadFilter.connect(that.audioContext.destination);    
        }

    }

    checkPeerDisconnect(that, event, peerUuid) {
        if(peerUuid in that.peerConnections){
            var state = that.peerConnections[peerUuid].pc.iceConnectionState;
            console.log(`connection with peer ${peerUuid} ${state}`);
            if (state === "failed" || state === "closed" || state === "disconnected") {
                delete that.peerConnections[peerUuid];
                document.getElementById('videos').removeChild(document.getElementById('remoteVideo_' + peerUuid));
                //   updateLayout();
            }
        }
        else{
            console.log(peerUuid + " not in peerConnections " + that.peerConnections);
        }
    }

    errorHandler(error) {
        console.log("%c%s",
            'color: #ff0000;',
            error);
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

// MR.voip = new VoIP_webrtc(MR.syncClient);

window.changeGain = function (gain) {
    MR.voip.biquadFilter.gain.value = gain;
}

window.changeFreq = function (freq) {
    MR.voip.biquadFilter.frequency.value = freq;
}

var rotateListenerCounter = 0;
var isRotateListener = false;
window.rotateListener = function () {
    isRotateListener = !isRotateListener;
    return isRotateListener;
}

setInterval(function () {
    if (isRotateListener) {
        MR.voip.audioContext.listener.setOrientation(Math.sin(rotateListenerCounter), 0,
            Math.cos(rotateListenerCounter),
            0, 1, 0);
        rotateListenerCounter += Math.PI / 20;
        if (rotateListenerCounter > Math.PI * 2)
            rotateListenerCounter -= Math.PI * 2;

    }
}, 100);