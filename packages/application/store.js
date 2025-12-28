import { configureStore } from "@reduxjs/toolkit"
import createSagaMiddleware from "redux-saga"

import * as autoRu from "./slices/auto-ru.js"
import * as log from "./slices/log.js"
import * as settings from "./slices/settings.js"

export { autoRu, log, settings }

export const sagaMiddleware = createSagaMiddleware({})

export const instance = configureStore({
	reducer: {
		autoRu: autoRu.slice.reducer,
		log: log.slice.reducer,
		settings: settings.slice.reducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({}).concat(sagaMiddleware),
})

sagaMiddleware.run(autoRu.saga)
