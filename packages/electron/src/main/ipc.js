const path = require("node:path")
const fs = require("node:fs/promises")

const {
	autoRu,
	cancelAutoRu,
	getDefaultSettings,
	getSelectedBrandIds,
	loadSettings,
	normalizeSettingsOrDefault,
	saveSettings,
} = require("@market-slice/application")
const chromePaths = require("chrome-paths")

async function exists(filePath) {
	try {
		await fs.access(filePath)
		return true
	} catch {
		return false
	}
}

async function readParserSettings(userSettingsPath, projectSettingsPath) {
	if (await exists(userSettingsPath)) {
		return loadSettings(userSettingsPath)
	}
	if (await exists(projectSettingsPath)) {
		return loadSettings(projectSettingsPath)
	}
	return getDefaultSettings()
}

function createEffectiveOptions(app, settings) {
	return {
		url:
			process.env.AUTO_RU_LISTING_URL ||
			"https://auto.ru/sankt-peterburg/cars/new/?output_type=list",
		browser: {
			executablePath: process.env.CHROME_EXECUTABLE_PATH || chromePaths.chrome,
		},
		userDataDir: path.join(app.getPath("userData"), "puppeteer-profile"),
		brands: getSelectedBrandIds(settings),
		years: settings.years,
	}
}

function registerIpcHandlers({ app, ipcMain }) {
	const userSettingsPath = path.join(
		app.getPath("userData"),
		"auto-ru-settings.json",
	)
	const projectSettingsPath = path.join(
		__dirname,
		"..",
		"..",
		"auto-ru-settings.json",
	)

	ipcMain.on("autoRu:cancel", () => {
		cancelAutoRu()
	})

	ipcMain.on("autoRu", async () => {
		try {
			const settings = await readParserSettings(
				userSettingsPath,
				projectSettingsPath,
			)
			const effectiveOptions = createEffectiveOptions(app, settings)

			console.info("Запуск парсера с опциями:", effectiveOptions)

			autoRu
				.action(effectiveOptions)
				.catch((err) =>
					console.error(
						"Ошибка в autoRu.action:",
						err && err.stack ? err.stack : err,
					),
				)
		} catch (error) {
			console.error(
				"Ошибка при обработке autoRu IPC:",
				error && error.stack ? error.stack : error,
			)
		}
	})

	ipcMain.handle("get-settings", async () => {
		if (!(await exists(userSettingsPath))) {
			return getDefaultSettings()
		}
		return loadSettings(userSettingsPath)
	})

	ipcMain.handle("save-settings", async (event, settings) => {
		try {
			await saveSettings(userSettingsPath, normalizeSettingsOrDefault(settings))
			return true
		} catch (error) {
			console.error("Error saving settings:", error)
			return false
		}
	})
}

module.exports = { registerIpcHandlers }
