import { configureStore } from "@reduxjs/toolkit"
import createSagaMiddleware from "redux-saga"

import * as autoRu from "./slices/auto-ru.js"
import * as log from "./slices/log.js"

export { autoRu, log }

export const sagaMiddleware = createSagaMiddleware({})

export const instance = configureStore({
	reducer: {
		autoRu: autoRu.slice.reducer,
		log: log.slice.reducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({}).concat(sagaMiddleware),
})

sagaMiddleware.run(autoRu.saga)
