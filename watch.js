var express = require('express');
var router = express.Router();

router.post('/watch', (req, res) => {

    let peerConnection;
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
    const video = document.querySelector("video");

    socket.on("offer", (id, description) => {
        peerConnection = new RTCPeerConnection(config);
        peerConnection
            .setRemoteDescription(description)
            .then(() => peerConnection.createAnswer())
            .then(sdp => peerConnection.setLocalDescription(sdp))
            .then(() => {
                socket.emit("answer", id, peerConnection.localDescription);
            });
        peerConnection.ontrack = event => {
            video.srcObject = event.streams[0];
            video.play();
        };
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit("candidate", id, event.candidate);
            }
        };
    });


    socket.on("candidate", (id, candidate) => {
        peerConnection
            .addIceCandidate(new RTCIceCandidate(candidate))
            .catch(e => console.error(e));
    });

    socket.on("connect", () => {
        socket.emit("watcher");
    });

    socket.on("broadcaster", () => {
        socket.emit("watcher");
    });

    window.onunload = window.onbeforeunload = () => {
        socket.close();
        peerConnection.close();
    };

    function enableAudio() {
        console.log("Enabling audio")
        video.muted = false;
    }

});

module.exports = router;