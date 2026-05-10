const { store } = require("@market-slice/application")

const forwardedActionTypes = new Set([
	store.autoRu.slice.actions.offer.type,
	store.autoRu.slice.actions.status.type,
	store.autoRu.slice.actions.report.type,
	store.autoRu.slice.actions.setLastRun.type,
	store.autoRu.slice.actions.reset.type,
	store.log.slice.actions.push.type,
	store.settings.slice.actions.updateBrands.type,
	store.settings.slice.actions.toggleBrand.type,
	store.settings.slice.actions.updateYears.type,
	store.settings.slice.actions.updateCity.type,
	store.settings.slice.actions.setSettings.type,
	store.settings.slice.actions.reset.type,
])

function registerStoreSync(mainWindow) {
	let buffer = []
	let sendTimer = null

	return store.subscribeToActions((action) => {
		if (!forwardedActionTypes.has(action.type)) return
		buffer.push(action)
		if (sendTimer) return

		sendTimer = setTimeout(() => {
			mainWindow.webContents.send("actions", buffer)
			buffer = []
			sendTimer = null
		}, 3000)
	})
}

module.exports = { registerStoreSync }
