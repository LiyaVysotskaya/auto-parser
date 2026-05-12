import React from "react"

import { Statistic } from "antd"

export function DashboardKPI({
	memSummary,
	parseCitiesLabel,
	reportRows,
	reportSheets,
	lastDuration,
	lastStart,
}) {
	return (
		<div className="ms-launch-kpi">
			<div className="ms-stat-tile ms-launch-kpi-offers">
				<Statistic
					title="Всего предложений"
					value={memSummary.totalOffers || 0}
					valueStyle={{ color: "var(--ms-blue-soft)" }}
				/>
				<div className="ms-stat-delta ms-stat-delta--muted">
					{reportRows ? `${reportSheets} бренда · в памяти` : "Нет отчёта"}
				</div>
			</div>
			<div className="ms-launch-info">
				<div className="ms-launch-info-row">
					<span className="ms-launch-info-label">Последний запуск</span>
					<span>{lastStart}</span>
				</div>
				<div className="ms-launch-info-row">
					<span className="ms-launch-info-label">Длительность</span>
					<span>{lastDuration}</span>
				</div>
				<div className="ms-launch-info-row">
					<span className="ms-launch-info-label">Отчёт</span>
					<span className="ms-launch-info-accent">
						{reportSheets} бренда · {reportRows} строк
					</span>
				</div>
				<div className="ms-launch-info-row">
					<span className="ms-launch-info-label">Города</span>
					<span>{parseCitiesLabel}</span>
				</div>
			</div>
		</div>
	)
}
