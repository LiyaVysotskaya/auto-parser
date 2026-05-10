const path = require("node:path")
const fs = require("node:fs/promises")

const {
	autoRu,
	cancelAutoRu,
	fetchCatalogBrands,
	fetchCatalogModels,
	getDefaultBrandCatalog,
	getDefaultSettings,
	getParseCityIds,
	getSelectedBrandRuns,
	loadSettings,
	normalizeSettingsOrDefault,
	saveSettings,
} = require("@market-slice/application")
const chromePaths = require("chrome-paths")

const priceHistoryDb = require("./price-history-db.js")

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
	const cities = getParseCityIds(normalized)
	const defaultListingUrl = `https://auto.ru/${city}/cars/new/?output_type=list`
	return {
		url: process.env.AUTO_RU_LISTING_URL || defaultListingUrl,
		city,
		cities,
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
				.action(effectiveOptions, {
					onPersistRun: (payload) => {
						try {
							priceHistoryDb.persistRun(app, payload)
						} catch (err) {
							console.error("price-history persistRun:", err)
						}
					},
				})
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

	ipcMain.handle("price-history-list-runs", async (_event, filters) => {
		try {
			return { ok: true, runs: priceHistoryDb.listRuns(app, filters || {}) }
		} catch (error) {
			console.error("price-history-list-runs:", error)
			return { ok: false, runs: [], error: error?.message || String(error) }
		}
	})

	ipcMain.handle("price-history-query-offers", async (_event, filters) => {
		try {
			return {
				ok: true,
				rows: priceHistoryDb.queryOffers(app, filters || {}),
			}
		} catch (error) {
			console.error("price-history-query-offers:", error)
			return { ok: false, rows: [], error: error?.message || String(error) }
		}
	})

	ipcMain.handle("price-history-meta", async () => {
		try {
			return { ok: true, meta: priceHistoryDb.filterMeta(app) }
		} catch (error) {
			console.error("price-history-meta:", error)
			return {
				ok: false,
				meta: { brands: [], dealers: [], cities: [], models: [] },
				error: error?.message || String(error),
			}
		}
	})

	ipcMain.handle("price-history-export", async (_event, range) => {
		try {
			const data = priceHistoryDb.exportHistory(app, range || {})
			return { ok: true, data }
		} catch (error) {
			console.error("price-history-export:", error)
			return { ok: false, data: null, error: error?.message || String(error) }
		}
	})

	ipcMain.handle("price-history-import", async (_event, data) => {
		try {
			const result = priceHistoryDb.importHistory(app, data)
			return { ok: true, ...result }
		} catch (error) {
			console.error("price-history-import:", error)
			return {
				ok: false,
				imported: 0,
				skipped: 0,
				error: error?.message || String(error),
			}
		}
	})

	ipcMain.handle("price-history-clear", async () => {
		try {
			priceHistoryDb.clearHistory(app)
			return { ok: true }
		} catch (error) {
			console.error("price-history-clear:", error)
			return { ok: false, error: error?.message || String(error) }
		}
	})

	ipcMain.handle("price-history-diff", async (_event, { runIdA, runIdB }) => {
		try {
			if (!runIdA || !runIdB) {
				return { ok: false, rows: [], error: "runIdA and runIdB required" }
			}
			return {
				ok: true,
				rows: priceHistoryDb.diffRuns(app, Number(runIdA), Number(runIdB)),
			}
		} catch (error) {
			console.error("price-history-diff:", error)
			return { ok: false, rows: [], error: error?.message || String(error) }
		}
	})

	ipcMain.handle("favorites-list", async () => {
		try {
			return { ok: true, items: priceHistoryDb.listFavorites(app) }
		} catch (error) {
			console.error("favorites-list:", error)
			return { ok: false, items: [], error: error?.message || String(error) }
		}
	})

	ipcMain.handle("favorites-add", async (_event, row) => {
		try {
			priceHistoryDb.addFavorite(app, row)
			return { ok: true }
		} catch (error) {
			console.error("favorites-add:", error)
			return { ok: false, error: error?.message || String(error) }
		}
	})

	ipcMain.handle("favorites-remove", async (_event, row) => {
		try {
			priceHistoryDb.removeFavorite(app, row)
			return { ok: true }
		} catch (error) {
			console.error("favorites-remove:", error)
			return { ok: false, error: error?.message || String(error) }
		}
	})
}

module.exports = { registerIpcHandlers }
