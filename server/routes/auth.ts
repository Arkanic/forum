import {Context} from "../server";
import bcrypt from "bcrypt";
import genCaptcha, {randLetters} from "../captcha";

export default (ctx:Context) => {
    const {app, dbc, sessions} = ctx;

    let map:Map<string, string> = new Map();

    app.get("/register", (req, res) => {
        let id = randLetters(32);
        let captcha = genCaptcha();

        res.locals.captcha = {
            image: captcha.image,
            id
        };
        map.set(id, captcha.text);

        res.render("register");
    });
    app.post("/register", async (req, res) => {
        let cid = randLetters(32);
        let ccaptcha = genCaptcha();

        res.locals.captcha = {
            image: ccaptcha.image,
            id: cid
        };
        map.set(cid, ccaptcha.text);
        const { username, password, confpass, captcha, captchaid } = req.body;

        if(!username || !password || !confpass) return res.render("register", { msg: "empty boxes" });
        if(!/^([a-zA-Z0-9_-]){4,32}$/.test(username)) return res.render("register", { msg: "bad username" });

        if(!captcha || !captchaid) return res.render("register", {msg: "bad captcha"});
        let right = map.get(captchaid);
        if(!right) return res.render("register", {msg: "stop screwing around"});
        if(captcha !== right) return res.render("register", {msg: "invalid captcha"});
        
        const user = await dbc.getByUsername("users", username);
        if(user) return res.render("register", { msg: "username is already taken" });

        const created = Date.now();
        const id = await dbc.insert("users", {username, created});
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                await dbc.insert("passwords", {id, hash});

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
        const { username, password } = req.body;

        if (!username || !password) return res.render("login", { msg: "empty boxes" });

        const msg = "Username or password is incorrect.";

        const user = await dbc.getByUsername("users", username);
        if (!user) return res.render("login", { msg });

        const pword = await dbc.getById("passwords", user.id);
        bcrypt.compare(password, pword.hash, (err, result) => {
            if (!result) return res.render("login", { msg });

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
}