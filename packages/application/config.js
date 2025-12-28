import "dotenv/config"

import chromePaths from "chrome-paths"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadSettings() {
	try {
		const settingsPath = path.join(
			__dirname,
			"..",
			"..",
			"auto-ru-settings.json",
		)
		if (fs.existsSync(settingsPath)) {
			const data = fs.readFileSync(settingsPath, "utf-8")
			const settings = JSON.parse(data)

			if (settings && Array.isArray(settings.brands)) {
				const brands = settings.brands
					.map((b) => {
						if (typeof b === "string") return b
						if (b && typeof b === "object")
							return b.id ?? (b.name ? String(b.name).toLowerCase() : "")
						return ""
					})
					.filter(Boolean)

				return {
					brands,
					years: settings.years ?? { from: 2023, to: 2025 },
				}
			}
		}
	} catch (error) {
		console.log(
			"Не удалось загрузить настройки, используем по умолчанию:",
			error.message,
		)
	}

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

export function saveSettings(newSettings) {
	try {
		const settingsPath = path.join(
			__dirname,
			"..",
			"..",
			"auto-ru-settings.json",
		)
		fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2))
		return true
	} catch (error) {
		console.error("Ошибка сохранения настроек:", error)
		return false
	}
}
