import { getConfig } from "../config.js"
import * as store from "../store.js"
import { runAutoRu } from "./orchestrator.js"

export async function action(options = getConfig().autoRu) {
	return runAutoRu(options, {
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
	})
}
