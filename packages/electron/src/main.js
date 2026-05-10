const { app, BrowserWindow, ipcMain } = require("electron")

const { registerIpcHandlers } = require("./main/ipc")
const { registerStoreSync } = require("./main/store-sync")
const { createMainWindow } = require("./main/window")

if (require("electron-squirrel-startup")) {
	app.quit()
}

const createWindow = () => {
	const mainWindow = createMainWindow()
	const unsubscribeStoreSync = registerStoreSync(mainWindow)
	mainWindow.on("closed", unsubscribeStoreSync)
}

app.whenReady().then(() => {
	registerIpcHandlers({ app, ipcMain })
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
