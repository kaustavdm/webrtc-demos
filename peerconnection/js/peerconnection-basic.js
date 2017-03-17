"use strict";

// Get the video elements to render things
let video_local = document.getElementById("video-local");
let video_remote = document.getElementById("video-remote");

let button_start = document.getElementById("button-start");
let button_end = document.getElementById("button-end");

let local_stream = null;

let pc = { local: null, remote: null }; // RTCPeerConnection holder

let offer_options = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

let peertype = peer => peer == pc.local ? "local" : "remote";


// --- Set things up ----

let get_media_stream = () => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(stream => {
            console.log("Got media stream", stream);
            video_local.srcObject = local_stream = stream;
            button_start.removeAttribute("disabled");
        })
        .catch(media_stream_error);
};

let start_call = () => {
    button_start.setAttribute("disabled", "disabled");
    init_pc_local(local_stream)
        .createOffer(offer_options)
        .then(create_offer_success)
        .catch(create_offer_error);
    init_pc_remote();
};

let init_pc_local = (stream) => {
    pc.local = new RTCPeerConnection(null);
    pc.local.onicecandidate = event => handle_icecandidate(pc.remote, event);
    pc.local.addStream(stream);
    console.log("Created local RTCPeerConnection", pc.local);
    return pc.local;
};

let init_pc_remote = () => {
    pc.remote = new RTCPeerConnection(null);
    pc.remote.onicecandidate = event => handle_icecandidate(pc.local, event);
    pc.remote.onaddstream = event => {
        console.log("Received remote stream", event);
        video_remote.srcObject = event.stream;
        button_end.removeAttribute("disabled");
    };
    console.log("Created remote RTCPeerConnection", pc.remote);
};

let handle_icecandidate = (remote_peer, event) => {
    if (event.candidate) {
        remote_peer.addIceCandidate(event.candidate)
            .then(() => console.log("Sent ICE Candidate to remote peer", event.candidate))
            .catch(err => console.log("Error sending ICE Candidate to remote peer", err));
    } else {
        console.log("All ICE Candidates sent to", peertype(remote_peer));
    }
};

let create_offer_success = offer => {
    console.log("Created offer from local peer", offer);
    // Set local description of local peer
    pc.local.setLocalDescription(offer)
        .then(() => set_local_desc_success(pc.local))
        .catch(err => set_local_desc_error(pc.local, err));
    // Send offer to remote peer
    // Set remote description in remote peer
    pc.remote.setRemoteDescription(offer)
        .then(() => set_remote_desc_success(pc.remote))
        .catch(err => set_remote_desc_error(pc.remote, err));

    // Create Answer from remote peer
    pc.remote.createAnswer()
        .then(create_answer_success)
        .catch(err => console.log("Error creating answer", err));
};

let create_answer_success = answer => {
    console.log("Created answer from remote peer", answer);
    // Set local description of remote peer
    pc.remote.setLocalDescription(answer)
        .then(() => set_local_desc_success(pc.remote))
        .catch(err => set_local_desc_error(pc.remote, err));
    // Send answer to local peer
    // Set remote description in local peer
    pc.local.setRemoteDescription(answer)
        .then(() => set_remote_desc_success(pc.local))
        .catch(err => set_remote_desc_error(pc.local, err));
};

let set_local_desc_success = peer => {
    console.log(`[${peertype(peer)}]`, "Success setting local description", peer);
};

let set_remote_desc_success = peer => {
    console.log(`[${peertype(peer)}]`, "Success setting remote description", peer);
};

let media_stream_error = err => {
    alert("Error getting user media");
    console.error("Error getting user media", err);
};

let set_local_desc_error = (peer, err) => {
    console.error(`[${peertype(peer)}]`, "Error setting local description", err);
};

let set_remote_desc_error = (peer, err) => {
    console.error(`[${peertype(peer)}]`, "Error setting remote description", err);
};

let create_offer_error = err => {
    console.error("Error creating offer", err);
};

let end_call = () => {
    if (pc.local.close) pc.local.close();
    if (pc.remote.close) pc.remote.close();
    pc = { local: null, remote: null };
    video_remote.srcObject = null
    button_end.setAttribute("disabled", "disabled");
    button_start.removeAttribute("disabled");
};


// --- Start it all ---
window.addEventListener("load", () => {
    button_start.addEventListener("click", start_call);
    button_end.addEventListener("click", end_call);
    get_media_stream();
});
