import React, { useEffect, useMemo, useRef, useState } from "react"
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
import { parseXlsx, reportName, xlsx } from "@market-slice/auto-ru/xlsx.js"
import {
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
import dayjs from "dayjs"
import * as XLSX from "xlsx"

import { computeSummary, flattenReport } from "../../analytics.js"
import { electron } from "../../electron.js"
import { REF } from "../../theme-tokens.js"
import {
	CockpitBrandDonut,
	CockpitDonutLegend,
	CockpitMinPriceLine,
} from "./cockpit-charts.jsx"
import { attachPriceDeltas, stableOfferKey } from "./offer-delta.js"
import { money } from "./report-formatters.js"

const { Paragraph, Text } = Typography

const DONUT_COLORS = [
	REF.acc2,
	"#854F0B",
	"#0F6E56",
	REF.acc,
	"#5DCAA5",
	"#633806",
]

function logLevelClass(level) {
	switch (level) {
		case "error":
			return "ms-log-line--error"
		case "warning":
			return "ms-log-line--warning"
		case "success":
			return "ms-log-line--success"
		default:
			return "ms-log-line--info"
	}
}

function formatDuration(ms) {
	if (!ms && ms !== 0) return "—"
	const s = Math.floor(ms / 1000)
	const hh = Math.floor(s / 3600)
	const mm = Math.floor((s % 3600) / 60)
	const ss = s % 60
	if (hh) return `${hh}ч ${mm}м ${ss}с`
	if (mm) return `${mm}м ${ss}с`
	return `${ss}с`
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
	const [lineSeries, setLineSeries] = useState([])
	const [priceMoves, setPriceMoves] = useState([])

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
	const getCityLabel = useMemo(() => {
		const opts = mergeCityOptions(settings.extraCities ?? [])
		const byId = new Map(opts.map((c) => [String(c.id), c.name]))
		return (id) => {
			if (id == null || id === "" || id === "—") return "—"
			const s = String(id)
			return byId.get(s) ?? s
		}
	}, [settings.extraCities])

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

	const { rowsFlat } = useMemo(() => flattenReport(report), [report])
	const memSummary = useMemo(() => computeSummary(rowsFlat), [rowsFlat])

	const donutSlices = useMemo(() => {
		const byBrand = new Map()
		for (const r of rowsFlat) {
			const b = r.brand || "—"
			byBrand.set(b, (byBrand.get(b) || 0) + (r.count || 0))
		}
		const entries = [...byBrand.entries()].sort((a, b) => b[1] - a[1])
		return entries.map(([name, value], i) => ({
			name,
			value,
			color: DONUT_COLORS[i % DONUT_COLORS.length],
		}))
	}, [rowsFlat])

	const last = autoRuState.lastRun || {}
	const lastStart = last.startIso
		? dateFns.format(new Date(last.startIso), "dd MM yyyy HH:mm")
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

	useEffect(() => {
		let cancelled = false
		async function loadHistoryCharts() {
			if (
				!electron?.priceHistoryListRuns ||
				!electron?.priceHistoryQueryOffers
			) {
				if (!cancelled) {
					setLineSeries([])
					setPriceMoves([])
				}
				return
			}
			const dateFrom = dayjs()
				.subtract(45, "day")
				.startOf("day")
				.format("YYYY-MM-DD[T]HH:mm:ss")
			const dateTo = dayjs().endOf("day").format("YYYY-MM-DD[T]HH:mm:ss")
			const lr = await electron.priceHistoryListRuns({ dateFrom, dateTo })
			if (cancelled || !lr?.ok) return
			const runs = [...(lr.runs || [])].slice(0, 14).reverse()
			const ids = runs.map((r) => r.id).filter(Boolean)
			if (!ids.length) {
				setLineSeries([])
			} else {
				const q = await electron.priceHistoryQueryOffers({
					dateFrom,
					dateTo,
					runIds: ids,
				})
				if (cancelled || !q?.ok) return
				const rows = attachPriceDeltas([...(q.rows || [])])
				const byRun = new Map()
				for (const r of rows) {
					if (r.price == null) continue
					const t = String(r.run_started || "")
					if (!t) continue
					const cur = byRun.get(t)
					if (cur == null || r.price < cur.price) {
						byRun.set(t, {
							price: r.price,
							brand: r.brand,
							model: r.model,
							dealer: r.dealer,
							city: r.city,
						})
					}
				}
				const pts = [...byRun.entries()]
					.sort((a, b) => a[0].localeCompare(b[0]))
					.map(([started, m]) => ({
						label: dateFns.format(new Date(started), "dd MM yyyy"),
						value: Math.round(m.price / 1000),
						brand: m.brand,
						model: m.model,
						dealer: m.dealer,
						city: m.city,
					}))
				setLineSeries(pts)
			}

			const q2 = await electron.priceHistoryQueryOffers({
				dateFrom: dayjs()
					.subtract(30, "day")
					.startOf("day")
					.format("YYYY-MM-DD[T]HH:mm:ss"),
				dateTo,
			})
			if (cancelled || !q2?.ok) return
			const withD = attachPriceDeltas([...(q2.rows || [])])
			const changed = withD
				.filter((r) => r._delta != null && r._delta !== 0)
				.sort((a, b) => Math.abs(b._delta) - Math.abs(a._delta))
				.slice(0, 6)
			setPriceMoves(changed)
		}
		loadHistoryCharts()
		return () => {
			cancelled = true
		}
	}, [])

	const lineDeltaHint = useMemo(() => {
		if (lineSeries.length < 2) return null
		const a = lineSeries[0].value
		const b = lineSeries[lineSeries.length - 1].value
		if (!a) return null
		const pct = ((b - a) / a) * 100
		const up = b >= a
		return `${up ? "↑" : "↓"} ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% за период`
	}, [lineSeries])

	const upDownHint = useMemo(() => {
		let up = 0
		let down = 0
		for (const r of priceMoves) {
			if (r._delta > 0) up++
			else if (r._delta < 0) down++
		}
		if (!up && !down) return null
		return `${up} выросли · ${down} снизились (в подборке)`
	}, [priceMoves])

	const lineLastContext = useMemo(() => {
		if (!lineSeries.length) return null
		const p = lineSeries[lineSeries.length - 1]
		const car = [p.brand, p.model].filter(Boolean).join(" ").trim()
		const dealer = p.dealer && String(p.dealer).trim()
		const city =
			p.city != null && String(p.city).trim() && String(p.city).trim() !== "—"
				? getCityLabel(String(p.city).trim())
				: ""
		if (!car && !dealer && !city) return null
		const parts = []
		if (car) parts.push(car)
		if (dealer) parts.push(dealer)
		if (city) parts.push(city)
		return `Последняя точка (${p.label}): ${parts.join(" · ")}`
	}, [getCityLabel, lineSeries])

	return (
		<Space
			direction="vertical"
			style={{ width: "100%" }}
			size={14}
		>
			<div className="ms-dash-actions">
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
						style={{ width: "100%" }}
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

			<Card
				className="ms-toolbar-card ms-dash-card"
				size="small"
				title="Настройки парсинга и отчёт"
			>
				<div className="ms-cockpit-g3 ms-cockpit-g3--embedded">
					<Card
						className="ms-dash-card"
						size="small"
						title="Бренды"
						extra={
							<Button
								type="link"
								size="small"
								onClick={() => navigate("/auto-ru/settings")}
							>
								Изменить
							</Button>
						}
					>
						<Text
							type="secondary"
							style={{ fontSize: 12 }}
						>
							Выбрано {selectedCount} из {totalBrands}
						</Text>
						<div className="ms-brand-tags">
							{(settings.brands || []).slice(0, 14).map((b) => (
								<Tag
									key={b.id}
									className="ms-brand-tag"
									color={b.selected ? "blue" : "default"}
								>
									{b.name}
								</Tag>
							))}
						</div>
					</Card>
					<Card
						className="ms-dash-card"
						size="small"
						title="Годы"
					>
						<Statistic
							title="Диапазон"
							value={yearsText}
						/>
					</Card>
					<Card
						className="ms-dash-card"
						size="small"
						title="Каталог"
					>
						<Text style={{ fontSize: 12 }}>{cityDisplay.name}</Text>
						<Text
							type="secondary"
							style={{ fontSize: 11, display: "block" }}
						>
							{parseCitiesLabel}
						</Text>
					</Card>
				</div>
				{reportRows > 0 && !isPending ? (
					<>
						<Divider style={{ margin: "12px 0" }} />
						<Space
							style={{ width: "100%", justifyContent: "space-between" }}
							wrap
						>
							<Text strong>Отчёт в памяти</Text>
							<Button
								type="primary"
								icon={<BarChartOutlined />}
								onClick={() => navigate("/auto-ru/report")}
							>
								Аналитика
							</Button>
						</Space>
					</>
				) : (
					<Text
						type="secondary"
						style={{ fontSize: 12, display: "block", marginTop: 8 }}
					>
						Нет загруженного отчёта — после парсинга здесь появится кнопка
						аналитики.
					</Text>
				)}
			</Card>

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
						<span style={{ color: REF.acc }}>
							{reportSheets} бренда · {reportRows} строк
						</span>
					</div>
					<div className="ms-launch-info-row">
						<span className="ms-launch-info-label">Города</span>
						<span>{parseCitiesLabel}</span>
					</div>
				</div>
			</div>

			<div className="ms-cockpit-g2">
				<Card
					className="ms-dash-card"
					size="small"
					title={
						<div>
							<div>Динамика минимальных цен</div>
							<Text
								type="secondary"
								style={{
									fontSize: 11,
									fontWeight: 400,
									display: "block",
									marginTop: 4,
									lineHeight: 1.45,
								}}
							>
								По каждому запуску — минимальная цена среди всех предложений в
								истории; точки могут относиться к разным моделям. Подсказка при
								наведении на точку.
							</Text>
						</div>
					}
				>
					<CockpitMinPriceLine
						data={lineSeries}
						height={140}
						getCityLabel={getCityLabel}
					/>
					{lineLastContext ? (
						<div
							className="ms-stat-delta ms-stat-delta--muted"
							style={{ marginTop: 6 }}
						>
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
					<CockpitDonutLegend slices={donutSlices} />
					<CockpitBrandDonut
						slices={donutSlices}
						height={120}
					/>
				</Card>
			</div>

			<Card
				className="ms-dash-card"
				size="small"
			>
				<div className="ms-card-hd">
					Изменения цен
					{upDownHint ? (
						<span
							style={{
								color: "var(--ant-color-text-tertiary)",
								fontSize: 10,
								marginLeft: 8,
							}}
						>
							{upDownHint}
						</span>
					) : null}
				</div>
				{priceMoves.length === 0 ? (
					<Text
						type="secondary"
						style={{ fontSize: 12 }}
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

			{favoriteSnapshots.length > 0 ? (
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
											style={{ fontSize: 11 }}
										>
											Нет в отчёте
										</Text>
									)}
								</div>
							</Col>
						))}
					</Row>
				</Card>
			) : null}

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
						<span style={{ opacity: 0.6 }}>Нет записей</span>
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
		</Space>
	)
}
