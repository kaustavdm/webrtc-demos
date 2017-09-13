"use strict";

const path = require("path");
const crypto = require("crypto");
const express = require("express");

var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

const PORT = process.env.PORT || 3000;

let rooms = {};

let create_slug = () => {
  var id = crypto.randomBytes(3).toString("hex");
  return [id.slice(0, 3), id.slice(3)].join("-");
};

// -----------------------------
// Set up routes
// -----------------------------

app.use("/assets", express.static(path.join(__dirname, "assets")));

app.get("/room", (req, res) => {
    let slug = create_slug();
    rooms[slug] = 0;
    res.redirect(`/room/${slug}`);
});

app.get("/room/:id", (req, res) => {
    if (rooms[req.params.id] == null) {
        res.status(404).send();
        return;
    }
    res.sendFile(path.resolve("views/room.html"));
});

app.get("/", (req, res) => {
    res.sendFile(path.resolve("views/index.html"));
});

// -----------------------------
// Set up socket.io server
// -----------------------------
io.on("connection", socket => {
    let room = null;

    socket.on("join", room_id => {
        if (room != null) {
            socket.emit("joinerror", "User has already joined room");
            return;
        }
        if (rooms[room_id] == null) {
            socket.emit("joinerror", "Invalid room id");
            return;
        }
        if (rooms[room_id] >= 2) {
            socket.emit("joinerror", "Room full");
            return;
        }
        socket.join(room_id);
        rooms[room_id]++;
        socket.emit("joined", { room_id: room_id, count: rooms[room_id] });
        socket.broadcast.to(room_id).emit("userjoined", {
            room_id: room_id, socket_id: socket.id, count: rooms[room_id]
        });
        room = room_id
    });

    socket.on("signal", (payload) => {
        if (room == null) {
            socket.emit("joinerror", "User has not joined room");
            return;
        }
        socket.broadcast.to(room).emit("signal", payload);
    });

    socket.on("disconnect", function(){
        if (room != null && rooms[room] != null) {
            io.to(room).emit("userleft", socket.id);
            rooms[room]--;
        }
    });

});

// -----------------------------
// Start HTTP server
// -----------------------------
http.listen(PORT, () => {
    console.log("Server listening on port " + PORT);
});
