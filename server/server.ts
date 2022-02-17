import path from "path";
import fs from "fs";

import express from "express";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";

import cookieParser from "cookie-parser";
import fileUpload, { UploadedFile } from "express-fileupload";
import bodyParser from "body-parser";

import bcrypt from "bcrypt";
import {customAlphabet} from "nanoid";
import mime from "mime";

import database from "./db";
import s from "./session";
import { getJSDocImplementsTags, isConstructorDeclaration, parseIsolatedEntityName } from "typescript";

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
app.use(fileUpload({}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.use(express.static("static"));
app.use("/files", express.static("./fdata/files/"));

if(process.env.NODE_ENV == "development") {
    const compiler = webpack(config);
    app.use(webpackDevMiddleware(compiler));
} else {
    app.use(express.static("buildc"));
}

const DATA_DIR = "fdata";
const FILE_DIR = "files";

const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const fnanoid = customAlphabet(alphabet, 32);

function manipFile(req:express.Request):string {
    if(!req.files) return "";

    let file:fileUpload.UploadedFile = req.files.file as any as fileUpload.UploadedFile;

    let fpath = `./${DATA_DIR}/${FILE_DIR}`;
    let name = `${fnanoid()}${path.extname(file.name)}`;
    
    file.mv(`${fpath}/${name}`);

    return name;
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
    const recents = await db("posts").orderBy("id", "desc").limit(100);
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
    if(!res.locals.loggedin) return res.redirect("/login");
    res.render("create");
});
app.post("/post", async (req, res) => {
    if(!res.locals.loggedin) res.redirect("/login"); // stop

    const {title, body} = req.body;

    let name;
    if(req.files) name = manipFile(req);

    let id = res.locals.id;

    const [pid] = await db("posts").insert({
        created: new Date(), 
        title: title.substring(0, 100) || "unnamed",
        body: body.substring(0, 3000) || "",
        author: id,
        attachment: (req.files) ? name : null,
        comments: "[]"
    });
    
    res.redirect(`/posts/${pid}`);
});

app.get("/profile", async (req, res) => {
    if(!res.locals.loggedin) return res.redirect("/login");

    const [user] = await db("users").select().where("id", res.locals.id);
    res.locals.profile = {
        bio: user.about
    }

    res.render("profile");
});
app.post("/profile", async (req, res) => {
    if(!res.locals.loggedin) return res.redirect("/login");

    const {bio} = req.body;

    if(bio) {
        await db("users").update({about:bio}).where("id", res.locals.id);
    }

    if(req.files) if(req.files.file) {
        let mime = (req.files.file as UploadedFile).mimetype
        if(!(mime == "image/png" || mime == "image/jpeg" || mime == "image/gif" || mime == "image/bmp" || mime == "image/webp")) return res.redirect("/profile");

        let file = manipFile(req);
        await db("users").update({avatar:file}).where("id", res.locals.id);
    }

    res.redirect(`/users/${res.locals.id}`);
});

app.get("/comment", (req, res) => {
    res.redirect("/");
});
app.post("/comment", async (req, res) => {
    if(!res.locals.loggedin) return res.redirect("/login");

    const {body, id} = req.body;
    if(!body || !id) return res.redirect("/");

    let [post] = await db("posts").select().where("id", id);
    if(!post) return res.redirect("/");

    let [cid] = await db("comments").insert({
        created: new Date(),
        body: body.substring(0, 1000),
        author: res.locals.id,
    });

    post.comments = JSON.parse(post.comments);

    let comments = post.comments || [];
    comments.push(cid);
    await db("posts").update({comments: JSON.stringify(comments)}).where("id", id);

    res.redirect(`/posts/${id}`);
});

app.get("/posts/:id", async (req, res, next) => {
    const [post] = await db("posts").select().where("id", req.params.id);
    if(!post) return res.render("404");
    
    let fpost:any = {
        title: post.title,
        created: post.created,
        author: {},
        comments: [],
        body: post.body,
        attachment: post.attachment,
        amime: mime.getType(post.attachment),
        id: post.id
    };

    let [user] = await db("users").select().where("id", post.author);
    fpost.author = {
        username: user.username,
        id: user.id,
        avatar: user.avatar
    };

    post.comments = JSON.parse(post.comments);

    let comments:any[] = [];
    for(let i in post.comments) {
        let id = post.comments[i];

        let [comment] = await db("comments").select().where("id", id);
        let fcomment = {
            author: {},
            created: comment.created,
            body: comment.body
        }

        let [cuser] = await db("users").select().where("id", comment.author);
        fcomment.author = {
            username: cuser.username,
            id: cuser.id,
            avatar: cuser.avatar
        }

        comments.push(fcomment);
    }
    fpost.comments = comments;

    res.locals.fpost = fpost;
    res.render("post");
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