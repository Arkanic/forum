import express from "express";
import {Context} from "../server";
import path from "path";
import {customAlphabet} from "nanoid";
import fileUpload, {UploadedFile} from "express-fileupload";
import {Knex} from "knex";

const DATA_DIR = "fdata";
const FILE_DIR = "files";

const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const fnanoid = customAlphabet(alphabet, 32);

async function manipFile(req:express.Request, ctx:Context):Promise<string> {
    if(!req.files) return "";

    const {dbc} = ctx;

    let file:fileUpload.UploadedFile = req.files.file as any as fileUpload.UploadedFile;
    let name = `${fnanoid()}${path.extname(file.name)}`;
    
    const fid = dbc.insert("files", {
        name,
        data: file.data
    });

    return name;
}

export default (ctx:Context) => {
    const {app, dbc} = ctx;

    app.get("/post", (req, res) => {
        if(!res.locals.loggedin) return res.redirect("/login");
        res.render("create");
    });
    app.post("/post", async (req, res) => {
        if(!res.locals.loggedin) return res.redirect("/login"); // stop
    
        const {title, body} = req.body;
    
        let name;
        if(req.files) name = await manipFile(req, ctx);
    
        let id = res.locals.id;
    
        const pid = await dbc.insert("posts", {
            created: new Date(), 
            title: (title || "unnamed").substring(0, 100),
            body: (body || "(no post)").substring(0, 3000),
            author: id,
            attachment: (req.files) ? name : null,
            comments: "[]"
        });
        
        res.redirect(`/posts/${pid}`);
    });
    
    app.get("/profile", async (req, res) => {
        if(!res.locals.loggedin) return res.redirect("/login");
    
        const user = await dbc.getById("users", res.locals.id);
        res.locals.profile = {
            bio: user.about
        }
    
        res.render("profile");
    });
    app.post("/profile", async (req, res) => {
        if(!res.locals.loggedin) return res.redirect("/login");
    
        const {bio} = req.body;
    
        if(bio) {
            await dbc.updateById("users", res.locals.id, {about:bio});
        }
    
        if(req.files) if(req.files.file) {
            let mime = (req.files.file as UploadedFile).mimetype
            if(!(mime == "image/png" || mime == "image/jpeg" || mime == "image/gif" || mime == "image/bmp" || mime == "image/webp")) return res.redirect("/profile");
    
            let file = await manipFile(req, ctx);
            await dbc.updateById("users", res.locals.id, {avatar:file});
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
    
        let post = await dbc.getById("posts", id);
        if(!post) return res.redirect("/");
    
        let cid = await dbc.insert("comments", {
            created: new Date(),
            body: body.substring(0, 1000),
            author: res.locals.id,
        });
    
        post.comments = JSON.parse(post.comments);
    
        let comments = post.comments || [];
        comments.push(cid);
        await dbc.updatePost(id, {comments});
    
        res.redirect(`/posts/${id}`);
    });
}