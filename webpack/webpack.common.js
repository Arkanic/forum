const path = require("path");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");

function relative(dir) {
    return path.resolve(__dirname, dir);
}

module.exports = {
    stats: {
        children: true
    },

    entry: {
        common: relative("../client/common/index.ts")
    },
    output: {
        filename: "[name].js",
        path: relative("../buildc")
    },

    resolve: {
        extensions: [
            ".ts", ".tsx",
            ".js"
        ]
    },
    module: {
        rules: [
            {
                test: /.tsx?/,
                exclude: /node_modules/,
                loader: "ts-loader"
            }
        ]
    },

    plugins: [
        new CleanWebpackPlugin({})
    ]
}