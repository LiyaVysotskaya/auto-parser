import React from "react"
import { createRoot } from "react-dom/client"
import { Provider as StoreProvider } from "react-redux"

import * as store from "@market-slice/application/store"

import { App } from "./app.js"
import { electron } from "./electron.js"

const root = createRoot(document.getElementById("app"))
root.render(
	<React.StrictMode>
		<StoreProvider store={store.instance}>
			<App />
		</StoreProvider>
	</React.StrictMode>,
)

electron?.onActions((actions) => {
	actions.forEach((action) => store.instance.dispatch(action))
})
