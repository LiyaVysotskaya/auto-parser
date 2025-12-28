import React, { useMemo } from "react"
import { useSelector } from "react-redux"

import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	BankOutlined,
	CrownOutlined,
	FireOutlined,
	StarOutlined,
	TrophyOutlined,
} from "@ant-design/icons"
import {
	Alert,
	Badge,
	Card,
	Col,
	Collapse,
	List,
	Progress,
	Row,
	Space,
	Statistic,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd"

const { Title, Text } = Typography
const { Panel } = Collapse

const money = (v) =>
	v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString() + " ₽"
const pct = (v) =>
	v == null || Number.isNaN(Number(v))
		? "—"
		: `${(Number(v) * 100).toFixed(1)}%`

function parseNumberLoose(v) {
	if (v == null) return null
	if (typeof v === "number") return v
	const s = String(v).trim()
	if (s === "") return null
	let cleaned = s.replace(/\s+/g, "").replace(/[^0-9,.\-]/g, "")
	if (cleaned.indexOf(",") >= 0 && cleaned.indexOf(".") === -1) {
		cleaned = cleaned.replace(",", ".")
	}
	const n = Number(cleaned)
	return Number.isFinite(n) ? n : null
}

function parseQty(v) {
	const n = parseNumberLoose(v)
	if (n == null) return 1
	return Math.max(0, Math.floor(n))
}

function generateComprehensiveAnalytics(report = []) {
	const rowsFlat = []
	const dealerCounts = {}
	let totalUnits = 0
	let totalPriceSum = 0
	let totalPriceUnits = 0
	let minPrice = Infinity
	let maxDiscount = 0

	for (const tab of report) {
		const brand = tab.name || "Unknown"
		for (const r of tab.rows || []) {
			const qty = parseQty(r.count ?? r.stock ?? r.quantity)
			const price = parseNumberLoose(r.price)
			const priceMin = parseNumberLoose(r.priceMin)
			const secondPrice = parseNumberLoose(r.secondPrice)
			const maxDiscountAbs = parseNumberLoose(r.maxDiscount) || 0

			const offer = {
				brand,
				model: r.model || "—",
				equipment: r.equipment || "—",
				modification: r.modification || "—",
				year: r.year || "—",
				count: qty,
				dealer: r.dealer || "—",
				price: price != null ? price : null,
				priceMin: priceMin != null ? priceMin : null,
				secondPrice: secondPrice != null ? secondPrice : null,
				maxDiscount: maxDiscountAbs,
				tradeInDiscount: parseNumberLoose(r.tradeInDiscount) || 0,
				creditDiscount: parseNumberLoose(r.creditDiscount) || 0,
				insuranceDiscount: parseNumberLoose(r.insuranceDiscount) || 0,
			}

			rowsFlat.push(offer)

			dealerCounts[offer.dealer] = (dealerCounts[offer.dealer] || 0) + qty

			if (offer.price !== null) {
				totalUnits += qty
				totalPriceSum += offer.price * qty
				totalPriceUnits += qty
				if (offer.price < minPrice) minPrice = offer.price
			}

			if (offer.maxDiscount > maxDiscount) maxDiscount = offer.maxDiscount
		}
	}

	const avgPrice = totalPriceUnits > 0 ? totalPriceSum / totalPriceUnits : 0

	const topCheapest = [...rowsFlat]
		.filter((o) => o.price != null)
		.sort((a, b) => a.price - b.price)
		.slice(0, 15)

	const topDiscounts = [...rowsFlat]
		.filter((o) => o.maxDiscount > 0)
		.sort((a, b) => b.maxDiscount - a.maxDiscount)
		.slice(0, 15)

	const topValue = [...rowsFlat]
		.filter((o) => o.price != null && o.maxDiscount > 0)
		.map((o) => ({
			...o,
			discountRatio: o.maxDiscount / o.price,
			finalPrice: o.price - o.maxDiscount,
		}))
		.sort((a, b) => b.discountRatio - a.discountRatio)
		.slice(0, 15)

	const topDealers = Object.entries(dealerCounts)
		.map(([dealer, units]) => ({ dealer, units }))
		.sort((a, b) => b.units - a.units)
		.slice(0, 10)

	const groups = {}
	for (const r of rowsFlat) {
		const key = `${r.brand}||${r.model}||${r.equipment}||${r.modification}||${r.year}`
		groups[key] = groups[key] || {
			meta: {
				brand: r.brand,
				model: r.model,
				equipment: r.equipment,
				modification: r.modification,
				year: r.year,
			},
			rows: [],
		}
		groups[key].rows.push(r)
	}

	const perModelSummary = Object.values(groups).map((g) => {
		const rows = g.rows
		const totalUnitsInGroup = rows.reduce((s, x) => s + (x.count || 0), 0)
		const sortedByPrice = rows
			.filter((x) => x.price != null)
			.sort((a, b) => a.price - b.price)
		const min = sortedByPrice[0] || null
		const second = sortedByPrice[1] || null
		const sumPriceTimesQty = rows.reduce(
			(s, x) => s + (x.price != null ? x.price * (x.count || 0) : 0),
			0,
		)
		const avgWeighted =
			totalUnitsInGroup > 0 ? sumPriceTimesQty / totalUnitsInGroup : null
		const bestDiscountAbs = Math.max(...rows.map((r) => r.maxDiscount || 0))
		const bestDiscountEntry =
			rows.find((r) => (r.maxDiscount || 0) === bestDiscountAbs) || null
		const bestDiscountPct =
			bestDiscountEntry && bestDiscountEntry.price
				? bestDiscountAbs / bestDiscountEntry.price
				: null

		const priceMinVal = rows.reduce((acc, r) => {
			if (r.priceMin != null && (acc == null || r.priceMin < acc))
				return r.priceMin
			return acc
		}, null)
		const priceMinDealer =
			priceMinVal != null
				? rows.find((r) => r.priceMin === priceMinVal)?.dealer || null
				: null

		return {
			brand: g.meta.brand,
			model: g.meta.model,
			equipment: g.meta.equipment,
			modification: g.meta.modification,
			year: g.meta.year,
			totalOffers: totalUnitsInGroup,
			minPrice: min?.price ?? null,
			minDealer: min?.dealer ?? null,
			secondPrice: second?.price ?? null,
			secondDealer: second?.dealer ?? null,
			priceGapAbs: min && second ? second.price - min.price : null,
			priceGapPct:
				min && second ? (second.price - min.price) / second.price : null,
			priceMin: priceMinVal,
			priceMinDealer,
			avgPrice: avgWeighted,
			bestDiscountAbs,
			bestDiscountPct,
			rows,
		}
	})

	const topModelsByPct = perModelSummary
		.filter((m) => m.bestDiscountPct != null)
		.map((m) => ({
			brand: m.brand,
			model: m.model,
			equipment: m.equipment,
			modification: m.modification,
			year: m.year,
			priceMin: m.priceMin,
			priceMinDealer: m.priceMinDealer,
			minPrice: m.minPrice,
			minDealer: m.minDealer,
			bestDiscountAbs: m.bestDiscountAbs,
			bestDiscountPct: m.bestDiscountPct,
			totalOffers: m.totalOffers,
		}))
		.sort((a, b) => (b.bestDiscountPct || 0) - (a.bestDiscountPct || 0))
		.slice(0, 10)

	const topByDiscountPct = perModelSummary
		.filter((x) => x.bestDiscountPct != null)
		.sort((a, b) => (b.bestDiscountPct || 0) - (a.bestDiscountPct || 0))
		.slice(0, 10)
		.map((item) => ({ ...item, topDealer: item.minDealer || "—" }))

	const perBrand = {}
	for (const row of perModelSummary) {
		perBrand[row.brand] = perBrand[row.brand] || { models: [] }
		perBrand[row.brand].models.push(row)
	}
	for (const b of Object.keys(perBrand)) {
		perBrand[b].models.sort((a, b) => {
			if (a.minPrice == null && b.minPrice == null) return 0
			if (a.minPrice == null) return 1
			if (b.minPrice == null) return -1
			return a.minPrice - b.minPrice
		})
	}

	return {
		summary: {
			totalOffers: totalUnits,
			avgPrice,
			minPrice: minPrice === Infinity ? 0 : minPrice,
			maxDiscount,
		},
		topCheapest,
		topDiscounts,
		topValue,
		topDealers,
		topModelsByPct,
		topByDiscountPct,
		perBrand,
		perModelSummary,
	}
}

export function AutoRuReport() {
	const report = useSelector((state) => state.autoRu.report || [])
	const analytics = useMemo(
		() => generateComprehensiveAnalytics(report),
		[report],
	)

	const {
		summary,
		topCheapest,
		topDiscounts,
		topValue,
		topDealers,
		topModelsByPct,
		topByDiscountPct,
		perBrand,
	} = analytics

	const topOfferColumns = [
		{
			title: "Поз.",
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
	]

	const detailedColumns = [
		{
			title: "Модель",
			dataIndex: "model",
			key: "model",
			render: (_v, rec) => (
				<div>
					<b>{rec.model}</b>
					<div style={{ color: "#666", fontSize: 12 }}>
						{rec.equipment} • {rec.modification} • {rec.year}
					</div>
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
				<Tooltip title={`Дилер: ${record.minDealer || "—"}`}>
					<Text
						strong
						type="success"
					>
						{money(v)}
					</Text>
				</Tooltip>
			),
		},
		{
			title: "2-я цена",
			dataIndex: "secondPrice",
			key: "secondPrice",
			width: 100,
			render: (v, record) => (
				<Tooltip title={`Дилер: ${record.secondDealer || "—"}`}>
					{money(v)}
				</Tooltip>
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
				<div>
					<Tag color={r.bestDiscountPct >= 0.1 ? "red" : "gold"}>
						{money(v)}
					</Tag>
					<div style={{ fontSize: 11, color: "#666" }}>
						{pct(r.bestDiscountPct)}
					</div>
				</div>
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
	]

	const brandKeys = Object.keys(perBrand).sort()

	return (
		<div style={{ padding: 16, background: "#f5f5f5", minHeight: "100vh" }}>
			<Card style={{ marginBottom: 16 }}>
				<Title
					level={2}
					style={{ marginBottom: 24 }}
				>
					Аналитика
				</Title>

				<Row gutter={16}>
					<Col
						xs={12}
						sm={6}
					>
						<Statistic
							title="Всего предложений"
							value={summary.totalOffers}
							prefix={<FireOutlined />}
							valueStyle={{ color: "#cf1322" }}
						/>
					</Col>
					<Col
						xs={12}
						sm={6}
					>
						<Statistic
							title="Средняя цена"
							value={Math.round(summary.avgPrice)}
							prefix="₽"
							valueStyle={{ color: "#389e0d" }}
						/>
					</Col>
					<Col
						xs={12}
						sm={6}
					>
						<Statistic
							title="Минимальная цена"
							value={summary.minPrice}
							prefix="₽"
							valueStyle={{ color: "#52c41a" }}
						/>
					</Col>
					<Col
						xs={12}
						sm={6}
					>
						<Statistic
							title="Макс. скидка"
							value={summary.maxDiscount}
							prefix="₽"
							valueStyle={{ color: "#faad14" }}
						/>
					</Col>
				</Row>
			</Card>

			<Row style={{ marginBottom: 16 }}>
				<Col>
					<Card
						title={
							<>
								<CrownOutlined /> Топ-15 по цене
							</>
						}
						size="small"
					>
						<Table
							dataSource={topCheapest.map((item, index) => ({
								...item,
								key: index,
							}))}
							columns={topOfferColumns}
							pagination={false}
							size="small"
						/>
					</Card>
				</Col>
			</Row>
			<Row style={{ marginBottom: 16 }}>
				<Col>
					<Card
						title={
							<>
								<TrophyOutlined /> Топ-15 по скидкам
							</>
						}
						size="small"
					>
						<Table
							dataSource={topDiscounts.map((item, index) => ({
								...item,
								key: index,
							}))}
							columns={topOfferColumns}
							pagination={false}
							size="small"
						/>
					</Card>
				</Col>
			</Row>
			<Row style={{ marginBottom: 16 }}>
				<Col>
					<Card
						title={
							<>
								<StarOutlined /> Топ-15 по выгоде
							</>
						}
						size="small"
					>
						<Table
							dataSource={topValue.map((item, index) => ({
								...item,
								key: index,
							}))}
							columns={topOfferColumns}
							pagination={false}
							size="small"
						/>
					</Card>
				</Col>
			</Row>

			<Row style={{ marginBottom: 16 }}>
				<Col style={{ width: "50%" }}>
					<Card
						size="small"
						title="Топ-10 моделей по % скидке"
						style={{ marginBottom: 12 }}
					>
						<List
							dataSource={topModelsByPct}
							renderItem={(it, idx) => (
								<List.Item key={`${it.brand}-${it.model}-${idx}`}>
									<Space
										style={{ width: "100%", justifyContent: "space-between" }}
									>
										<div>
											<Badge
												count={idx + 1}
												style={{ marginRight: 8 }}
											/>
											<b>{it.brand}</b> — {it.model}
											<div style={{ color: "#666", fontSize: 12 }}>
												{it.equipment} • дилер:{" "}
												{it.priceMinDealer ?? it.minDealer ?? "—"}
											</div>
										</div>
										<div style={{ textAlign: "right" }}>
											<Tag color="red">
												{it.bestDiscountPct
													? (it.bestDiscountPct * 100).toFixed(1) + "%"
													: "—"}
											</Tag>
											<div style={{ fontSize: 12 }}>
												{it.bestDiscountAbs
													? Number(it.bestDiscountAbs).toLocaleString() + " ₽"
													: "—"}
											</div>
											<div style={{ fontSize: 11, color: "#888" }}>
												итог:{" "}
												{it.priceMin
													? Number(it.priceMin).toLocaleString() + " ₽"
													: "—"}
											</div>
										</div>
									</Space>
								</List.Item>
							)}
						/>
					</Card>
				</Col>

				<Col style={{ width: "50%" }}>
					<Card
						title="🏢 Топ-10 дилеров"
						size="small"
					>
						<List
							size="small"
							dataSource={topDealers}
							renderItem={(dealer, index) => (
								<List.Item>
									<Space
										style={{ width: "100%", justifyContent: "space-between" }}
									>
										<div>
											<Badge
												count={index + 1}
												style={{
													backgroundColor: index < 3 ? "#ff4d4f" : "#1890ff",
													marginRight: 8,
												}}
											/>
											<BankOutlined style={{ marginRight: 8 }} />
											{dealer.dealer}
										</div>
										<Text strong>
											{(dealer.units ?? dealer.count ?? 0).toLocaleString()} шт.
										</Text>
									</Space>
								</List.Item>
							)}
						/>
					</Card>
				</Col>
			</Row>

			<Card title="📊 Детальная аналитика по брендам и моделям">
				<Collapse defaultActiveKey={brandKeys.slice(0, 3)}>
					{brandKeys.map((brand) => (
						<Panel
							header={
								<Space>
									<strong>{brand}</strong>
									<Tag color="blue">
										{perBrand[brand].models.length} моделей
									</Tag>
									<Tag color="green">
										{perBrand[brand].models.reduce(
											(sum, m) => sum + m.totalOffers,
											0,
										)}{" "}
										предложений
									</Tag>
								</Space>
							}
							key={brand}
						>
							<Table
								size="small"
								columns={detailedColumns}
								dataSource={perBrand[brand].models}
								rowKey={(r) =>
									`${r.brand}::${r.model}::${r.equipment}::${r.year}`
								}
								pagination={{ pageSize: 10, showSizeChanger: true }}
								scroll={{ x: 800 }}
							/>
						</Panel>
					))}
				</Collapse>
			</Card>
		</div>
	)
}
