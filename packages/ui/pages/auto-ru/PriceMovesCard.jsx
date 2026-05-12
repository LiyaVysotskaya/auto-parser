import React from "react"

import { Card, Typography } from "antd"

import { stableOfferKey } from "./offer-delta.js"

const { Text } = Typography

export function PriceMovesCard({ getCityLabel, priceMoves, upDownHint }) {
	return (
		<Card
			className="ms-dash-card"
			size="small"
		>
			<div className="ms-card-hd">
				Изменения цен
				{upDownHint ? (
					<span className="ms-price-moves-hint">{upDownHint}</span>
				) : null}
			</div>
			{priceMoves.length === 0 ? (
				<Text
					type="secondary"
					className="ms-text-12"
				>
					Нет истории или нет изменений за 30 дней.
				</Text>
			) : (
				priceMoves.map((r, i) => {
					const title =
						`${r.brand || ""} ${r.model || ""} · ${r.equipment || "—"}`.trim()
					const sub = `${r.dealer || "—"} · ${getCityLabel(r.city)}`
					const up = r._delta > 0
					return (
						<div
							key={`${stableOfferKey(r)}-${i}`}
							className="ms-price-row"
						>
							<div>
								<div className="ms-pr-name">{title}</div>
								<div className="ms-pr-detail">{sub}</div>
							</div>
							<span className={up ? "ms-badge-up" : "ms-badge-dn"}>
								{up ? "+" : "−"}
								{Math.abs(Math.round(r._delta)).toLocaleString("ru-RU")} ₽ (
								{r._deltaPct != null
									? `${(r._deltaPct * 100).toFixed(1)}%`
									: "—"}
								)
							</span>
						</div>
					)
				})
			)}
		</Card>
	)
}
