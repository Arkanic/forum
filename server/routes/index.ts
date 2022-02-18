import express from "express";
import {Context} from "../server";

export default (ctx:Context) => {
    const {app, dbc} = ctx;
    app.get("/", async (req, res) => {
        const recents = await dbc.fetchRecentPosts(100);
        const posts = await Promise.all(recents.map((r: any) => {
            return new Promise(async (resolve) => {
                r.comments = JSON.parse(r.comments);
                let post = {
                    title: r.title,
                    body: r.body,
                    created: r.created,
                    id: r.id,
                    author: {},
                    commentcount: r.comments.length
                };

                const author = await dbc.getById("users", r.author);
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
}