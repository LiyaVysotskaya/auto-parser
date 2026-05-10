import _ from "lodash"

const { app, BrowserWindow, ipcMain } = require("electron")
const {
	DEFAULT_YEARS,
	store,
	autoRu,
	getDefaultBrandIds,
	getDefaultSettings,
} = require("@market-slice/application")
const { takeEvery } = require("redux-saga/effects")

const path = require("node:path")
const fs = require("node:fs/promises")
const chromePaths = require("chrome-paths")

if (require("electron-squirrel-startup")) {
	app.quit()
}

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 1000,
		minHeight: 700,
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
			webSecurity: false,
		},
	})

	ipcMain.on("autoRu", async () => {
		try {
			const settingsPath = path.join(
				app.getPath("userData"),
				"auto-ru-settings.json",
			)
			let saved = null
			try {
				const data = await fs.readFile(settingsPath, "utf-8")
				saved = JSON.parse(data)
			} catch (err) {
				console.warn(
					"Не удалось прочитать сохранённые настройки, используем defaults:",
					err.message,
				)
			}

			let brands = []
			let years = { ...DEFAULT_YEARS }
			if (saved && Array.isArray(saved.brands)) {
				brands = saved.brands
					.filter((b) => b && b.selected === true)
					.map((b) => (typeof b === "string" ? b : b.id))
					.filter(Boolean)
			}
			if (saved && saved.years) {
				years = saved.years
			}

			if (!brands.length) {
				try {
					const proj = await fs.readFile(
						path.join(__dirname, "..", "..", "auto-ru-settings.json"),
						"utf-8",
					)
					const projSettings = JSON.parse(proj)
					if (
						Array.isArray(projSettings.brands) &&
						projSettings.brands.length
					) {
						brands = projSettings.brands
							.map((b) => (typeof b === "string" ? b : b.id || b))
							.filter(Boolean)
					}
					if (projSettings.years) years = projSettings.years
				} catch (err) {
					console.warn(
						"Нет проектного settings файла, используем полный набор брендов",
					)
					brands = getDefaultBrandIds()
				}
			}

			const effectiveOptions = {
				url:
					process.env.AUTO_RU_LISTING_URL ||
					"https://auto.ru/sankt-peterburg/cars/new/?output_type=list",
				browser: {
					executablePath:
						process.env.CHROME_EXECUTABLE_PATH || chromePaths.chrome,
				},
				userDataDir: path.join(app.getPath("userData"), "puppeteer-profile"),
				brands,
				years,
			}

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
			const settingsPath = path.join(
				app.getPath("userData"),
				"auto-ru-settings.json",
			)
			const data = await fs.readFile(settingsPath, "utf-8")
			return JSON.parse(data)
		} catch (error) {
			return getDefaultSettings()
		}
	})

	ipcMain.handle("save-settings", async (event, settings) => {
		try {
			const settingsPath = path.join(
				app.getPath("userData"),
				"auto-ru-settings.json",
			)
			await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2))
			return true
		} catch (error) {
			console.error("Error saving settings:", error)
			return false
		}
	})

	store.sagaMiddleware.run(function* () {
		let buffer = []
		const send = _.throttle(() => {
			mainWindow.webContents.send("actions", buffer)
			buffer = []
		}, 3000)
		yield takeEvery("*", function (action) {
			buffer.push(action)
			send()
		})
	})

	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
	// Open the DevTools.
	// mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
	createWindow()

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit()
	}
})

app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors")
