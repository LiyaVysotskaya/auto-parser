require("dotenv").config()
const webpack = require("webpack")
const rules = require("./webpack.rules")

rules.push(
	{
		test: /\.css$/,
		use: [{ loader: "style-loader" }, { loader: "css-loader" }],
	},
	{
		test: /\.jsx?$/,
		use: {
			loader: "babel-loader",
			options: {
				exclude: /node_modules/,
				presets: ["@babel/preset-react"],
			},
		},
	},
)

module.exports = {
	module: {
		rules,
	},
	plugins: [
		new webpack.DefinePlugin({
			"process.env.ELECTRON_RENDERER_AUTH_ENDPOINT": JSON.stringify(
				process.env.ELECTRON_RENDERER_AUTH_ENDPOINT,
			),
		}),
	],
}
