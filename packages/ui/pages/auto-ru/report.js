import React, { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"

import { mergeCityOptions } from "@market-slice/application/settings/defaults.js"
import { Input, Select, Space, Table, Tag, Tooltip, Typography } from "antd"

import {
	generateComprehensiveAnalytics,
	resolveReportCityScope,
	uniqueCitiesFromReport,
} from "../../analytics.js"
import { FavoriteStar } from "./FavoriteStar.jsx"
import { buildDetailedColumns } from "./columns.jsx"
import { money } from "./report-formatters.js"

const { Text } = Typography

function offerTooltipContent(offer) {
	if (!offer) return "Нет данных по этому показателю"
	const title = [offer.brand, offer.model].filter(Boolean).join(" ").trim()
	const spec = [offer.equipment, offer.modification, offer.year]
		.filter((x) => x != null && String(x).trim() !== "")
		.join(" · ")
	return (
		<div style={{ maxWidth: 300 }}>
			{title ? (
				<div>
					<b>{title}</b>
				</div>
			) : null}
			{spec ? <div style={{ fontSize: 12, marginTop: 4 }}>{spec}</div> : null}
			<div style={{ marginTop: 8 }}>Дилер: {offer.dealer || "—"}</div>
		</div>
	)
}

function BrandCockpitPanel({ brand, data, modelRows, getCityLabel }) {
	const [pageSize, setPageSize] = useState(10)
	const [page, setPage] = useState(1)
	const [searchText, setSearchText] = useState("")

	useEffect(() => {
		setPage(1)
	}, [brand])

	useEffect(() => {
		setPage(1)
	}, [searchText])

	const filteredModelRows = useMemo(() => {
		const rows = modelRows || []
		const q = searchText.trim().toLowerCase()
		if (!q) return rows
		return rows.filter((r) => {
			const blob = [
				r.model,
				r.equipment,
				r.modification,
				r.year,
				r.city,
				getCityLabel(String(r.city ?? "")),
				r.minDealer,
				r.secondDealer,
				r.priceMinDealer,
				r.bestDiscountDealer,
			]
				.join(" ")
				.toLowerCase()
			return blob.includes(q)
		})
	}, [modelRows, searchText, getCityLabel])

	const detailedCols = useMemo(
		() =>
			buildDetailedColumns({
				getCityLabel,
				filterRows: modelRows || [],
			}),
		[getCityLabel, modelRows],
	)

	const detailedWithFavorite = useMemo(
		() => [
			{
				title: "",
				key: "fav",
				width: 40,
				fixed: "left",
				render: (_, rec) => <FavoriteStar row={rec} />,
			},
			...detailedCols,
		],
		[detailedCols],
	)

	if (!data) return null
	const { summary, topCheapest, topDiscounts } = data
	const cheapestOffer = topCheapest?.[0]
	const topDiscOffer = topDiscounts?.[0]

	const top5 = (topCheapest || []).slice(0, 5)

	const top5Cols = [
		{
			title: "",
			key: "pos",
			width: 40,
			render: (_, __, i) => (
				<span
					className={`ms-mini-pos ${i === 0 ? "p1" : i === 1 ? "p2" : i === 2 ? "p3" : ""}`}
				>
					{i + 1}
				</span>
			),
		},
		{
			title: "Бренд",
			dataIndex: "brand",
			width: 72,
			render: (b) => <span className="ms-chip ms-chip-blue">{b}</span>,
		},
		{
			title: "Модель",
			dataIndex: "model",
			ellipsis: true,
			render: (m) => <b>{m}</b>,
		},
		{
			title: "Комплектация",
			key: "eq",
			ellipsis: true,
			render: (_, r) => (
				<span style={{ fontSize: 12 }}>
					{r.equipment} · {r.modification} · {r.year}
				</span>
			),
		},
		{
			title: "Цена",
			dataIndex: "price",
			width: 96,
			render: (v) => <span className="ms-text-amber">{money(v)}</span>,
		},
		{
			title: "Скидка",
			dataIndex: "maxDiscount",
			width: 100,
			render: (d, r) =>
				d ? (
					<span className="ms-chip ms-chip-red">
						−{Number(d).toLocaleString("ru-RU")} ₽
					</span>
				) : (
					"—"
				),
		},
		{
			title: "Итог",
			key: "fin",
			width: 96,
			render: (_, r) => {
				const fin = (r.price || 0) - (r.maxDiscount || 0)
				return <span className="ms-text-green">{money(fin)}</span>
			},
		},
		{ title: "Дилер", dataIndex: "dealer", ellipsis: true },
	]

	return (
		<Space
			direction="vertical"
			style={{ width: "100%" }}
			size={12}
		>
			<div className="ms-cockpit-g3">
				<div className="ms-stat-tile">
					<Text
						type="secondary"
						style={{ fontSize: 11, textTransform: "uppercase" }}
					>
						Предложений
					</Text>
					<div className="ms-stat-tile-val ms-val-blue">
						{summary.totalOffers.toLocaleString("ru-RU")}
					</div>
				</div>
				<Tooltip title={offerTooltipContent(cheapestOffer)}>
					<div
						className="ms-stat-tile ms-stat-tile--hoverable"
						role="presentation"
					>
						<Text
							type="secondary"
							style={{ fontSize: 11, textTransform: "uppercase" }}
						>
							Мин. цена
						</Text>
						<div className="ms-stat-tile-val ms-val-green">
							{money(summary.minPrice)}
						</div>
					</div>
				</Tooltip>
				<Tooltip title={offerTooltipContent(topDiscOffer)}>
					<div
						className="ms-stat-tile ms-stat-tile--hoverable"
						role="presentation"
					>
						<Text
							type="secondary"
							style={{ fontSize: 11, textTransform: "uppercase" }}
						>
							Лучшая скидка
						</Text>
						<div className="ms-stat-tile-val ms-val-red">
							{money(summary.maxDiscount)}
						</div>
					</div>
				</Tooltip>
			</div>

			<div
				className="ms-dash-card ant-card ant-card-bordered"
				style={{ padding: 0 }}
			>
				<div
					className="ms-card-hd"
					style={{ padding: "12px 16px 0" }}
				>
					Топ-5 по цене — {brand}
				</div>
				<div style={{ padding: "0 16px 14px" }}>
					<Table
						className="ms-table-polished"
						size="small"
						pagination={false}
						columns={top5Cols}
						dataSource={top5}
						rowKey={(r, i) => `${r.brand}-${r.model}-${i}`}
						scroll={{ x: "max-content" }}
						tableLayout="auto"
						style={{ width: "100%" }}
					/>
				</div>
			</div>

			<div
				className="ms-dash-card ant-card ant-card-bordered"
				style={{ padding: 0 }}
			>
				<div
					className="ms-card-hd"
					style={{
						padding: "12px 16px 0",
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 10,
					}}
				>
					<span>Детальная аналитика — модели {brand}</span>
					<Input.Search
						allowClear
						placeholder="Поиск по модели, комплектации, дилеру…"
						style={{ minWidth: 220, maxWidth: 360 }}
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
					/>
				</div>
				<div style={{ padding: "0 16px 14px" }}>
					<Table
						className="ms-table-polished"
						size="small"
						columns={detailedWithFavorite}
						dataSource={filteredModelRows}
						rowKey={(r) =>
							`${r.brand}::${r.model}::${r.equipment}::${r.modification}::${r.year}::${r.city || "—"}`
						}
						pagination={{
							current: page,
							pageSize,
							total: filteredModelRows.length,
							showSizeChanger: true,
							pageSizeOptions: [10, 20, 50, 100],
							showTotal: (t) => `Записей: ${t}`,
							onChange: (p) => setPage(p),
							onShowSizeChange: (_cur, size) => {
								setPageSize(size)
								setPage(1)
							},
						}}
						scroll={{ x: "max-content" }}
						tableLayout="auto"
						style={{ width: "100%" }}
					/>
				</div>
			</div>
		</Space>
	)
}

export function AutoRuReport() {
	const report = useSelector((state) => state.autoRu.report || [])
	const settings = useSelector((state) => state.settings)
	const cityIds = useMemo(() => uniqueCitiesFromReport(report), [report])
	const cityOptions = useMemo(() => {
		const opts = mergeCityOptions(settings.extraCities ?? [])
		return cityIds.map((id) => ({
			value: id,
			label: opts.find((c) => c.id === id)?.name || id,
		}))
	}, [cityIds, settings.extraCities])

	const getCityLabel = useMemo(() => {
		const opts = mergeCityOptions(settings.extraCities ?? [])
		const byId = new Map(opts.map((c) => [String(c.id), c.name]))
		return (id) => {
			if (id == null || id === "" || id === "—") return "—"
			const s = String(id)
			return byId.get(s) ?? s
		}
	}, [settings.extraCities])

	const [cityOverride, setCityOverride] = useState(null)
	const [brandTab, setBrandTab] = useState(null)

	useEffect(() => {
		const ids = uniqueCitiesFromReport(report)
		setCityOverride((prev) => (prev && ids.includes(prev) ? prev : null))
	}, [report])

	const effectiveScopeCity = useMemo(() => {
		if (!cityIds.length) return null
		if (cityOverride && cityIds.includes(cityOverride)) return cityOverride
		return resolveReportCityScope(report, settings) ?? cityIds[0]
	}, [report, settings, cityOverride, cityIds])

	const analytics = useMemo(
		() => generateComprehensiveAnalytics(report, { city: effectiveScopeCity }),
		[report, effectiveScopeCity],
	)

	const { perBrand, perBrandAnalytics } = analytics
	const brandKeys = Object.keys(perBrand).sort()

	useEffect(() => {
		if (!brandKeys.length) {
			setBrandTab(null)
			return
		}
		setBrandTab((prev) =>
			prev && brandKeys.includes(prev) ? prev : brandKeys[0],
		)
	}, [brandKeys])

	return (
		<Space
			direction="vertical"
			style={{ width: "100%" }}
			size={14}
		>
			<Text
				type="secondary"
				style={{ display: "block", marginBottom: 10, fontSize: 12 }}
			>
				Сводка в рамках выбранного города — без смешивания регионов.
			</Text>
			{cityIds.length > 1 ? (
				<Space
					wrap
					align="center"
					style={{ marginBottom: 12 }}
				>
					<Text strong>Город:</Text>
					<Select
						style={{ minWidth: 220 }}
						value={effectiveScopeCity}
						options={cityOptions}
						onChange={(v) => setCityOverride(v)}
					/>
				</Space>
			) : cityIds.length === 1 ? (
				<Text
					type="secondary"
					style={{ display: "block", marginBottom: 12, fontSize: 12 }}
				>
					Город: {cityOptions[0]?.label ?? cityIds[0]}
				</Text>
			) : null}

			{brandKeys.length > 0 && brandTab ? (
				<>
					<div className="ms-report-brand-tabs">
						<Text
							type="secondary"
							style={{ display: "block", marginBottom: 8, fontSize: 12 }}
						>
							Бренд отчёта
						</Text>
						<div className="ms-tabs-bar ms-tabs-bar--prominent">
							{brandKeys.map((b) => (
								<button
									key={b}
									type="button"
									className={`ms-tab-btn ${brandTab === b ? "active" : ""}`}
									onClick={() => setBrandTab(b)}
								>
									{b}
								</button>
							))}
						</div>
					</div>
					<BrandCockpitPanel
						brand={brandTab}
						data={perBrandAnalytics[brandTab]}
						modelRows={perBrand[brandTab]?.models ?? []}
						getCityLabel={getCityLabel}
					/>
				</>
			) : (
				<Text type="secondary">Нет данных — загрузите отчёт на главной.</Text>
			)}
		</Space>
	)
}
