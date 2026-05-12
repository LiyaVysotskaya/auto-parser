import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"

import {
	resolveReportCityScope,
	uniqueCitiesFromReport,
} from "@market-slice/application/lib/analytics.js"
import { mergeCityOptions } from "@market-slice/application/settings/defaults.js"

export function useReportCityScope(report) {
	const settings = useSelector((s) => s.settings)
	const cityIds = useMemo(() => uniqueCitiesFromReport(report), [report])
	const cityOptions = useMemo(() => {
		const opts = mergeCityOptions(settings.extraCities ?? [])
		return cityIds.map((id) => ({
			value: id,
			label: opts.find((c) => c.id === id)?.name || id,
		}))
	}, [cityIds, settings.extraCities])

	const [cityOverride, setCityOverride] = useState(null)

	useEffect(() => {
		const ids = uniqueCitiesFromReport(report)
		setCityOverride((prev) => (prev && ids.includes(prev) ? prev : null))
	}, [report])

	const effectiveScopeCity = useMemo(() => {
		if (!cityIds.length) return null
		if (cityOverride && cityIds.includes(cityOverride)) return cityOverride
		return resolveReportCityScope(report, settings) ?? cityIds[0]
	}, [report, settings, cityOverride, cityIds])

	return {
		cityIds,
		cityOptions,
		effectiveScopeCity,
		setCityOverride,
	}
}
