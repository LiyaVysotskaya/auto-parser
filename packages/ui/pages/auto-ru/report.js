import React, { useMemo } from "react"
import { useSelector } from "react-redux"

import {
	BankOutlined,
	CrownOutlined,
	FireOutlined,
	StarOutlined,
	TrophyOutlined,
} from "@ant-design/icons"
import {
	Badge,
	Card,
	Col,
	Collapse,
	List,
	Row,
	Space,
	Statistic,
	Table,
	Tag,
	Typography,
} from "antd"

import { generateComprehensiveAnalytics } from "../../analytics.js"
import { TopListCard } from "./TopListCard.jsx"
import { detailedColumns, topOfferColumns } from "./columns.jsx"

const { Title, Text } = Typography
const { Panel } = Collapse

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
		perBrand,
	} = analytics

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

			<TopListCard
				icon={<CrownOutlined />}
				title="Топ-15 по цене"
				data={topCheapest}
				columns={topOfferColumns}
			/>
			<TopListCard
				icon={<TrophyOutlined />}
				title="Топ-15 по скидкам"
				data={topDiscounts}
				columns={topOfferColumns}
			/>
			<TopListCard
				icon={<StarOutlined />}
				title="Топ-15 по выгоде"
				data={topValue}
				columns={topOfferColumns}
			/>

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
