export {
	DEFAULT_YEARS,
	getDefaultBrandIds,
	getDefaultSettings,
} from "./defaults.js"
export {
	getSelectedBrandIds,
	normalizeSettingsOrDefault,
	normalizeStoredSettings,
} from "./normalize.js"
export {
	loadSettings,
	loadSettingsSync,
	saveSettings,
	saveSettingsSync,
} from "./persistence.js"
