import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"

import {
	DownloadOutlined,
	UploadOutlined,
} from "@ant-design/icons"
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import {
	Alert,
	Button,
	Card,
	Col,
	DatePicker,
	Input,
	InputNumber,
	Row,
	Select,
	Segmented,
	Space,
	Statistic,
	Table,
	Tabs,
	Tag,
	theme,
	Typography,
	Upload,
	message,
} from "antd"
import dayjs from "dayjs"
import { parseXlsx } from "@market-slice/auto-ru/xlsx.js"

import { diffFlattenedOffers, flattenReport } from "../../analytics.js"
import { electron } from "../../electron.js"
import { useTheme } from "../../theme-context.js"
import { chartSeriesColors } from "../../theme-tokens.js"
import { attachPriceDeltas, stableOfferKey } from "./offer-delta.js"
import { money, pct } from "./report-formatters.js"

const { Paragraph, Text, Title } = Typography
const { RangePicker } = DatePicker

const FALLBACK_CHART_PALETTE = ["#64748b", "#475569", "#334155"]

function rowSearchHaystack(r) {
	return [
		r.brand,
		r.model,
		r.equipment,
		r.modification,
		String(r.year ?? ""),
		r.city,
		r.dealer,
		String(r.run_started ?? ""),
	]
		.join(" ")
		.toLowerCase()
}

function newDisappearedBetweenFirstLastRun(rows) {
	if (!rows.length) return { newKeys: 0, goneKeys: 0 }
	const byTime = [...new Set(rows.map((r) => String(r.run_started || "")))].filter(
		Boolean,
	)
	byTime.sort((a, b) => a.localeCompare(b))
	if (byTime.length < 2) return { newKeys: 0, goneKeys: 0 }
	const first = byTime[0]
	const last = byTime[byTime.length - 1]
	const firstKeys = new Set(
		rows.filter((r) => String(r.run_started) === first).map(stableOfferKey),
	)
	const lastKeys = new Set(
		rows.filter((r) => String(r.run_started) === last).map(stableOfferKey),
	)
	let newKeys = 0
	for (const k of lastKeys) if (!firstKeys.has(k)) newKeys++
	let goneKeys = 0
	for (const k of firstKeys) if (!lastKeys.has(k)) goneKeys++
	return { newKeys, goneKeys }
}

function uniqueVals(rows, pick) {
	const s = new Set()
	for (const r of rows) {
		const v = pick(r)
		if (v != null && String(v).trim() !== "" && v !== "—") s.add(String(v))
	}
	return [...s].sort((a, b) => a.localeCompare(b, "ru"))
}

function minPriceOnDate(rows, datePrefix, pred) {
	let m = Infinity
	for (const r of rows) {
		if (r.price == null) continue
		const d = String(r.run_started || "").slice(0, 10)
		if (d !== datePrefix) continue
		if (pred && !pred(r)) continue
		if (r.price < m) m = r.price
	}
	return m === Infinity ? null : m
}

function countOnDate(rows, datePrefix, pred) {
	let n = 0
	for (const r of rows) {
		const d = String(r.run_started || "").slice(0, 10)
		if (d !== datePrefix) continue
		if (pred && !pred(r)) continue
		n++
	}
	return n
}

function buildChartPack(rows, lineMode, metric, topN, palette) {
	const pal =
		Array.isArray(palette) && palette.length > 0 ? palette : FALLBACK_CHART_PALETTE
	const dates = [
		...new Set(rows.map((r) => String(r.run_started || "").slice(0, 10))),
	]
		.filter(Boolean)
		.sort((a, b) => a.localeCompare(b))
	if (!dates.length) return { data: [], series: [], metric }

	if (lineMode === "overall") {
		const data = dates.map((date) => {
			if (metric === "count") {
				return { date, v0: countOnDate(rows, date, null) }
			}
			return { date, v0: minPriceOnDate(rows, date, null) }
		})
		return {
			data,
			series: [
				{
					key: "v0",
					label: metric === "count" ? "Предложений" : "Мин. цена",
					color: pal[0],
				},
			],
			metric,
		}
	}

	const scoreMap = new Map()
	for (const r of rows) {
		if (metric === "price" && r.price == null) continue
		const label =
			lineMode === "dealer"
				? String(r.dealer || "—")
				: `${r.brand || "—"} ${r.model || "—"}`.trim()
		scoreMap.set(label, (scoreMap.get(label) || 0) + 1)
	}
	const topLabels = [...scoreMap.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, topN)
		.map(([k]) => k)

	const series = topLabels.map((label, i) => ({
		key: `v${i}`,
		label,
		color: pal[i % pal.length],
		pred:
			lineMode === "dealer"
				? (r) => String(r.dealer || "—") === label
				: (r) => `${r.brand || "—"} ${r.model || "—"}`.trim() === label,
	}))

	const data = dates.map((date) => {
		const row = { date }
		for (const s of series) {
			if (metric === "count") {
				row[s.key] = countOnDate(rows, date, s.pred)
			} else {
				row[s.key] = minPriceOnDate(rows, date, s.pred)
			}
		}
		return row
	})

	return { data, series, metric }
}

