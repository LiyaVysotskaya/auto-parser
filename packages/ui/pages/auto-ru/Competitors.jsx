import React, { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"

import { mergeCityOptions } from "@market-slice/application/settings/defaults.js"
import { Alert, Card, Select, Space, Typography } from "antd"

import {
	dealerModelBreakdown,
	filterRowsFlatByCity,
	flattenReport,
	generateComprehensiveAnalytics,
	resolveReportCityScope,
	uniqueCitiesFromReport,
} from "../../analytics.js"
import { CockpitModelHBar } from "./cockpit-charts.jsx"
import { DealerComparison } from "./DealerComparison.jsx"

const { Text } = Typography

export function Competitors() {
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

	const rowsFlatScoped = useMemo(() => {
		const { rowsFlat } = flattenReport(report)
		return filterRowsFlatByCity(rowsFlat, effectiveScopeCity)
	}, [report, effectiveScopeCity])

	const { topDealers } = analytics

	const topFive = useMemo(
		() => [...(topDealers || [])].slice(0, 5),
		[topDealers],
	)
	const maxUnits = useMemo(
		() => Math.max(1, ...topFive.map((d) => d.units ?? d.count ?? 0)),
		[topFive],
	)

	const modelBarRows = useMemo(() => {
		const m = new Map()
		for (const r of rowsFlatScoped) {
			const name = r.model || "—"
			m.set(name, (m.get(name) || 0) + (r.count || 0))
		}
		return [...m.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 8)
			.map(([name, value]) => ({ name: name.length > 14 ? `${name.slice(0, 12)}…` : name, value }))
	}, [rowsFlatScoped])

	const firstBrand = report[0]?.name

	if (!report.length) {
		return (
			<Text type="secondary">Загрузите отчёт на главной или дождитесь сбора — здесь появятся дилеры и сравнение цен.</Text>
		)
	}

	return (
		<Space direction="vertical" style={{ width: "100%" }} size={14}>
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
					style={{ marginBottom: 0 }}
				/>
			) : null}

			<Text type="secondary" style={{ fontSize: 11, display: "block" }}>
				Объём предложений по дилерам — нажмите на строку в таблице сравнения ниже, чтобы задать базу в блоке «Сравнение».
			</Text>

			<div className="ms-cockpit-g2">
				<Card className="ms-dash-card" size="small" title={`Топ дилеров${firstBrand ? ` — ${firstBrand}` : ""}`}>
					{topFive.map((d, idx) => {
						const full = d.dealer || "—"
						const n = d.units ?? d.count ?? 0
						const pct = Math.round((n / maxUnits) * 100)
						const models = dealerModelBreakdown(rowsFlatScoped, full, 4).map((x) => x.model)
						return (
							<div key={full} className="ms-comp-row">
								<div style={{ fontSize: 10, color: "var(--ant-color-text-quaternary)", width: 14 }}>
									{idx + 1}
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div className="ms-comp-name">{full}</div>
									<div style={{ marginTop: 2 }}>
										{models.map((m) => (
											<span key={m} className="ms-chip ms-chip-blue" style={{ marginRight: 4 }}>
												{m}
											</span>
										))}
									</div>
								</div>
								<div className="ms-bar-bg">
									<div className="ms-bar-fill" style={{ width: `${pct}%` }} />
								</div>
								<div className="ms-comp-cnt">{n}</div>
							</div>
						)
					})}
				</Card>
				<Card className="ms-dash-card" size="small" title="Распределение по моделям">
					<CockpitModelHBar rows={modelBarRows} height={200} />
				</Card>
			</div>

			<DealerComparison report={report} forcedCity={effectiveScopeCity} />
		</Space>
	)
}
