import React, { useRef } from "react"
import { useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"

import {
	BarChartOutlined,
	DownloadOutlined,
	PlayCircleOutlined,
	StopOutlined,
	UploadOutlined,
} from "@ant-design/icons"
import * as appStore from "@market-slice/application/store"
import { parseXlsx, reportName, xlsx } from "@market-slice/auto-ru/xlsx.js"
import { Button, Card, Divider, Progress, Space, Typography, message } from "antd"
import * as XLSX from "xlsx"

import { electron } from "../../electron.js"
import { REF } from "../../theme-tokens.js"

const { Text } = Typography

export function DashboardActions({
	autoRuState,
	isPending,
	progressPct,
	pagination,
}) {
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const uploadReportInputRef = useRef(null)

	return (
		<>
			<div className="ms-dash-actions">
				<input
					ref={uploadReportInputRef}
					type="file"
					accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					className="ms-hidden-input"
					onChange={async (ev) => {
						const file = ev.target.files?.[0]
						if (!file) return
						try {
							const buf = await file.arrayBuffer()
							const parsed = parseXlsx(buf)
							if (!parsed.length) {
								message.error(
									"Не удалось прочитать файл: нет листов с ожидаемыми заголовками столбцов",
								)
								return
							}
							dispatch(appStore.autoRu.slice.actions.report(parsed))
							message.success(`Отчёт загружен: ${parsed.length} лист(ов).`)
						} catch (err) {
							console.error(err)
							message.error(
								`Ошибка чтения XLSX: ${err?.message || String(err)}`,
							)
						} finally {
							if (uploadReportInputRef.current)
								uploadReportInputRef.current.value = ""
						}
					}}
				/>
				<div className="ms-dash-actions-row">
					<Space
						wrap
						className="ms-parser-run-btns"
					>
						<Button
							type="primary"
							size="large"
							icon={<PlayCircleOutlined />}
							className="ms-parser-start-btn"
							onClick={() => electron?.autoRu()}
							disabled={isPending}
						>
							Старт
						</Button>
						<Button
							danger
							size="large"
							variant={isPending ? "solid" : "outlined"}
							icon={<StopOutlined />}
							className="ms-parser-stop-btn"
							onClick={() => electron?.autoRuCancel?.()}
							disabled={!isPending}
						>
							Стоп
						</Button>
					</Space>
					<Divider
						type="vertical"
						className="ms-dash-actions-divider"
					/>
					<Space
						wrap
						className="ms-dash-actions-secondary"
					>
						<Button
							icon={<DownloadOutlined />}
							onClick={() => navigate("/auto-ru/report")}
						>
							Отчёт
						</Button>
						<Button
							icon={<DownloadOutlined />}
							onClick={() => {
								XLSX.writeFile(
									xlsx(autoRuState.report || []),
									reportName(autoRuState.report || [], "xlsx"),
								)
							}}
							disabled={!autoRuState.report?.length}
						>
							Скачать XLSX
						</Button>
						<Button
							icon={<UploadOutlined />}
							onClick={() => uploadReportInputRef.current?.click()}
						>
							Загрузить
						</Button>
					</Space>
				</div>
			</div>

			{isPending ? (
				<Card
					className="ms-dash-card"
					size="small"
				>
					<Space
						direction="vertical"
						className="ms-width-full"
					>
						<Text strong>Парсинг…</Text>
						<Progress
							percent={progressPct}
							status="active"
							strokeColor={REF.acc}
						/>
						<Text type="secondary">
							Собрано: {autoRuState.count}
							{pagination?.total_offers_count
								? ` / ~${pagination.total_offers_count}`
								: ""}
						</Text>
					</Space>
				</Card>
			) : null}
		</>
	)
}
