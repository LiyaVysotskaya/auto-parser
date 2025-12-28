import { createSlice } from "@reduxjs/toolkit"

export const list = []

export const slice = createSlice({
	name: "log",
	initialState: [],
	reducers: {
		push(
			state, action,
		) {
			const level = action.payload.level ?? "info"
			state.unshift({ ...action.payload, level })
			state.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
			state.slice(0, 100)
			list.unshift(action.payload)
			list.slice(0, 1000)
		},
	},
})
