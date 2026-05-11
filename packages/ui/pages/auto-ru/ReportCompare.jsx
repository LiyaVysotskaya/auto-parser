import React from "react"

import { PriceHistory } from "./PriceHistory.jsx"

/** Отдельный экран как в HTML-прототипе: сразу вкладка «Сравнение отчётов». */
export function ReportCompare() {
	return <PriceHistory initialTab="diff" />
}
