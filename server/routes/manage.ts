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
}