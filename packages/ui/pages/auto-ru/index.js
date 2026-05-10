import React from "react"
import { useSelector } from "react-redux"

import {
	DownloadOutlined,
	PlayCircleOutlined,
	StopOutlined,
} from "@ant-design/icons"
import * as autoRuTools from "@market-slice/auto-ru"
import {
	Alert,
	Button,
	Card,
	Col,
	Divider,
	Row,
	Space,
	Statistic,
	Tag,
	Typography,
} from "antd"
import * as dateFns from "date-fns"
import * as XLSX from "xlsx"

import { electron } from "../../electron.js"

const { Text, Title } = Typography

function formatDuration(ms) {
	if (!ms && ms !== 0) return "—"
	const s = Math.floor(ms / 1000)
	const hh = Math.floor(s / 3600)
	const mm = Math.floor((s % 3600) / 60)
	const ss = s % 60
	if (hh) return `${hh}h ${mm}m ${ss}s`
	if (mm) return `${mm}m ${ss}s`
	return `${ss}s`
}

export function AutoRu() {
	const autoRuState = useSelector((state) => state.autoRu)
	const settings = useSelector((state) => state.settings)
	const log = useSelector((state) =>
		state.log.filter(({ scope }) => scope === "autoRu"),
	)

	const selectedBrands = (settings.brands || []).filter((b) => b.selected)
	const selectedCount = selectedBrands.length
	const totalBrands = (settings.brands || []).length
	const years = settings.years || { from: "—", to: "—" }
	const yearsText = `${years.from} — ${years.to}`

	const report = autoRuState.report || []
	const reportSheets = report.length
	let reportRows = 0
	for (const t of report) {
		if (Array.isArray(t.rows)) reportRows += t.rows.length
	}

	const last = autoRuState.lastRun || {}
	const lastStart = last.startIso
		? dateFns.format(new Date(last.startIso), "dd.MM.yyyy HH:mm:ss")
		: "—"
	const lastDuration = formatDuration(last.durationMs)

	return (
		<Space
			direction="vertical"
			style={{ width: "100%", marginTop: 16 }}
			size="large"
		>
			<Row
				justify="space-between"
				align="middle"
				style={{ width: "100%" }}
			>
				<Col>
					<Title level={4}>Панель управления</Title>
				</Col>
				<Col>
					<Space>
						<Button
							icon={<PlayCircleOutlined />}
							type="primary"
							onClick={() => electron?.autoRu()}
							disabled={autoRuState.status === "pending"}
						>
							Старт
						</Button>

						<Button
							danger
							icon={<StopOutlined />}
							onClick={() => electron?.autoRuCancel?.()}
							disabled={autoRuState.status !== "pending"}
						>
							Стоп
						</Button>

						<Button
							icon={<DownloadOutlined />}
							onClick={() => {
								XLSX.writeFile(
									autoRuTools.xlsx(autoRuState.report || []),
									autoRuTools.reportName(autoRuState.report || [], "xlsx"),
								)
							}}
							disabled={!autoRuState.report || !autoRuState.report.length}
						>
							Скачать отчёт
						</Button>
					</Space>
				</Col>
			</Row>

			<Row gutter={16}>
				<Col
					xs={24}
					md={12}
					lg={8}
				>
					<Card
						title="Бренды для парсинга"
						size="small"
					>
						<div>
							<strong>Выбрано:</strong> {selectedCount} из {totalBrands}
						</div>
						<div
							style={{
								marginTop: 8,
								display: "flex",
								flexWrap: "wrap",
								gap: 8,
							}}
						>
							{(settings.brands || []).map((b) => (
								<Tag
									key={b.id}
									color={b.selected ? "blue" : "default"}
								>
									{b.name}
								</Tag>
							))}
						</div>
					</Card>
				</Col>

				<Col
					xs={24}
					md={12}
					lg={8}
				>
					<Card
						title="Диапазон годов"
						size="small"
					>
						<Statistic
							title="Годы"
							value={yearsText}
						/>
					</Card>
				</Col>

				<Col
					xs={24}
					md={24}
					lg={8}
				>
					<Card
						title="Последний запуск"
						size="small"
					>
						<div>
							<strong>Начало:</strong> {lastStart}
						</div>
						<div>
							<strong>Длительность:</strong> {lastDuration}
						</div>
						<Divider style={{ margin: "8px 0" }} />
						<div>
							<strong>Отчёт:</strong> {reportSheets} листов, {reportRows} строк
						</div>
					</Card>
				</Col>
			</Row>

			<Card title="Журнал (последние сообщения)">
				<Space
					direction="vertical"
					style={{ width: "100%" }}
				>
					{log.length === 0 ? (
						<Text type="secondary">Записи журнала отсутствуют</Text>
					) : (
						log
							.slice(-8)
							.reverse()
							.map((r, i) => (
								<Alert
									key={i}
									type={
										r.level === "error"
											? "error"
											: r.level === "warning"
												? "warning"
												: "info"
									}
									message={`${dateFns.format(new Date(r.timestamp), "HH:mm")} — ${r.message}`}
									showIcon
								/>
							))
					)}
				</Space>
			</Card>
		</Space>
	)
}
