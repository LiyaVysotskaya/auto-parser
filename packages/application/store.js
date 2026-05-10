import { configureStore } from "@reduxjs/toolkit"

import * as autoRu from "./slices/auto-ru.js"
import * as favorites from "./slices/favorites.js"
import * as log from "./slices/log.js"
import * as settings from "./slices/settings.js"

export { autoRu, favorites, log, settings }

const actionListeners = new Set()

const actionObserverMiddleware = () => (next) => (action) => {
	const result = next(action)
	for (const listener of actionListeners) {
		listener(action)
	}
	return result
}

export function subscribeToActions(listener) {
	actionListeners.add(listener)
	return () => actionListeners.delete(listener)
}

export function createStore() {
	return configureStore({
		reducer: {
			autoRu: autoRu.slice.reducer,
			favorites: favorites.slice.reducer,
			log: log.slice.reducer,
			settings: settings.slice.reducer,
		},
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({}).concat(actionObserverMiddleware),
	})
}

export const instance = createStore()
