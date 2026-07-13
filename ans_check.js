async function ans_check(theme_index, word_number, ask){
//htmlから受け取るお題と文字と入力されたもの（未完成）
    //const word =  "いぎりす";
    //const rule = "";//文字
//jsonのデータ
    //console.log(theme_index, ans, char_index);
    const fs = require("fs");
    const text = fs.readFileSync("data.json", "utf8");
    const data = JSON.parse(text);

    let ans = ask.replace(/[\u30a1-\u30f6]/g, function(match) {
        return String.fromCharCode(match.charCodeAt(0) - 0x60);
    });

//文字判定
    if(!ans.startsWith(data.theme[theme_index].answer[word_number][0])){ //document.getElementById("result").textContent = "不正解";
        console.log("不正解");
        const point = data.theme[theme_index].point * 5.0;
        return {TF:"NNG", PT:point};
        }
//単語がjsonにあるかの判定
    if (data.theme[theme_index].answer.includes(ans)) {
        console.log("正解");
        const point = data.theme[theme_index].point*5;
        return {TF : "ok", PT : point};

    }
    else{
        console.log("不正解");
        const point = data.theme[theme_index].point;
        return {TF:"NG", PT:point};
    }
}

module.exports = ans_check;
