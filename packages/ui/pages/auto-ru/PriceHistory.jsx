import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
	DownloadOutlined,
	UploadOutlined,
} from "@ant-design/icons"
import { Line } from "@ant-design/plots"
import {
	Button,
	Card,
	DatePicker,
	Select,
	Space,
	Table,
	Tabs,
	Tag,
	Typography,
	Upload,
	message,
	theme,
} from "antd"
import dayjs from "dayjs"
import * as autoRuTools from "@market-slice/auto-ru"

import { diffFlattenedOffers, flattenReport } from "../../analytics.js"
import { electron } from "../../electron.js"
import { money, pct } from "./report-formatters.js"

const { Text, Title } = Typography
const { RangePicker } = DatePicker

function stableOfferKey(r) {
	return [
		r.brand,
		r.model,
		r.equipment || "—",
		r.modification || "—",
		String(r.year ?? ""),
		r.dealer || "—",
		r.city || "—",
	].join("\u0000")
}

function attachPriceDeltas(rows) {
	const byKey = new Map()
	for (const r of rows) {
		const k = stableOfferKey(r)
		if (!byKey.has(k)) byKey.set(k, [])
		byKey.get(k).push(r)
	}
	for (const list of byKey.values()) {
		list.sort((a, b) =>
			String(a.run_started).localeCompare(String(b.run_started)),
		)
		for (let i = 0; i < list.length; i++) {
			const cur = list[i]
			const prev = list[i - 1]
			let delta = null
			let deltaPct = null
			if (
				prev &&
				cur.price != null &&
				prev.price != null &&
				prev.run_started !== cur.run_started
			) {
				delta = cur.price - prev.price
				deltaPct = prev.price ? delta / prev.price : null
			}
			cur._delta = delta
			cur._deltaPct = deltaPct
		}
	}
	return rows
}

export function PriceHistory() {
	const { token } = theme.useToken()
	const [tab, setTab] = useState("table")
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
		loadRuns()
	}, [loadRuns])

	useEffect(() => {
		loadRows()
	}, [loadRows])

	const chartData = useMemo(() => {
		const byDate = new Map()
		for (const r of rows) {
			if (r.price == null) continue
			const d = String(r.run_started || "").slice(0, 10)
			if (!d) continue
			const cur = byDate.get(d)
			if (!cur || r.price < cur.price) {
				byDate.set(d, { date: d, price: r.price })
			}
		}
		return [...byDate.entries()]
			.map(([date, v]) => ({ date, price: v.price }))
			.sort((a, b) => a.date.localeCompare(b.date))
	}, [rows])

	const summaryText = useMemo(() => {
		if (!rows.length) return null
		const prices = rows.map((r) => r.price).filter((p) => p != null)
		if (!prices.length) return null
		const minP = Math.min(...prices)
		const maxP = Math.max(...prices)
		return `В выборке ${rows.length} строк, цены от ${money(minP)} до ${money(maxP)}`
	}, [rows])

	const tableColumns = [
		{
			title: "Запуск",
			dataIndex: "run_started",
			key: "run_started",
			width: 160,
			render: (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "—"),
		},
		{ title: "Бренд", dataIndex: "brand", key: "brand", width: 90 },
		{ title: "Модель", dataIndex: "model", key: "model", width: 120 },
		{ title: "Комплектация", dataIndex: "equipment", key: "equipment", ellipsis: true },
		{ title: "Город", dataIndex: "city", key: "city", width: 100 },
		{ title: "Дилер", dataIndex: "dealer", key: "dealer", width: 140, ellipsis: true },
		{
			title: "Цена",
			dataIndex: "price",
			key: "price",
			width: 110,
			render: (v) => money(v),
		},
		{
			title: "Изм.",
			key: "delta",
			width: 120,
			render: (_, r) => {
				if (r._delta == null) return "—"
				const down = r._delta < 0
				return (
					<Tag color={down ? "green" : r._delta > 0 ? "red" : "default"}>
						{down ? "" : "+"}
						{money(r._delta)}
						{r._deltaPct != null ? ` (${(r._deltaPct * 100).toFixed(1)}%)` : ""}
					</Tag>
				)
			},
		},
	]

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
		const report = autoRuTools.parseXlsx(buf)
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
		const rows = await parseXlsxFile(file)
		if (!rows) return
		setXlsxPick((p) => ({ ...p, [which]: { name: file.name, rows } }))
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

	const diffColumns = [
		{ title: "Тип", dataIndex: "change", key: "change", width: 100,
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
		{ title: "Бренд", dataIndex: "brand", key: "brand", width: 90 },
		{ title: "Модель", dataIndex: "model", key: "model", width: 110 },
		{ title: "Комплектация", dataIndex: "equipment", key: "equipment", ellipsis: true },
		{ title: "Город", dataIndex: "city", key: "city", width: 90 },
		{ title: "Дилер", dataIndex: "dealer", key: "dealer", width: 120, ellipsis: true },
		{
			title: "Цена A",
			dataIndex: "priceA",
			key: "priceA",
			width: 100,
			render: (v) => money(v),
		},
		{
			title: "Цена B",
			dataIndex: "priceB",
			key: "priceB",
			width: 100,
			render: (v) => money(v),
		},
		{
			title: "%",
			dataIndex: "pct",
			key: "pct",
			width: 80,
			render: (v) => (v == null ? "—" : pct(v)),
		},
	]

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

	return (
		<div style={{ padding: 16 }}>
			<Title level={3}>История цен</Title>
			<Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
				Данные накапливаются после каждого завершённого парсинга. Экспорт и импорт
				JSON — для обмена между коллегами.
			</Text>

			<Card size="small" style={{ marginBottom: 16 }}>
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
				{summaryText ? (
					<div style={{ marginTop: 12 }}>
						<Text type="secondary">{summaryText}</Text>
					</div>
				) : null}
			</Card>

			<Tabs
				activeKey={tab}
				onChange={setTab}
				items={[
					{
						key: "table",
						label: "Таблица",
						children: (
							<Table
								size="small"
								rowKey={(r) =>
									`${r.id ?? r.run_id}-${stableOfferKey(r)}`
								}
								columns={tableColumns}
								dataSource={rows}
								loading={loading}
								pagination={{ pageSize: 20, showSizeChanger: true }}
								scroll={{ x: 1100 }}
							/>
						),
					},
					{
						key: "chart",
						label: "График",
						children: chartData.length ? (
							<Line
								data={chartData}
								xField="date"
								yField="price"
								height={320}
								color={token.colorPrimary}
								point={{ size: 4 }}
								meta={{
									price: { alias: "Мин. цена, ₽" },
									date: { alias: "Дата запуска" },
								}}
							/>
						) : (
							<Text type="secondary">Нет данных для графика</Text>
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
								<Table
									size="small"
									rowKey="key"
									columns={diffColumns}
									dataSource={diffRows}
									pagination={{ pageSize: 15, showSizeChanger: true }}
									scroll={{ x: 1000 }}
								/>
							</Space>
						),
					},
				]}
			/>
		</div>
	)
}
