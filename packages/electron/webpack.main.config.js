const path = require("path")

module.exports = {
	entry: "./src/main.js",
	module: {
		rules: require("./webpack.rules"),
	},
	resolve: {
		alias: {
			"@market-slice/application": path.resolve(
				__dirname,
				"../application/lib/index.js",
			),
			"@market-slice/auto-ru": path.resolve(__dirname, "../auto-ru/index.js"),
			"@market-slice/ui": path.resolve(__dirname, "../ui/index.js"),
		},
	},
	externalsType: "commonjs",
	externals: {
		"puppeteer-core": "puppeteer-core",
		"puppeteer-extra": "puppeteer-extra",
		"puppeteer-extra-plugin-stealth": "puppeteer-extra-plugin-stealth",
	},
}
