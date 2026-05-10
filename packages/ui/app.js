import React, { useCallback, useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { RouterProvider, createMemoryRouter } from "react-router-dom"

import { normalizeStoredSettings } from "@market-slice/application/settings/normalize.js"
import { setSettings } from "@market-slice/application/slices/settings.js"
import { App as AntdApp, ConfigProvider, theme } from "antd"
import "normalize.css"

import { electron } from "./electron.js"
import { initialEntries, routes } from "./pages/index.js"

const router = createMemoryRouter(routes(), {
	initialEntries,
})

export function App() {
	const dispatch = useDispatch()
	const [darkMode, setDarkMode] = useState(false)
	const windowQuery = window.matchMedia("(prefers-color-scheme:dark)")

	const darkModeChange = useCallback((event) => {
		setDarkMode(event.matches ? true : false)
	}, [])

	useEffect(() => {
		windowQuery.addEventListener("change", darkModeChange)
		return () => {
			windowQuery.removeEventListener("change", darkModeChange)
		}
	}, [windowQuery, darkModeChange])

	useEffect(() => {
		setDarkMode(windowQuery.matches ? true : false)
	}, [])

	useEffect(() => {
		let mounted = true
		;(async () => {
			try {
				if (!electron?.getSettings) return
				const saved = await electron.getSettings()
				if (!mounted) return
				const normalized = normalizeStoredSettings(saved)
				if (normalized) dispatch(setSettings(normalized))
			} catch {
				/* userData или IPC недоступны — остаётся initialState */
			}
		})()
		return () => {
			mounted = false
		}
	}, [dispatch])

	return (
		<ConfigProvider
			theme={{
				algorithm: darkMode ? theme.darkAlgorithm : theme.compactAlgorithm,
			}}
		>
			<AntdApp>
				<RouterProvider router={router} />
			</AntdApp>
		</ConfigProvider>
	)
}
