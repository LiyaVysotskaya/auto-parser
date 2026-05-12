import React, { useEffect, useMemo, useState } from "react"

import {
	Button,
	Card,
	Col,
	Input,
	Row,
	Select,
	Space,
	Statistic,
	Table,
	Tag,
	Typography,
} from "antd"

import {
	compareDealers,
	filterRowsFlatByCity,
	flattenReport,
} from "@market-slice/application/lib/analytics.js"
import { money, pct } from "@market-slice/application/lib/formatters.js"

import { useCityLabel } from "../../hooks/useCityLabel.js"

const { Text, Paragraph } = Typography

function uniqueDealers(rowsFlat) {
	const s = new Set()
	for (const r of rowsFlat) {
		const d = r.dealer
		if (d && d !== "—") s.add(d)
	}
	return [...s].sort((a, b) => a.localeCompare(b, "ru"))
}

function uniqueSorted(rowsFlat, key) {
	const s = new Set()
	for (const r of rowsFlat) {
		const v = r[key]
		if (v != null && String(v).trim() !== "" && v !== "—") s.add(String(v))
	}
	return [...s].sort((a, b) => a.localeCompare(b, "ru"))
}

export function DealerComparison({ report = [], forcedCity = null }) {
	const getCityLabel = useCityLabel()
	const { rowsFlat: rawFlat } = useMemo(() => flattenReport(report), [report])
	const rowsFlat = useMemo(
		() => filterRowsFlatByCity(rawFlat, forcedCity),
		[rawFlat, forcedCity],
	)
	const dealers = useMemo(() => uniqueDealers(rowsFlat), [rowsFlat])
	const allBrands = useMemo(() => uniqueSorted(rowsFlat, "brand"), [rowsFlat])
	const allCities = useMemo(() => uniqueSorted(rowsFlat, "city"), [rowsFlat])

	const [baseDealer, setBaseDealer] = useState(null)
	const [otherDealers, setOtherDealers] = useState([])
	const [filterBrands, setFilterBrands] = useState([])
	const [filterModels, setFilterModels] = useState([])
	const [filterCities, setFilterCities] = useState([])
	const [tableSearch, setTableSearch] = useState("")

	useEffect(() => {
		if (forcedCity) setFilterCities([])
	}, [forcedCity])

	const { rows: rawRows, summary: rawSummary } = useMemo(() => {
		if (!baseDealer || !otherDealers.length) {
			return { rows: [], summary: null }
		}
		return compareDealers(rowsFlat, baseDealer, otherDealers)
	}, [rowsFlat, baseDealer, otherDealers])

	const modelOptions = useMemo(() => {
		const s = new Set()
		for (const r of rowsFlat) {
			if (filterBrands.length && !filterBrands.includes(r.brand)) continue
			if (r.model && r.model !== "—") s.add(String(r.model))
		}
		return [...s].sort((a, b) => a.localeCompare(b, "ru"))
	}, [rowsFlat, filterBrands])

	const filteredRows = useMemo(() => {
		let list = rawRows
		if (filterBrands.length) {
			list = list.filter((r) => filterBrands.includes(r.brand))
		}
		if (filterModels.length) {
			list = list.filter((r) => filterModels.includes(r.model))
		}
		if (filterCities.length) {
			list = list.filter((r) => {
				const c =
					r.city != null && String(r.city).trim() !== ""
						? String(r.city).trim()
						: "—"
				return filterCities.includes(c)
			})
		}
		const q = tableSearch.trim().toLowerCase()
		if (q) {
			list = list.filter((r) => {
				const hay = [
					r.brand,
					r.model,
					r.equipment,
					r.modification,
					String(r.year ?? ""),
					r.city,
					r.baseDealer,
					r.otherDealer,
				]
					.join(" ")
					.toLowerCase()
				return hay.includes(q)
			})
		}
		return list
	}, [
		rawRows,
		filterBrands,
		filterModels,
		filterCities,
		tableSearch,
	])

	const filteredSummary = useMemo(() => {
		if (!rawSummary || !filteredRows.length) {
			if (!rawSummary) return null
			return {
				baseCheaperCount: 0,
				baseExpensiveCount: 0,
				tieCount: 0,
				comparedPairs: 0,
				avgDiffAbs: null,
				avgDiffPct: null,
			}
		}
		let baseCheaper = 0
		let baseExpensive = 0
		let ties = 0
		let diffSum = 0
		let pctSum = 0
		let pctN = 0
		for (const r of filteredRows) {
			const d = r.diffAbs
			if (d == null) continue
			if (d < 0) baseCheaper++
			else if (d > 0) baseExpensive++
			else ties++
			diffSum += d
			if (r.diffPct != null && Number.isFinite(r.diffPct)) {
				pctSum += r.diffPct
				pctN++
			}
		}
		const n = filteredRows.length
		return {
			baseCheaperCount: baseCheaper,
			baseExpensiveCount: baseExpensive,
			tieCount: ties,
			comparedPairs: n,
			avgDiffAbs: n ? diffSum / n : null,
			avgDiffPct: pctN ? pctSum / pctN : null,
		}
	}, [rawSummary, filteredRows])

	const otherOptions = useMemo(
		() => dealers.filter((d) => d !== baseDealer),
		[dealers, baseDealer],
	)

	const modelFilters = useMemo(() => {
		const s = new Set(rawRows.map((r) => r.model).filter(Boolean))
		return [...s]
			.sort((a, b) => a.localeCompare(b, "ru"))
			.map((m) => ({ text: m, value: m }))
	}, [rawRows])

	const columns = useMemo(
		() => [
			{
				title: "Бренд",
				dataIndex: "brand",
				key: "brand",
				width: 88,
				sorter: (a, b) => String(a.brand || "").localeCompare(String(b.brand || ""), "ru"),
			},
			{
				title: "Модель",
				key: "model",
				width: 200,
				filters: modelFilters,
				onFilter: (value, record) => record.model === value,
				render: (_, r) => (
					<div>
						<b>{r.model}</b>
						<Text type="secondary" style={{ fontSize: 12 }}>
							{r.equipment} • {r.modification} • {r.year}
							{r.city && r.city !== "—" ? ` • ${getCityLabel(r.city)}` : ""}
						</Text>
					</div>
				),
			},
			{
				title: "Базовый дилер",
				dataIndex: "basePrice",
				key: "basePrice",
				width: 120,
				sorter: (a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0),
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
				sorter: (a, b) => (a.otherPrice ?? 0) - (b.otherPrice ?? 0),
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
				sorter: (a, b) => (a.diffAbs ?? 0) - (b.diffAbs ?? 0),
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
				sorter: (a, b) => (a.diffPct ?? 0) - (b.diffPct ?? 0),
				render: (v) => pct(v),
			},
		],
		[modelFilters, getCityLabel],
	)

	if (!dealers.length) {
		return (
			<Card size="small">
				<Text type="secondary">Нет данных по дилерам в отчёте</Text>
			</Card>
		)
	}

	return (
		<Card title="Сравнение цен конкурентов с базовым дилером" size="small" className="ms-filter-card">
			<Space direction="vertical" style={{ width: "100%" }} size="middle">
				<Paragraph type="secondary" style={{ marginBottom: 0 }}>
					Сравнение по одинаковым позициям (модель, комплектация, модификация,
					год, город), где есть цена у базового дилера и у выбранных конкурентов.
					{forcedCity ? (
						<>
							{" "}
							<Tag color="blue">Город: {getCityLabel(forcedCity)}</Tag>
						</>
					) : null}
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

				<Space wrap align="start">
					<div style={{ minWidth: 160 }}>
						<div style={{ marginBottom: 4 }}>
							<Text type="secondary">Бренд</Text>
						</div>
						<Select
							mode="multiple"
							allowClear
							placeholder="Все"
							style={{ width: "100%" }}
							options={allBrands.map((b) => ({ value: b, label: b }))}
							value={filterBrands}
							onChange={(v) => {
								setFilterBrands(v)
								setFilterModels((prev) =>
									prev.filter((m) =>
										rowsFlat.some(
											(r) =>
												r.model === m &&
												(!v.length || v.includes(r.brand)),
										),
									),
								)
							}}
						/>
					</div>
					<div style={{ minWidth: 160 }}>
						<div style={{ marginBottom: 4 }}>
							<Text type="secondary">Модель</Text>
						</div>
						<Select
							mode="multiple"
							allowClear
							placeholder="Все"
							style={{ width: "100%" }}
							options={modelOptions.map((m) => ({ value: m, label: m }))}
							value={filterModels}
							onChange={setFilterModels}
						/>
					</div>
					{forcedCity ? null : (
						<div style={{ minWidth: 140 }}>
							<div style={{ marginBottom: 4 }}>
								<Text type="secondary">Город</Text>
							</div>
							<Select
								mode="multiple"
								allowClear
								placeholder="Все"
								style={{ width: "100%" }}
								options={allCities.map((c) => ({
									value: c,
									label: getCityLabel(c),
								}))}
								value={filterCities}
								onChange={setFilterCities}
							/>
						</div>
					)}
					<div style={{ minWidth: 220, flex: 1 }}>
						<div style={{ marginBottom: 4 }}>
							<Text type="secondary">Поиск по таблице</Text>
						</div>
						<Input.Search
							allowClear
							placeholder="Модель, комплектация, дилер…"
							value={tableSearch}
							onChange={(e) => setTableSearch(e.target.value)}
						/>
					</div>
				</Space>

				{filteredSummary && baseDealer && otherDealers.length > 0 ? (
					<Row gutter={[12, 12]}>
						<Col xs={12} sm={8} md={4}>
							<Statistic
								title="Базовый дешевле"
								value={filteredSummary.baseCheaperCount}
								valueStyle={{ color: "var(--ant-color-success)" }}
							/>
						</Col>
						<Col xs={12} sm={8} md={4}>
							<Statistic
								title="Базовый дороже"
								value={filteredSummary.baseExpensiveCount}
								valueStyle={{ color: "var(--ant-color-error)" }}
							/>
						</Col>
						<Col xs={12} sm={8} md={4}>
							<Statistic
								title="Равная цена"
								value={filteredSummary.tieCount}
							/>
						</Col>
						<Col xs={12} sm={8} md={4}>
							<Statistic
								title="Пар (в фильтре)"
								value={filteredSummary.comparedPairs}
							/>
						</Col>
						<Col xs={12} sm={8} md={4}>
							<Statistic
								title="Средняя разница (база − конкурент)"
								value={
									filteredSummary.avgDiffAbs != null
										? Math.round(filteredSummary.avgDiffAbs)
										: "—"
								}
								suffix={filteredSummary.avgDiffAbs != null ? "₽" : undefined}
							/>
						</Col>
						<Col xs={12} sm={8} md={4}>
							<Statistic
								title="Средний % к конкуренту"
								value={
									filteredSummary.avgDiffPct != null
										? (filteredSummary.avgDiffPct * 100).toFixed(1)
										: "—"
								}
								suffix={filteredSummary.avgDiffPct != null ? "%" : undefined}
							/>
						</Col>
					</Row>
				) : null}

				<Table
					size="small"
					rowKey="key"
					columns={columns}
					dataSource={filteredRows}
					locale={{
						emptyText:
							"Выберите дилеров и убедитесь, что есть общие позиции (или ослабьте фильтры)",
					}}
					pagination={{ pageSize: 15, showSizeChanger: true }}
					scroll={{ x: 980 }}
				/>
			</Space>
		</Card>
	)
}
