import { createSlice } from "@reduxjs/toolkit"

import { offerIdentityKey } from "../lib/offer-key.js"

const initialState = {
	items: [],
}

export const slice = createSlice({
	name: "favorites",
	initialState: structuredClone(initialState),
	reducers: {
		setFavorites(state, action) {
			state.items = Array.isArray(action.payload) ? action.payload : []
		},
		addFavorite(state, action) {
			const row = action.payload
			if (!row?.brand || !row?.model) return
			const k = offerIdentityKey(row)
			if (state.items.some((x) => offerIdentityKey(x) === k)) return
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
			const k = offerIdentityKey(row)
			state.items = state.items.filter((x) => offerIdentityKey(x) !== k)
		},
	},
})

export const { setFavorites, addFavorite, removeFavorite } = slice.actions
