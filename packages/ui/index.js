import React from "react"
import { createRoot } from "react-dom/client"
import { Provider as StoreProvider } from "react-redux"

import * as store from "@market-slice/application/store"

import { setSettings } from "../application/slices/settings.js"
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
;(async () => {
	try {
		if (electron?.getSettings) {
			const saved = await electron.getSettings()
			if (saved && typeof saved === "object") {
				let normalized = { ...saved }
				if (Array.isArray(saved.brands) && saved.brands.length > 0) {
					normalized.brands = saved.brands.map((b) => {
						if (typeof b === "string") {
							const id = String(b).toLowerCase()
							const name =
								String(b).charAt(0).toUpperCase() + String(b).slice(1)
							return { id, name, selected: true }
						}
						return {
							id: b.id ?? String(b.name ?? "").toLowerCase(),
							name: b.name ?? (b.id ? String(b.id).toUpperCase() : ""),
							selected: typeof b.selected === "boolean" ? b.selected : true,
						}
					})
				}
				if (!normalized.years) normalized.years = { from: 2023, to: 2025 }
				store.instance.dispatch(setSettings(normalized))
			}
		}
	} catch (err) {
		console.warn("Не удалось загрузить настройки из main:", err)
	}
})()
