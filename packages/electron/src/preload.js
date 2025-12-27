const { contextBridge, ipcRenderer } = require("electron/renderer")

contextBridge.exposeInMainWorld("electronAPI", {
	autoRu: () => ipcRenderer.send("autoRu"),
	onActions: (callback) =>
		ipcRenderer.on("actions", (_event, action) => callback(action)),
})
