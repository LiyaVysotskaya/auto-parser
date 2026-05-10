import { getConfig } from "../config.js"
import * as store from "../store.js"
import { runAutoRu } from "./orchestrator.js"

let currentAbortController = null

function dispatchCallbacks() {
	return {
		onStatus: (status) =>
			store.instance.dispatch(store.autoRu.slice.actions.status(status)),
		onLastRun: (lastRun) =>
			store.instance.dispatch(store.autoRu.slice.actions.setLastRun(lastRun)),
		onOffer: (offer) =>
			store.instance.dispatch(store.autoRu.slice.actions.offer(offer)),
		onReport: (report) =>
			store.instance.dispatch(store.autoRu.slice.actions.report(report)),
		onLog: (entry) =>
			store.instance.dispatch(store.log.slice.actions.push(entry)),
	}
}

export async function action(options = getConfig().autoRu, hooks = {}) {
	const controller = new AbortController()
	currentAbortController?.abort()
	currentAbortController = controller
	const signal = controller.signal

	try {
		return await runAutoRu(
			options,
			{ ...dispatchCallbacks(), ...hooks },
			signal,
		)
	} finally {
		if (currentAbortController === controller) {
			currentAbortController = null
		}
	}
}

export function cancelAutoRu() {
	currentAbortController?.abort()
}
