import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"

import {
	DownloadOutlined,
	UploadOutlined,
} from "@ant-design/icons"
import { mergeCityOptions } from "@market-slice/application/settings/defaults.js"
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip as RechartsTooltip,
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
	Row,
	Select,
	Segmented,
	Space,
	Table,
	Tooltip,
	theme,
	Typography,
	Upload,
	message,
} from "antd"
import dayjs from "dayjs"

import { electron } from "../../electron.js"
import { useTheme } from "../../theme-context.js"
import { chartSeriesColors } from "../../theme-tokens.js"
import { attachPriceDeltas, stableOfferKey } from "./offer-delta.js"
import { money } from "./report-formatters.js"

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

function unitsForRow(r) {
	const c = Number(r.count)
	return Number.isFinite(c) && c > 0 ? c : 1
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
				: String(r.brand || "—")
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
				? (row) => String(row.dealer || "—") === label
				: (row) => String(row.brand || "—") === label,
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

export function PriceHistory() {
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
	const [loading, setLoading] = useState(false)

	const [tableView, setTableView] = useState("flat")
	const [tableSearch, setTableSearch] = useState("")
	const [chartMetric, setChartMetric] = useState("price")

	const chartLineMode = useMemo(() => {
		if (tableView === "dealer") return "dealer"
		if (tableView === "brand") return "brand"
		return "overall"
	}, [tableView])

	const settings = useSelector((state) => state.settings)
	const getCityLabel = useMemo(() => {
		const opts = mergeCityOptions(settings.extraCities ?? [])
		const byId = new Map(opts.map((c) => [String(c.id), c.name]))
		return (id) => {
			if (id == null || id === "" || id === "—") return "—"
			const s = String(id)
			return byId.get(s) ?? s
		}
	}, [settings.extraCities])
	const didAutoCity = useRef(false)
	const { token } = theme.useToken()
	const { isDark } = useTheme()
	const chartPalette = useMemo(() => chartSeriesColors(isDark), [isDark])

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
				setRows(attachPriceDeltas(res.rows || []))
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
		loadRows()
	}, [loadRows])

	const filteredHistoryRows = useMemo(() => {
		let list = rows
		const q = tableSearch.trim().toLowerCase()
		if (q) list = list.filter((r) => rowSearchHaystack(r).includes(q))
		return list
	}, [rows, tableSearch])

	const groupedHistoryParents = useMemo(() => {
		if (tableView === "flat") return null
		const map = new Map()
		for (const r of filteredHistoryRows) {
			const gkey =
				tableView === "dealer"
					? String(r.dealer || "—")
					: String(r.brand || "—")
			if (!map.has(gkey)) {
				map.set(gkey, {
					key: gkey,
					groupTitle: gkey,
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
			out.push({
				...g,
				childCount: ch.length,
				minP,
				maxP,
			})
		}
		out.sort((a, b) => b.childCount - a.childCount)
		return out
	}, [filteredHistoryRows, tableView])

	const chartPack = useMemo(
		() =>
			buildChartPack(
				filteredHistoryRows,
				chartLineMode,
				chartMetric,
				10,
				chartPalette,
			),
		[chartLineMode, chartMetric, chartPalette, filteredHistoryRows],
	)

	const tableColumns = useMemo(
		() => [
			{
				title: "Запуск",
				dataIndex: "run_started",
				key: "run_started",
				width: "14%",
				ellipsis: true,
				sorter: (a, b) =>
					String(a.run_started || "").localeCompare(String(b.run_started || "")),
				render: (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "—"),
			},
			{
				title: "Бренд",
				dataIndex: "brand",
				key: "brand",
				width: "11%",
				ellipsis: true,
				sorter: (a, b) => String(a.brand || "").localeCompare(String(b.brand || ""), "ru"),
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
				width: "10%",
				ellipsis: true,
				sorter: (a, b) => String(a.city || "").localeCompare(String(b.city || ""), "ru"),
				render: (v) => getCityLabel(v),
			},
			{
				title: "Дилер",
				dataIndex: "dealer",
				key: "dealer",
				width: "18%",
				ellipsis: true,
				sorter: (a, b) =>
					String(a.dealer || "").localeCompare(String(b.dealer || ""), "ru"),
			},
			{
				title: "Шт.",
				dataIndex: "count",
				key: "count",
				width: "6%",
				align: "right",
				sorter: (a, b) => unitsForRow(a) - unitsForRow(b),
				render: (_, r) => unitsForRow(r),
			},
			{
				title: "Цена",
				dataIndex: "price",
				key: "price",
				width: "10%",
				align: "right",
				sorter: (a, b) => (a.price ?? 0) - (b.price ?? 0),
				render: (v) => money(v),
			},
			{
				title: "Изм.",
				key: "delta",
				className: "ms-ph-delta-col",
				width: 128,
				align: "right",
				sorter: (a, b) => (a._delta ?? 0) - (b._delta ?? 0),
				render: (_, r) => {
					if (r._delta == null) return "—"
					const down = r._delta < 0
					const up = r._delta > 0
					const arrow = down ? "↓ " : up ? "↑ " : ""
					const sign = down ? "" : up ? "+" : ""
					const color = down
						? token.colorSuccess
						: up
							? token.colorError
							: token.colorTextSecondary
					const amount = money(r._delta)
					const pct =
						r._deltaPct != null ? `${(r._deltaPct * 100).toFixed(1)}%` : null
					const tip = pct ? `${arrow}${sign}${amount} (${pct})` : `${arrow}${sign}${amount}`
					return (
						<Tooltip title={tip}>
							<div className="ms-ph-delta-cell">
								<Text
									strong
									style={{
										color,
										fontVariantNumeric: "tabular-nums",
										display: "block",
										lineHeight: 1.25,
									}}
								>
									{arrow}
									{sign}
									{amount}
								</Text>
								{pct != null ? (
									<Text
										style={{
											color,
											fontSize: 11,
											display: "block",
											lineHeight: 1.2,
											opacity: 0.92,
										}}
									>
										({pct})
									</Text>
								) : null}
							</div>
						</Tooltip>
					)
				},
			},
		],
		[getCityLabel, token.colorError, token.colorSuccess, token.colorTextSecondary],
	)

	const groupParentColumns = useMemo(
		() => [
			{
				title: tableView === "dealer" ? "Дилер" : "Бренд",
				dataIndex: "groupTitle",
				key: "groupTitle",
				ellipsis: true,
				render: (t) => <Text strong>{t}</Text>,
			},
			{
				title: "Строк",
				dataIndex: "childCount",
				key: "childCount",
				width: 90,
			},
			{
				title: "Мин. цена",
				key: "minP",
				width: 120,
				render: (_, r) => money(r.minP),
			},
			{
				title: "Макс. цена",
				key: "maxP",
				width: 120,
				render: (_, r) => money(r.maxP),
			},
		],
		[tableView],
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
		a.download = `price-history_${dayjs().format("DD MM YYYY")}.json`
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
				? "Число строк по дням (вся выборка)"
				: chartLineMode === "dealer"
					? "Число строк по дням — топ дилеров в выборке"
					: "Число строк по дням — топ брендов в выборке"
			: chartLineMode === "overall"
				? "Минимальная цена по дню (вся выборка)"
				: chartLineMode === "dealer"
					? "Мин. цена по дню и дилеру (топ-10 по числу строк)"
					: "Мин. цена по дню и бренду (топ-10 по числу строк)"

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
						</div>
					)
				})}
			</div>
		)
	}

	const overviewToolbar = (
		<div className="ms-price-history-toolbar">
			<div className="ms-price-history-toolbar__left">
				<Text type="secondary">Вид</Text>
				<Segmented
					size="small"
					value={tableView}
					onChange={setTableView}
					options={[
						{ label: "Плоский список", value: "flat" },
						{ label: "По дилерам", value: "dealer" },
						{ label: "По бренду", value: "brand" },
					]}
				/>
				<Text type="secondary">График</Text>
				<Segmented
					size="small"
					value={chartMetric}
					onChange={setChartMetric}
					options={[
						{ label: "Цены", value: "price" },
						{ label: "Количество", value: "count" },
					]}
				/>
			</div>
			<Input.Search
				allowClear
				placeholder="Поиск по таблице и графику"
				className="ms-price-history-toolbar__search"
				value={tableSearch}
				onChange={(e) => setTableSearch(e.target.value)}
			/>
		</div>
	)

	const chartBlock =
		chartPack.data.length > 0 ? (
			chartMetric === "count" ? (
				<div className="ms-chart-surface ms-chart-surface--compact">
					<ResponsiveContainer width="100%" height={280}>
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
							<RechartsTooltip content={chartTooltip} />
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
				<div className="ms-chart-surface ms-chart-surface--compact">
					<ResponsiveContainer width="100%" height={280}>
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
							<RechartsTooltip content={chartTooltip} />
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
			<div className="ms-chart-surface ms-chart-surface--compact">
				<Text type="secondary">Нет данных для графика</Text>
			</div>
		)

	return (
		<div className="ms-price-history-page">
			<div className="ms-page-hero">
				<Title level={2} style={{ marginBottom: 8 }}>
					История цен
				</Title>
				<Paragraph type="secondary" style={{ marginBottom: 0 }}>
					Данные подгружаются автоматически при смене периода, города, брендов, моделей
					или дилеров. Таблица и график используют одну и ту же выборку; колонка
					«Изм.» — изменение цены той же позиции относительно предыдущего запуска в
					истории.
				</Paragraph>
			</div>

			<Card size="small" className="ms-filter-card ms-price-history-filters">
				{(meta?.cities || []).length > 1 && cities.length === 0 ? (
					<Alert
						type="info"
						showIcon
						style={{ marginBottom: 12 }}
						message="Укажите город, чтобы не смешивать регионы в одной выборке."
					/>
				) : null}
				<Row gutter={[16, 16]} align="bottom">
					<Col xs={24} lg={8}>
						<div className="ms-ph-filter-label">
							<Text type="secondary">Период</Text>
						</div>
						<RangePicker
							className="ms-ph-range"
							format="DD.MM.YYYY HH:mm"
							showTime={{ format: "HH:mm" }}
							value={range}
							onChange={(dates) => {
								if (dates?.[0] && dates?.[1]) setRange(dates)
							}}
						/>
					</Col>
					<Col xs={24} sm={12} lg={4}>
						<div className="ms-ph-filter-label">
							<Text type="secondary">Город</Text>
						</div>
						<Select
							mode="multiple"
							allowClear
							placeholder="Все города"
							className="ms-ph-select"
							options={(meta.cities || []).map((c) => ({
								value: c,
								label: getCityLabel(c),
							}))}
							value={cities}
							onChange={setCities}
						/>
					</Col>
					<Col xs={24} sm={12} lg={4}>
						<div className="ms-ph-filter-label">
							<Text type="secondary">Бренды</Text>
						</div>
						<Select
							mode="multiple"
							allowClear
							placeholder="Все"
							className="ms-ph-select"
							options={(meta.brands || []).map((b) => ({ value: b, label: b }))}
							value={brands}
							onChange={setBrands}
						/>
					</Col>
					<Col xs={24} sm={12} lg={4}>
						<div className="ms-ph-filter-label">
							<Text type="secondary">Модели</Text>
						</div>
						<Select
							mode="multiple"
							allowClear
							placeholder="Все"
							className="ms-ph-select"
							options={(meta.models || []).map((m) => ({ value: m, label: m }))}
							value={models}
							onChange={setModels}
						/>
					</Col>
					<Col xs={24} sm={12} lg={4}>
						<div className="ms-ph-filter-label">
							<Text type="secondary">Дилеры</Text>
						</div>
						<Select
							mode="multiple"
							allowClear
							placeholder="Все"
							className="ms-ph-select"
							options={(meta.dealers || []).map((d) => ({ value: d, label: d }))}
							value={dealers}
							onChange={setDealers}
						/>
					</Col>
				</Row>
			</Card>

			<div className="ms-price-history-split">
				<Card size="small" className="ms-price-history-panel" title="Таблица">
					{overviewToolbar}
					{tableView === "flat" ? (
						<Table
							className="ms-table-polished ms-price-history-table"
							size="small"
							tableLayout="fixed"
							rowKey={(r) => `${r.id ?? r.run_id}-${stableOfferKey(r)}`}
							columns={tableColumns}
							dataSource={filteredHistoryRows}
							loading={loading}
							pagination={{ pageSize: 15, showSizeChanger: true }}
						/>
					) : (
						<Table
							className="ms-table-polished ms-price-history-table"
							size="small"
							tableLayout="fixed"
							rowKey="key"
							columns={groupParentColumns}
							dataSource={groupedHistoryParents || []}
							pagination={{ pageSize: 12, showSizeChanger: true }}
							expandable={{
								expandedRowRender: (rec) => (
									<Table
										className="ms-table-polished ms-price-history-table"
										size="small"
										tableLayout="fixed"
										rowKey={(r) =>
											`${r.id ?? r.run_id}-${stableOfferKey(r)}`
										}
										columns={tableColumns}
										dataSource={rec.nestedRows}
										pagination={false}
									/>
								),
							}}
						/>
					)}
				</Card>
				<Card size="small" className="ms-price-history-panel" title="График">
					{chartBlock}
				</Card>
			</div>

			<Card size="small" title="Инструменты" className="ms-price-history-tools">
				<Space wrap>
					<Button icon={<DownloadOutlined />} onClick={exportJson}>
						Экспорт JSON
					</Button>
					<Upload {...importProps}>
						<Button icon={<UploadOutlined />}>Импорт JSON</Button>
					</Upload>
				</Space>
			</Card>
		</div>
	)
}
