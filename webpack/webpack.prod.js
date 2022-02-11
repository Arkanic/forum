const {merge} = require("webpack-merge");
const common = require("./webpack.common");

const TerserJSPlugin = require("terser-webpack-plugin");

module.exports = merge(common, {
    mode: "production",

    optimization: {
        minimizer: [
            new TerserJSPlugin({})
        ],
        usedExports: true
    }
});