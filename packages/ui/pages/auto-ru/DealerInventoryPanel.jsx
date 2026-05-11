import React, { useMemo, useState } from "react"

import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import { Card, Drawer, List, Space, Table, Typography } from "antd"

import { dealerModelBreakdown } from "../../analytics.js"
import { money } from "./report-formatters.js"

const { Text } = Typography

export function DealerInventoryPanel({ rowsFlat = [], topDealers = [] }) {
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [pickedDealer, setPickedDealer] = useState(null)

	const chartData = useMemo(() => {
		return [...(topDealers || [])].slice(0, 14).map((d) => {
			const name = d.dealer || "—"
			return {
				name: name.length > 36 ? `${name.slice(0, 34)}…` : name,
				full: name,
				units: d.units ?? d.count ?? 0,
			}
		})
	}, [topDealers])

	const chartDataReversed = useMemo(() => [...chartData].reverse(), [chartData])

	const listForClicks = useMemo(
		() => [...(topDealers || [])].slice(0, 14),
		[topDealers],
	)

	const breakdown = useMemo(
		() => (pickedDealer ? dealerModelBreakdown(rowsFlat, pickedDealer) : []),
		[rowsFlat, pickedDealer],
	)

	const columns = useMemo(
		() => [
			{
				title: "Модель",
				key: "m",
				render: (_, r) => (
					<div>
						<Text strong>{r.model}</Text>
						<div>
							<Text type="secondary" style={{ fontSize: 11 }}>
								{r.brand} · {r.equipment}
							</Text>
						</div>
					</div>
				),
			},
			{ title: "Год", dataIndex: "year", key: "year", width: 64 },
			{
				title: "Шт.",
				dataIndex: "units",
				key: "units",
				width: 72,
				className: "ms-mono-nums",
			},
			{
				title: "Мин. цена",
				dataIndex: "minPrice",
				key: "minPrice",
				width: 120,
				className: "ms-mono-nums",
				render: (v) => money(v),
			},
		],
		[],
	)

	if (!chartData.length) return null

	return (
		<>
			<Card
				size="small"
				title="Дилеры по объёму витрины"
				className="ms-stat-tile"
				style={{ marginBottom: 16 }}
			>
				<div style={{ height: Math.min(420, Math.max(200, chartDataReversed.length * 32)) }}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							layout="vertical"
							data={chartDataReversed}
							margin={{ left: 4, right: 12, top: 8, bottom: 8 }}
						>
							<CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.35} />
							<XAxis
								type="number"
								tick={{ fontSize: 11 }}
							/>
							<YAxis
								type="category"
								dataKey="name"
								width={148}
								tick={{ fontSize: 11 }}
							/>
							<Tooltip
								formatter={(v) => [`${v} шт.`, "На витрине"]}
								labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ""}
							/>
							<Bar
								dataKey="units"
								radius={[0, 4, 4, 0]}
								fill="var(--ant-color-primary)"
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
				<Text
					type="secondary"
					style={{ fontSize: 11, display: "block", marginTop: 8 }}
				>
					Нажмите строку в списке ниже, чтобы увидеть модели у дилера.
				</Text>
				<List
					size="small"
					style={{ marginTop: 10, maxHeight: 200, overflow: "auto" }}
					dataSource={listForClicks}
					locale={{ emptyText: "Нет данных" }}
					renderItem={(d) => {
						const full = d.dealer || "—"
						const n = d.units ?? d.count ?? 0
						return (
							<List.Item
								style={{ cursor: "pointer", padding: "6px 0" }}
								onClick={() => {
									setPickedDealer(full)
									setDrawerOpen(true)
								}}
							>
								<Space style={{ width: "100%", justifyContent: "space-between" }}>
									<Text ellipsis style={{ maxWidth: "70%" }}>
										{full}
									</Text>
									<Text type="secondary" className="ms-mono-nums">
										{n.toLocaleString()} шт.
									</Text>
								</Space>
							</List.Item>
						)
					}}
				/>
			</Card>

			<Drawer
				title={pickedDealer ? `Модели: ${pickedDealer}` : "Дилер"}
				open={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				width={520}
			>
				<Table
					size="small"
					rowKey={(r) =>
						`${r.brand}-${r.model}-${r.equipment}-${r.modification}-${r.year}`
					}
					columns={columns}
					dataSource={breakdown}
					pagination={{ pageSize: 12 }}
					locale={{ emptyText: "Нет строк" }}
				/>
			</Drawer>
		</>
	)
}
