const path = require("node:path")
const fs = require("node:fs/promises")

const {
	autoRu,
	cancelAutoRu,
	fetchCatalogBrands,
	fetchCatalogModels,
	getDefaultBrandCatalog,
	getDefaultSettings,
	getSelectedBrandRuns,
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
	const normalized = normalizeSettingsOrDefault(settings)
	const city = normalized.city
	const defaultListingUrl = `https://auto.ru/${city}/cars/new/?output_type=list`
	return {
		url: process.env.AUTO_RU_LISTING_URL || defaultListingUrl,
		city,
		browser: {
			executablePath: process.env.CHROME_EXECUTABLE_PATH || chromePaths.chrome,
		},
		userDataDir: path.join(app.getPath("userData"), "puppeteer-profile"),
		brands: getSelectedBrandRuns(settings),
		years: normalized.years,
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
		try {
			if (!(await exists(userSettingsPath))) {
				return getDefaultSettings()
			}
			return await loadSettings(userSettingsPath)
		} catch (error) {
			console.error("get-settings:", error)
			return getDefaultSettings()
		}
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

	ipcMain.handle("fetch-brands", async () => {
		try {
			const settings = await readParserSettings(
				userSettingsPath,
				projectSettingsPath,
			)
			const effectiveOptions = createEffectiveOptions(app, settings)
			const items = await fetchCatalogBrands(effectiveOptions)
			return { ok: true, items }
		} catch (error) {
			console.error("fetch-brands:", error)
			return {
				ok: false,
				error: error?.message || String(error),
				items: getDefaultBrandCatalog(),
			}
		}
	})

	ipcMain.handle("fetch-models", async (_event, payload) => {
		const brandId =
			payload && typeof payload === "object" && payload.brandId
				? String(payload.brandId)
				: ""
		if (!brandId) {
			return { ok: false, error: "brandId required", items: [] }
		}
		try {
			const settings = await readParserSettings(
				userSettingsPath,
				projectSettingsPath,
			)
			const effectiveOptions = createEffectiveOptions(app, settings)
			const items = await fetchCatalogModels(effectiveOptions, brandId)
			return { ok: true, items }
		} catch (error) {
			console.error("fetch-models:", error)
			return {
				ok: false,
				error: error?.message || String(error),
				items: [],
			}
		}
	})
}

module.exports = { registerIpcHandlers }
