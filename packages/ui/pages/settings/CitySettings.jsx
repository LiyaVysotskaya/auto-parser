import React, { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
	CheckCircleFilled,
	DeleteOutlined,
	PlusOutlined,
	SearchOutlined,
} from "@ant-design/icons"
import {
	DEFAULT_CITY_ID,
	isKnownCityId,
	mergeCityOptions,
	normalizeExtraCityEntry,
} from "@market-slice/application/settings/defaults.js"
import {
	setSettings,
	updateCity,
} from "@market-slice/application/slices/settings.js"
import {
	Button,
	Card,
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
		const nextCity =
			settings.city === cityEntry.id ? DEFAULT_CITY_ID : settings.city
		dispatch(
			setSettings({
				...settings,
				extraCities: extra,
				city: nextCity,
			}),
		)
		message.success("Город удалён")
	}

	const handleSelectCity = (cityId) => {
		dispatch(updateCity(cityId))
	}

	return (
		<Space direction="vertical" style={{ width: "100%" }} size="middle">
			<Title level={5}>Город для парсинга</Title>
			<Text type="secondary">
				Выберите город, откуда будут собираться предложения. Активный город
				подсвечен. Можно добавлять свои регионы auto.ru по slug из URL.
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
				renderItem={(city) => {
					const isActive = settings.city === city.id
					const isBuiltin = isKnownCityId(city.id)
					return (
						<List.Item
							style={{ padding: 0, margin: 0, borderBottom: "none" }}
						>
							<Card
								size="small"
								bordered
								hoverable
								onClick={() => handleSelectCity(city.id)}
								styles={{
									body: {
										padding: 12,
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 8,
										minHeight: 48,
										cursor: "pointer",
									},
								}}
								style={{
									border: isActive
										? "2px solid var(--ant-color-primary)"
										: "1px solid #d9d9d9",
									margin: 4,
									boxSizing: "border-box",
									boxShadow: isActive
										? "0 0 0 2px rgba(22, 119, 255, 0.1)"
										: "0 1px 2px rgba(0, 0, 0, 0.06)",
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
										{isActive && (
											<CheckCircleFilled
												style={{ color: "var(--ant-color-primary)" }}
											/>
										)}
										<strong>{city.name}</strong>
									</div>
									<Text
										type="secondary"
										style={{ fontSize: 11, display: "block", marginTop: 2 }}
									>
										{city.id}
										{isBuiltin ? "" : " (свой)"}
									</Text>
								</div>
								{!isBuiltin && (
									<Popconfirm
										title={`Удалить город «${city.name}»?`}
										onConfirm={(e) => {
											e?.stopPropagation()
											handleRemoveExtraCity(city)
										}}
										onCancel={(e) => e?.stopPropagation()}
										okText="Да"
										cancelText="Нет"
									>
										<Tooltip title="Удалить">
											<Button
												size="small"
												danger
												icon={<DeleteOutlined />}
												onClick={(e) => e.stopPropagation()}
											/>
										</Tooltip>
									</Popconfirm>
								)}
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
