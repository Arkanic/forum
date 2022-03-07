import express from "express";
import {Context} from "../server";
import {PermissionCodes, CodeNameMap} from "../permissions";
import mime from "mime";
import path from "path";

import TimeAgo from "javascript-time-ago";

const timeAgo = new TimeAgo("en-GB");

export default (ctx:Context) => {
    const {app, dbc, permissions} = ctx;

    app.get("/files/:name", async (req, res, next) => {
        if(!permissions.hasFlag(res.locals.permissions, PermissionCodes.View)) {
            return res.render("message", {message: "You don't have permission to view files!", redirectto: "/"});
        }

        const file = await dbc.getFile(req.params.name);
        if(!file) return res.render("404");

        res.set("Content-Type", mime.getType(path.extname(file.name)) || "text/plain");

        res.send(file.data);
    });

    app.get("/posts/:id", async (req, res, next) => {
        if(!ctx.permissions.hasFlag(res.locals.permissions, PermissionCodes.View)) {
            return res.render("message", {message: "You don't have permission to view posts!", redirectto: "/"});
        }

        const post = await dbc.getPost(req.params.id);
        if(!post) return res.render("404");

        let fpost: any = {
            title: post.title,
            created: post.created,
            author: {},
            comments: [],
            body: post.body,
            attachment: post.attachment,
            amime: mime.getType(post.attachment),
            id: post.id,
        };

        let user = await dbc.getById("users", post.author);
        fpost.author = {
            username: user.username,
            id: user.id,
            avatar: user.avatar
        };

        let del:any = {};
        if(res.locals.id === user.id || permissions.hasFlag(res.locals.permissions, PermissionCodes.Delete)) del.canDelete = true;
        else del.canDelete = false;
        del.id = post.id;
        del.type = "post";
        res.locals.del = del;

        let comments: any[] = [];
        for(let i in post.comments) {
            let id = post.comments[i];

            let comment = await dbc.getById("comments", id);

            let del:any = {};
            if(res.locals.loggedin && (res.locals.id === comment.author || permissions.hasFlag(res.locals.permissions, PermissionCodes.Delete))) del.canDelete = true;
            else del.canDelete = false;
            del.id = post.id;
            del.type = "comment";

            let fcomment = {
                author: {},
                created: timeAgo.format(comment.created),
                body: comment.body,
                id: comment.id,
                del
            }

            let cuser = await dbc.getById("users", comment.author);
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
        if(!ctx.permissions.hasFlag(res.locals.permissions, PermissionCodes.View)) {
            return res.render("message", {message: "You don't have permission to view users!", redirectto: "/"});
        }

        const user = await dbc.getById("users", req.params.id);
        if (!user) return next();

        let perms:any = {canModify: false};
        if(res.locals.loggedin && permissions.hasFlag(res.locals.permissions, PermissionCodes.Admin)) perms.canModify = true;
        perms.perms = CodeNameMap;
        perms.id = req.params.id;
        perms.permissions = user.permissions

        res.locals.perms = perms;

        let fuser = {
            created: user.created,
            username: user.username,
            about: user.about || "(no bio)",
            avatar: user.avatar
        };

        res.locals.fuser = fuser;
        res.render("user");
    });
}