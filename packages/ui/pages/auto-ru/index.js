import React, { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"

import {
	computeSummary,
	flattenReport,
} from "@market-slice/application/lib/analytics.js"
import { mergeCityOptions } from "@market-slice/application/settings/defaults.js"
import { Space } from "antd"
import * as dateFns from "date-fns"
import dayjs from "dayjs"

import { electron } from "../../electron.js"
import { useCityLabel } from "../../hooks/useCityLabel.js"
import { REF } from "../../theme-tokens.js"
import { DashboardActions } from "./DashboardActions.jsx"
import { DashboardCockpitG2 } from "./DashboardCockpitG2.jsx"
import { DashboardKPI } from "./DashboardKPI.jsx"
import { FavoritesCard } from "./FavoritesCard.jsx"
import { ParseConfigCard } from "./ParseConfigCard.jsx"
import { PriceMovesCard } from "./PriceMovesCard.jsx"
import { RunLogCard } from "./RunLogCard.jsx"
import { formatDuration, medianFromPrices } from "./dashboard-format.js"
import { attachPriceDeltas } from "./offer-delta.js"

export function AutoRu() {
	const autoRuState = useSelector((state) => state.autoRu)
	const settings = useSelector((state) => state.settings)
	const favorites = useSelector((state) => state.favorites.items)
	const log = useSelector((state) =>
		state.log.filter(({ scope }) => scope === "autoRu"),
	)

	const getCityLabel = useCityLabel()

	const [logFilter, setLogFilter] = useState("all")
	const [lineSeries, setLineSeries] = useState([])
	const [priceMoves, setPriceMoves] = useState([])

	const selectedBrands = (settings.brands || []).filter((b) => b.selected)
	const selectedCount = selectedBrands.length
	const totalBrands = (settings.brands || []).length
	const years = settings.years || { from: "—", to: "—" }
	const yearsText = `${years.from} — ${years.to}`

	const cityDisplay = useMemo(() => {
		const opts = mergeCityOptions(settings.extraCities ?? [])
		const hit = opts.find((c) => c.id === settings.city)
		return {
			name: hit?.name ?? settings.city ?? "—",
			slug: settings.city ?? "—",
		}
	}, [settings.city, settings.extraCities])

	const report = autoRuState.report || []

	const parseCitiesLabel = useMemo(() => {
		const ids = settings.cities?.length > 0 ? settings.cities : [settings.city]
		const opts = mergeCityOptions(settings.extraCities ?? [])
		return ids.map((id) => opts.find((c) => c.id === id)?.name || id).join(", ")
	}, [settings.cities, settings.city, settings.extraCities])

	const favoriteSnapshots = useMemo(() => {
		const { rowsFlat } = flattenReport(report)
		return (favorites || []).map((f) => {
			const matches = rowsFlat.filter(
				(r) =>
					r.brand === f.brand &&
					r.model === f.model &&
					String(r.equipment ?? "—") === String(f.equipment ?? "—") &&
					String(r.modification ?? "—") === String(f.modification ?? "—") &&
					String(r.year ?? "—") === String(f.year ?? "—"),
			)
			const priced = matches.filter((r) => r.price != null)
			const best = priced.length
				? priced.reduce((a, b) => (a.price <= b.price ? a : b))
				: null
			return { f, best }
		})
	}, [favorites, report])

	const reportSheets = report.length
	let reportRows = 0
	for (const t of report) {
		if (Array.isArray(t.rows)) reportRows += t.rows.length
	}

	const { rowsFlat } = useMemo(() => flattenReport(report), [report])
	const memSummary = useMemo(() => computeSummary(rowsFlat), [rowsFlat])

	const donutSlices = useMemo(() => {
		const DONUT_COLORS = [
			REF.acc2,
			"#854F0B",
			"#0F6E56",
			REF.acc,
			"#5DCAA5",
			"#633806",
		]
		const byBrand = new Map()
		for (const r of rowsFlat) {
			const b = r.brand || "—"
			byBrand.set(b, (byBrand.get(b) || 0) + (r.count || 0))
		}
		const entries = [...byBrand.entries()].sort((a, b) => b[1] - a[1])
		return entries.map(([name, value], i) => ({
			name,
			value,
			color: DONUT_COLORS[i % DONUT_COLORS.length],
		}))
	}, [rowsFlat])

	const last = autoRuState.lastRun || {}
	const lastStart = last.startIso
		? dateFns.format(new Date(last.startIso), "dd MM yyyy HH:mm")
		: "—"
	const lastDuration = formatDuration(last.durationMs)

	const isPending = autoRuState.status === "pending"
	const pagination = autoRuState.pagination
	const progressPct =
		isPending && pagination?.total_offers_count && autoRuState.count
			? Math.min(
					99,
					Math.round((autoRuState.count / pagination.total_offers_count) * 100),
				)
			: 0

	const filteredLog = useMemo(() => {
		if (logFilter === "all") return log
		return log.filter((r) => r.level === logFilter)
	}, [log, logFilter])

	useEffect(() => {
		let cancelled = false
		async function loadHistoryCharts() {
			if (
				!electron?.priceHistoryListRuns ||
				!electron?.priceHistoryQueryOffers
			) {
				if (!cancelled) {
					setLineSeries([])
					setPriceMoves([])
				}
				return
			}
			const dateFrom = dayjs()
				.subtract(45, "day")
				.startOf("day")
				.format("YYYY-MM-DD[T]HH:mm:ss")
			const dateTo = dayjs().endOf("day").format("YYYY-MM-DD[T]HH:mm:ss")
			const lr = await electron.priceHistoryListRuns({ dateFrom, dateTo })
			if (cancelled || !lr?.ok) return
			const runs = [...(lr.runs || [])].slice(0, 14).reverse()
			const ids = runs.map((r) => r.id).filter(Boolean)
			if (!ids.length) {
				setLineSeries([])
			} else {
				const q = await electron.priceHistoryQueryOffers({
					dateFrom,
					dateTo,
					runIds: ids,
				})
				if (cancelled || !q?.ok) return
				const rows = attachPriceDeltas([...(q.rows || [])])
				const byRun = new Map()
				for (const r of rows) {
					if (r.price == null) continue
					const t = String(r.run_started || "")
					if (!t) continue
					if (!byRun.has(t)) byRun.set(t, [])
					byRun.get(t).push(r)
				}
				const pts = [...byRun.entries()]
					.sort((a, b) => a[0].localeCompare(b[0]))
					.map(([started, list]) => {
						const prices = list
							.map((x) => x.price)
							.filter((x) => Number.isFinite(x))
						const med = medianFromPrices(prices)
						const minR = list.reduce((a, b) => (a.price <= b.price ? a : b))
						return {
							label: dateFns.format(new Date(started), "dd MM yyyy"),
							value: Math.round(med / 1000),
							minValue: Math.round(minR.price / 1000),
							minCarBrand: minR.brand,
							minCarModel: minR.model,
							minCarDealer: minR.dealer,
							minCarCity: minR.city,
						}
					})
				setLineSeries(pts)
			}

			const q2 = await electron.priceHistoryQueryOffers({
				dateFrom: dayjs()
					.subtract(30, "day")
					.startOf("day")
					.format("YYYY-MM-DD[T]HH:mm:ss"),
				dateTo,
			})
			if (cancelled || !q2?.ok) return
			const withD = attachPriceDeltas([...(q2.rows || [])])
			const changed = withD
				.filter((r) => r._delta != null && r._delta !== 0)
				.sort((a, b) => Math.abs(b._delta) - Math.abs(a._delta))
				.slice(0, 6)
			setPriceMoves(changed)
		}
		loadHistoryCharts()
		return () => {
			cancelled = true
		}
	}, [autoRuState.status, report])

	const lineDeltaHint = useMemo(() => {
		if (lineSeries.length < 2) return null
		const a = lineSeries[0].value
		const b = lineSeries[lineSeries.length - 1].value
		if (!a) return null
		const pct = ((b - a) / a) * 100
		const up = b >= a
		return `${up ? "↑" : "↓"} ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% за период`
	}, [lineSeries])

	const upDownHint = useMemo(() => {
		let up = 0
		let down = 0
		for (const r of priceMoves) {
			if (r._delta > 0) up++
			else if (r._delta < 0) down++
		}
		if (!up && !down) return null
		return `${up} выросли · ${down} снизились (в подборке)`
	}, [priceMoves])

	const lineLastContext = useMemo(() => {
		if (!lineSeries.length) return null
		const p = lineSeries[lineSeries.length - 1]
		const minCar = [p.minCarBrand, p.minCarModel]
			.filter(Boolean)
			.join(" ")
			.trim()
		const dealer = p.minCarDealer && String(p.minCarDealer).trim()
		const city =
			p.minCarCity != null &&
			String(p.minCarCity).trim() &&
			String(p.minCarCity).trim() !== "—"
				? getCityLabel(String(p.minCarCity).trim())
				: ""
		const med = p.value != null ? `медиана ${p.value} тыс ₽` : ""
		const mn = p.minValue != null ? `мин. ${p.minValue} тыс ₽` : ""
		const head = [med, mn].filter(Boolean).join(", ")
		if (!head && !minCar && !dealer && !city) return null
		const tailParts = []
		if (minCar) tailParts.push(`самая дешёвая позиция: ${minCar}`)
		if (dealer) tailParts.push(dealer)
		if (city) tailParts.push(city)
		const tail = tailParts.length ? ` · ${tailParts.join(" · ")}` : ""
		return `Последний запуск (${p.label}): ${head}${tail}`
	}, [getCityLabel, lineSeries])

	return (
		<Space
			direction="vertical"
			className="ms-width-full"
			size={14}
		>
			<DashboardActions
				autoRuState={autoRuState}
				isPending={isPending}
				pagination={pagination}
				progressPct={progressPct}
			/>

			<ParseConfigCard
				brands={settings.brands || []}
				cityDisplayName={cityDisplay.name}
				isPending={isPending}
				reportRows={reportRows}
				reportSheets={reportSheets}
				selectedCount={selectedCount}
				totalBrands={totalBrands}
				yearsText={yearsText}
			/>

			<DashboardKPI
				lastDuration={lastDuration}
				lastStart={lastStart}
				memSummary={memSummary}
				parseCitiesLabel={parseCitiesLabel}
				reportRows={reportRows}
				reportSheets={reportSheets}
			/>

			<DashboardCockpitG2
				donutSlices={donutSlices}
				getCityLabel={getCityLabel}
				lineDeltaHint={lineDeltaHint}
				lineLastContext={lineLastContext}
				lineSeries={lineSeries}
			/>

			<PriceMovesCard
				getCityLabel={getCityLabel}
				priceMoves={priceMoves}
				upDownHint={upDownHint}
			/>

			<FavoritesCard
				favoriteSnapshots={favoriteSnapshots}
				getCityLabel={getCityLabel}
			/>

			<RunLogCard
				filteredLog={filteredLog}
				logFilter={logFilter}
				setLogFilter={setLogFilter}
			/>
		</Space>
	)
}
