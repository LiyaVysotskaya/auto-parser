import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react"

const STORAGE_KEY = "market-slice-theme"

const ThemeContext = createContext({
	mode: "system",
	setMode: () => {},
	isDark: false,
})

export function useTheme() {
	return useContext(ThemeContext)
}

function getSystemDark() {
	return window.matchMedia("(prefers-color-scheme:dark)").matches
}

export function ThemeProvider({ children }) {
	const [mode, setModeRaw] = useState(() => {
		try {
			return localStorage.getItem(STORAGE_KEY) || "system"
		} catch {
			return "system"
		}
	})

	const [systemDark, setSystemDark] = useState(getSystemDark)

	useEffect(() => {
		const mql = window.matchMedia("(prefers-color-scheme:dark)")
		const handler = (e) => setSystemDark(e.matches)
		mql.addEventListener("change", handler)
		return () => mql.removeEventListener("change", handler)
	}, [])

	const setMode = useCallback((m) => {
		setModeRaw(m)
		try {
			localStorage.setItem(STORAGE_KEY, m)
		} catch {}
	}, [])

	const isDark = mode === "dark" ? true : mode === "light" ? false : systemDark

	return (
		<ThemeContext.Provider value={{ mode, setMode, isDark }}>
			{children}
		</ThemeContext.Provider>
	)
}
