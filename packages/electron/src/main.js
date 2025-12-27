import _ from "lodash"

const { app, BrowserWindow, ipcMain } = require("electron")
const { store, autoRu } = require("@market-slice/application")
const { takeEvery } = require("redux-saga/effects")

if (require("electron-squirrel-startup")) {
	app.quit()
}

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		minWidth: 800,
		minHeight: 600,
		maxWidth: 800,
		maxHeight: 600,
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
			webSecurity: false,
		},
	})

	ipcMain.on("autoRu", () => {
		autoRu.action().catch(() => {})
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
