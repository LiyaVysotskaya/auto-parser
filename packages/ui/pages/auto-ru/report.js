import React, { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"

import { mergeCityOptions } from "@market-slice/application/settings/defaults.js"
import { Select, Space, Table, Tag, Typography } from "antd"

import {
	filterRowsFlatByCity,
	flattenReport,
	generateComprehensiveAnalytics,
	resolveReportCityScope,
	uniqueCitiesFromReport,
} from "../../analytics.js"
import { FavoriteStar } from "./FavoriteStar.jsx"
import { detailedColumns } from "./columns.jsx"
import { money, pct } from "./report-formatters.js"

const { Text } = Typography

function BrandCockpitPanel({ brand, data, modelRows }) {
	if (!data) return null
	const { summary, topCheapest, topDiscounts } = data
	const topDisc = topDiscounts?.[0]
	const bestPct =
		topDisc?.price && topDisc?.maxDiscount
			? (topDisc.maxDiscount / topDisc.price) * 100
			: null

	const top5 = (topCheapest || []).slice(0, 5)

	const top5Cols = [
		{
			title: "Поз.",
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

	const detailedWithFavorite = [
		{
			title: "",
			key: "fav",
			width: 40,
			fixed: "left",
			render: (_, rec) => <FavoriteStar row={rec} />,
		},
		...detailedColumns,
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
				<div className="ms-stat-tile">
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
				<div className="ms-stat-tile">
					<Text
						type="secondary"
						style={{ fontSize: 11, textTransform: "uppercase" }}
					>
						Лучшая скидка
					</Text>
					<div className="ms-stat-tile-val ms-val-red">
						{money(summary.maxDiscount)}
					</div>
					{bestPct != null ? (
						<div className="ms-stat-delta ms-stat-delta--muted">
							{bestPct.toFixed(0)}%
						</div>
					) : null}
				</div>
			</div>

			<div
				className="ms-dash-card ant-card ant-card-bordered"
				style={{ padding: 0 }}
			>
				<div
					className="ms-card-hd"
					style={{ padding: "12px 14px 0" }}
				>
					Топ-5 по цене — {brand}
				</div>
				<div style={{ padding: "0 8px 12px" }}>
					<Table
						className="ms-table-polished"
						size="small"
						pagination={false}
						columns={top5Cols}
						dataSource={top5}
						rowKey={(r, i) => `${r.brand}-${r.model}-${i}`}
						scroll={{ x: 720 }}
					/>
				</div>
			</div>

			<div
				className="ms-dash-card ant-card ant-card-bordered"
				style={{ padding: 0 }}
			>
				<div
					className="ms-card-hd"
					style={{ padding: "12px 14px 0" }}
				>
					Детальная аналитика — модели {brand}
				</div>
				<div style={{ padding: "0 8px 12px" }}>
					<Table
						className="ms-table-polished"
						size="small"
						columns={detailedWithFavorite}
						dataSource={modelRows || []}
						rowKey={(r) =>
							`${r.brand}::${r.model}::${r.equipment}::${r.modification}::${r.year}::${r.city || "—"}`
						}
						pagination={{ pageSize: 10, showSizeChanger: true }}
						scroll={{ x: 900 }}
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

	const { summary, perBrand, perBrandAnalytics } = analytics
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
		<div style={{ minHeight: "100%" }}>
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

			<div
				className="ms-stat-grid"
				style={{ marginBottom: 14 }}
			>
				<div className="ms-stat-tile">
					<Text
						type="secondary"
						style={{ fontSize: 11, textTransform: "uppercase" }}
					>
						Всего предложений
					</Text>
					<div className="ms-stat-tile-val ms-val-blue">
						{summary.totalOffers.toLocaleString("ru-RU")}
					</div>
				</div>
				<div className="ms-stat-tile">
					<Text
						type="secondary"
						style={{ fontSize: 11, textTransform: "uppercase" }}
					>
						Средняя цена
					</Text>
					<div className="ms-stat-tile-val ms-val-amber">
						{money(Math.round(summary.avgPrice))}
					</div>
				</div>
				<div className="ms-stat-tile">
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
				<div className="ms-stat-tile">
					<Text
						type="secondary"
						style={{ fontSize: 11, textTransform: "uppercase" }}
					>
						Макс. скидка
					</Text>
					<div className="ms-stat-tile-val ms-val-red">
						{money(summary.maxDiscount)}
					</div>
				</div>
			</div>

			{brandKeys.length > 0 && brandTab ? (
				<>
					<div
						className="ms-tabs-bar"
						style={{ marginBottom: 12 }}
					>
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
					<BrandCockpitPanel
						brand={brandTab}
						data={perBrandAnalytics[brandTab]}
						modelRows={perBrand[brandTab]?.models ?? []}
					/>
				</>
			) : (
				<Text type="secondary">Нет данных — загрузите отчёт на главной.</Text>
			)}

			<div
				style={{ marginTop: 16 }}
				className="ms-dash-card ant-card ant-card-bordered"
			>
				<div
					className="ms-card-hd"
					style={{ padding: "12px 14px 0" }}
				>
					Справочник по моделям
				</div>
				<div style={{ padding: "8px 14px 14px" }}>
					{brandKeys.length === 0 ? (
						<Text type="secondary">Нет данных</Text>
					) : (
						brandKeys.map((brand) => (
							<div
								key={brand}
								style={{ marginBottom: 16 }}
							>
								<Space
									wrap
									style={{ marginBottom: 8 }}
								>
									<Text strong>{brand}</Text>
									<Tag>{perBrand[brand].models.length} моделей</Tag>
									<Tag color="success">
										{perBrand[brand].models.reduce(
											(s, m) => s + m.totalOffers,
											0,
										)}{" "}
										предложений
									</Tag>
								</Space>
								<Table
									className="ms-table-polished"
									size="small"
									columns={[
										{
											title: "",
											key: "fav",
											width: 40,
											render: (_, rec) => <FavoriteStar row={rec} />,
										},
										...detailedColumns,
									]}
									dataSource={perBrand[brand].models}
									rowKey={(r) =>
										`${r.brand}::${r.model}::${r.equipment}::${r.modification}::${r.year}::${r.city || "—"}`
									}
									pagination={{ pageSize: 8, showSizeChanger: true }}
									scroll={{ x: 800 }}
								/>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	)
}
