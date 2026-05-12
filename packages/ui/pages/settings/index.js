import React, {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react"
import { useDispatch, useSelector, useStore } from "react-redux"
import { useBlocker } from "react-router-dom"

import {
	CalendarOutlined,
	DatabaseOutlined,
	DeleteOutlined,
	DownloadOutlined,
	EnvironmentOutlined,
	ReloadOutlined,
	SaveOutlined,
	ShopOutlined,
	UploadOutlined,
} from "@ant-design/icons"
import { normalizeStoredSettings } from "@market-slice/application/settings/normalize.js"
import {
	reset,
	setSettings,
} from "@market-slice/application/slices/settings.js"
import {
	Alert,
	Button,
	Card,
	Modal,
	Space,
	Tabs,
	Typography,
	message,
} from "antd"
import _ from "lodash"

import { electron } from "../../electron.js"
import { BrandSettings } from "./BrandSettings.jsx"
import { CitySettings } from "./CitySettings.jsx"
import { YearsSettings } from "./YearsSettings.jsx"

const { Paragraph, Text, Title } = Typography

/** Снимок полей, которые уходят в файл / localStorage (как в handleSave). */
function buildPersistPayload(settingsState) {
	return {
		brands: settingsState.brands,
		years: settingsState.years,
		city: settingsState.city,
		cities: settingsState.cities?.length
			? settingsState.cities
			: [settingsState.city],
		extraCities: settingsState.extraCities ?? [],
	}
}

/**
 * Последний успешно сохранённый снимок (живёт между заходами на страницу
 * настроек). null до первой инициализации на странице «Настройки».
 */
let persistedSettingsBaseline = null

export function Settings() {
	const dispatch = useDispatch()
	const store = useStore()
	const settings = useSelector((state) => state.settings)
	const [loading, setLoading] = useState(false)
	const [leaveSaveLoading, setLeaveSaveLoading] = useState(false)
	const fileInputRef = useRef(null)

	useLayoutEffect(() => {
		if (persistedSettingsBaseline === null) {
			persistedSettingsBaseline = _.cloneDeep(
				buildPersistPayload(store.getState().settings),
			)
		}
	}, [store])

	const dirty = useMemo(() => {
		if (persistedSettingsBaseline === null) return false
		return !_.isEqual(buildPersistPayload(settings), persistedSettingsBaseline)
	}, [settings])

	useEffect(() => {
		if (!dirty) return
		const onBeforeUnload = (e) => {
			e.preventDefault()
			e.returnValue = ""
		}
		window.addEventListener("beforeunload", onBeforeUnload)
		return () => window.removeEventListener("beforeunload", onBeforeUnload)
	}, [dirty])

	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			dirty && currentLocation.pathname !== nextLocation.pathname,
	)

	const persistToDisk = async (sourceSettings) => {
		const payload = buildPersistPayload(sourceSettings)
		try {
			if (electron?.saveSettings) {
				const ok = await electron.saveSettings(payload)
				if (ok) {
					message.success("Настройки успешно сохранены!")
					dispatch(setSettings(payload))
					persistedSettingsBaseline = _.cloneDeep(payload)
					return true
				}
				message.error("Ошибка при сохранении настроек")
				return false
			}
			localStorage.setItem("autoRuSettings", JSON.stringify(payload))
			dispatch(setSettings(payload))
			persistedSettingsBaseline = _.cloneDeep(payload)
			message.success("Настройки сохранены в localStorage (fallback)")
			return true
		} catch (error) {
			console.error("Ошибка сохранения:", error)
			message.error("Ошибка при сохранении настроек")
			return false
		}
	}

	const handleSave = async () => {
		setLoading(true)
		try {
			await persistToDisk(settings)
		} finally {
			setLoading(false)
		}
	}

	const handleSaveFromBlocker = async () => {
		setLeaveSaveLoading(true)
		try {
			const latest = store.getState().settings
			const ok = await persistToDisk(latest)
			if (ok) blocker.proceed?.()
		} finally {
			setLeaveSaveLoading(false)
		}
	}

	const handleReset = () => {
		dispatch(reset())
		message.info("Настройки сброшены к значениям по умолчанию")
	}

	const handleExport = () => {
		try {
			const payload = buildPersistPayload(settings)
			const data = JSON.stringify(payload, null, 2)
			const blob = new Blob([data], {
				type: "application/json;charset=utf-8",
			})
			const url = URL.createObjectURL(blob)
			const a = document.createElement("a")
			a.href = url
			a.download = "auto-ru-settings.json"
			document.body.appendChild(a)
			a.click()
			a.remove()
			URL.revokeObjectURL(url)
			message.success("Экспорт подготовлен")
		} catch (err) {
			console.error("export err", err)
			message.error("Не удалось экспортировать")
		}
	}

	const onFileSelected = async (ev) => {
		const f = ev.target.files?.[0]
		if (!f) return
		try {
			const text = await f.text()
			const parsed = JSON.parse(text)
			if (!parsed || !Array.isArray(parsed.brands)) {
				message.error("Неверный формат файла")
				return
			}
			const normalized = normalizeStoredSettings(parsed)
			if (!normalized) {
				message.error("Неверный формат файла")
				return
			}
			dispatch(setSettings(normalized))
			message.success("Импорт настроек выполнен")
		} catch (err) {
			console.error("import error", err)
			message.error("Ошибка импорта")
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = ""
		}
	}

	const tabItems = [
		{
			key: "city",
			label: (
				<span>
					<EnvironmentOutlined /> Город
				</span>
			),
			children: <CitySettings />,
		},
		{
			key: "years",
			label: (
				<span>
					<CalendarOutlined /> Годы
				</span>
			),
			children: <YearsSettings />,
		},
		{
			key: "brands",
			label: (
				<span>
					<ShopOutlined /> Бренды
				</span>
			),
			children: <BrandSettings />,
		},
	]

	return (
		<Space
			direction="vertical"
			style={{ width: "100%" }}
			size="large"
		>
			<div className="ms-page-hero">
				<Title
					level={2}
					style={{ marginBottom: 8 }}
				>
					Настройки
				</Title>
				<Paragraph
					type="secondary"
					style={{ marginBottom: 0 }}
				>
					Город и годы задают срез для парсинга; бренды и модели ограничивают
					объём сбора.
				</Paragraph>
			</div>

			<Card
				className="ms-toolbar-card"
				title="Сохранение и данные"
				size="small"
			>
				<Space
					direction="vertical"
					style={{ width: "100%" }}
					size="middle"
				>
					{dirty ? (
						<Alert
							type="warning"
							showIcon
							message="Есть несохранённые изменения"
							description="Они видны в форме, но ещё не записаны на диск. Нажмите «Применить и сохранить», иначе после перезапуска приложения останутся прежние значения."
						/>
					) : null}
					<Text type="secondary">
						Ниже настройте вкладки с городом, годами и брендами, затем
						сохраните. Экспорт и импорт переносят JSON между машинами; очистка
						истории не затрагивает избранное.
					</Text>
					<Space
						wrap
						style={{ width: "100%" }}
					>
						<Button
							type="primary"
							icon={<SaveOutlined />}
							onClick={handleSave}
							loading={loading}
							size="large"
						>
							Применить и сохранить
						</Button>
						<Button
							icon={<DownloadOutlined />}
							onClick={handleExport}
						>
							Экспорт настроек
						</Button>
						<Button
							icon={<UploadOutlined />}
							onClick={() => fileInputRef.current?.click()}
						>
							Импорт настроек
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept="application/json"
							style={{ display: "none" }}
							onChange={onFileSelected}
						/>
						<Button
							icon={<ReloadOutlined />}
							onClick={handleReset}
						>
							Сбросить
						</Button>
						{electron?.priceHistorySeedMock ? (
							<Button
								icon={<DatabaseOutlined />}
								onClick={async () => {
									const res = await electron.priceHistorySeedMock()
									if (!res?.ok) {
										message.error(res?.error || "Ошибка заполнения")
										return
									}
									if (res.skipped) {
										message.info(
											"В базе уже есть запуски — демо-данные не добавлены. Очистите историю и повторите.",
										)
									} else {
										message.success(
											`Демо-данные: запусков ${res.runs ?? 0}, строк ${res.offers ?? 0}`,
										)
									}
								}}
							>
								Заполнить тестовыми данными
							</Button>
						) : null}
						{electron?.priceHistoryClear ? (
							<Button
								danger
								icon={<DeleteOutlined />}
								onClick={() => {
									Modal.confirm({
										title: "Очистить историю цен?",
										content: (
											<Text type="secondary">
												Будут удалены все сохранённые запуски и строки из
												локальной базы. Избранное не затрагивается. Действие
												необратимо.
											</Text>
										),
										okText: "Очистить",
										okType: "danger",
										cancelText: "Отмена",
										async onOk() {
											const res = await electron.priceHistoryClear()
											if (res?.ok) message.success("История очищена")
											else message.error(res?.error || "Не удалось очистить")
										},
									})
								}}
							>
								Очистить историю цен
							</Button>
						) : null}
					</Space>
				</Space>
			</Card>

			<Card className="ms-summary-card">
				<Tabs
					items={tabItems}
					defaultActiveKey="city"
				/>
			</Card>

			<Modal
				title="Несохранённые изменения настроек"
				open={blocker.state === "blocked"}
				onCancel={() => blocker.reset?.()}
				footer={[
					<Button
						key="stay"
						onClick={() => blocker.reset?.()}
					>
						Остаться
					</Button>,
					<Button
						key="leave"
						onClick={() => blocker.proceed?.()}
					>
						Уйти без сохранения
					</Button>,
					<Button
						key="save"
						type="primary"
						loading={leaveSaveLoading}
						onClick={handleSaveFromBlocker}
					>
						Сохранить и перейти
					</Button>,
				]}
				maskClosable={false}
				closable={false}
			>
				<Text type="secondary">
					Текущие правки не записаны в файл. Сохраните их, останьтесь на этой
					странице или уйдите — тогда в интерфейсе останутся несохранённые
					значения до следующего запуска приложения.
				</Text>
			</Modal>
		</Space>
	)
}
