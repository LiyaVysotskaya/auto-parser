import React, { useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import {
	BarChartOutlined,
	DownloadOutlined,
	PlayCircleOutlined,
	StopOutlined,
	UploadOutlined,
} from "@ant-design/icons"
import { mergeCityOptions } from "@market-slice/application/settings/defaults.js"
import * as appStore from "@market-slice/application/store"
import * as autoRuTools from "@market-slice/auto-ru"
import {
	Alert,
	Button,
	Card,
	Col,
	Divider,
	Progress,
	Row,
	Segmented,
	Space,
	Statistic,
	Tag,
	Typography,
	message,
} from "antd"
import * as dateFns from "date-fns"
import * as XLSX from "xlsx"

import { flattenReport } from "../../analytics.js"
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

function statusColor(status) {
	switch (status) {
		case "pending":
			return "processing"
		case "success":
			return "success"
		case "failed":
			return "error"
		case "cancelled":
			return "warning"
		default:
			return "default"
	}
}

function statusBorder(status) {
	switch (status) {
		case "pending":
			return "var(--ant-color-info-border)"
		case "success":
			return "var(--ant-color-success-border)"
		case "failed":
			return "var(--ant-color-error-border)"
		case "cancelled":
			return "var(--ant-color-warning-border)"
		default:
			return "var(--ant-color-border)"
	}
}

export function AutoRu() {
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const uploadReportInputRef = useRef(null)
	const autoRuState = useSelector((state) => state.autoRu)
	const settings = useSelector((state) => state.settings)
	const favorites = useSelector((state) => state.favorites.items)
	const log = useSelector((state) =>
		state.log.filter(({ scope }) => scope === "autoRu"),
	)

	const [logFilter, setLogFilter] = useState("all")

	const selectedBrands = (settings.brands || []).filter((b) => b.selected)
	const selectedCount = selectedBrands.length
	const totalBrands = (settings.brands || []).length
	const years = settings.years || { from: "—", to: "—" }
	const yearsText = `${years.from} — ${years.to}`

	const cityDisplay = useMemo(() => {
		const opts = mergeCityOptions(settings.extraCities ?? [])
		const hit = opts.find((c) => c.id === settings.city)
		return {
			name: hit?.name ?? settings.city ?? "—",
			slug: settings.city ?? "—",
		}
	}, [settings.city, settings.extraCities])

	const report = autoRuState.report || []

	const parseCitiesLabel = useMemo(() => {
		const ids = settings.cities?.length > 0 ? settings.cities : [settings.city]
		const opts = mergeCityOptions(settings.extraCities ?? [])
		return ids.map((id) => opts.find((c) => c.id === id)?.name || id).join(", ")
	}, [settings.cities, settings.city, settings.extraCities])

	const favoriteSnapshots = useMemo(() => {
		const { rowsFlat } = flattenReport(report)
		return (favorites || []).map((f) => {
			const matches = rowsFlat.filter(
				(r) =>
					r.brand === f.brand &&
					r.model === f.model &&
					String(r.equipment ?? "—") === String(f.equipment ?? "—") &&
					String(r.modification ?? "—") === String(f.modification ?? "—") &&
					String(r.year ?? "—") === String(f.year ?? "—"),
			)
			const priced = matches.filter((r) => r.price != null)
			const best = priced.length
				? priced.reduce((a, b) => (a.price <= b.price ? a : b))
				: null
			return { f, best }
		})
	}, [favorites, report])

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

	const isPending = autoRuState.status === "pending"
	const pagination = autoRuState.pagination
	const progressPct =
		isPending && pagination?.total_offers_count && autoRuState.count
			? Math.min(
					99,
					Math.round((autoRuState.count / pagination.total_offers_count) * 100),
				)
			: 0

	const filteredLog = useMemo(() => {
		if (logFilter === "all") return log
		return log.filter((r) => r.level === logFilter)
	}, [log, logFilter])

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
					<Title
						level={4}
						style={{ margin: 0 }}
					>
						Панель управления
					</Title>
				</Col>
				<Col>
					<Space>
						<Button
							icon={<PlayCircleOutlined />}
							type="primary"
							onClick={() => electron?.autoRu()}
							disabled={isPending}
						>
							Старт
						</Button>
						<Button
							danger
							icon={<StopOutlined />}
							onClick={() => electron?.autoRuCancel?.()}
							disabled={!isPending}
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
						<input
							ref={uploadReportInputRef}
							type="file"
							accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
							style={{ display: "none" }}
							onChange={async (ev) => {
								const file = ev.target.files?.[0]
								if (!file) return
								try {
									const buf = await file.arrayBuffer()
									const parsed = autoRuTools.parseXlsx(buf)
									if (!parsed.length) {
										message.error(
											"Не удалось прочитать файл: нет листов с ожидаемыми заголовками столбцов",
										)
										return
									}
									dispatch(appStore.autoRu.slice.actions.report(parsed))
									message.success(
										`Отчёт загружен: ${parsed.length} лист(ов). Откройте страницу «Отчёт» для аналитики.`,
									)
								} catch (err) {
									console.error(err)
									message.error(
										`Ошибка чтения XLSX: ${err?.message || String(err)}`,
									)
								} finally {
									if (uploadReportInputRef.current) {
										uploadReportInputRef.current.value = ""
									}
								}
							}}
						/>
						<Button
							icon={<UploadOutlined />}
							onClick={() => uploadReportInputRef.current?.click()}
						>
							Загрузить отчёт
						</Button>
					</Space>
				</Col>
			</Row>

			{isPending && (
				<Card size="small">
					<Space
						direction="vertical"
						style={{ width: "100%" }}
					>
						<Text strong>Парсинг в процессе…</Text>
						<Progress
							percent={progressPct}
							status="active"
							strokeColor={{ from: "#108ee9", to: "#87d068" }}
						/>
						<Text type="secondary">
							Собрано предложений: {autoRuState.count}
							{pagination?.total_offers_count
								? ` / ~${pagination.total_offers_count}`
								: ""}
						</Text>
					</Space>
				</Card>
			)}

			<Row gutter={[16, 16]}>
				<Col
					xs={24}
					md={12}
					lg={6}
				>
					<Card
						title="Бренды для парсинга"
						size="small"
						style={{
							borderTop: `3px solid ${statusBorder(autoRuState.status)}`,
						}}
					>
						<div>
							<strong>Выбрано:</strong> {selectedCount} из {totalBrands}
						</div>
						<div
							style={{
								marginTop: 8,
								display: "flex",
								flexWrap: "wrap",
								gap: 4,
							}}
						>
							{(settings.brands || []).slice(0, 12).map((b) => (
								<Tag
									key={b.id}
									color={b.selected ? "blue" : "default"}
								>
									{b.name}
								</Tag>
							))}
							{(settings.brands || []).length > 12 && (
								<Tag>+{settings.brands.length - 12}</Tag>
							)}
						</div>
					</Card>
				</Col>

				<Col
					xs={24}
					md={12}
					lg={6}
				>
					<Card
						title="Диапазон годов"
						size="small"
						style={{
							borderTop: `3px solid ${statusBorder(autoRuState.status)}`,
						}}
					>
						<Statistic
							title="Годы"
							value={yearsText}
						/>
					</Card>
				</Col>

				<Col
					xs={24}
					md={12}
					lg={6}
				>
					<Card
						title="Города парсинга"
						size="small"
						style={{
							borderTop: `3px solid ${statusBorder(autoRuState.status)}`,
						}}
					>
						<Statistic
							title="Регионы"
							value={parseCitiesLabel}
						/>
						<Text
							type="secondary"
							style={{ fontSize: 12, display: "block", marginTop: 4 }}
						>
							Основной (каталог): {cityDisplay.name} ({cityDisplay.slug})
						</Text>
					</Card>
				</Col>

				<Col
					xs={24}
					md={12}
					lg={6}
				>
					<Card
						title="Последний запуск"
						size="small"
						style={{
							borderTop: `3px solid ${statusBorder(autoRuState.status)}`,
						}}
						extra={
							autoRuState.status && (
								<Tag color={statusColor(autoRuState.status)}>
									{autoRuState.status}
								</Tag>
							)
						}
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

			{reportRows > 0 && !isPending && (
				<Card size="small">
					<Space style={{ width: "100%", justifyContent: "space-between" }}>
						<Text>
							<strong>Последний отчёт:</strong> {reportSheets} брендов,{" "}
							{reportRows} предложений
						</Text>
						<Button
							type="link"
							icon={<BarChartOutlined />}
							onClick={() => navigate("/auto-ru/report")}
						>
							Перейти к аналитике
						</Button>
					</Space>
				</Card>
			)}

			{favoriteSnapshots.length > 0 ? (
				<Card
					title="Избранное"
					size="small"
				>
					<Text
						type="secondary"
						style={{ display: "block", marginBottom: 12 }}
					>
						Цены из текущего отчёта в памяти (минимум по дилерам для позиции).
						Добавляйте звёздочкой на странице «Отчёт».
					</Text>
					<Row gutter={[12, 12]}>
						{favoriteSnapshots.map(({ f, best }) => (
							<Col
								xs={24}
								sm={12}
								md={8}
								key={`${f.brand}-${f.model}-${f.equipment}-${f.modification}-${f.year}`}
							>
								<Card
									size="small"
									bordered
								>
									<div>
										<strong>
											{f.brand} {f.model}
										</strong>
									</div>
									<Text
										type="secondary"
										style={{ fontSize: 12, display: "block" }}
									>
										{f.equipment} • {f.modification} • {f.year}
									</Text>
									{best ? (
										<>
											<Statistic
												title="Мин. цена"
												value={Math.round(best.price)}
												suffix="₽"
												style={{ marginTop: 8 }}
											/>
											{best.city && best.city !== "—" ? (
												<Tag style={{ marginTop: 8 }}>{best.city}</Tag>
											) : null}
											{best.dealer ? (
												<Text
													type="secondary"
													style={{ fontSize: 11, display: "block" }}
												>
													{best.dealer}
												</Text>
											) : null}
										</>
									) : (
										<Text
											type="secondary"
											style={{ marginTop: 8, display: "block" }}
										>
											Нет в текущем отчёте
										</Text>
									)}
								</Card>
							</Col>
						))}
					</Row>
				</Card>
			) : null}

			<Card
				title="Журнал"
				extra={
					<Segmented
						size="small"
						value={logFilter}
						onChange={setLogFilter}
						options={[
							{ value: "all", label: "Все" },
							{ value: "info", label: "Info" },
							{ value: "success", label: "Успех" },
							{ value: "warning", label: "Внимание" },
							{ value: "error", label: "Ошибки" },
						]}
					/>
				}
			>
				<div style={{ maxHeight: 320, overflow: "auto" }}>
					<Space
						direction="vertical"
						style={{ width: "100%" }}
					>
						{filteredLog.length === 0 ? (
							<Text type="secondary">Записи журнала отсутствуют</Text>
						) : (
							filteredLog.slice(0, 30).map((r, i) => (
								<Alert
									key={i}
									type={
										r.level === "error"
											? "error"
											: r.level === "warning"
												? "warning"
												: r.level === "success"
													? "success"
													: "info"
									}
									message={`${dateFns.format(new Date(r.timestamp), "HH:mm:ss")} — ${r.message}`}
									showIcon
								/>
							))
						)}
					</Space>
				</div>
			</Card>
		</Space>
	)
}
