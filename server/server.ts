import express from "express";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";

const config = require("../webpack/webpack.dev");

const app = express();

app.set("view engine", "pug");
app.set("views", "./views");
app.use(express.static("static"));

if(process.env.NODE_ENV == "development") {
    const compiler = webpack(config);
    app.use(webpackDevMiddleware(compiler));
} else {
    app.use(express.static("buildc"));
}

app.get("/", (req, res) => {
    res.render("index");
});

app.listen(process.env.PORT || "8080", () => {
    console.log("Server Started.");
});