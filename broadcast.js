var express = require('express');
var router = express.Router();

router.post('/broadcast', (req, res) => {

    const peerConnections = {};
    const config = {
        iceServers: [
            {
                "urls": "stun:stun.l.google.com:19302",
            },
            // {
            //   "urls": "turn:TURN_IP?transport=tcp",
            //   "username": "TURN_USERNAME",
            //   "credential": "TURN_CREDENTIALS"
            // }
        ]
    };

    const socket = io.connect(window.location.origin);

    socket.on("answer", (id, description) => {
        peerConnections[id].setRemoteDescription(description);
    });

    socket.on("watcher", id => {

        const peerConnection = new RTCPeerConnection(config);
        peerConnections[id] = peerConnection;

        let stream = videoElement.srcObject;
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit("candidate", id, event.candidate);
            }
        };

        peerConnection
            .createOffer()
            .then(sdp => peerConnection.setLocalDescription(sdp))
            .then(() => {
                socket.emit("offer", id, peerConnection.localDescription);
            });

        peerConnection.oniceconnectionstatechange = function () {
            console.log('ICE state: ', peerConnection.iceConnectionState);
        }
    });

    socket.on("candidate", (id, candidate) => {
        peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
        peerConnections[id].oniceconnectionstatechange = function () {
            console.log('ICE state: ', peerConnections[id].iceConnectionState);
        }
    });

    socket.on("disconnectPeer", id => {
        peerConnections[id].close();
        peerConnections[id].oniceconnectionstatechange = function () {
            console.log('ICE state: ', peerConnections[id].iceConnectionState);
        }
        delete peerConnections[id];
    });

    window.onunload = window.onbeforeunload = () => {
        socket.close();
    };

    // Get camera and microphone
    const videoElement = document.querySelector("video");
    const audioSelect = document.querySelector("select#audioSource");
    const videoSelect = document.querySelector("select#videoSource");

    audioSelect.onchange = getStream;
    videoSelect.onchange = getStream;

    getStream()
        .then(getDevices)
        .then(gotDevices);

    function getDevices() {
        return navigator.mediaDevices.enumerateDevices();
    }

    function gotDevices(deviceInfos) {
        window.deviceInfos = deviceInfos;
        for (const deviceInfo of deviceInfos) {
            const option = document.createElement("option");
            option.value = deviceInfo.deviceId;
            if (deviceInfo.kind === "audioinput") {
                option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
                audioSelect.appendChild(option);
            } else if (deviceInfo.kind === "videoinput") {
                option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
                videoSelect.appendChild(option);
            }
        }
    }

    function getStream() {
        if (window.stream) {
            window.stream.getTracks().forEach(track => {
                track.stop();
            });
        }
        const audioSource = audioSelect.value;
        const videoSource = videoSelect.value;
        const constraints = {
            audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
            video: { facingMode: "environment" }
        };
        return navigator.mediaDevices
            .getUserMedia(constraints)
            .then(gotStream)
            .catch(handleError);
    }

    function gotStream(stream) {
        window.stream = stream;
        videoElement.srcObject = stream;
        socket.emit("broadcaster");
    }

    function handleError(error) {
        console.error("Error: ", error);
    }

});

module.exports = router;