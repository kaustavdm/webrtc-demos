"use strict";

// Get DOM reference of `<video>` element.  We will play the live
// stream from `getUserMedia` here.
let video_el = document.querySelector("video");

// Define `getUserMedia` constraints. We will keep it simple here.
let constraints = {
    audio: true,                // Get audio
    video: true                 // Get video
};

let gum_success = stream => {
    console.log("Got media stream", stream);
    video_el.srcObject = stream;
};

let gum_error = err => {
    alert("Error getting user media. Check console for details.");
    console.error("getUserMedia error", err);
};

// We hook to the `window` `load` event to trigger our `gUM` call
window.addEventListener("load", () => {

    // Trigger `getUserMedia` request. This uses the new Promise driven
    // `getUserMedia` function of the `MediaDevices` API.
    navigator.mediaDevices.getUserMedia(constraints)
        .then(gum_success)          // Call `gum_success()` if `MediaStream` is obtained
        .catch(gum_error);          // Else, call `gum_error()` if gUM failed
});
