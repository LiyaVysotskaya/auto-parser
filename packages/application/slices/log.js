import { createSlice } from "@reduxjs/toolkit"

export const slice = createSlice({
	name: "log",
	initialState: [],
	reducers: {
		push(state, action) {
			const level = action.payload.level ?? "info"
			state.unshift({ ...action.payload, level })
			if (state.length > 100) state.splice(100)
		},
	},
})
