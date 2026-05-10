import "dotenv/config"

import chromePaths from "chrome-paths"
import path from "path"
import { fileURLToPath } from "url"

import {
	getSelectedBrandIds,
	loadSettingsSync,
	saveSettingsSync,
} from "./settings/index.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const settingsPath = path.join(__dirname, "..", "..", "auto-ru-settings.json")

function loadSettings() {
	const settings = loadSettingsSync(settingsPath)
	return {
		brands: getSelectedBrandIds(settings),
		years: settings.years,
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

export function saveSettings(newSettings) {
	try {
		saveSettingsSync(settingsPath, newSettings)
		return true
	} catch (error) {
		console.error("Ошибка сохранения настроек:", error)
		return false
	}
}
