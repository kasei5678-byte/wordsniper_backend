const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ======== 辞書ファイル読み込み ========
const themes = JSON.parse(fs.readFileSync("./themes.json", "utf8"));

// ======== ラウンドデータ保存用 ========
const roundData = {};

// public を公開
app.use(express.static('public'));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// ======== ランダムテーマ＋頭文字生成 ========
function getRandomThemeAndHead(themes){
    const themeList = themes.theme;
    const wordList = themes.word;

    const theme = themeList[Math.floor(Math.random() * themeList.length)];
    const head = wordList[Math.floor(Math.random() * wordList.length)];

    return { theme, head };
}

// ======== ラウンド開始 ========
function startRound(roomId){
    const { theme, head } = getRandomThemeAndHead(themes);

    // 判定用データを保存
    roundData[roomId] = {
        theme: theme.name,
        head: head.char,
        answers: theme.answer
    };

    // クライアントへ送信
    io.to(roomId).emit("startRound", {
        theme: theme.name,
        head: head.char
    });
}

// ======== Socket.io ========
io.on("connection", (socket) => {

    // ======== ルーム参加 ========
    socket.on("joinRoom", (roomId, name) => {

        socket.data.name = name;
        socket.data.roomId = roomId;

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
        } 
        else if (newCount === 2) {

            const clients = [...io.sockets.adapter.rooms.get(roomId)];

            const p1 = io.sockets.sockets.get(clients[0]).data.name;
            const p2 = io.sockets.sockets.get(clients[1]).data.name;

            io.to(roomId).emit("matched", { p1, p2 });

            //  最初のラウンド開始
            startRound(roomId);
        }
    });

    // ======== 回答受信 ========
    socket.on("answer", (text) => {
        const roomId = socket.data.roomId;
        const player = socket.data.name;

        const data = roundData[roomId];

        // テーマに含まれるか？
        const inTheme = data.answers.includes(text);

        // 頭文字一致？
        const headMatch = text.startsWith(data.head);

        const correct = inTheme && headMatch;

        // 判定結果を全員に送信
        io.to(roomId).emit("judgeResult", {
            player,
            answer: text,
            correct
        });

        //  次のラウンドへ
        setTimeout(() => {
            startRound(roomId);
        }, 1500);
    });

});

server.listen(PORT, () => {
    console.log("Server running on http://localhost:" + PORT);
});

