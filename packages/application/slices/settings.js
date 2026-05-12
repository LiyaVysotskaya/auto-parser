import { createSlice } from "@reduxjs/toolkit"

import { getDefaultSettings } from "../settings/defaults.js"

export { normalizeStoredSettings } from "../settings/normalize.js"

const initialState = getDefaultSettings()

export const slice = createSlice({
	name: "settings",
	initialState: structuredClone(initialState),
	reducers: {
		updateBrands(state, action) {
			state.brands = action.payload
		},
		toggleBrand(state, action) {
			const brandId = action.payload
			const brand = state.brands.find((b) => b.id === brandId)
			if (brand) {
				brand.selected = !brand.selected
			}
		},
		updateYears(state, action) {
			state.years = action.payload
		},
		updateCity(state, action) {
			state.city = action.payload
		},
		setSettings(state, action) {
			return { ...state, ...action.payload }
		},
		reset() {
			return structuredClone(initialState)
		},
	},
})

export const {
	updateBrands,
	toggleBrand,
	updateYears,
	updateCity,
	setSettings,
	reset,
} = slice.actions
export default slice.reducer
