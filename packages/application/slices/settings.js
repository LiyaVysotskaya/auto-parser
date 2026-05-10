import { createSlice } from "@reduxjs/toolkit"
import _ from "lodash"

import { getDefaultSettings } from "../settingsDefaults.js"

export function normalizeStoredSettings(saved) {
	if (!saved || !Array.isArray(saved.brands)) return null
	return {
		...saved,
		brands: saved.brands.map((b) => {
			if (typeof b === "string") {
				const id = String(b).toLowerCase()
				const name = String(b).charAt(0).toUpperCase() + String(b).slice(1)
				return { id, name, selected: true }
			}
			return {
				id: b.id ?? String(b.name ?? "").toLowerCase(),
				name: b.name ?? (b.id ? String(b.id).toUpperCase() : ""),
				selected: typeof b.selected === "boolean" ? b.selected : true,
			}
		}),
	}
}

const initialState = getDefaultSettings()

export const slice = createSlice({
	name: "settings",
	initialState: _.cloneDeep(initialState),
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
		setSettings(state, action) {
			return { ...state, ...action.payload }
		},
		reset() {
			return _.cloneDeep(initialState)
		},
	},
})

export const { updateBrands, toggleBrand, updateYears, setSettings, reset } =
	slice.actions
export default slice.reducer
