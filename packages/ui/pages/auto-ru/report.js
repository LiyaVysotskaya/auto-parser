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

import { generateComprehensiveAnalytics } from "../../analytics.js"

const { Title, Text } = Typography
const { Panel } = Collapse

const money = (v) =>
	v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString() + " ₽"
const pct = (v) =>
	v == null || Number.isNaN(Number(v))
		? "—"
		: `${(Number(v) * 100).toFixed(1)}%`

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
