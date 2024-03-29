import express from "express";
import {Context} from "../server";
import path from "path";
import {customAlphabet} from "nanoid";
import fileUpload, {UploadedFile} from "express-fileupload";
import {PermissionCodes} from "../permissions";
import bcrypt from "bcrypt";

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
        if(!res.locals.loggedin) return res.redirect("/login");
        if(!ctx.permissions.hasFlag(res.locals.permissions, PermissionCodes.Post)) {
            res.render("message", {message: "You don't have permission to post!", redirectto: "/"});
        }

        if(!res.locals.captchavalid) return res.render("message", {message: res.locals.captchamsg, redirectto: "/post"});
    
        const {title, body} = req.body;
    
        let name;
        if(req.files) name = await manipFile(req, ctx);
    
        let id = res.locals.id;
    
        const pid = await dbc.insert("posts", {
            created: Date.now(), 
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
            bio: user.about,
            email: user.email
        }
    
        res.render("profile");
    });
    app.post("/profile", async (req, res) => {
        if(!res.locals.loggedin) return res.redirect("/login");
    
        const {bio, email, password, newpassword, confnewpassword} = req.body;
    
        if(bio) {
            await dbc.updateById("users", res.locals.id, {about:bio});
        }
        if(email) {
            let parts = email.split("@");
            if(parts[1] && parts[0] > 0 && parts[0] < 65 && parts[1] > 0 && parts[1] < 256) await dbc.updateById("users", res.locals.id, {email});
        }
        if(req.files) if(req.files.file) {
            let mime = (req.files.file as UploadedFile).mimetype
            if(!(mime == "image/png" || mime == "image/jpeg" || mime == "image/gif" || mime == "image/bmp" || mime == "image/webp")) return res.redirect("/profile");
    
            let file = await manipFile(req, ctx);
            await dbc.updateById("users", res.locals.id, {avatar:file});
        }
        if(password && newpassword && confnewpassword) {
            const pword = await dbc.getById("passwords", res.locals.id);
            let result = bcrypt.compareSync(password, pword.hash);
            if(!result) return res.render("message", {message: "Your password is incorrect!", redirectto: "/profile"});

            if(newpassword !== confnewpassword) return res.render("message", {message: "Passwords do not match!", redirectto: "/profile"});
            let salt = bcrypt.genSaltSync(10);
            let hash = bcrypt.hashSync(newpassword, salt);
            await dbc.updateById("passwords", res.locals.id, {hash});

            return res.render("message", {message: "Successfully changed password", redirectto: `/users/${res.locals.id}`});
        }
    
        return res.redirect(`/users/${res.locals.id}`);
    });
    
    app.get("/comment", (req, res) => {
        if(!req.body.id) return res.redirect("/");
        res.redirect(`/posts/${req.body.id}/`);
    });
    app.post("/comment", async (req, res) => {
        if(!res.locals.loggedin) return res.redirect("/login");
    
        const {body, id} = req.body;
        if(!body || !id) return res.redirect("/");

        if(!ctx.permissions.hasFlag(res.locals.permissions, PermissionCodes.Comment)) {
            return res.render("message", {message: "You don't have permission to comment!", redirectto: `/posts/${id}`});
        }

        if(!res.locals.captchavalid) return res.render("message", {message: res.locals.captchamsg, redirectto: `/posts/${id}/`});
    
        let post = await dbc.getById("posts", id);
        if(!post) return res.redirect("/");
    
        let cid = await dbc.insert("comments", {
            created: Date.now(),
            body: body.substring(0, 1000),
            author: res.locals.id,
            parent: id
        });
    
        post.comments = JSON.parse(post.comments);
    
        let comments = post.comments || [];
        comments.push(cid);
        await dbc.updatePost(id, {comments});
    
        res.redirect(`/posts/${id}`);
    });
}