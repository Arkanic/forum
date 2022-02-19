import express from "express";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";

import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import bodyParser from "body-parser";


import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);


import auth from "./routes/auth";
import content from "./routes/content";
import create from "./routes/create";
import index from "./routes/index";


import database, {DbConnection} from "./db";
import s, { Sessions } from "./session";

export interface Context {
    app:express.Application,
    dbc:DbConnection,
    sessions:Sessions
}


database().then(db => {
    const sessions = s();
    const dbConnection = new DbConnection(db);

    const config = require("../webpack/webpack.dev");

    const app = express();

    app.set("view engine", "pug");
    app.set("views", "./views");
    app.use(fileUpload({}));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());

    app.use(express.static("static"));
    app.use("/files", express.static("./fdata/files/"));

    if (process.env.NODE_ENV == "development") {
        const compiler = webpack(config);
        app.use(webpackDevMiddleware(compiler));
    } else {
        app.use(express.static("buildc"));
    }

    app.use(async (req, res, next) => {
        if (!req.cookies.session) {
            res.locals.loggedin = false;
            return next();
        }

        let id = sessions.from(req);
        if (!id) {
            res.locals.loggedin = false;
            return next();
        }

        res.locals.id = id;
        res.locals.loggedin = true;

        next();
    });
    // setup locals for pug
    app.use(async (req, res, next) => {
        if (!res.locals.loggedin) return next();
        let [user] = await db("users").select().where("id", res.locals.id);
        res.locals.username = user.username;

        next();
    });


    let ctx:Context = {
        app,
        dbc: dbConnection,
        sessions
    };

    auth(ctx);
    content(ctx);
    create(ctx);
    index(ctx);


    app.get("*", (req, res) => {
        res.render("404");
    });

    app.listen(process.env.PORT || "8080", () => {
        console.log("Server Started.");
    });
});