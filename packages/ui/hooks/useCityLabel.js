import { useMemo } from "react"
import { useSelector } from "react-redux"

import { mergeCityOptions } from "@market-slice/application/settings/defaults.js"

export function useCityLabel() {
	const extraCities = useSelector((s) => s.settings.extraCities)
	return useMemo(() => {
		const opts = mergeCityOptions(extraCities ?? [])
		const byId = new Map(opts.map((c) => [String(c.id), c.name]))
		return (id) => {
			if (id == null || id === "" || id === "—") return "—"
			const s = String(id)
			return byId.get(s) ?? s
		}
	}, [extraCities])
}
