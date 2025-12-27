import "dotenv/config"

import chromePaths from "chrome-paths"

let value = {
	autoRu: {
		browser: {
			// @ts-ignore
			executablePath: process.env.CHROME_EXECUTABLE_PATH ?? chromePaths.chrome,
		},
		url:
			process.env.AUTO_RU_LISTING_URL ??
			"https://auto.ru/sankt-peterburg/cars/new/?output_type=list",
		brands: [
			"exeed",
			"geely",
			"haval",
			"chery",
			"omoda",
			"jaecoo",
			"belgee",
			"jetour",
			"aito",
			"seres",
		],
		years: { from: 2023, to: 2025 },
	},
}

/**
 * @param {object} [next]
 * @param {object} [next.autoRu]
 * @param {object} next.autoRu.browser
 * @param {string} next.autoRu.browser.executablePath
 * @param {string} next.autoRu.url
 * @returns {{
 * 	autoRu: {
 * 		browser: {
 * 			executablePath: string
 * 		}
 * 		url: string
 * 	}
 * }}
 */
export function config(next) {
	if (next) value = { ...value, ...next }
	return value
}
