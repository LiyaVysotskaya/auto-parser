const { BrowserWindow } = require("electron")

function createMainWindow() {
	const mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 1000,
		minHeight: 700,
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
		},
	})

	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
	return mainWindow
}

module.exports = { createMainWindow }
