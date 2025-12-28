import "dotenv/config"

import chromePaths from "chrome-paths"

function loadSettings() {
	// Всегда используем предустановленные настройки
	return {
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
			"tenet",
		],
		years: { from: 2023, to: 2025 },
	}
}

const settings = loadSettings()

const config = {
	autoRu: {
		browser: {
			executablePath: process.env.CHROME_EXECUTABLE_PATH ?? chromePaths.chrome,
		},
		url:
			process.env.AUTO_RU_LISTING_URL ??
			"https://auto.ru/sankt-peterburg/cars/new/?output_type=list",
		brands: settings.brands,
		years: settings.years,
	},
}

export function getConfig() {
	return config
}
