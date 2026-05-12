import React from "react"

import { Card, Typography } from "antd"

import {
	CockpitBrandDonut,
	CockpitDonutLegend,
	CockpitMinPriceLine,
} from "./cockpit-charts.jsx"

import { ErrorBoundary } from "../../ErrorBoundary.jsx"

const { Text } = Typography

export function DashboardCockpitG2({
	donutSlices,
	getCityLabel,
	lineDeltaHint,
	lineLastContext,
	lineSeries,
}) {
	return (
		<div className="ms-cockpit-g2">
			<Card
				className="ms-dash-card"
				size="small"
				title={
					<div>
						<div>Динамика цен по запускам</div>
						<Text
							type="secondary"
							className="ms-price-trend-subtitle"
						>
							Сплошная линия — медиана цены по всем строкам отчёта в запуске.
							Пунктир — минимум в том же запуске.
						</Text>
					</div>
				}
			>
				<ErrorBoundary title="Ошибка графика динамики цен">
					<CockpitMinPriceLine
						data={lineSeries}
						height={140}
						getCityLabel={getCityLabel}
					/>
				</ErrorBoundary>
				{lineLastContext ? (
					<div className="ms-stat-delta ms-stat-delta--muted ms-mt-6">
						{lineLastContext}
					</div>
				) : null}
				{lineDeltaHint ? (
					<div
						className={`ms-stat-delta ${lineSeries[lineSeries.length - 1]?.value >= lineSeries[0]?.value ? "ms-stat-delta--up" : "ms-stat-delta--dn"}`}
					>
						{lineDeltaHint}
					</div>
				) : (
					<div className="ms-stat-delta ms-stat-delta--muted">
						История из локальной БД (если есть)
					</div>
				)}
			</Card>
			<Card
				className="ms-dash-card"
				size="small"
				title="Предложения по брендам"
			>
				<ErrorBoundary title="Ошибка диаграммы по брендам">
					<CockpitDonutLegend slices={donutSlices} />
					<CockpitBrandDonut
						slices={donutSlices}
						height={120}
					/>
				</ErrorBoundary>
			</Card>
		</div>
	)
}
