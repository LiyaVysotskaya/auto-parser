import React from "react"

import { Card, Segmented } from "antd"
import * as dateFns from "date-fns"

export function RunLogCard({ filteredLog, logFilter, setLogFilter }) {
	return (
		<Card
			className="ms-dash-card"
			size="small"
			title={<span className="ms-card-hd-inline">Журнал</span>}
			extra={
				<Segmented
					size="small"
					value={logFilter}
					onChange={setLogFilter}
					options={[
						{ value: "all", label: "Все" },
						{ value: "info", label: "Info" },
						{ value: "success", label: "OK" },
						{ value: "warning", label: "Warn" },
						{ value: "error", label: "Err" },
					]}
				/>
			}
		>
			<div className="ms-run-log">
				{filteredLog.length === 0 ? (
					<span className="ms-run-log-empty">Нет записей</span>
				) : (
					filteredLog.slice(-12).map((r, i) => (
						<div key={`${r.timestamp}-${i}`}>
							<span className={`ms-log-tag ms-log-tag--${r.level || "info"}`}>
								[{String(r.level || "info").toUpperCase()}]
							</span>{" "}
							{dateFns.format(new Date(r.timestamp), "dd MM yyyy HH:mm:ss")} —{" "}
							{r.message}
						</div>
					))
				)}
			</div>
		</Card>
	)
}
