const express = require("express");
const mongoose = require("mongoose");
const parser = {
    body: require("body-parser"),
    cookie: require("cookie-parser")
};
const User = require("./models/user");
const {auth} = require("./middleware/auth");
const db = require("./config/config").get(process.env.NODE_ENV);

const app = express();

app.use(parser.body.urlencoded({extended: false}));
app.use(parser.body.json());
app.use(parser.cookie());

mongoose.Promise = global.Promise;
mongoose.connect(db.DATABASE, {useNewUrlParser: true, useUnifiedTopology: true}, err => {
    if(err) throw err;
    console.log("Database connected");
});

