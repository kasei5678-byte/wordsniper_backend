// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// public フォルダを公開
app.use(express.static('public'));

// 動作確認用
app.get('/health', (req, res) => {
    res.send('OK');
});

// Socket.io 接続
io.on('connection', (socket) => {
    console.log('ユーザー接続:', socket.id);

    // 1対1専用 joinRoom
    socket.on('joinRoom', (roomId, playerName) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        const count = room ? room.size : 0;

        // 2人以上なら入れない
        if (count >= 2) {
            socket.emit('roomFull');
            return;
        }

        // 部屋に参加
        socket.join(roomId);

        // 入室通知
        io.to(roomId).emit('playerJoined', {
            playerId: socket.id,
            playerName,
        });

        // 2人そろったらゲーム開始
        const newCount = (io.sockets.adapter.rooms.get(roomId) || { size: 0 }).size;
        if (newCount === 2) {
            io.to(roomId).emit('startGame');
        }
    });


    socket.on('answer', ({ roomId, playerId, word }) => {
        const isCorrect = true; // 仮の判定
        io.to(roomId).emit('answerResult', {
            playerId,
            word,
            isCorrect,
        });
    });

    socket.on('disconnect', () => {
        console.log('ユーザー切断:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

