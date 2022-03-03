import path from "path";

import express from "express";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";

import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import bodyParser from "body-parser";


import {nanoid} from "nanoid";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);


import auth from "./routes/auth";
import content from "./routes/content";
import create from "./routes/create";
import index from "./routes/index";


import database, {DbConnection} from "./db";
import s, {Sessions} from "./session";
import genCaptcha from "./captcha";

export interface Context {
    app:express.Application,
    dbc:DbConnection,
    sessions:Sessions
}


database(process.env.NODE_ENV).then(db => {
    const sessions = s();
    const dbConnection = new DbConnection(db);

    const config = require("../webpack/webpack.dev");

    const app = express();

    app.set("view engine", "pug");
    app.set("views", path.join(__dirname, "../views"));
    app.use(fileUpload({
        limits: {
            fileSize: 8388608 // 8mb
        },
        abortOnLimit: true
    }));
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(cookieParser());

    app.use(express.static("static"));

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

    
    // captcha setup (one is generated for every request, whether it is used or not is optional)
    let captchaMap:Map<string, string> = new Map();
    app.use((req, res, next) => {
        if(req.method == "POST") {
            const {captcha, captchaid} = req.body;
            if(!captcha || !captchaid) res.locals.captchamsg = "invalid data";
            else {
                let right = captchaMap.get(captchaid);
                captchaMap.delete(captchaid);
                if(!right) res.locals.captchamsg = "stop messing around";
                else {
                    if(captcha !== right) res.locals.captchamsg = "invalid input";
                    else {
                        res.locals.captchavalid = true;
                    }
                }
            }
        }

        let id = nanoid();
        let captcha = genCaptcha();

        res.locals.captcha = {
            image: captcha.image,
            id
        };
        captchaMap.set(id, captcha.text);

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
