import fs from "fs"
import fsp from "fs/promises"

import { normalizeSettingsOrDefault } from "./normalize.js"

export function loadSettingsSync(settingsPath, fallbackSettings = null) {
	try {
		if (!fs.existsSync(settingsPath))
			return normalizeSettingsOrDefault(fallbackSettings)
		const data = fs.readFileSync(settingsPath, "utf-8")
		return normalizeSettingsOrDefault(JSON.parse(data))
	} catch (error) {
		return normalizeSettingsOrDefault(fallbackSettings)
	}
}

export async function loadSettings(settingsPath, fallbackSettings = null) {
	try {
		const data = await fsp.readFile(settingsPath, "utf-8")
		return normalizeSettingsOrDefault(JSON.parse(data))
	} catch (error) {
		return normalizeSettingsOrDefault(fallbackSettings)
	}
}

export function saveSettingsSync(settingsPath, settings) {
	fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
}

export async function saveSettings(settingsPath, settings) {
	await fsp.writeFile(settingsPath, JSON.stringify(settings, null, 2))
}
