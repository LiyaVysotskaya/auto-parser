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
}
