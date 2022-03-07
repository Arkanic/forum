import express from "express";
import {Context} from "../server";
import {PermissionCodes} from "../permissions";

function removeItem<T>(arr:Array<T>, value:T):Array<T> {
    let index = arr.indexOf(value);
    if(index > -1) arr.splice(index, 1);
    return arr;
}

export default (ctx:Context) => {
    const {app, dbc, permissions} = ctx;

    app.post("/posts/:id/delete", async (req, res) => {
        if(!res.locals.loggedin) return res.redirect("/login");
        
        const {id} = req.params;
        let post = await dbc.getPost(id);
        if(!post) return res.render("message", {message: "Post does not exist", redirectto: "/"});

        if(!(res.locals.id === post.author || permissions.hasFlag(res.locals.permissions, PermissionCodes.Delete))) {
            return res.render("message", {message: "You don't have permission to delete this", redirectto: "/"});
        }

        await dbc.deleteById("posts", id);

        res.render("message", {message: "Post successfully deleted!", redirectto: "/"});
    });
    app.post("/comments/:id/delete", async (req, res) => {
        if(!res.locals.loggedin) return res.redirect("/login");

        let {id} = req.params;

        let comment = await dbc.getById("comments", id);
        if(!comment) return res.render("message", {message: "Comment does not exist", redirectto: "/"});

        if(!(res.locals.id === comment.author || permissions.hasFlag(res.locals.permissions, PermissionCodes.Delete))) {
            return res.render("message", {message: "You don't have permission to delete this", redirectto: "/"});
        }

        let post = await dbc.getPost(comment.parent);
        post.comments = removeItem(post.comments, parseInt(id));
        await dbc.updatePost(comment.parent, {comments: post.comments});
        await dbc.deleteById("comments", id);


        res.render("message", {message: "Comment successfully deleted!", redirectto: "/"});
    });
    app.post("/users/:id/permissions", async (req, res) => {
        if(!res.locals.loggedin) return res.render("/login");

        let {id} = req.params;
        if(!id) return res.render("message", {message: "Invalid data", redirectto: "/"});

        let redirect = `/users/${id}/`;
        let user = await dbc.getById("users", id);
        if(!user) return res.render("message", {message: "User does not exist", redirectto: redirect});
        
        if(!res.locals.captchavalid) return res.render("message", {message: res.locals.captchamsg, redirectto: redirect});

        if(!permissions.hasFlag(res.locals.permissions, PermissionCodes.Admin)) {
            return res.render("message", {message: "You don't have permission to modify roles.", redirectto: redirect});
        }

        let perms = "";
        let vals:Array<string> = Object.values(PermissionCodes);
        for(let i in vals) {
            if(req.body[vals[i]]) {
                perms += vals[i];
            }
        }

        if(res.locals.id === user.id && !perms.includes(PermissionCodes.Admin)) {
            return res.render("message", {message: "You can't self demote admin", redirectto: redirect});
        }

        await dbc.updateById("users", id, {permissions: perms});

        return res.render("message", {message: "Success. Permissions have been updated.", redirectto: redirect});
    });
}