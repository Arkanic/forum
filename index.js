const express = require("express");
const mongoose = require("mongoose");
const parser = {
    body: require("body-parser"),
    cookie: require("cookie-parser")
};
const User = require("./models/user");
const {auth} = require("./middleware/auth");
const db = require("./config/config").get(process.env.NODE_ENV);

const app = express();

app.use(parser.body.urlencoded({extended: false}));
app.use(parser.body.json());
app.use(parser.cookie());

mongoose.Promise = global.Promise;
mongoose.connect(db.DATABASE, {useNewUrlParser: true, useUnifiedTopology: true}, err => {
    if(err) throw err;
    console.log("Database connected");
});

app.post("/api/register", (req, res) => {
    const newUser = new User(req.body);
    console.log(newUser);

    if(newUser.password!=newUser.password2) return res.status(400).json({success: false, message: "Passwords do not match"});

    User.findOne({email: newUser.email}, (err, user) => {
        if(user) return res.status(400).json({success: false, message: "Email is already used by another account"});

        newUser.save((err, doc) => {
            if(err) {
                throw err;
                return res.status(400).json({success: false, message: "Internal server error"});
            }
            res.status(200).json({success: true, user: doc});
        });
    });
});

app.post("/api/login", (req, res) => {
    let token = req.cookies.auth;
    User.findByToken(token, (err, user) => {
        if(err) return res(err);
        if(user) return res.status(400).json({
            success: false,
            message: "You are already logged in"
        });
        
        else {
            User.findOne({"email": req.body.email}, (err, user) => {
                if(!user) return res.json({success: false, message: "Email or password is incorrect"});
                
                user.comparePassword(req.body.password, (err, isMatch) => {
                    if(!isMatch) return res.json({success: false, message: "Email or password is incorrect"});
                });

                user.generateToken((err, user) => {
                    if(err) return res.status(400).send(err);
                    res.cookie("auth", user.token).json({
                        success: true,
                        id: user._id,
                        email: user.email
                    });
                });
            });
        }
    });
});

app.get("/api/logout", auth, (req, res) => {
    req.user.deleteToken(req.token, (err, user) => {
        if(err) return res.status(400).send(err);
        res.sendStatus(200);
    });
});

app.get("/api/profile", auth, (req, res) => {
    res.json({
        success: true,
        id: req.user._id,
        email: req.user.email,
        username: req.user.username
    });
});

app.get("/", (req, res) => {
    res.status(200).send("welcome.");
});

const port = process.env.port || 8080;
app.listen(port, () => {
    console.log("Webserver online");
});