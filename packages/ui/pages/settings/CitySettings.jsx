import React, { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { DeleteOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons"
import {
	DEFAULT_CITY_ID,
	isKnownCityId,
	mergeCityOptions,
	normalizeExtraCityEntry,
} from "@market-slice/application/settings/defaults.js"
import { setSettings } from "@market-slice/application/slices/settings.js"
import {
	Button,
	Card,
	Checkbox,
	Col,
	Input,
	List,
	Modal,
	Popconfirm,
	Row,
	Space,
	Tooltip,
	Typography,
	message,
} from "antd"

const { Search } = Input
const { Title, Text } = Typography

export function CitySettings() {
	const dispatch = useDispatch()
	const settings = useSelector((state) => state.settings)

	const [cityModalVisible, setCityModalVisible] = useState(false)
	const [newCityName, setNewCityName] = useState("")
	const [newCityId, setNewCityId] = useState("")
	const [query, setQuery] = useState("")
	const [debouncedQuery, setDebouncedQuery] = useState("")

	useEffect(() => {
		const t = setTimeout(
			() => setDebouncedQuery(query.trim().toLowerCase()),
			250,
		)
		return () => clearTimeout(t)
	}, [query])

	const cityOptions = useMemo(
		() => mergeCityOptions(settings.extraCities ?? []),
		[settings.extraCities],
	)

	const filteredCities = useMemo(() => {
		if (!debouncedQuery) return cityOptions
		return cityOptions.filter((c) => {
			const s = `${c.name} ${c.id}`.toLowerCase()
			return s.includes(debouncedQuery)
		})
	}, [cityOptions, debouncedQuery])

	const generateCitySlug = (name) =>
		String(name || "")
			.trim()
			.toLowerCase()
			.replace(/\s+/g, "_")
			.replace(/[^a-z0-9_-]/g, "")

	useEffect(() => {
		if (!cityModalVisible) return
		setNewCityId(generateCitySlug(newCityName))
	}, [newCityName, cityModalVisible])

	const openCityModal = () => {
		setNewCityName("")
		setNewCityId("")
		setCityModalVisible(true)
	}

	const handleCityModalOk = () => {
		const entry = normalizeExtraCityEntry({
			id: newCityId || generateCitySlug(newCityName),
			name: newCityName,
		})
		if (!entry) {
			message.error("Введите название города")
			return
		}
		if (isKnownCityId(entry.id)) {
			message.error("Такой город уже есть в базовом списке")
			return
		}
		const extra = settings.extraCities ?? []
		if (extra.some((c) => c.id === entry.id)) {
			message.error("Город с таким id уже добавлен")
			return
		}
		dispatch(
			setSettings({
				...settings,
				extraCities: [...extra, entry],
			}),
		)
		setCityModalVisible(false)
		message.success("Город добавлен (не забудьте сохранить настройки)")
	}

	const handleRemoveExtraCity = (cityEntry) => {
		const extra = (settings.extraCities ?? []).filter(
			(c) => c.id !== cityEntry.id,
		)
		const cities = (settings.cities ?? []).filter((id) => id !== cityEntry.id)
		const nextCities =
			cities.length > 0 ? cities : [DEFAULT_CITY_ID]
		const nextCity =
			settings.city === cityEntry.id
				? (nextCities[0] ?? DEFAULT_CITY_ID)
				: settings.city
		dispatch(
			setSettings({
				...settings,
				extraCities: extra,
				city: nextCity,
				cities: nextCities,
			}),
		)
		message.success("Город удалён")
	}

	const parseCityValues = settings.cities?.length
		? settings.cities
		: [settings.city]

	const extraCityIds = useMemo(
		() => new Set((settings.extraCities ?? []).map((c) => c.id)),
		[settings.extraCities],
	)

	const inParseCount = parseCityValues.length

	const applyParseCities = (nextCities) => {
		if (!nextCities.length) {
			message.warning("Нужен хотя бы один город для парсинга")
			return
		}
		const uniq = [...new Set(nextCities.map((id) => String(id).trim()))].filter(
			Boolean,
		)
		if (!uniq.length) {
			message.warning("Нужен хотя бы один город для парсинга")
			return
		}
		const nextCity = uniq.includes(settings.city) ? settings.city : uniq[0]
		dispatch(setSettings({ ...settings, cities: uniq, city: nextCity }))
	}

	const toggleCityInParse = (cityId, checked) => {
		const cur = settings.cities?.length ? [...settings.cities] : [settings.city]
		const next = checked
			? [...new Set([...cur, cityId])]
			: cur.filter((id) => id !== cityId)
		applyParseCities(next)
	}

	return (
		<Space direction="vertical" style={{ width: "100%" }} size="middle">
			<Title level={5}>
				Города для парсинга ({inParseCount} из {cityOptions.length} в очереди)
			</Title>
			<Text type="secondary">
				Отметьте регионы для сбора — парсинг пройдёт по каждому по очереди. Если
				основной город снят с парсинга, первым в очереди станет следующий из
				списка. Свои регионы auto.ru добавляйте по slug из URL; в отчёте и
				истории у строк будет колонка «Город».
			</Text>

			<Row gutter={12} style={{ alignItems: "center" }}>
				<Col flex="auto">
					<Button
						type="dashed"
						icon={<PlusOutlined />}
						onClick={openCityModal}
					>
						Добавить город
					</Button>
				</Col>
				<Col flex="280px">
					<Search
						placeholder="Поиск по имени или id"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						allowClear
						enterButton={<SearchOutlined />}
					/>
				</Col>
			</Row>

			<List
				grid={{ gutter: 8, column: 4 }}
				dataSource={filteredCities}
				locale={{ emptyText: "Нет городов по запросу" }}
				renderItem={(c) => {
					const inParse = parseCityValues.includes(c.id)
					const isExtra = extraCityIds.has(c.id)
					return (
						<List.Item style={{ padding: 0, margin: 0, borderBottom: "none" }}>
							<Card
								size="small"
								bordered
								styles={{
									body: {
										padding: 8,
										display: "flex",
										flexDirection: "column",
										gap: 6,
										minHeight: 48,
									},
								}}
								style={{
									border: inParse
										? "2px solid var(--ant-color-primary)"
										: "1px solid #d9d9d9",
									margin: 4,
									boxSizing: "border-box",
									boxShadow: inParse
										? "0 0 0 2px rgba(22, 119, 255, 0.1)"
										: "0 1px 2px rgba(0, 0, 0, 0.06)",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "flex-start",
										justifyContent: "space-between",
										gap: 8,
									}}
								>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
											}}
										>
											<Checkbox
												checked={inParse}
												onChange={(e) =>
													toggleCityInParse(c.id, e.target.checked)
												}
												style={{ margin: 0, padding: 0 }}
											/>
											<strong>{c.name}</strong>
										</div>
										<Text
											type="secondary"
											style={{ fontSize: 12, display: "block", marginTop: 4 }}
										>
											{c.id}
										</Text>
									</div>
									{isExtra ? (
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: 6,
												flexShrink: 0,
											}}
										>
											<Popconfirm
												title={`Удалить город «${c.name}» из списка и из сохранённых регионов?`}
												onConfirm={() => handleRemoveExtraCity(c)}
												okText="Да"
												cancelText="Нет"
											>
												<Tooltip title="Удалить регион">
													<Button
														size="small"
														danger
														icon={<DeleteOutlined />}
													/>
												</Tooltip>
											</Popconfirm>
										</div>
									) : null}
								</div>
							</Card>
						</List.Item>
					)
				}}
			/>

			<Modal
				title="Добавить город"
				open={cityModalVisible}
				onOk={handleCityModalOk}
				onCancel={() => setCityModalVisible(false)}
				okText="Добавить"
				cancelText="Отмена"
			>
				<Space direction="vertical" style={{ width: "100%" }}>
					<label>Название (для списка)</label>
					<Input
						value={newCityName}
						onChange={(e) => setNewCityName(e.target.value)}
						placeholder="Например: Владивосток"
					/>
					<label>
						ID региона (slug в URL auto.ru; можно править вручную)
					</label>
					<Input
						value={newCityId}
						onChange={(e) => setNewCityId(e.target.value)}
						placeholder="например: vladivostok"
					/>
				</Space>
			</Modal>
		</Space>
	)
}
