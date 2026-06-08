const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// public を公開
app.use(express.static('public'));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
    socket.on("joinRoom", (roomId, name) => {

        socket.data.name = name;

        const room = io.sockets.adapter.rooms.get(roomId);
        const count = room ? room.size : 0;

        if (count >= 2) {
            socket.emit("roomFull");
            return;
        }

        socket.join(roomId);
        const newCount = io.sockets.adapter.rooms.get(roomId).size;

        if (newCount === 1) {
            socket.emit("waiting");
        } else if (newCount === 2) {

            const clients = [...io.sockets.adapter.rooms.get(roomId)];

            const p1 = io.sockets.sockets.get(clients[0]).data.name;
            const p2 = io.sockets.sockets.get(clients[1]).data.name;

            io.to(roomId).emit("matched", {p1, p2 });
        }
    });
});

server.listen(PORT, () => {
    console.log("Server running on http://localhost:" + PORT);
});

