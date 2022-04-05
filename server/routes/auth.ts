import {Context} from "../server";
import bcrypt from "bcrypt";
import {PermissionCodes} from "../permissions";

export default (ctx:Context) => {
    const {app, dbc, sessions} = ctx;

    app.get("/register", (req, res) => {
        res.render("register");
    });
    app.post("/register", async (req, res) => {
        const {username, password, confpassword} = req.body;

        if(!username || !password || !confpassword) return res.render("message", {message: "You are missing some data", redirectto: "/register"});
        if(!/^([a-zA-Z0-9_-]){4,32}$/.test(username)) return res.render("message", {message: "Username is not in the correct format!", redirectto: "/register"});

        if(!res.locals.captchavalid) return res.render("message", {message: res.locals.captchamsg, redirectto: "/register"});
        
        const user = await dbc.getByUsername("users", username);
        if(user) return res.render("message", {message: "username is already taken", redirectto: "/register"});

        if(password !== confpassword) return res.render("message", {message: "Passwords don't match", redirectto: "/register"});

        const created = Date.now();
        let permissions = ctx.permissions.defaultUserPermissions();
        if(res.locals.firstaccount) permissions += `${PermissionCodes.Admin}${PermissionCodes.Delete}`;
        const id = await dbc.insert("users", {username, created, permissions});
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                await dbc.insert("passwords", {id, hash});

                return res.render("message", {message: "Success. Now try logging in.", redirectto: "/login"});
            });
        });
    });

    app.get("/login", (req, res) => {
        res.render("login");
    });
    app.post("/login", async (req, res) => {
        const { username, password } = req.body;

        if(!username || !password) return res.render("message", {message: "You are missing some data", redirectto: "/login"});

        if(!res.locals.captchavalid) return res.render("message", {message: res.locals.captchamsg, redirectto: "/login"});

        const msg = "Username or password is incorrect.";

        const user = await dbc.getByUsername("users", username);
        if (!user) return res.render("message", {message: msg, redirectto: "/login"});

        const pword = await dbc.getById("passwords", user.id);
        bcrypt.compare(password, pword.hash, (err, result) => {
            if (!result) return res.render("message", {message: msg, redirectto: "/login"});

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