import React from "react"
import { useNavigate } from "react-router-dom"

import { BarChartOutlined } from "@ant-design/icons"
import { Button, Card, Typography } from "antd"

import { ParseBrandRoster } from "./ParseBrandRoster.jsx"

const { Text } = Typography

export function ParseConfigCard({
	brands,
	cityDisplayName,
	isPending,
	reportRows,
	reportSheets,
	selectedCount,
	totalBrands,
	yearsText,
}) {
	const navigate = useNavigate()

	return (
		<Card
			className="ms-toolbar-card ms-dash-card"
			size="small"
			title="Настройки парсинга и отчёт"
		>
			<div className="ms-parse-config-grid">
				<div className="ms-parse-config-tile">
					<div className="ms-parse-config-tile__head">
						<span className="ms-parse-config-tile__title">Бренды</span>
						<Button
							type="link"
							size="small"
							className="ms-parse-config-link"
							onClick={() => navigate("/auto-ru/settings")}
						>
							Изменить
						</Button>
					</div>
					<div className="ms-parse-config-tile__meta">
						Выбрано {selectedCount} из {totalBrands}
					</div>
					<div className="ms-parse-config-tile__body">
						<ParseBrandRoster brands={brands} />
					</div>
				</div>
				<div className="ms-parse-config-tile">
					<div className="ms-parse-config-tile__head">
						<span className="ms-parse-config-tile__title">Годы</span>
					</div>
					<div className="ms-parse-config-tile__meta">Диапазон выпуска</div>
					<div className="ms-parse-config-tile__value">{yearsText}</div>
				</div>
				<div className="ms-parse-config-tile">
					<div className="ms-parse-config-tile__head">
						<span className="ms-parse-config-tile__title">Каталог</span>
					</div>
					<div className="ms-parse-config-tile__meta">Город каталога</div>
					<div className="ms-parse-config-tile__value">{cityDisplayName}</div>
				</div>
			</div>
			<div className="ms-parse-config-footer">
				{reportRows > 0 && !isPending ? (
					<>
						<div className="ms-parse-config-footer__main">
							<Text strong>Отчёт в памяти</Text>
							<Text
								type="secondary"
								className="ms-text-12"
							>
								{reportSheets} бренда · {reportRows.toLocaleString("ru-RU")} строк
							</Text>
						</div>
						<Button
							type="primary"
							icon={<BarChartOutlined />}
							onClick={() => navigate("/auto-ru/report")}
						>
							Аналитика
						</Button>
					</>
				) : (
					<Text
						type="secondary"
						className="ms-text-12"
					>
						Нет загруженного отчёта — после парсинга здесь появится кнопка
						аналитики.
					</Text>
				)}
			</div>
		</Card>
	)
}
