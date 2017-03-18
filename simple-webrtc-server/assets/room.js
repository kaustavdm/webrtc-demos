/* global socket, room_id */

window.addEventListener("load", function () {

    let pc = null;
    let video_local = document.getElementById("video-local");
    let video_remote = document.getElementById("video-remote");
    let offer_options = {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
    };
    let pc_config = {
        "iceServers": [{
            "url": "stun:stun.l.google.com:19302"
        }, {
            "url": "stun:stun1.l.google.com:19302"
        }]
    };

    // Shortcut to sending "signal" events on socket
    let signal = (name, data) => socket.emit("signal", { name: name, data: data });

    // -------------------------------
    // Set up client side stuff
    // -------------------------------

    let get_media_stream = () => {
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { width: { max: "640" }, height: { max: "480" }}
        }).then(stream => {
            console.log("Got media stream", stream);
            video_local.srcObject = stream;
            init_pc(stream);
        }).catch(media_stream_error);
    };

    let init_pc = (stream) => {
        pc = new RTCPeerConnection(pc_config);
        pc.onicecandidate = event => signal("icecandidate", event.candidate);
        pc.onaddstream = event => {
            console.log("Received remote stream", event, video_remote);
            video_remote.srcObject = event.stream;
        };
        pc.addStream(stream);
        console.log("Created local RTCPeerConnection", pc);
        // Join room
        socket.emit("join", room_id);
        return pc;
    };

    let start_call = () => {
        console.log("Starting call");
        pc.createOffer(offer_options)
            .then(create_offer_success)
            .catch(create_offer_error);
    };

    let handle_icecandidate = data => {
        if (data != null) {
            let candidate = new RTCIceCandidate({
                candidate: data.candidate,
                sdpMLineIndex: data.sdpMLineIndex,
                sdpMid: data.sdpMid
            });
            console.log("Created ICE Candidate", candidate);
            pc.addIceCandidate(new RTCIceCandidate(candidate))
                .then(() => console.log("Added ICE candidate", candidate))
                .catch(err => console.log("Error adding ICE candidate", err));
        } else {
            console.log("Finished getting ice candidates");
        }
    };

    let handle_offer = data => {
        pc.setRemoteDescription(new RTCSessionDescription(data))
            .then(set_remote_desc_success)
            .catch(set_remote_desc_error);

        // Create Answer from remote peer
        pc.createAnswer()
            .then(create_answer_success)
            .catch(err => console.log("Error creating answer", err));
    };

    let handle_answer = data => {
        // Set remote description in remote peer
        pc.setRemoteDescription(new RTCSessionDescription(data))
            .then(set_remote_desc_success)
            .catch(set_remote_desc_error);
    };

    let create_offer_success = offer => {
        console.log("Created offer from local peer", offer);
        // Set local description of local peer
        pc.setLocalDescription(offer)
            .then(set_local_desc_success)
            .catch(set_local_desc_error);
        // Send offer to remote peer
        signal("offer", offer);
    };

    let create_answer_success = answer => {
        console.log("Created answer from remote peer", answer);
        // Set local description of remote peer
        pc.setLocalDescription(answer)
            .then(set_local_desc_success)
            .catch(set_local_desc_error);
        // Send answer to remote peer
        signal("answer", answer);
    };

    let set_local_desc_success = () => {
        console.log("Success setting local description");
    };

    let set_remote_desc_success = () => {
        console.log("Success setting remote description");
    };

    let media_stream_error = err => {
        alert("Error getting user media");
        console.error("Error getting user media", err);
    };

    let set_local_desc_error = err => {
        console.error("Error setting local description");
    };

    let set_remote_desc_error = err => {
        console.error("Error setting remote description", err);
    };

    let create_offer_error = err => {
        console.error("Error creating offer", err);
    };

    let end_call = () => {
        if (pc != null) pc.close();
        pc = null;
        video_remote.srcObject = null;
        if (socket && socket.connected) socket.disconnect();
    };

    // --------------------------
    // Set up socket.io bindings
    // --------------------------

    socket.on("joined", function (payload) {
        console.log("Joined room", payload);
        if (payload.count == 2 && pc != null) {
            start_call();
        }
    });

    socket.on("userjoined", function (payload) {
        console.log("New user joined room", payload);
    });

    socket.on("userleft", function (e) {
        console.log("User left room", e);
        // end_call();
    });

    socket.on("joinerror", function (err) {
        console.error("Error joining room", err);
        document.getElementById("errors").innerHTML = "<p>" + err + "</p>";
    });

    socket.on("signal", function (payload) {
        console.log("Received signal", payload);
        if (!payload || payload.name == null || payload.data == null) {
            console.log("Unknown signal payload. Not taking action", payload);
        }
        switch (payload.name) {
            case "icecandidate":
                handle_icecandidate(payload.data);
                break;
            case "offer":
                handle_offer(payload.data);
                break;
            case "answer":
                handle_answer(payload.data);
                break;
            default:
                console.log("Unknown signal payload name", payload.name);

        }
    });

    // Start it all
    get_media_stream();

});
