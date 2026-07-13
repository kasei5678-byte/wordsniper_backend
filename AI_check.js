async function testAI(theme_Index, word, ask) {
    require("dotenv").config();

    const { GoogleGenerativeAI } = require("@google/generative-ai");

    const fs = require("fs");
    const text = fs.readFileSync("data.json", "utf8");
    const data = JSON.parse(text);

    const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
    );

    try {
        const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
        });

//プロンプト部分
        console.log(ask);
        console.log(data.theme[theme_Index].name);
        const result = await model.generateContent(
            `${ask}は${data.theme[theme_Index].name}ですか.yesなら1、noなら0を返してください.返信は0か1のみでしてください`
        );
//AIの返信をanswerに入れる
        const response = await result.response;
        const answer = response.text();
        console.log("asdfgh")
        

        if(answer.includes(1)){

            let ans = ask.replace(/[\u30a1-\u30f6]/g, function(match) {
            return String.fromCharCode(match.charCodeAt(0) - 0x60);
            });
            data.theme[theme_Index].answer.push(ask);
            fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
        }

        return answer;


    } catch (error) {

        console.log("エラー");
        console.log(error.message);

    }

}

module.exports =testAI;
