import React, { useCallback, useEffect, useState } from "react"
import { RouterProvider, createMemoryRouter } from "react-router-dom"

import { App as AntdApp, ConfigProvider, theme } from "antd"
import "normalize.css"

import { initialEntries, routes } from "./pages/index.js"

const router = createMemoryRouter(routes(), {
	initialEntries,
})

export function App() {
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
