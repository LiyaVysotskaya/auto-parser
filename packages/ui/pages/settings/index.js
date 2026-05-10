import React, { useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
	CalendarOutlined,
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
import { Button, Card, Modal, Space, Tabs, Typography, message } from "antd"

import { electron } from "../../electron.js"
import { BrandSettings } from "./BrandSettings.jsx"
import { CitySettings } from "./CitySettings.jsx"
import { YearsSettings } from "./YearsSettings.jsx"

const { Text } = Typography

export function Settings() {
	const dispatch = useDispatch()
	const settings = useSelector((state) => state.settings)
	const [loading, setLoading] = useState(false)
	const fileInputRef = useRef(null)

	const handleSave = async () => {
		setLoading(true)
		try {
			const payload = {
				brands: settings.brands,
				years: settings.years,
				city: settings.city,
				cities: settings.cities?.length ? settings.cities : [settings.city],
				extraCities: settings.extraCities ?? [],
			}
			if (electron?.saveSettings) {
				const ok = await electron.saveSettings(payload)
				if (ok) {
					message.success("Настройки успешно сохранены!")
					dispatch(setSettings(payload))
				} else {
					message.error("Ошибка при сохранении настроек")
				}
			} else {
				localStorage.setItem("autoRuSettings", JSON.stringify(payload))
				dispatch(setSettings(payload))
				message.success("Настройки сохранены в localStorage (fallback)")
			}
		} catch (error) {
			console.error("Ошибка сохранения:", error)
			message.error("Ошибка при сохранении настроек")
		} finally {
			setLoading(false)
		}
	}

	const handleReset = () => {
		dispatch(reset())
		message.info("Настройки сброшены к значениям по умолчанию")
	}

	const handleExport = () => {
		try {
			const payload = {
				brands: settings.brands,
				years: settings.years,
				city: settings.city,
				cities: settings.cities?.length ? settings.cities : [settings.city],
				extraCities: settings.extraCities ?? [],
			}
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
			<Card>
				<Tabs
					items={tabItems}
					defaultActiveKey="city"
				/>
			</Card>

			<Space
				style={{ width: "100%", justifyContent: "flex-start" }}
				wrap
			>
				<Button
					type="primary"
					icon={<SaveOutlined />}
					onClick={handleSave}
					loading={loading}
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
				{electron?.priceHistoryClear ? (
					<Button
						danger
						icon={<DeleteOutlined />}
						onClick={() => {
							Modal.confirm({
								title: "Очистить историю цен?",
								content: (
									<Text type="secondary">
										Будут удалены все сохранённые запуски и строки из локальной
										базы. Избранное не затрагивается. Действие необратимо.
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
	)
}
