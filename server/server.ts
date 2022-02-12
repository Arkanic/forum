import express from "express";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";

import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import multer from "multer";

import bcrypt from "bcrypt";

import database from "./db";
import s from "./session";
import * as file from "./file";

// IDE seems confused about typescript version, so this errors.
// @ts-expect-error
let db:Knex<any, unknown[]>;
(async () => {
    db = await database();
})();

const sessions = s();
const upload = file.initFiles(db);

const config = require("../webpack/webpack.dev");

const app = express();

app.set("view engine", "pug");
app.set("views", "./views");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.use(express.static("static"));
app.use("/files", express.static("/fdata/files/"));

if(process.env.NODE_ENV == "development") {
    const compiler = webpack(config);
    app.use(webpackDevMiddleware(compiler));
} else {
    app.use(express.static("buildc"));
}

app.use(async (req, res, next) => {
    if(!req.cookies.session) {
        res.locals.loggedin = false;
        return next();
    }

    let id = sessions.from(req);
    if(!id) {
        res.locals.loggedin = false;
        return next();
    }

    res.locals.id = id;
    res.locals.loggedin = true;
    
    next();
});
// setup locals for pug
app.use(async (req, res, next) => {
    if(!res.locals.loggedin) return next();
    let [user] = await db("users").select().where("id", res.locals.id);
    res.locals.username = user.username;

    next();
});


app.get("/", async (req, res) => {
    const recents = await db("posts").orderBy("id", "desc").limit(10);
    const posts = await Promise.all(recents.map((r:any) => {
        return new Promise(async (resolve) => {
            let post = {
                title: r.title,
                body: r.body,
                created: r.created,
                id: r.id,
                author: {}
            };

            const [author] = await db("users").select().where("id", r.author);
            post.author = {
                username: author.username,
                avatar: author.avatar,
                id: author.id
            }

            resolve(post);
        });
    }));

    res.locals.posts = posts;

    res.render("index");
});

app.get("/register", (req, res) => {
    res.render("register");
});
app.post("/register", async (req, res) => {
    const {username, password, confpass} = req.body;

    if(!username || !password || !confpass) return res.render("register", {msg: "empty boxes"});
    if(!/^([a-zA-Z0-9_-]){4,32}$/.test(username)) return res.render("register", {msg: "bad username"});
    if(!/^([a-zA-Z0-9_-]){4,32}$/.test(password)) return res.render("register", {msg: "bad password"});

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

app.post("/logout", (req, res) => {
    if(!res.locals.loggedin) return res.redirect("/");

    res.clearCookie("session");
    res.clearCookie("username");

    res.redirect("/");
});

app.get("/post", (req, res) => {
    if(!res.locals.loggedin) res.redirect("/login");
    res.render("create");
});
app.post("/post", upload.single("file"), async (req, res) => {
    const {title, body} = req.body;

    let id = res.locals.id;

    const [pid] = await db("posts").insert({
        created: new Date(), 
        title: title.substring(0, 100) || "unnamed",
        body: body.substring(0, 3000) || "",
        author: id,
        attachment: (req.file) ? req.file.filename : null
    });
    
    res.redirect(`/posts/${pid}`);
});

app.get("/posts/:id", async (req, res, next) => {
    const [post] = await db("posts").select().where("id", req.params.id);
    if(!post) return next();
    
    let fpost = {
        title: post.title,
        created: post.created,
        author: {},
        body: post.body,
        attachment: post.attachment
    };

    let [user] = await db("users").select().where("id", post.author);
    fpost.author = {
        username: user.username,
        id: user.id
    };

    res.locals.fpost = fpost;
    res.render("post");
}, (req, res, next) => {
    res.render("404");
});

app.get("/users/:id", async (req, res, next) => {
    const [user] = await db("users").select().where("id", req.params.id);
    if(!user) return next();

    let fuser = {
        created: user.created,
        username: user.username,
        about: user.about || "(no bio)",
        avatar: user.avatar
    };

    res.locals.fuser = fuser;
    res.render("user");
});


app.get("*", (req, res) => {
    res.render("404");
});

app.listen(process.env.PORT || "8080", () => {
    console.log("Server Started.");
});