import express from "express";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";

import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

import bcrypt from "bcrypt";

import database from "./db";
import s from "./session";

// IDE seems confused about typescript version, so this errors.
// @ts-expect-error
let db:Knex<any, unknown[]>;
(async () => {
    db = await database();
})();

const sessions = s();

const config = require("../webpack/webpack.dev");

const app = express();

app.set("view engine", "pug");
app.set("views", "./views");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static("static"));

if(process.env.NODE_ENV == "development") {
    const compiler = webpack(config);
    app.use(webpackDevMiddleware(compiler));
} else {
    app.use(express.static("buildc"));
}

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/register", (req, res) => {
    res.render("register");
});
app.post("/register", async (req, res) => {
    const {username, password, confpass} = req.body;

    if(!username || !password || !confpass) return res.render("register", {msg: "empty boxes"});
    //if(!/^[a-zA-Z0-9_]{4, 32}$/i.test(username)) return res.render("register", {msg: "bad username"});
    //if(!/^[*]{8, 64}$/i.test(password)) return res.render("register", {msg: "bad password"});

    const [user] = await db("users").select().where("username", username);
    if(user) return res.render("register", {msg: "username is already taken"});

    const created = Date();
    const [id] = await db("users").insert({username, created});
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            await db("passwords").insert({id, hash});

            res.cookie("session", sessions.add(id.toString()))
               .cookie("username", username)
               .redirect("/");
        });
    });
});

app.get("/login", (req, res) => {
    res.render("login");
});
app.post("/login", async (req, res) => {
    const {username, password} = req.body;

    if(!username || !password) return res.render("login", {msg: "empty boxes"});

    const msg = "Username or password is incorrect.";

    const [user] = await db("users").select().where("username", username);
    if(!user) return res.render("login", {msg});

    const [pword] = await db("passwords").select().where("id", user.id);
    bcrypt.compare(password, pword.hash, (err, result) => {
        if(!result) return res.render("login", {msg});

        res.cookie("session", sessions.add(user.id))
           .cookie("username", username)
           .redirect("/");
    });
});


app.get("*", (req, res) => {
    res.render("404");
});

app.listen(process.env.PORT || "8080", () => {
    console.log("Server Started.");
});