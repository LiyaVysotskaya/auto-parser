import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"

import {
	DownloadOutlined,
	UploadOutlined,
} from "@ant-design/icons"
import {
	Alert,
	Button,
	Card,
	Col,
	DatePicker,
	Input,
	Row,
	Select,
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
import { useCityLabel } from "../../hooks/useCityLabel.js"
import { downloadJson } from "../../utils/download-file.js"
import { attachPriceDeltas, stableOfferKey } from "./offer-delta.js"
import { money } from "@market-slice/application/lib/formatters.js"

const { Paragraph, Text, Title } = Typography
const { RangePicker } = DatePicker

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

function normCell(v) {
	const s = String(v ?? "").trim()
	return s || "—"
}

function uniqueSortedDistinct(values, locale = "ru") {
	const seen = new Set()
	for (const v of values) {
		seen.add(normCell(v))
	}
	const out = [...seen]
	out.sort((a, b) => a.localeCompare(b, locale))
	return out
}

function stringFilters(list) {
	return list.map((v) => ({
		text: v.length > 44 ? `${v.slice(0, 42)}…` : v,
		value: v,
	}))
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

	const [tableSearch, setTableSearch] = useState("")

	const settings = useSelector((state) => state.settings)
	const getCityLabel = useCityLabel()
	const didAutoCity = useRef(false)
	const { token } = theme.useToken()

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

	const tableColumns = useMemo(() => {
		const src = rows
		const brandFilters = stringFilters(
			uniqueSortedDistinct(src.map((r) => r.brand)),
		)
		const modelFilters = stringFilters(
			uniqueSortedDistinct(src.map((r) => r.model)),
		)
		const equipmentFilters = stringFilters(
			uniqueSortedDistinct(src.map((r) => r.equipment)),
		)
		const modificationFilters = stringFilters(
			uniqueSortedDistinct(src.map((r) => r.modification)),
		)
		const yearFilters = uniqueSortedDistinct(
			src.map((r) => (r.year != null && r.year !== "" ? String(r.year) : "—")),
		).map((y) => ({ text: y, value: y }))
		const cityIds = uniqueSortedDistinct(src.map((r) => r.city))
		const cityFilters = cityIds.map((c) => ({
			text: getCityLabel(c),
			value: c,
		}))
		const dealerFilters = stringFilters(
			uniqueSortedDistinct(src.map((r) => r.dealer)),
		)

		return [
			{
				title: "Запуск",
				dataIndex: "run_started",
				key: "run_started",
				width: 152,
				ellipsis: true,
				sorter: (a, b) =>
					String(a.run_started || "").localeCompare(String(b.run_started || "")),
				render: (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "—"),
			},
			{
				title: "Бренд",
				dataIndex: "brand",
				key: "brand",
				width: 88,
				ellipsis: true,
				filterSearch: true,
				filters: brandFilters,
				onFilter: (value, record) => normCell(record.brand) === value,
				sorter: (a, b) => String(a.brand || "").localeCompare(String(b.brand || ""), "ru"),
			},
			{
				title: "Модель",
				dataIndex: "model",
				key: "model",
				width: 72,
				ellipsis: true,
				filterSearch: true,
				filters: modelFilters,
				onFilter: (value, record) => normCell(record.model) === value,
				sorter: (a, b) =>
					String(a.model || "").localeCompare(String(b.model || ""), "ru"),
			},
			{
				title: "Комплектация",
				dataIndex: "equipment",
				key: "equipment",
				width: 120,
				ellipsis: true,
				filterSearch: true,
				filters: equipmentFilters,
				onFilter: (value, record) => normCell(record.equipment) === value,
				sorter: (a, b) =>
					String(a.equipment || "").localeCompare(String(b.equipment || ""), "ru"),
			},
			{
				title: "Модификация",
				dataIndex: "modification",
				key: "modification",
				width: 200,
				ellipsis: true,
				filterSearch: true,
				filters: modificationFilters,
				onFilter: (value, record) => normCell(record.modification) === value,
				sorter: (a, b) =>
					String(a.modification || "").localeCompare(String(b.modification || ""), "ru"),
			},
			{
				title: "Год",
				dataIndex: "year",
				key: "year",
				width: 64,
				align: "center",
				filters: yearFilters,
				onFilter: (value, record) =>
					(record.year != null && record.year !== ""
						? String(record.year)
						: "—") === value,
				sorter: (a, b) => Number(a.year ?? 0) - Number(b.year ?? 0),
				render: (v) => (v != null && v !== "" ? String(v) : "—"),
			},
			{
				title: "Город",
				dataIndex: "city",
				key: "city",
				width: 120,
				ellipsis: true,
				filterSearch: true,
				filters: cityFilters,
				onFilter: (value, record) => normCell(record.city) === value,
				sorter: (a, b) => String(a.city || "").localeCompare(String(b.city || ""), "ru"),
				render: (v) => getCityLabel(v),
			},
			{
				title: "Дилер",
				dataIndex: "dealer",
				key: "dealer",
				width: 200,
				ellipsis: true,
				filterSearch: true,
				filters: dealerFilters,
				onFilter: (value, record) => normCell(record.dealer) === value,
				sorter: (a, b) =>
					String(a.dealer || "").localeCompare(String(b.dealer || ""), "ru"),
			},
			{
				title: "Шт.",
				dataIndex: "count",
				key: "count",
				width: 56,
				align: "right",
				sorter: (a, b) => unitsForRow(a) - unitsForRow(b),
				render: (_, r) => unitsForRow(r),
			},
			{
				title: "Цена",
				dataIndex: "price",
				key: "price",
				width: 118,
				align: "right",
				sorter: (a, b) => (a.price ?? 0) - (b.price ?? 0),
				render: (v) => money(v),
			},
			{
				title: (
					<span
						className="ms-ph-delta-th"
						title="Изменение основной цены к предыдущему запуску той же позиции"
					>
						Изм. цены
					</span>
				),
				key: "delta",
				className: "ms-ph-delta-col",
				width: 168,
				align: "right",
				filters: [
					{ text: "Снижение", value: "down" },
					{ text: "Рост", value: "up" },
					{ text: "Нет сравнения с прошлым запуском", value: "na" },
				],
				onFilter: (value, record) => {
					if (value === "down")
						return record._delta != null && record._delta < 0
					if (value === "up")
						return record._delta != null && record._delta > 0
					if (value === "na") return record._delta == null
					return true
				},
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
					const line = pct
						? `${arrow}${sign}${amount} (${pct})`
						: `${arrow}${sign}${amount}`
					return (
						<Tooltip title={line} placement="top">
							<div className="ms-ph-delta-cell ms-ph-delta-cell--pill">
								<Text
									strong
									style={{
										color,
										fontVariantNumeric: "tabular-nums",
										whiteSpace: "nowrap",
									}}
								>
									{arrow}
									{sign}
									{amount}
									{pct != null ? (
										<span
											style={{
												color,
												fontSize: 11,
												marginLeft: 4,
												fontWeight: 600,
												fontVariantNumeric: "tabular-nums",
												opacity: 0.88,
											}}
										>
											({pct})
										</span>
									) : null}
								</Text>
							</div>
						</Tooltip>
					)
				},
			},
			{
				title: "Мин. цена",
				dataIndex: "price_min",
				key: "price_min",
				width: 118,
				align: "right",
				sorter: (a, b) => (a.price_min ?? 0) - (b.price_min ?? 0),
				render: (v) => money(v),
			},
			{
				title: "2-я цена",
				dataIndex: "second_price",
				key: "second_price",
				width: 118,
				align: "right",
				sorter: (a, b) => (a.second_price ?? 0) - (b.second_price ?? 0),
				render: (v) => money(v),
			},
			{
				title: "Макс. скидка",
				dataIndex: "max_discount",
				key: "max_discount",
				width: 118,
				align: "right",
				sorter: (a, b) => (a.max_discount ?? 0) - (b.max_discount ?? 0),
				render: (v) => money(v),
			},
			{
				title: "Трейд-ин",
				dataIndex: "tradein_discount",
				key: "tradein_discount",
				width: 100,
				align: "right",
				sorter: (a, b) => (a.tradein_discount ?? 0) - (b.tradein_discount ?? 0),
				render: (v) => money(v),
			},
			{
				title: "Кредит",
				dataIndex: "credit_discount",
				key: "credit_discount",
				width: 100,
				align: "right",
				sorter: (a, b) => (a.credit_discount ?? 0) - (b.credit_discount ?? 0),
				render: (v) => money(v),
			},
			{
				title: "Страховка",
				dataIndex: "insurance_discount",
				key: "insurance_discount",
				width: 100,
				align: "right",
				sorter: (a, b) => (a.insurance_discount ?? 0) - (b.insurance_discount ?? 0),
				render: (v) => money(v),
			},
		]
	}, [rows, getCityLabel, token.colorError, token.colorSuccess, token.colorTextSecondary])

	const exportJson = async () => {
		if (!electron?.priceHistoryExport) return
		const res = await electron.priceHistoryExport({ dateFrom, dateTo })
		if (!res?.ok || !res.data) {
			message.error(res?.error || "Ошибка экспорта")
			return
		}
		downloadJson(
			res.data,
			`price-history_${dayjs().format("DD MM YYYY")}.json`,
		)
		message.success("Экспорт готов")
	}

	const importProps = {
		beforeUpload: (file) => {
			; (async () => {
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

	const overviewToolbar = (
		<div className="ms-price-history-toolbar">
			<Text type="secondary" className="ms-ph-toolbar-hint">
				Фильтры — в иконках в заголовках колонок; поиск ниже фильтрует текущий список по
				тексту.
			</Text>
			<Input.Search
				allowClear
				placeholder="Поиск по строке"
				className="ms-price-history-toolbar__search"
				value={tableSearch}
				onChange={(e) => setTableSearch(e.target.value)}
			/>
		</div>
	)

	const tableScroll = { x: "max-content" }

	return (
		<div className="ms-price-history-page">
			<div className="ms-page-hero">
				<Title level={2} style={{ marginBottom: 8 }}>
					История цен
				</Title>
				<Paragraph type="secondary" style={{ marginBottom: 0 }}>
					Данные накапливаются после каждого завершённого парсинга. Сначала задайте
					период и город — так сводки и графики останутся в одном регионе. Экспорт и
					импорт JSON удобны для обмена между коллегами.
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

			<Card size="small" className="ms-price-history-panel ms-price-history-table-card">
				{overviewToolbar}
				<div className="ms-ph-table-scroll">
					<Table
						className="ms-table-polished ms-price-history-table"
						size="small"
						tableLayout="auto"
						scroll={tableScroll}
						rowKey={(r) => `${r.id ?? r.run_id}-${stableOfferKey(r)}`}
						columns={tableColumns}
						dataSource={filteredHistoryRows}
						loading={loading}
						pagination={{
							pageSize: 25,
							showSizeChanger: true,
							pageSizeOptions: [15, 25, 50, 100],
						}}
					/>
				</div>
			</Card>

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
