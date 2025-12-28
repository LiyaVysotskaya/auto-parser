const path = require("path")

module.exports = [
	{
		test: /native_modules[/\\].+\.node$/,
		use: "node-loader",
	},
	{
		test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
		parser: { amd: false },
		use: {
			loader: "@vercel/webpack-asset-relocator-loader",
			options: {
				outputAssetBase: "native_modules",
			},
		},
	},
	{
		test: /\.js$/,
		include: [
			path.resolve(__dirname, "../application"),
			path.resolve(__dirname, "../auto-ru"),
			path.resolve(__dirname, "../ui"),
		],
		use: {
			loader: "babel-loader",
			options: {
				presets: [["@babel/preset-env", { targets: { node: "current" } }]],
			},
		},
	},
]
