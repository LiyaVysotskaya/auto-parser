import React, { useMemo } from "react"
import { useSelector } from "react-redux"

import { Alert, Card, Select, Space, Typography } from "antd"

import {
	dealerModelBreakdown,
	filterRowsFlatByCity,
	flattenReport,
	generateComprehensiveAnalytics,
} from "@market-slice/application/lib/analytics.js"
import { useReportCityScope } from "../../hooks/useReportCityScope.js"
import { CockpitModelHBar } from "./cockpit-charts.jsx"
import { DealerComparison } from "./DealerComparison.jsx"

const { Text } = Typography

export function Competitors() {
	const report = useSelector((state) => state.autoRu.report || [])
	const {
		cityIds,
		cityOptions,
		effectiveScopeCity,
		setCityOverride,
	} = useReportCityScope(report)

	const analytics = useMemo(
		() => generateComprehensiveAnalytics(report, { city: effectiveScopeCity }),
		[report, effectiveScopeCity],
	)

	const rowsFlatScoped = useMemo(() => {
		const { rowsFlat } = flattenReport(report)
		return filterRowsFlatByCity(rowsFlat, effectiveScopeCity)
	}, [report, effectiveScopeCity])

	const brandCards = useMemo(() => {
		const items = []
		for (const tab of report || []) {
			const brand = tab?.name || "Unknown"
			const topDealers = analytics.perBrandAnalytics?.[brand]?.topDealers || []
			const topFive = [...topDealers].slice(0, 5)
			const maxUnits = Math.max(1, ...topFive.map((d) => d.units ?? d.count ?? 0))
			const brandRows = rowsFlatScoped.filter((r) => r.brand === brand)
			const modelMap = new Map()
			for (const r of brandRows) {
				const name = r.model || "—"
				modelMap.set(name, (modelMap.get(name) || 0) + (r.count || 0))
			}
			const modelBarRows = [...modelMap.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 8)
				.map(([name, value]) => ({
					name: name.length > 14 ? `${name.slice(0, 12)}…` : name,
					value,
				}))
			items.push({ brand, topFive, maxUnits, modelBarRows, brandRows })
		}
		return items
	}, [analytics.perBrandAnalytics, report, rowsFlatScoped])

	if (!report.length) {
		return (
			<Text type="secondary">
				Загрузите отчёт на главной или дождитесь сбора — здесь появятся дилеры и
				сравнение цен.
			</Text>
		)
	}

	return (
		<Space
			direction="vertical"
			className="ms-width-full"
			size={14}
		>
			{cityIds.length > 1 ? (
				<Space wrap align="center">
					<Text strong>Город:</Text>
					<Select
						style={{ minWidth: 220 }}
						value={effectiveScopeCity}
						options={cityOptions}
						onChange={(v) => setCityOverride(v)}
					/>
				</Space>
			) : null}
			{cityIds.length > 1 ? (
				<Alert
					type="info"
					showIcon
					message="Статистика только для выбранного города — как в макете отчёта."
					className="ms-mb-0"
				/>
			) : null}

			<Text
				type="secondary"
				className="ms-competitors-hint"
			>
				Объём предложений по дилерам — нажмите на строку в таблице сравнения ниже,
				чтобы задать базу в блоке «Сравнение».
			</Text>

			{brandCards.map(({ brand, topFive, maxUnits, modelBarRows, brandRows }) => (
				<div
					key={brand}
					className="ms-cockpit-g2"
				>
					<Card
						className="ms-dash-card"
						size="small"
						title={`Топ дилеров — ${brand}`}
					>
						{topFive.map((d, idx) => {
							const full = d.dealer || "—"
							const n = d.units ?? d.count ?? 0
							const pct = Math.round((n / maxUnits) * 100)
							const models = dealerModelBreakdown(brandRows, full, 4).map(
								(x) => x.model,
							)
							return (
								<div
									key={full}
									className="ms-comp-row"
								>
									<div className="ms-comp-rank">{idx + 1}</div>
									<div className="ms-comp-main">
										<div className="ms-comp-name">{full}</div>
										<div className="ms-comp-models">
											{models.map((m) => (
												<span
													key={m}
													className="ms-chip ms-chip-blue ms-chip-spaced"
												>
													{m}
												</span>
											))}
										</div>
									</div>
									<div className="ms-bar-bg">
										<div
											className="ms-bar-fill"
											style={{ width: `${pct}%` }}
										/>
									</div>
									<div className="ms-comp-cnt">{n}</div>
								</div>
							)
						})}
					</Card>
					<Card
						className="ms-dash-card"
						size="small"
						title={`Распределение по моделям — ${brand}`}
					>
						<CockpitModelHBar
							rows={modelBarRows}
							height={200}
						/>
					</Card>
				</div>
			))}

			<DealerComparison
				report={report}
				forcedCity={effectiveScopeCity}
			/>
		</Space>
	)
}
