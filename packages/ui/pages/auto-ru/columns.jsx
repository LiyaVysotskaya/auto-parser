import React from "react"

import { Badge, Tag, Tooltip, Typography } from "antd"

import { money, pct } from "@market-slice/application/lib/formatters.js"

const { Text } = Typography

function carSpecDealerTooltip(record, dealerKey) {
	const dealer = record[dealerKey] || "—"
	return (
		<Text style={{ fontSize: 12, color: "var(--ant-color-text-light-solid)" }}>
			Дилер: {dealer}
		</Text>
	)
}

export const topOfferColumns = [
	{
		title: "",
		dataIndex: "position",
		key: "position",
		width: 50,
		render: (_, __, index) => (
			<Badge
				count={index + 1}
				style={{ backgroundColor: index < 3 ? "#ff4d4f" : "#1890ff" }}
			/>
		),
	},
	{
		title: "Бренд",
		dataIndex: "brand",
		key: "brand",
		width: 80,
		render: (brand) => <Tag color="blue">{brand}</Tag>,
	},
	{
		title: "Модель",
		dataIndex: "model",
		key: "model",
		width: 100,
		ellipsis: true,
	},
	{
		title: "Комплектация",
		dataIndex: "equipment",
		key: "equipment",
		width: 120,
		ellipsis: true,
	},
	{
		title: "Цена",
		dataIndex: "price",
		key: "price",
		width: 100,
		render: (price) => <Text strong>{money(price)}</Text>,
	},
	{
		title: "Скидка",
		dataIndex: "maxDiscount",
		key: "maxDiscount",
		width: 140,
		render: (discount, record) => {
			const pctVal =
				record.price && record.maxDiscount
					? record.maxDiscount / record.price
					: null
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-start",
					}}
				>
					{discount ? <Tag color="green">-{money(discount)}</Tag> : "—"}
					{pctVal != null ? (
						<div style={{ marginTop: 4 }}>
							<Tag color="magenta">{(pctVal * 100).toFixed(1)}%</Tag>
						</div>
					) : null}
				</div>
			)
		},
	},
	{
		title: "Итог",
		key: "finalPrice",
		width: 110,
		render: (_, record) => {
			const finalPrice =
				typeof record.finalPrice === "number"
					? record.finalPrice
					: (record.price || 0) - (record.maxDiscount || 0)
			return <Text type="danger">{money(finalPrice)}</Text>
		},
	},
	{
		title: "Дилер",
		dataIndex: "dealer",
		key: "dealer",
		width: 140,
		ellipsis: true,
		render: (dealer) => <Text copyable>{dealer}</Text>,
	},
	{
		title: "Город",
		dataIndex: "city",
		key: "city",
		width: 100,
		ellipsis: true,
		render: (city) => (city && city !== "—" ? <Tag>{city}</Tag> : "—"),
	},
]

export function buildDetailedColumns(opts = {}) {
	const getCityLabel =
		typeof opts.getCityLabel === "function"
			? opts.getCityLabel
			: (id) => String(id ?? "")
	const rows = Array.isArray(opts.filterRows) ? opts.filterRows : []
	const models = [
		...new Set(rows.map((r) => r.model).filter((m) => m != null && String(m))),
	].sort((a, b) => String(a).localeCompare(String(b), "ru"))
	const cityIds = [
		...new Set(
			rows
				.map((r) => r.city)
				.filter((c) => c != null && String(c).trim() !== "" && c !== "—"),
		),
	].sort((a, b) => String(a).localeCompare(String(b), "ru"))

	return [
		{
			title: "Модель",
			dataIndex: "model",
			key: "model",
			filters: models.map((m) => ({ text: String(m), value: m })),
			onFilter: (value, rec) => rec.model === value,
			filterSearch: true,
			render: (_v, rec) => (
				<div>
					<b>{rec.model}</b>
					<Text type="secondary" style={{ fontSize: 12, display: "block" }}>
						{rec.equipment} • {rec.modification} • {rec.year}
					</Text>
				</div>
			),
			fixed: "left",
			width: 200,
		},
		{
			title: "Мин. цена",
			dataIndex: "minPrice",
			key: "minPrice",
			width: 100,
			render: (v, record) => (
				<Tooltip title={`Дилер: ${record.minDealer || "—"}`}>{money(v)}</Tooltip>
			),
		},
		{
			title: "2-я цена",
			dataIndex: "secondPrice",
			key: "secondPrice",
			width: 100,
			render: (v, record) => (
				<Tooltip title={`Дилер: ${record.secondDealer || "—"}`}>{money(v)}</Tooltip>
			),
		},
		{
			title: "Разрыв",
			dataIndex: "priceGapPct",
			key: "priceGapPct",
			width: 90,
			render: (v) =>
				v ? (
					<Tag color={v > 0.05 ? "volcano" : "orange"}>
						{(v * 100).toFixed(1)}%
					</Tag>
				) : (
					"—"
				),
		},
		{
			title: "Мин. возможная",
			dataIndex: "priceMin",
			key: "priceMin",
			width: 110,
			render: (v, record) => (
				<Tooltip title={`Дилер: ${record.priceMinDealer || "—"}`}>
					<Text type="secondary">{money(v)}</Text>
				</Tooltip>
			),
		},
		{
			title: "Лучшая скидка",
			dataIndex: "bestDiscountAbs",
			key: "bestDiscountAbs",
			width: 120,
			render: (v, r) => (
				<Tooltip title={`Дилер: ${r.bestDiscountDealer || "—"}`}>
					<Tag color={r.bestDiscountPct >= 0.1 ? "red" : "gold"}>{money(v)}</Tag>
				</Tooltip>
			),
		},
		{
			title: "Предложений",
			dataIndex: "totalOffers",
			key: "totalOffers",
			width: 90,
			align: "center",
			render: (count) => (
				<Badge
					count={count}
					style={{ backgroundColor: "#52c41a" }}
				/>
			),
		},
		{
			title: "Город",
			dataIndex: "city",
			key: "city",
			width: 100,
			ellipsis: true,
			filters: cityIds.map((id) => ({
				text: getCityLabel(String(id)),
				value: id,
			})),
			onFilter: (value, rec) => String(rec.city ?? "") === String(value ?? ""),
			filterSearch: true,
			render: (city) =>
				city && city !== "—" ? (
					<Tag>{getCityLabel(String(city))}</Tag>
				) : (
					"—"
				),
		},
	]
}
