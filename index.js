const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));

io.on("connection", socket => {
    console.log("User connected:", socket.id);

    socket.on("join", roomID => {
        socket.join(roomID);
        socket.to(roomID).emit("user-joined", socket.id);

        socket.on("signal", data => {
            io.to(data.to).emit("signal", {
                from: socket.id,
                signal: data.signal
            });
        });

        socket.on("disconnect", () => {
            socket.to(roomID).emit("user-left", socket.id);
        });
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});