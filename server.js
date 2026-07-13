const express = require("express");
const app = express();
const port = 3000;
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server);
const fs = require("fs");

const ans_check = require("./ans_check");
const testAI = require("./AI_check");
//const post_json = require("./input_theme");


app.use(express.static("public"));


const data = JSON.parse(fs.readFileSync("./data.json", "utf8"));

let themeIndex;
let wordIndex;
let Rooms = {};
let public_roomID = [];

io.on('connection', (socket) => {
//ルーム作成リクエスト
    socket.on("make_room", (data) => {
        const room = io.sockets.adapter.rooms.get(data.ID);
        const count = room ? room.size : 0;
        console.log(count);

        if (count!=0) { 
            socket.emit("can't_make");
            return;
        }
        
        socket.join(data.ID);
        socket.data.make_neme = data.name;
        socket.data.roomID = data.ID;
        if(data.isPublic){
            public_roomID.push(data.ID);
        }


        Rooms[data.ID] = {
            name: [data.name],   // 最初のプレイヤー
            point: [0]
        };

        socket.emit("make_room", "OK");
    })

//ルーム参加画面
    socket.on("public_room", () => {
        console.log(public_roomID);
        socket.emit("room_list", public_roomID);
    })

//ルーム参加リクエスト
    socket.on("join_room", (need) => {


        const room = io.sockets.adapter.rooms.get(need.ID);
        const count = room ? room.size : 0;
        console.log(count);

        if (count!=1) {
            socket.emit("roomFull");
            return;
        }
        socket.join(need.ID);
        socket.data.join_name = need.name;
        socket.data.roomID = need.ID;
        Rooms[need.ID].name.push(need.name);
        Rooms[need.ID].point.push(0);

        const index = public_roomID.indexOf(socket.data.roomID);
        if (index !== -1) {
            public_roomID.splice(index, 1);
        }

        socket.emit("MAKE_GAME");

        io.to(socket.data.roomID).emit("change_point", {
        person: 1,
        point: 0
        });

        io.to(socket.data.roomID).emit("change_point", {
        person: 2,
        point: 0
        });


        io.to(socket.data.roomID).emit("join_room", { 
            p1: Rooms[need.ID].name[0],
            p2: Rooms[need.ID].name[1]
        });
    })

// クライアントからthemeの要求and返信
    socket.on("give_theme", () => {
        var json_str=JSON.stringify(socket.data);
        console.log(json_str);

        themeIndex = Math.floor(Math.random()*data.theme.length);
        setTimeout(function(){

        io.to(socket.data.roomID).emit("give_theme", data.theme[themeIndex].name);

        },50);
    });

// クライアントからword要求and返信
    socket.on("give_word", () => {
        wordIndex = Math.floor(Math.random()*data.theme[themeIndex].answer.length);
        
        setTimeout(function(){

        io.to(socket.data.roomID).emit("give_word", data.theme[themeIndex].answer[wordIndex][0]);

        },50);
        
    });

//通信切断
    socket.on("disconnect", (reason) => {
        console.log("切断理由 : ", reason);
        const index = public_roomID.indexOf(socket.data.roomID);
        if (index !== -1) {
            Rooms[socket.data.roomID].name = [];
            Rooms[socket.data.roomID].point = [];
            public_roomID.splice(index, 1);
        }
        socket.to(socket.data.roomID).emit("cut");
        io.in(socket.data.roomID).socketsLeave(socket.data.roomID);
        delete Rooms[socket.data.roomID];
    });
    
// クライアントからの正誤判定要求
    socket.on("ans_check", async (arg) => {
        const person = arg.you;
        const ans = arg.ans;
        const ret = await ans_check(themeIndex, wordIndex, ans);

        if(ret.TF ==="ok"){
            Rooms[socket.data.roomID].point[person-1] += ret.PT;
            const point = Rooms[socket.data.roomID].point[person-1];
            /*
            if(point>=100){
                socket.emit("WIN");
                socket.to(socket.data.roomID).emit("LOSE");
                io.to(socket.data.roomID).emit("room_out");
                return;
            }
            */
            socket.to(socket.data.roomID).emit("Another_player", {person, ans});
            io.to(socket.data.roomID).emit("change_point", {point, person});
            socket.emit("True");
        }

        else if(ret.TF === "NG"){
            socket.emit("False");
        }

        else if(ret.TF === "NNG"){
            Rooms[socket.data.roomID].point[person-1] -= ret.PT;
            const point =Rooms[socket.data.roomID].point[person-1];
            io.to(socket.data.roomID).emit("change_point", {point, person});
            socket.emit("NG");
        }

        else{console.log("error");}

        
    });
//AI使わない
    socket.on("don't_use_AI", (arg) => {
        const person = arg.you;
        const ans = arg.ans;
        Rooms[socket.data.roomID].point[person-1] -= 50;
        const point = Rooms[socket.data.roomID].point[person-1];
        /*
        if(point>=100){
            socket.emit("WIN");
            socket.to(socket.data.roomID).emit("LOSE");
            io.to(socket.data.roomID).emit("room_out");
            return;
        }
        */
        socket.emit("NG");
        socket.to(socket.data.roomID).emit("Another_player", {person, ans});
        io.to(socket.data.roomID).emit("change_point", {point, person});
    })


//クライアントからのAI判定要求
    socket.on("AI_test", async (ret) => {
        const person=ret.you;
        const ans = ret.ans;
        console
        const AI_check = await testAI(themeIndex, data.theme[themeIndex].answer[wordIndex][0], ans);
        if(AI_check.includes("1")){
            Rooms[socket.data.roomID].point[person-1] += 100;
            const point = Rooms[socket.data.roomID].point[person-1];
            io.to(socket.data.roomID).emit("change_point", {point, person});
            socket.emit("True");
            socket.to(socket.data.roomID).emit("Another_player", {person, ans});
        }

        else if(AI_check.includes("0")){
            const point = Rooms[socket.data.roomID].point[person-1];
            Rooms[socket.data.roomID].point[person-1] -= 50;
            io.to(socket.data.roomID).emit("change_point", {point, person});
            socket.to(socket.data.roomID).emit("Another_player", {person, ans});
            socket.emit("NG");
        }
    });
});


server.listen(port, () => console.log("server get up"))
