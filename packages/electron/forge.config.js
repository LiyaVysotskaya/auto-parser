require("dotenv").config()
const { exec } = require("node:child_process")
const path = require("node:path")
const { FusesPlugin } = require("@electron-forge/plugin-fuses")
const { FuseV1Options, FuseVersion } = require("@electron/fuses")

module.exports = {
	packagerConfig: {
		name: "market-slice",
		asar: true,
		extraResource: "externals/node_modules",
		beforeCopyExtraResources: [
			(_buildPath, _electronVersion, _platform, _arch, callback) => {
				exec(
					"npm i",
					{
						cwd: path.join(__dirname, "externals"),
					},
					callback,
				)
			},
		],
	},
	rebuildConfig: {},
	makers: [
		{
			name: "@electron-forge/maker-squirrel",
			config: {
				name: "market-slice",
			},
		},
		{
			name: "@electron-forge/maker-zip",
			platforms: ["darwin"],
		},
		{
			name: "@electron-forge/maker-deb",
			config: {},
		},
		{
			name: "@electron-forge/maker-rpm",
			config: {},
		},
	],
	plugins: [
		{
			name: "@electron-forge/plugin-auto-unpack-natives",
			config: {},
		},
		{
			name: "@electron-forge/plugin-webpack",
			config: {
				mainConfig: "./webpack.main.config.js",
				devContentSecurityPolicy: "connect-src 'self' 'unsafe-eval'",
				port: 9000,
				loggerPort: 9001,
				renderer: {
					config: "./webpack.renderer.config.js",
					entryPoints: [
						{
							html: "./src/index.html",
							js: "./src/renderer.js",
							name: "main_window",
							preload: {
								js: "./src/preload.js",
							},
						},
					],
				},
			},
		},
		new FusesPlugin({
			version: FuseVersion.V1,
			[FuseV1Options.RunAsNode]: false,
			[FuseV1Options.EnableCookieEncryption]: true,
			[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
			[FuseV1Options.EnableNodeCliInspectArguments]: false,
			[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
			[FuseV1Options.OnlyLoadAppFromAsar]: true,
		}),
	],
}
