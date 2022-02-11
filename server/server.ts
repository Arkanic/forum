import express from "express";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";

const config = require("../webpack/webpack.dev");

const app = express();

if(process.env.NODE_ENV == "development") {
    const compiler = webpack(config);
    app.use(webpackDevMiddleware(compiler));
} else {
    app.use(express.static("buildc"));
}

app.listen(process.env.PORT || "8080", () => {
    console.log("Server Started.");
});