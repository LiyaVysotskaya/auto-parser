module.exports = {
	entry: "./src/main.js",
	module: {
		rules: require("./webpack.rules"),
	},
	externalsType: "commonjs",
	externals: {
		"puppeteer-core": "puppeteer-core",
		"puppeteer-extra": "puppeteer-extra",
		"puppeteer-extra-plugin-stealth": "puppeteer-extra-plugin-stealth",
	},
}
