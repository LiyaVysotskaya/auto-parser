import { createSlice } from "@reduxjs/toolkit"
import _ from "lodash"

const initialState = {
	brands: [
		{ id: "exeed", name: "Exeed", selected: true },
		{ id: "geely", name: "Geely", selected: true },
		{ id: "haval", name: "Haval", selected: true },
		{ id: "chery", name: "Chery", selected: true },
		{ id: "omoda", name: "Omoda", selected: true },
		{ id: "jaecoo", name: "Jaecoo", selected: true },
		{ id: "belgee", name: "Belgee", selected: true },
		{ id: "jetour", name: "Jetour", selected: true },
		{ id: "aito", name: "Aito", selected: true },
		{ id: "seres", name: "Seres", selected: true },
		{ id: "tenet", name: "Tenet", selected: true },
	],
	years: { from: 2023, to: 2025 },
}

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
