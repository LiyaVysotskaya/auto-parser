import React, { useEffect } from "react"
import { useDispatch } from "react-redux"
import { RouterProvider, createMemoryRouter } from "react-router-dom"

import { getDefaultSettings } from "@market-slice/application/settings/defaults.js"
import { normalizeStoredSettings } from "@market-slice/application/settings/normalize.js"
import { setFavorites } from "@market-slice/application/slices/favorites.js"
import { setSettings } from "@market-slice/application/slices/settings.js"
import { App as AntdApp, ConfigProvider, theme } from "antd"
import ruRU from "antd/es/locale/ru_RU.js"
import dayjs from "dayjs"
import "dayjs/locale/ru.js"
import "normalize.css"

import { electron } from "./electron.js"
import "./global.css"
import { initialEntries, routes } from "./pages/index.js"
import { ThemeProvider, useTheme } from "./theme-context.js"
import { buildAntdTheme } from "./theme-tokens.js"

dayjs.locale("ru")

const antdLocale = ruRU?.default ?? ruRU

const router = createMemoryRouter(routes(), {
	initialEntries,
})

function AppInner() {
	const dispatch = useDispatch()
	const { isDark } = useTheme()

	useEffect(() => {
		let mounted = true
		;(async () => {
			try {
				if (!electron?.getSettings) return
				const saved = await electron.getSettings()
				if (!mounted) return
				const normalized =
					normalizeStoredSettings(saved) ?? getDefaultSettings()
				dispatch(setSettings(normalized))
				if (electron?.favoritesList) {
					const fav = await electron.favoritesList()
					if (mounted && fav?.ok) dispatch(setFavorites(fav.items || []))
				}
			} catch {
				if (!mounted) return
				dispatch(setSettings(getDefaultSettings()))
			}
		})()
		return () => {
			mounted = false
		}
	}, [dispatch])

	/* Светлая тема без compact — крупнее типографика и удобнее для «рабочего» дашборда */
	const algorithms = isDark
		? [theme.darkAlgorithm, theme.compactAlgorithm]
		: [theme.defaultAlgorithm]
	const tk = buildAntdTheme(isDark)

	return (
		<ConfigProvider
			locale={antdLocale}
			theme={{
				algorithm: algorithms,
				token: tk.token,
				components: tk.components,
			}}
		>
			<AntdApp>
				<RouterProvider router={router} />
			</AntdApp>
		</ConfigProvider>
	)
}

export function App() {
	return (
		<ThemeProvider>
			<AppInner />
		</ThemeProvider>
	)
}
