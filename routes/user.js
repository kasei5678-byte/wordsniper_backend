const express = require("express");
const router = express.Router();

//router.use(mylogger);

router.get("/", mylogger, (req, res) => {
    res.send("You're user");
});

router.get("/info", (req, res) => {
    res.send("user information");
});

router.get("/:id", (req, res) => {
    res.send(`get ${req.params.id} of user information`);
});

function mylogger(req, res, next){
    console.log(req.originalUrl);
    next();
}

module.exports = router;