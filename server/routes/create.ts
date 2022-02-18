import express from "express";
import {Context} from "../server";
import path from "path";
import {customAlphabet} from "nanoid";
import fileUpload, {UploadedFile} from "express-fileupload";

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

export default (ctx:Context) => {
    const {app, db} = ctx;

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
}