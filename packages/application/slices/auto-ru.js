import { createSlice } from "@reduxjs/toolkit"
import _ from "lodash"

const initialState = {
	count: 0,
	status: null,
	report: [],
	pagination: null,
	lastRun: {
		startIso: null,
		startMs: null,
		endIso: null,
		endMs: null,
		durationMs: null,
	},
}

export const slice = createSlice({
	name: "autoRu",
	initialState: _.cloneDeep(initialState),
	reducers: {
		offer(state, action) {
			const payload = action.payload
			const pagination =
				payload && typeof payload === "object" && "pagination" in payload
					? payload.pagination
					: undefined
			state.count++
			if (pagination !== undefined && pagination !== null) {
				state.pagination = pagination
			}
		},
		status(state, action) {
			state.status = action.payload
		},
		report(state, action) {
			state.report = action.payload
		},
		setLastRun(state, action) {
			state.lastRun = { ...state.lastRun, ...action.payload }
		},
		reset() {
			return _.cloneDeep(initialState)
		},
	},
})
