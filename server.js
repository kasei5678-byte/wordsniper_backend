// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const cards = require('./cards.json');
const dict = require('./dict.json');

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

// 山札シャッフル
function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

// ルームごとの状態管理
const rooms = {};

// 単語検索
function findWord(word) {
    return dict.find(e => e.word === word);
}

// ラウンド開始
function startRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // 山札が尽きたらゲーム終了
    if (room.deck.length === 0) {
        io.to(roomId).emit('gameOver', {
            scores: room.scores
        });
        return;
    }

    // カードを1枚めくる
    const card = room.deck.shift();
    room.currentCards.push(card);
    room.roundWon = false;

    console.log(`Room ${roomId} new card:`, card);

    // クライアントへ送信
    io.to(roomId).emit('newCard', {
        theme: card.theme,
        letter: card.letter,
        score: card.score,
        cardsCount: room.currentCards.length
    });
}

// Socket.io 接続（★ここが正しい位置）
io.on('connection', (socket) => {
    console.log('ユーザー接続:', socket.id);

    // 1対1専用 joinRoom
    socket.on('joinRoom', (roomId, playerName) => {
        const roomInfo = io.sockets.adapter.rooms.get(roomId);
        const count = roomInfo ? roomInfo.size : 0;

        if (count >= 2) {
            socket.emit('roomFull');
            return;
        }

        socket.join(roomId);

        // ルーム状態初期化
        if (!rooms[roomId]) {
            rooms[roomId] = {
                deck: shuffle([...cards]),
                currentCards: [],
                scores: {},
                usedWords: new Set(),
                roundWon: false
            };
        }

        rooms[roomId].scores[socket.id] = 0;

        io.to(roomId).emit('playerJoined', {
            playerId: socket.id,
            playerName,
        });

        const newCount = (io.sockets.adapter.rooms.get(roomId) || { size: 0 }).size;
        if (newCount === 2) {
            io.to(roomId).emit('startGame');
            startRound(roomId);
        }
    });

    // 回答処理
    socket.on('answer', ({ roomId, playerId, word }) => {
        const room = rooms[roomId];
        if (!room) return;

        const trimmed = (word || '').trim();
        if (!trimmed) return;

        if (room.roundWon) return;

        const hit = findWord(trimmed);
        if (!hit) {
            socket.emit('answerResult', {
                playerId,
                word: trimmed,
                isCorrect: false,
                reason: '辞書に存在しない単語'
            });
            return;
        }

        if (room.usedWords.has(trimmed)) {
            socket.emit('answerResult', {
                playerId,
                word: trimmed,
                isCorrect: false,
                reason: 'すでに使われた単語'
            });
            return;
        }

        for (const card of room.currentCards) {
            if (!hit.yomi.startsWith(card.letter)) {
                socket.emit('answerResult', {
                    playerId,
                    word: trimmed,
                    isCorrect: false,
                    reason: `「${card.letter}」から始まっていない`
                });
                return;
            }
            if (hit.category !== card.theme) {
                socket.emit('answerResult', {
                    playerId,
                    word: trimmed,
                    isCorrect: false,
                    reason: `お題「${card.theme}」に合っていない`
                });
                return;
            }
        }

        room.roundWon = true;
        room.usedWords.add(trimmed);

        const lastCard = room.currentCards[room.currentCards.length - 1];
        room.scores[playerId] += lastCard.score;

        io.to(roomId).emit('answerResult', {
            playerId,
            word: trimmed,
            isCorrect: true,
            scoreGained: lastCard.score,
            totalScore: room.scores[playerId]
        });

        room.currentCards = [];
        room.roundWon = false;
        startRound(roomId);
    });

    socket.on('disconnect', () => {
        console.log('ユーザー切断:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

