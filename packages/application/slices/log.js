import { createSlice } from "@reduxjs/toolkit"

export const list = []

export const slice = createSlice({
	name: "log",
	initialState: [],
	reducers: {
		push(state, action) {
			const level = action.payload.level ?? "info"
			state.unshift({ ...action.payload, level })
			state.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
			if (state.length > 100) state.splice(100)
			list.unshift({ ...action.payload, level })
			if (list.length > 1000) list.splice(1000)
		},
	},
})
