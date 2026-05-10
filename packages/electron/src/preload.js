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
	priceHistoryListRuns: (filters) =>
		ipcRenderer.invoke("price-history-list-runs", filters),
	priceHistoryQueryOffers: (filters) =>
		ipcRenderer.invoke("price-history-query-offers", filters),
	priceHistoryMeta: () => ipcRenderer.invoke("price-history-meta"),
	priceHistoryExport: (range) =>
		ipcRenderer.invoke("price-history-export", range),
	priceHistoryImport: (data) =>
		ipcRenderer.invoke("price-history-import", data),
	priceHistoryClear: () => ipcRenderer.invoke("price-history-clear"),
	priceHistoryDiff: (payload) =>
		ipcRenderer.invoke("price-history-diff", payload),
	favoritesList: () => ipcRenderer.invoke("favorites-list"),
	favoritesAdd: (row) => ipcRenderer.invoke("favorites-add", row),
	favoritesRemove: (row) => ipcRenderer.invoke("favorites-remove", row),
})
