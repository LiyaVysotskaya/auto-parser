const { contextBridge, ipcRenderer } = require("electron/renderer")

contextBridge.exposeInMainWorld("electronAPI", {
	autoRu: () => ipcRenderer.send("autoRu"),
	autoRuCancel: () => ipcRenderer.send("autoRu:cancel"),
	onActions: (callback) =>
		ipcRenderer.on("actions", (_event, action) => callback(action)),
	getSettings: () => ipcRenderer.invoke("get-settings"),
	saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
	fetchBrandsFromAutoRu: () => ipcRenderer.invoke("fetch-brands"),
	fetchModelsFromAutoRu: (brandId) =>
		ipcRenderer.invoke("fetch-models", { brandId }),
})
