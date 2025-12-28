import * as autoRuTools from "@market-slice/auto-ru"
import { createSlice } from "@reduxjs/toolkit"
import _ from "lodash"
import { cancel, put, takeEvery } from "redux-saga/effects"

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
			state.count++
			state.pagination = action.payload.pagination
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

export function* saga() {
	let generator, task
	yield takeEvery(slice.actions.reset.type, function* () {
		generator?.return()
		if (task) yield cancel(task)
		let offers = []
		generator = autoRuTools.report()
		task = yield takeEvery(slice.actions.offer.type, function* (action) {
			if (offers.find(({ id }) => action.payload.offer.id === id)) return
			yield put(
				slice.actions.report(
					_.cloneDeep(generator.next(action.payload.offer).value),
				),
			)
			offers.push(action.payload.offer)
		})
	})
}
