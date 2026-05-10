import React, { useMemo, useState } from "react"

import { Button, Card, Select, Space, Table, Tag, Typography } from "antd"

import { compareDealers, flattenReport } from "../../analytics.js"
import { money, pct } from "./report-formatters.js"

const { Text, Paragraph } = Typography

function uniqueDealers(rowsFlat) {
	const s = new Set()
	for (const r of rowsFlat) {
		const d = r.dealer
		if (d && d !== "—") s.add(d)
	}
	return [...s].sort((a, b) => a.localeCompare(b, "ru"))
}

export function DealerComparison({ report = [] }) {
	const { rowsFlat } = useMemo(() => flattenReport(report), [report])
	const dealers = useMemo(() => uniqueDealers(rowsFlat), [rowsFlat])

	const [baseDealer, setBaseDealer] = useState(null)
	const [otherDealers, setOtherDealers] = useState([])

	const { rows, summary } = useMemo(() => {
		if (!baseDealer || !otherDealers.length) {
			return { rows: [], summary: null }
		}
		return compareDealers(rowsFlat, baseDealer, otherDealers)
	}, [rowsFlat, baseDealer, otherDealers])

	const otherOptions = useMemo(
		() => dealers.filter((d) => d !== baseDealer),
		[dealers, baseDealer],
	)

	const columns = [
		{
			title: "Модель",
			key: "model",
			width: 200,
			render: (_, r) => (
				<div>
					<b>{r.model}</b>
					<Text type="secondary" style={{ fontSize: 12 }}>
						{r.equipment} • {r.modification} • {r.year}
						{r.city && r.city !== "—" ? ` • ${r.city}` : ""}
					</Text>
				</div>
			),
		},
		{
			title: "Базовый дилер",
			dataIndex: "basePrice",
			key: "basePrice",
			width: 120,
			render: (v, r) => (
				<div>
					<Text type="secondary">{r.baseDealer}</Text>
					<div>
						<Text strong>{money(v)}</Text>
					</div>
				</div>
			),
		},
		{
			title: "Дилер сравнения",
			dataIndex: "otherPrice",
			key: "otherPrice",
			width: 120,
			render: (v, r) => (
				<div>
					<Text type="secondary">{r.otherDealer}</Text>
					<div>
						<Text strong>{money(v)}</Text>
					</div>
				</div>
			),
		},
		{
			title: "Разница",
			dataIndex: "diffAbs",
			key: "diffAbs",
			width: 140,
			render: (diffAbs) => {
				if (diffAbs == null) return "—"
				const cheaper = diffAbs < 0
				return (
					<Tag color={cheaper ? "green" : diffAbs > 0 ? "red" : "default"}>
						{cheaper ? "" : "+"}
						{money(diffAbs)}
					</Tag>
				)
			},
		},
		{
			title: "% к цене конкурента",
			dataIndex: "diffPct",
			key: "diffPct",
			width: 110,
			render: (v) => pct(v),
		},
	]

	if (!dealers.length) {
		return (
			<Card size="small">
				<Text type="secondary">Нет данных по дилерам в отчёте</Text>
			</Card>
		)
	}

	return (
		<Card
			title="Сравнение дилеров"
			size="small"
		>
			<Space
				direction="vertical"
				style={{ width: "100%" }}
				size="middle"
			>
				<Paragraph type="secondary" style={{ marginBottom: 0 }}>
					Сравнение по одинаковым позициям (модель, комплектация, модификация,
					год), где есть цена у базового дилера и у выбранных конкурентов.
				</Paragraph>
				<Space wrap>
					<div>
						<div style={{ marginBottom: 4 }}>
							<Text type="secondary">Базовый дилер</Text>
						</div>
						<Select
							showSearch
							allowClear
							placeholder="Выберите дилера"
							style={{ minWidth: 260 }}
							options={dealers.map((d) => ({ value: d, label: d }))}
							value={baseDealer}
							onChange={(v) => {
								setBaseDealer(v || null)
								setOtherDealers((prev) => prev.filter((x) => x !== v))
							}}
							optionFilterProp="label"
						/>
					</div>
					<div>
						<div style={{ marginBottom: 4 }}>
							<Space>
								<Text type="secondary">Сравнить с</Text>
								<Button
									size="small"
									type="link"
									disabled={!baseDealer || !otherOptions.length}
									onClick={() => setOtherDealers(otherOptions)}
									style={{ padding: 0, height: "auto" }}
								>
									Выбрать всех
								</Button>
							</Space>
						</div>
						<Select
							mode="multiple"
							showSearch
							allowClear
							placeholder="Один или несколько дилеров"
							style={{ minWidth: 320 }}
							options={otherOptions.map((d) => ({ value: d, label: d }))}
							value={otherDealers}
							onChange={setOtherDealers}
							optionFilterProp="label"
							disabled={!baseDealer}
						/>
					</div>
				</Space>

				{summary && baseDealer && otherDealers.length > 0 ? (
					<Space wrap>
						<Tag color="green">
							Базовый дешевле: {summary.baseCheaperCount}
						</Tag>
						<Tag color="red">
							Базовый дороже: {summary.baseExpensiveCount}
						</Tag>
						<Tag>Равная цена: {summary.tieCount}</Tag>
						<Tag color="blue">
							Пар сравнений: {summary.comparedPairs}
						</Tag>
						{summary.avgDiffAbs != null ? (
							<Tag>
								Средняя разница (база − конкурент):{" "}
								{money(summary.avgDiffAbs)}
							</Tag>
						) : null}
					</Space>
				) : null}

				<Table
					size="small"
					rowKey="key"
					columns={columns}
					dataSource={rows}
					locale={{ emptyText: "Выберите дилеров и убедитесь, что есть общие позиции" }}
					pagination={{ pageSize: 15, showSizeChanger: true }}
					scroll={{ x: 900 }}
				/>
			</Space>
		</Card>
	)
}
