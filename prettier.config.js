export default {
	overrides: [
		{
			files: ["*.js"],
			options: {
				parser: "babel",
				semi: false,
				useTabs: true,
				quoteProps: "consistent",
				trailingComma: "all",
				htmlWhitespaceSensitivity: "ignore",
				singleAttributePerLine: true,
				plugins: [
					"@trivago/prettier-plugin-sort-imports",
					"prettier-plugin-jsdoc",
				],
				importOrder: [
					"^dotenv",
					"^node:(.*)$",
					"react",
					"<THIRD_PARTY_MODULES>",
					"^[./]",
				],
				importOrderSeparation: true,
				importOrderSortSpecifiers: true,
				importOrderParserPlugins: ["jsx"],
			},
		},
		{
			files: ["*.json"],
			options: {
				parser: "json",
				useTabs: true,
			},
		},
		{
			files: ["README.hbs"],
			options: {
				parser: "markdown",
			},
		},
	],
}
