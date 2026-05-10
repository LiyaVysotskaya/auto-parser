import "dotenv/config"

import chromePaths from "chrome-paths"
import path from "path"
import { fileURLToPath } from "url"

import {
	getParseCityIds,
	getSelectedBrandRuns,
	loadSettingsSync,
	normalizeSettingsOrDefault,
	saveSettingsSync,
} from "./settings/index.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const settingsPath = path.join(__dirname, "..", "..", "auto-ru-settings.json")

function loadSettings() {
	const raw = loadSettingsSync(settingsPath)
	const settings = normalizeSettingsOrDefault(raw)
	return {
		brands: getSelectedBrandRuns(settings),
		years: settings.years,
		city: settings.city,
		cities: getParseCityIds(settings),
	}
}

const settings = loadSettings()
const listingUrl =
	process.env.AUTO_RU_LISTING_URL ??
	`https://auto.ru/${settings.city}/cars/new/?output_type=list`

const config = {
	autoRu: {
		browser: {
			executablePath: process.env.CHROME_EXECUTABLE_PATH ?? chromePaths.chrome,
		},
		url: listingUrl,
		city: settings.city,
		cities: settings.cities,
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
