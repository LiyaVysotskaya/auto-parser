import React from "react"

import { money } from "@market-slice/application/lib/formatters.js"
import { Card, Col, Row, Typography } from "antd"

const { Text } = Typography

export function FavoritesCard({ favoriteSnapshots, getCityLabel }) {
	if (!favoriteSnapshots.length) return null

	return (
		<Card
			className="ms-dash-card"
			size="small"
			title="Избранное"
		>
			<Row gutter={[10, 10]}>
				{favoriteSnapshots.map(({ f, best }) => (
					<Col
						xs={24}
						sm={12}
						md={8}
						key={`${f.brand}-${f.model}-${f.equipment}-${f.modification}-${f.year}`}
					>
						<div className="ms-fav-tile">
							<div className="ms-pr-name">
								{f.brand} {f.model}
							</div>
							<div className="ms-pr-detail">
								{f.equipment} • {f.modification} • {f.year}
							</div>
							{best ? (
								<>
									<div className="ms-pr-detail ms-fav-dealer">
										{best.dealer && String(best.dealer).trim()
											? best.dealer
											: "Дилер не указан"}
										{best.city &&
										String(best.city).trim() &&
										String(best.city).trim() !== "—"
											? ` · ${getCityLabel(best.city)}`
											: ""}
									</div>
									<div className="ms-fav-price">{money(best.price)}</div>
								</>
							) : (
								<Text
									type="secondary"
									className="ms-text-11"
								>
									Нет в отчёте
								</Text>
							)}
						</div>
					</Col>
				))}
			</Row>
		</Card>
	)
}
