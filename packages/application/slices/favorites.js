import { createSlice } from "@reduxjs/toolkit"
import _ from "lodash"

function keyOf(row) {
	return [
		row.brand,
		row.model,
		row.equipment,
		row.modification,
		String(row.year ?? ""),
	].join("\u0000")
}

const initialState = {
	items: [],
}

export const slice = createSlice({
	name: "favorites",
	initialState: _.cloneDeep(initialState),
	reducers: {
		setFavorites(state, action) {
			state.items = Array.isArray(action.payload) ? action.payload : []
		},
		addFavorite(state, action) {
			const row = action.payload
			if (!row?.brand || !row?.model) return
			const k = keyOf(row)
			if (state.items.some((x) => keyOf(x) === k)) return
			state.items.push({
				brand: row.brand,
				model: row.model,
				equipment: row.equipment ?? "—",
				modification: row.modification ?? "—",
				year: String(row.year ?? "—"),
			})
		},
		removeFavorite(state, action) {
			const row = action.payload
			const k = keyOf(row)
			state.items = state.items.filter((x) => keyOf(x) !== k)
		},
	},
})

export const { setFavorites, addFavorite, removeFavorite } = slice.actions