export function PriceHistory({ initialTab = "table" } = {}) {
	const [tab, setTab] = useState(initialTab)
	useEffect(() => {
		setTab(initialTab)
	}, [initialTab])
	const [range, setRange] = useState(() => [
		dayjs().subtract(30, "day").startOf("day"),
		dayjs().endOf("day"),
	])
	const [brands, setBrands] = useState([])
	const [models, setModels] = useState([])
	const [dealers, setDealers] = useState([])
	const [cities, setCities] = useState([])
	const [meta, setMeta] = useState({
		brands: [],
		models: [],
		dealers: [],
		cities: [],
	})
	const [rows, setRows] = useState([])
	const [runs, setRuns] = useState([])
	const [loading, setLoading] = useState(false)
	const [runA, setRunA] = useState(null)
	const [runB, setRunB] = useState(null)
	const [diffRows, setDiffRows] = useState([])
	const [diffLoading, setDiffLoading] = useState(false)
	const xlsxARef = useRef(null)
	const xlsxBRef = useRef(null)
	const [xlsxPick, setXlsxPick] = useState({ a: null, b: null })

	const [tableView, setTableView] = useState("flat")
	const [tableSearch, setTableSearch] = useState("")
	const [deltaFilter, setDeltaFilter] = useState("all")
	/** all | changed | significant — по умолчанию только строки с изменением цены */
	const [signalView, setSignalView] = useState("changed")
	const [deltaMinAbs, setDeltaMinAbs] = useState(50_000)
	const [deltaMinPct, setDeltaMinPct] = useState(1)

	const [chartLineMode, setChartLineMode] = useState("overall")
	const [chartMetric, setChartMetric] = useState("price")

	const settings = useSelector((state) => state.settings)
	const didAutoCity = useRef(false)
	const { token } = theme.useToken()
	const { isDark } = useTheme()
	const chartPalette = useMemo(() => chartSeriesColors(isDark), [isDark])

	const [diffBrands, setDiffBrands] = useState([])
	const [diffModels, setDiffModels] = useState([])
	const [diffDealers, setDiffDealers] = useState([])
	const [diffSearch, setDiffSearch] = useState("")
	const [diffChangeFilter, setDiffChangeFilter] = useState("all")
	const [diffGroupView, setDiffGroupView] = useState("flat")

	const dateFrom =
		range?.[0] &&
		typeof range[0].isValid === "function" &&
		range[0].isValid()
			? range[0].startOf("day").format("YYYY-MM-DD[T]HH:mm:ss")
			: undefined
	const dateTo =
		range?.[1] &&
		typeof range[1].isValid === "function" &&
		range[1].isValid()
			? range[1].endOf("day").format("YYYY-MM-DD[T]HH:mm:ss")
			: undefined

	const loadMeta = useCallback(async () => {
		if (!electron?.priceHistoryMeta) return
		const res = await electron.priceHistoryMeta()
		if (res?.ok) setMeta(res.meta || {})
	}, [])

	const loadRuns = useCallback(async () => {
		if (!electron?.priceHistoryListRuns) return
		const res = await electron.priceHistoryListRuns({ dateFrom, dateTo })
		if (res?.ok) setRuns(res.runs || [])
	}, [dateFrom, dateTo])

	const loadRows = useCallback(async () => {
		if (!electron?.priceHistoryQueryOffers) return
		setLoading(true)
		try {
			const res = await electron.priceHistoryQueryOffers({
				dateFrom,
				dateTo,
				brands: brands.length ? brands : undefined,
				models: models.length ? models : undefined,
				dealers: dealers.length ? dealers : undefined,
				cities: cities.length ? cities : undefined,
			})
			if (res?.ok) {
				const list = attachPriceDeltas(res.rows || [])
				setRows(list)
			} else {
				message.error(res?.error || "Ошибка загрузки")
			}
		} finally {
			setLoading(false)
		}
	}, [brands, cities, dateFrom, dateTo, dealers, models])

	useEffect(() => {
		loadMeta()
	}, [loadMeta])

	useEffect(() => {
		if (didAutoCity.current) return
		const mc = meta?.cities || []
		const primary = settings?.city != null ? String(settings.city).trim() : ""
		if (mc.length > 1 && primary && mc.includes(primary)) {
			setCities([primary])
			didAutoCity.current = true
		}
	}, [meta, settings?.city])

	useEffect(() => {
		loadRuns()
	}, [loadRuns])

	useEffect(() => {
		loadRows()
	}, [loadRows])

	const historyStats = useMemo(() => {
		if (!rows.length) return null
		const prices = rows.map((r) => r.price).filter((p) => p != null)
		const posKeys = new Set(rows.map(stableOfferKey))
		let up = 0
		let down = 0
		let same = 0
		let sumPctUp = 0
		let sumPctDown = 0
		for (const r of rows) {
			if (r._delta == null) continue
			if (r._delta > 0) {
				up++
				if (r._deltaPct != null) sumPctUp += r._deltaPct
			} else if (r._delta < 0) {
				down++
				if (r._deltaPct != null) sumPctDown += Math.abs(r._deltaPct)
			} else same++
		}
		const avgPrice =
			prices.length > 0
				? prices.reduce((a, b) => a + b, 0) / prices.length
				: null
		return {
			uniquePositions: posKeys.size,
			rowCount: rows.length,
			minP: prices.length ? Math.min(...prices) : null,
			maxP: prices.length ? Math.max(...prices) : null,
			avgPrice,
			up,
			down,
			same,
			avgPctUp: up ? sumPctUp / up : null,
			avgPctDown: down ? sumPctDown / down : null,
		}
	}, [rows])

	const changeOverview = useMemo(() => {
		const { newKeys, goneKeys } = newDisappearedBetweenFirstLastRun(rows)
		let up = 0
		let down = 0
		let sumPctUp = 0
		let sumPctDown = 0
		for (const r of rows) {
			if (r._delta == null) continue
			if (r._delta > 0) {
				up++
				if (r._deltaPct != null) sumPctUp += r._deltaPct
			} else if (r._delta < 0) {
				down++
				if (r._deltaPct != null) sumPctDown += Math.abs(r._deltaPct)
			}
		}
		return {
			up,
			down,
			avgPctUp: up ? (sumPctUp / up) * 100 : null,
			avgPctDown: down ? (sumPctDown / down) * 100 : null,
			newKeys,
			goneKeys,
		}
	}, [rows])

	const filteredHistoryRows = useMemo(() => {
		let list = rows
		const q = tableSearch.trim().toLowerCase()
		if (q) list = list.filter((r) => rowSearchHaystack(r).includes(q))
		if (signalView === "changed" || signalView === "significant") {
			list = list.filter((r) => r._delta != null)
		}
		if (signalView === "significant") {
			const pctTol = deltaMinPct / 100
			list = list.filter((r) => {
				const absRub = Math.abs(r._delta)
				const absPct = r._deltaPct != null ? Math.abs(r._deltaPct) : 0
				return absRub >= deltaMinAbs || absPct >= pctTol
			})
		}
		if (deltaFilter === "up") list = list.filter((r) => r._delta != null && r._delta > 0)
		if (deltaFilter === "down")
			list = list.filter((r) => r._delta != null && r._delta < 0)
		if (deltaFilter === "same")
			list = list.filter((r) => r._delta != null && r._delta === 0)
		return list
	}, [
		rows,
		tableSearch,
		signalView,
		deltaMinAbs,
		deltaMinPct,
		deltaFilter,
	])

	const groupedHistoryParents = useMemo(() => {
		if (tableView === "flat") return null
		const map = new Map()
		for (const r of filteredHistoryRows) {
			const gkey =
				tableView === "dealer"
					? String(r.dealer || "—")
					: `${r.brand || "—"}::${r.model || "—"}`
			if (!map.has(gkey)) {
				map.set(gkey, {
					key: gkey,
					groupTitle: gkey.includes("::")
						? gkey.replace("::", " — ")
						: gkey,
					/* не `children`: Table воспринимает это как tree-data и рисует пустые строки */
					nestedRows: [],
				})
			}
			map.get(gkey).nestedRows.push(r)
		}
		const out = []
		for (const g of map.values()) {
			const ch = g.nestedRows
			const priced = ch.map((x) => x.price).filter((p) => p != null)
			const minP = priced.length ? Math.min(...priced) : null
			const maxP = priced.length ? Math.max(...priced) : null
			const changes = ch.filter((x) => x._delta != null && x._delta !== 0).length
			out.push({
				...g,
				childCount: ch.length,
				minP,
				maxP,
				changes,
			})
		}
		out.sort((a, b) => b.childCount - a.childCount)
		return out
	}, [filteredHistoryRows, tableView])

	const chartPack = useMemo(
		() => buildChartPack(rows, chartLineMode, chartMetric, 10, chartPalette),
		[rows, chartLineMode, chartMetric, chartPalette],
	)

	const chartPrevMap = useMemo(() => {
		const { data, series } = chartPack
		const m = new Map()
		for (let i = 1; i < data.length; i++) {
			const prev = data[i - 1]
			const cur = data[i]
			for (const s of series) {
				const pk = `${cur.date}::${s.key}`
				const a = prev[s.key]
				const b = cur[s.key]
				if (
					a != null &&
					b != null &&
					typeof a === "number" &&
					typeof b === "number"
				) {
					m.set(pk, b - a)
				}
			}
		}
		return m
	}, [chartPack])

	const tableColumns = useMemo(
		() => [
			{
				title: "Запуск",
				dataIndex: "run_started",
				key: "run_started",
				width: 160,
				sorter: (a, b) =>
					String(a.run_started || "").localeCompare(String(b.run_started || "")),
				render: (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "—"),
			},
			{
				title: "Бренд",
				dataIndex: "brand",
				key: "brand",
				width: 90,
				sorter: (a, b) => String(a.brand || "").localeCompare(String(b.brand || ""), "ru"),
			},
			{
				title: "Модель",
				dataIndex: "model",
				key: "model",
				width: 120,
				sorter: (a, b) => String(a.model || "").localeCompare(String(b.model || ""), "ru"),
			},
			{
				title: "Комплектация",
				dataIndex: "equipment",
				key: "equipment",
				ellipsis: true,
				sorter: (a, b) =>
					String(a.equipment || "").localeCompare(String(b.equipment || ""), "ru"),
			},
			{
				title: "Город",
				dataIndex: "city",
				key: "city",
				width: 100,
				sorter: (a, b) => String(a.city || "").localeCompare(String(b.city || ""), "ru"),
			},
			{
				title: "Дилер",
				dataIndex: "dealer",
				key: "dealer",
				width: 140,
				ellipsis: true,
				sorter: (a, b) =>
					String(a.dealer || "").localeCompare(String(b.dealer || ""), "ru"),
			},
			{
				title: "Цена",
				dataIndex: "price",
				key: "price",
				width: 110,
				sorter: (a, b) => (a.price ?? 0) - (b.price ?? 0),
				render: (v) => money(v),
			},
			{
				title: "Изм.",
				key: "delta",
				width: 130,
				sorter: (a, b) => (a._delta ?? 0) - (b._delta ?? 0),
				render: (_, r) => {
					if (r._delta == null) return "—"
					const down = r._delta < 0
					const up = r._delta > 0
					const arrow = down ? "↓ " : up ? "↑ " : ""
					const color = down
						? token.colorSuccess
						: up
							? token.colorError
							: token.colorTextSecondary
					return (
						<Text
							strong
							style={{
								color,
								fontVariantNumeric: "tabular-nums",
								whiteSpace: "nowrap",
							}}
						>
							{arrow}
							{down ? "" : up ? "+" : ""}
							{money(r._delta)}
							{r._deltaPct != null ? ` (${(r._deltaPct * 100).toFixed(1)}%)` : ""}
						</Text>
					)
				},
			},
		],
		[token.colorError, token.colorSuccess, token.colorTextSecondary],
	)

	const groupParentColumns = useMemo(
		() => [
			{
				title: tableView === "dealer" ? "Дилер" : "Бренд — модель",
				dataIndex: "groupTitle",
				key: "groupTitle",
				render: (t) => <Text strong>{t}</Text>,
			},
			{
				title: "Строк",
				dataIndex: "childCount",
				key: "childCount",
				width: 80,
			},
			{
				title: "Мин. цена",
				key: "minP",
				width: 110,
				render: (_, r) => money(r.minP),
			},
			{
				title: "Макс. цена",
				key: "maxP",
				width: 110,
				render: (_, r) => money(r.maxP),
			},
			{
				title: "С изм. цены",
				dataIndex: "changes",
				key: "changes",
				width: 100,
			},
		],
		[tableView],
	)

	const runOptions = (runs || []).map((r) => ({
		value: r.id,
		label: `${String(r.started).slice(0, 19)} — ${r.city} (${r.offer_count ?? 0})`,
	}))

	const runDiff = async () => {
		if (!runA || !runB || runA === runB) {
			message.warning("Выберите два разных запуска")
			return
		}
		if (!electron?.priceHistoryDiff) return
		setDiffLoading(true)
		try {
			const res = await electron.priceHistoryDiff({
				runIdA: runA,
				runIdB: runB,
			})
			if (res?.ok) setDiffRows(res.rows || [])
			else message.error(res?.error || "Ошибка")
		} finally {
			setDiffLoading(false)
		}
	}

	const parseXlsxFile = async (file) => {
		const buf = await file.arrayBuffer()
		const report = parseXlsx(buf)
		if (!report?.length) {
			message.error("Не удалось разобрать XLSX (ожидаемые заголовки колонок)")
			return null
		}
		return flattenReport(report).rowsFlat
	}

	const onPickXlsx = async (which, ev) => {
		const file = ev.target.files?.[0]
		ev.target.value = ""
		if (!file) return
		const xrows = await parseXlsxFile(file)
		if (!xrows) return
		setXlsxPick((p) => ({ ...p, [which]: { name: file.name, rows: xrows } }))
		message.success(`${which === "a" ? "A" : "B"}: ${file.name}`)
	}

	const runXlsxDiff = () => {
		const a = xlsxPick.a?.rows
		const b = xlsxPick.b?.rows
		if (!a?.length || !b?.length) {
			message.warning("Загрузите оба файла XLSX")
			return
		}
		setDiffRows(diffFlattenedOffers(a, b))
		message.success("Сравнение XLSX выполнено")
	}

	const diffMeta = useMemo(() => {
		const brands = uniqueVals(diffRows, (r) => r.brand)
		const models = uniqueVals(diffRows, (r) => r.model)
		const dealers = uniqueVals(diffRows, (r) => r.dealer)
		return { brands, models, dealers }
	}, [diffRows])

	const diffFiltered = useMemo(() => {
		let list = diffRows
		if (diffBrands.length)
			list = list.filter((r) => diffBrands.includes(String(r.brand)))
		if (diffModels.length)
			list = list.filter((r) => diffModels.includes(String(r.model)))
		if (diffDealers.length)
			list = list.filter((r) => diffDealers.includes(String(r.dealer)))
		const q = diffSearch.trim().toLowerCase()
		if (q) {
			list = list.filter((r) =>
				[
					r.brand,
					r.model,
					r.equipment,
					r.modification,
					String(r.year ?? ""),
					r.city,
					r.dealer,
					r.change,
				]
					.join(" ")
					.toLowerCase()
					.includes(q),
			)
		}
		if (diffChangeFilter !== "all") {
			list = list.filter((r) => r.change === diffChangeFilter)
		}
		return list
	}, [diffRows, diffBrands, diffModels, diffDealers, diffSearch, diffChangeFilter])

	const diffSummary = useMemo(() => {
		const priceRows = diffFiltered.filter((r) => r.change === "price")
		let up = 0
		let down = 0
		let sumPct = 0
		for (const r of priceRows) {
			if (r.pct == null) continue
			if (r.pct > 0) up++
			else if (r.pct < 0) down++
			sumPct += r.pct
		}
		const n = priceRows.length
		return {
			added: diffFiltered.filter((r) => r.change === "added").length,
			removed: diffFiltered.filter((r) => r.change === "removed").length,
			price: priceRows.length,
			unchanged: diffFiltered.filter((r) => r.change === "unchanged").length,
			priceUp: up,
			priceDown: down,
			avgPct: n ? (sumPct / n) * 100 : null,
		}
	}, [diffFiltered])

	const diffGroupedParents = useMemo(() => {
		if (diffGroupView === "flat") return null
		const map = new Map()
		for (const r of diffFiltered) {
			const gkey =
				diffGroupView === "dealer"
					? String(r.dealer || "—")
					: String(r.brand || "—")
			if (!map.has(gkey))
				map.set(gkey, { key: gkey, groupTitle: gkey, nestedRows: [] })
			map.get(gkey).nestedRows.push(r)
		}
		return [...map.values()].map((g) => ({
			...g,
			childCount: g.nestedRows.length,
		}))
	}, [diffFiltered, diffGroupView])

	const diffColumns = useMemo(
		() => [
			{
				title: "Тип",
				dataIndex: "change",
				key: "change",
				width: 100,
				sorter: (a, b) => String(a.change).localeCompare(String(b.change)),
				render: (c) => {
					const map = {
						added: { color: "gold", label: "Новое" },
						removed: { color: "default", label: "Исчезло" },
						price: { color: "processing", label: "Цена" },
						unchanged: { color: "default", label: "Без изм." },
					}
					const x = map[c] || map.unchanged
					return <Tag color={x.color}>{x.label}</Tag>
				},
			},
			{
				title: "Бренд",
				dataIndex: "brand",
				key: "brand",
				width: 90,
				sorter: (a, b) => String(a.brand || "").localeCompare(String(b.brand || ""), "ru"),
			},
			{
				title: "Модель",
				dataIndex: "model",
				key: "model",
				width: 110,
				sorter: (a, b) => String(a.model || "").localeCompare(String(b.model || ""), "ru"),
			},
			{
				title: "Комплектация",
				dataIndex: "equipment",
				key: "equipment",
				ellipsis: true,
			},
			{
				title: "Город",
				dataIndex: "city",
				key: "city",
				width: 90,
			},
			{
				title: "Дилер",
				dataIndex: "dealer",
				key: "dealer",
				width: 120,
				ellipsis: true,
			},
			{
				title: "Цена A",
				dataIndex: "priceA",
				key: "priceA",
				width: 100,
				sorter: (a, b) => (a.priceA ?? 0) - (b.priceA ?? 0),
				render: (v) => money(v),
			},
			{
				title: "Цена B",
				dataIndex: "priceB",
				key: "priceB",
				width: 100,
				sorter: (a, b) => (a.priceB ?? 0) - (b.priceB ?? 0),
				render: (v) => money(v),
			},
			{
				title: "%",
				dataIndex: "pct",
				key: "pct",
				width: 80,
				sorter: (a, b) => (a.pct ?? 0) - (b.pct ?? 0),
				render: (v) => (v == null ? "—" : pct(v)),
			},
		],
		[],
	)

	const diffGroupColumns = useMemo(
		() => [
			{
				title: diffGroupView === "dealer" ? "Дилер" : "Бренд",
				dataIndex: "groupTitle",
				key: "groupTitle",
				render: (t) => <Text strong>{t}</Text>,
			},
			{ title: "Строк", dataIndex: "childCount", key: "childCount", width: 80 },
		],
		[diffGroupView],
	)

	const exportJson = async () => {
		if (!electron?.priceHistoryExport) return
		const res = await electron.priceHistoryExport({ dateFrom, dateTo })
		if (!res?.ok || !res.data) {
			message.error(res?.error || "Ошибка экспорта")
			return
		}
		const blob = new Blob([JSON.stringify(res.data, null, 2)], {
			type: "application/json;charset=utf-8",
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		a.download = `price-history_${dayjs().format("YYYY-MM-DD")}.json`
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(url)
		message.success("Экспорт готов")
	}

	const importProps = {
		beforeUpload: (file) => {
			;(async () => {
				try {
					const text = await file.text()
					const data = JSON.parse(text)
					if (!electron?.priceHistoryImport) return
					const res = await electron.priceHistoryImport(data)
					if (res?.ok) {
						message.success(
							`Импортировано запусков: ${res.imported}, пропущено дублей: ${res.skipped}`,
						)
						await loadMeta()
						await loadRuns()
						await loadRows()
					} else message.error(res?.error || "Ошибка импорта")
				} catch {
					message.error("Неверный JSON")
				}
			})()
			return false
		},
		showUploadList: false,
	}

	const chartTitleText =
		chartMetric === "count"
			? chartLineMode === "overall"
				? "Количество предложений по дням (вся выборка)"
				: chartLineMode === "dealer"
					? "Количество предложений по дням (топ дилеров)"
					: "Количество предложений по дням (топ бренд — модель)"
			: chartLineMode === "overall"
				? "Минимальная цена по дню среди выбранных фильтров"
				: chartLineMode === "dealer"
					? "Минимальная цена по дню и дилеру (топ-10 по числу строк)"
					: "Минимальная цена по дню и модели (топ-10 по числу строк)"

	const chartTooltip = ({ active, payload, label }) => {
		if (!active || !payload?.length) return null
		return (
			<div
				style={{
					background: token.colorBgElevated,
					border: `1px solid ${token.colorBorderSecondary}`,
					borderRadius: token.borderRadius,
					padding: "10px 12px",
					fontSize: 12,
					boxShadow: token.boxShadowSecondary,
					color: token.colorText,
				}}
			>
				<div style={{ marginBottom: 4 }}>
					<Text strong>Дата: {label}</Text>
				</div>
				{payload.map((p) => {
					const s = chartPack.series.find((x) => x.key === p.dataKey)
					const name = s?.label || String(p.dataKey)
					const pk = `${label}::${p.dataKey}`
					const dlt = chartPrevMap.get(pk)
					const v = p.value
					const formatted =
						chartMetric === "count"
							? v != null
								? String(v)
								: "—"
							: v != null
								? `${Number(v).toLocaleString("ru-RU")} ₽`
								: "—"
					const lineColor = s?.color || p.color
					return (
						<div key={String(p.dataKey)} style={{ marginTop: 2 }}>
							<span style={{ color: lineColor }}>{name}: </span>
							{formatted}
							{chartMetric === "price" && dlt != null ? (
								<span
									style={{
										color: dlt <= 0 ? token.colorSuccess : token.colorError,
									}}
								>
									{" "}
									(Δ {dlt > 0 ? "+" : ""}
									{Math.round(dlt).toLocaleString("ru-RU")} ₽)
								</span>
							) : null}
						</div>
					)
				})}
			</div>
		)
	}

	return (
		<div>
			<div className="ms-page-hero">
				<Title
					level={2}
					style={{ marginBottom: 8 }}
				>
					История цен
				</Title>
				<Paragraph
					type="secondary"
					style={{ marginBottom: 0 }}
				>
					Данные накапливаются после каждого завершённого парсинга. Сначала задайте
					период и город — так сводки и графики останутся в одном регионе. Экспорт и
					импорт JSON удобны для обмена между коллегами.
				</Paragraph>
			</div>

			<Card
				size="small"
				style={{ marginBottom: 16 }}
				className="ms-filter-card ms-summary-card"
			>
				{(meta?.cities || []).length > 1 && cities.length === 0 ? (
					<Alert
						type="info"
						showIcon
						style={{ marginBottom: 12 }}
						message="Выберите город в фильтре ниже, чтобы графики и сводки не смешивали разные регионы."
					/>
				) : null}
				<Space wrap align="start">
					<div>
						<div style={{ marginBottom: 4 }}>
							<Text type="secondary">Период</Text>
						</div>
						<RangePicker
							value={range}
							onChange={(dates) => {
								if (dates?.[0] && dates?.[1]) setRange(dates)
							}}
						/>
					</div>
					<div style={{ minWidth: 180 }}>
						<div style={{ marginBottom: 4 }}>
							<Text type="secondary">Бренды</Text>
						</div>
						<Select
							mode="multiple"
							allowClear
							placeholder="Все"
							style={{ width: "100%" }}
							options={(meta.brands || []).map((b) => ({ value: b, label: b }))}
							value={brands}
							onChange={setBrands}
						/>
					</div>
					<div style={{ minWidth: 180 }}>
						<div style={{ marginBottom: 4 }}>
							<Text type="secondary">Модели</Text>
						</div>
						<Select
							mode="multiple"
							allowClear
							placeholder="Все"
							style={{ width: "100%" }}
							options={(meta.models || []).map((m) => ({ value: m, label: m }))}
							value={models}
							onChange={setModels}
						/>
					</div>
					<div style={{ minWidth: 180 }}>
						<div style={{ marginBottom: 4 }}>
							<Text type="secondary">Дилеры</Text>
						</div>
						<Select
							mode="multiple"
							allowClear
							placeholder="Все"
							style={{ width: "100%" }}
							options={(meta.dealers || []).map((d) => ({ value: d, label: d }))}
							value={dealers}
							onChange={setDealers}
						/>
					</div>
					<div style={{ minWidth: 160 }}>
						<div style={{ marginBottom: 4 }}>
							<Text type="secondary">Город (строка)</Text>
						</div>
						<Select
							mode="multiple"
							allowClear
							placeholder="Все"
							style={{ width: "100%" }}
							options={(meta.cities || []).map((c) => ({ value: c, label: c }))}
							value={cities}
							onChange={setCities}
						/>
					</div>
					<Button type="primary" onClick={() => loadRows()} loading={loading}>
						Обновить
					</Button>
					<Button icon={<DownloadOutlined />} onClick={exportJson}>
						Экспорт JSON
					</Button>
					<Upload {...importProps}>
						<Button icon={<UploadOutlined />}>Импорт JSON</Button>
					</Upload>
				</Space>

				{historyStats ? (
					<Row gutter={[12, 12]} style={{ marginTop: 16 }}>
						<Col xs={12} sm={8} md={4}>
							<Statistic title="Уникальных позиций" value={historyStats.uniquePositions} />
						</Col>
						<Col xs={12} sm={8} md={4}>
							<Statistic title="Строк в выборке" value={historyStats.rowCount} />
						</Col>
						<Col xs={12} sm={8} md={4}>
							<Statistic
								title="Мин. цена"
								value={
									historyStats.minP != null
										? Math.round(historyStats.minP)
										: "—"
								}
								suffix={historyStats.minP != null ? "₽" : undefined}
							/>
						</Col>
						<Col xs={12} sm={8} md={4}>
							<Statistic
								title="Макс. цена"
								value={
									historyStats.maxP != null
										? Math.round(historyStats.maxP)
										: "—"
								}
								suffix={historyStats.maxP != null ? "₽" : undefined}
							/>
						</Col>
						<Col xs={12} sm={8} md={4}>
							<Statistic
								title="Средняя цена"
								value={
									historyStats.avgPrice != null
										? Math.round(historyStats.avgPrice)
										: "—"
								}
								suffix={historyStats.avgPrice != null ? "₽" : undefined}
							/>
						</Col>
						<Col xs={12} sm={8} md={4}>
							<Statistic
								title="Строк с Δ цены"
								value={historyStats.up + historyStats.down}
								valueStyle={{ color: "#1677ff" }}
							/>
						</Col>
					</Row>
				) : null}
			</Card>

			{rows.length > 0 ? (
				<Card size="small" style={{ marginBottom: 16 }} title="Что изменилось (в периоде)">
					<Row gutter={[12, 12]}>
						<Col xs={12} sm={6}>
							<Card size="small" bordered={false} style={{ background: "#fff1f0" }}>
								<Statistic
									title="Цены выросли"
									value={changeOverview.up}
									suffix={
										changeOverview.avgPctUp != null
											? `ср. +${changeOverview.avgPctUp.toFixed(1)}%`
											: undefined
									}
									valueStyle={{ color: "#cf1322" }}
								/>
							</Card>
						</Col>
						<Col xs={12} sm={6}>
							<Card size="small" bordered={false} style={{ background: "#f6ffed" }}>
								<Statistic
									title="Цены снизились"
									value={changeOverview.down}
									suffix={
										changeOverview.avgPctDown != null
											? `ср. −${changeOverview.avgPctDown.toFixed(1)}%`
											: undefined
									}
									valueStyle={{ color: "#52c41a" }}
								/>
							</Card>
						</Col>
						<Col xs={12} sm={6}>
							<Card size="small" bordered={false} style={{ background: "#fffbe6" }}>
								<Statistic
									title="Новые позиции (последний vs первый запуск в выборке)"
									value={changeOverview.newKeys}
								/>
							</Card>
						</Col>
						<Col xs={12} sm={6}>
							<Card size="small" bordered={false} style={{ background: "#fafafa" }}>
								<Statistic
									title="Исчезли (последний vs первый запуск)"
									value={changeOverview.goneKeys}
								/>
							</Card>
						</Col>
					</Row>
				</Card>
			) : null}

			<Tabs
				activeKey={tab}
				onChange={setTab}
				items={[
					{
						key: "table",
						label: "Таблица",
						children: (
							<Space direction="vertical" style={{ width: "100%" }} size="middle">
								<Space wrap align="center">
									<Text type="secondary">Вид:</Text>
									<Segmented
										value={tableView}
										onChange={setTableView}
										options={[
											{ label: "Плоский список", value: "flat" },
											{ label: "По дилерам", value: "dealer" },
											{ label: "По бренду — модель", value: "brandModel" },
										]}
									/>
									<Text type="secondary">Сигнал:</Text>
									<Segmented
										value={signalView}
										onChange={setSignalView}
										options={[
											{ label: "Все строки", value: "all" },
											{ label: "Только Δ цены", value: "changed" },
											{ label: "Сильные Δ", value: "significant" },
										]}
									/>
									{signalView === "significant" ? (
										<Space size="small" align="center" wrap>
											<Text type="secondary">Порог:</Text>
											<InputNumber
												min={0}
												step={10_000}
												value={deltaMinAbs}
												onChange={(v) => setDeltaMinAbs(Number(v) || 0)}
												style={{ width: 128 }}
											/>
											<Text type="secondary">₽</Text>
											<Text type="secondary">или</Text>
											<InputNumber
												min={0}
												max={100}
												step={0.5}
												value={deltaMinPct}
												onChange={(v) => setDeltaMinPct(Number(v) || 0)}
												style={{ width: 72 }}
											/>
											<Text type="secondary">%</Text>
										</Space>
									) : null}
									<Text type="secondary">Направление:</Text>
									<Segmented
										value={deltaFilter}
										onChange={setDeltaFilter}
										options={[
											{ label: "Все Δ", value: "all" },
											{ label: "Рост", value: "up" },
											{ label: "Снижение", value: "down" },
											{ label: "Без изм.", value: "same" },
										]}
									/>
									<Input.Search
										allowClear
										placeholder="Поиск по таблице"
										style={{ minWidth: 220 }}
										value={tableSearch}
										onChange={(e) => setTableSearch(e.target.value)}
									/>
								</Space>
								{tableView === "flat" ? (
									<Table
										size="small"
										rowKey={(r) => `${r.id ?? r.run_id}-${stableOfferKey(r)}`}
										columns={tableColumns}
										dataSource={filteredHistoryRows}
										loading={loading}
										pagination={{ pageSize: 20, showSizeChanger: true }}
										scroll={{ x: 1200 }}
									/>
								) : (
									<Table
										size="small"
										rowKey="key"
										columns={groupParentColumns}
										dataSource={groupedHistoryParents || []}
										pagination={{ pageSize: 15, showSizeChanger: true }}
										expandable={{
											expandedRowRender: (rec) => (
												<Table
													className="ms-table-polished"
													size="small"
													rowKey={(r) =>
														`${r.id ?? r.run_id}-${stableOfferKey(r)}`
													}
													columns={tableColumns}
													dataSource={rec.nestedRows}
													pagination={false}
													scroll={{ x: 1200 }}
												/>
											),
										}}
									/>
								)}
							</Space>
						),
					},
					{
						key: "chart",
						label: "График",
						children: (
							<Space direction="vertical" style={{ width: "100%" }} size="middle">
								<Space wrap>
									<Text type="secondary">Режим линий:</Text>
									<Segmented
										value={chartLineMode}
										onChange={setChartLineMode}
										options={[
											{ label: "Общая", value: "overall" },
											{ label: "По дилерам", value: "dealer" },
											{ label: "По моделям", value: "model" },
										]}
									/>
									<Text type="secondary">Метрика:</Text>
									<Segmented
										value={chartMetric}
										onChange={setChartMetric}
										options={[
											{ label: "Цены (мин.)", value: "price" },
											{ label: "Количество", value: "count" },
										]}
									/>
								</Space>
								<Text type="secondary">{chartTitleText}</Text>
								{chartPack.data.length ? (
									chartMetric === "count" ? (
										<div className="ms-chart-surface">
											<ResponsiveContainer width="100%" height={360}>
												<BarChart data={chartPack.data}>
													<CartesianGrid
														strokeDasharray="3 3"
														stroke={token.colorBorderSecondary}
														vertical={false}
														opacity={0.5}
													/>
													<XAxis
														dataKey="date"
														tick={{ fontSize: 11, fill: token.colorTextTertiary }}
														stroke={token.colorBorderSecondary}
													/>
													<YAxis
														tick={{ fontSize: 11, fill: token.colorTextTertiary }}
														stroke={token.colorBorderSecondary}
													/>
													<Tooltip content={chartTooltip} />
													<Legend wrapperStyle={{ fontSize: 12 }} />
													{chartPack.series.map((s) => (
														<Bar
															key={s.key}
															dataKey={s.key}
															name={s.label}
															fill={s.color}
															radius={[3, 3, 0, 0]}
															maxBarSize={48}
														/>
													))}
												</BarChart>
											</ResponsiveContainer>
										</div>
									) : (
										<div className="ms-chart-surface">
											<ResponsiveContainer width="100%" height={360}>
												<LineChart data={chartPack.data}>
													<CartesianGrid
														strokeDasharray="3 3"
														stroke={token.colorBorderSecondary}
														opacity={0.5}
													/>
													<XAxis
														dataKey="date"
														tick={{ fontSize: 11, fill: token.colorTextTertiary }}
														stroke={token.colorBorderSecondary}
													/>
													<YAxis
														tick={{ fontSize: 11, fill: token.colorTextTertiary }}
														stroke={token.colorBorderSecondary}
														tickFormatter={(v) =>
															v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
														}
													/>
													<Tooltip content={chartTooltip} />
													<Legend wrapperStyle={{ fontSize: 12 }} />
													{chartPack.series.map((s) => (
														<Line
															key={s.key}
															type="monotone"
															dataKey={s.key}
															name={s.label}
															stroke={s.color}
															strokeWidth={2}
															dot={{ r: 2.5, strokeWidth: 1 }}
															activeDot={{ r: 4 }}
															connectNulls
														/>
													))}
												</LineChart>
											</ResponsiveContainer>
										</div>
									)
								) : (
									<Text type="secondary">Нет данных для графика</Text>
								)}
								<Text type="secondary" style={{ fontSize: 12 }}>
									По оси X — день запуска (дата из поля «Запуск»). Для режимов
									«По дилерам» / «По моделям» показаны до 10 рядов с наибольшим
									числом строк в выборке.
								</Text>
							</Space>
						),
					},
					{
						key: "diff",
						label: "Сравнение отчётов",
						children: (
							<Space direction="vertical" style={{ width: "100%" }} size="middle">
								<Space wrap>
									<Select
										style={{ minWidth: 320 }}
										placeholder="Запуск A (раньше)"
										options={runOptions}
										value={runA}
										onChange={setRunA}
										allowClear
									/>
									<Select
										style={{ minWidth: 320 }}
										placeholder="Запуск B (позже)"
										options={runOptions}
										value={runB}
										onChange={setRunB}
										allowClear
									/>
									<Button type="primary" onClick={runDiff} loading={diffLoading}>
										Сравнить
									</Button>
								</Space>
								<Text type="secondary">
									Сопоставление по бренду, модели, комплектации, модификации,
									году, дилеру и городу. Зелёные теги в таблице истории — цена
									ниже прошлого запуска для той же позиции.
								</Text>
								<Card size="small" title="Или два файла XLSX">
									<Space wrap>
										<input
											ref={xlsxARef}
											type="file"
											accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
											style={{ display: "none" }}
											onChange={(e) => onPickXlsx("a", e)}
										/>
										<input
											ref={xlsxBRef}
											type="file"
											accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
											style={{ display: "none" }}
											onChange={(e) => onPickXlsx("b", e)}
										/>
										<Button onClick={() => xlsxARef.current?.click()}>
											Файл A (раньше)
										</Button>
										<Button onClick={() => xlsxBRef.current?.click()}>
											Файл B (позже)
										</Button>
										<Text type="secondary">
											{xlsxPick.a?.name || "—"} · {xlsxPick.b?.name || "—"}
										</Text>
										<Button onClick={runXlsxDiff}>Сравнить XLSX</Button>
									</Space>
								</Card>

								{diffRows.length > 0 ? (
									<>
										<Row gutter={[12, 12]}>
											<Col xs={12} sm={6}>
												<Statistic title="Новое" value={diffSummary.added} />
											</Col>
											<Col xs={12} sm={6}>
												<Statistic title="Исчезло" value={diffSummary.removed} />
											</Col>
											<Col xs={12} sm={6}>
												<Statistic title="Изменение цены" value={diffSummary.price} />
											</Col>
											<Col xs={12} sm={6}>
												<Statistic
													title="Ср. % (цена A→B)"
													value={
														diffSummary.avgPct != null
															? diffSummary.avgPct.toFixed(1)
															: "—"
													}
													suffix={diffSummary.avgPct != null ? "%" : undefined}
												/>
											</Col>
										</Row>
										<Text type="secondary" style={{ fontSize: 12 }}>
											Рост цены: {diffSummary.priceUp}, снижение:{" "}
											{diffSummary.priceDown} (по строкам с типом «Цена» в
											текущих фильтрах)
										</Text>
										<Space wrap align="center">
											<Select
												mode="multiple"
												allowClear
												placeholder="Бренд"
												style={{ minWidth: 140 }}
												options={diffMeta.brands.map((b) => ({ value: b, label: b }))}
												value={diffBrands}
												onChange={setDiffBrands}
											/>
											<Select
												mode="multiple"
												allowClear
												placeholder="Модель"
												style={{ minWidth: 140 }}
												options={diffMeta.models.map((m) => ({ value: m, label: m }))}
												value={diffModels}
												onChange={setDiffModels}
											/>
											<Select
												mode="multiple"
												allowClear
												placeholder="Дилер"
												style={{ minWidth: 160 }}
												options={diffMeta.dealers.map((d) => ({ value: d, label: d }))}
												value={diffDealers}
												onChange={setDiffDealers}
											/>
											<Segmented
												value={diffChangeFilter}
												onChange={setDiffChangeFilter}
												options={[
													{ label: "Все", value: "all" },
													{ label: "Новое", value: "added" },
													{ label: "Исчезло", value: "removed" },
													{ label: "Цена", value: "price" },
													{ label: "Без изм.", value: "unchanged" },
												]}
											/>
											<Segmented
												value={diffGroupView}
												onChange={setDiffGroupView}
												options={[
													{ label: "Плоский список", value: "flat" },
													{ label: "По дилеру", value: "dealer" },
													{ label: "По бренду", value: "brand" },
												]}
											/>
											<Input.Search
												allowClear
												placeholder="Поиск"
												style={{ minWidth: 200 }}
												value={diffSearch}
												onChange={(e) => setDiffSearch(e.target.value)}
											/>
										</Space>
									</>
								) : null}

								{diffGroupView === "flat" ? (
									<Table
										size="small"
										rowKey="key"
										columns={diffColumns}
										dataSource={diffFiltered}
										pagination={{ pageSize: 15, showSizeChanger: true }}
										scroll={{ x: 1000 }}
									/>
								) : (
									<Table
										size="small"
										rowKey="key"
										columns={diffGroupColumns}
										dataSource={diffGroupedParents || []}
										pagination={{ pageSize: 12, showSizeChanger: true }}
										expandable={{
											expandedRowRender: (rec) => (
												<Table
													className="ms-table-polished"
													size="small"
													rowKey="key"
													columns={diffColumns}
													dataSource={rec.nestedRows}
													pagination={false}
													scroll={{ x: 1000 }}
												/>
											),
										}}
									/>
								)}
							</Space>
						),
					},
				]}
			/>
		</div>
	)
}
