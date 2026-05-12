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
import { setSettings } from "@market-slice/application/slices/settings.js"
import {
	Button,
	Card,
	Checkbox,
	Col,
	Divider,
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
		const cities = (settings.cities ?? []).filter((id) => id !== cityEntry.id)
		const nextCities =
			cities.length > 0 ? cities : [nextCity].filter(Boolean)
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

	const handleSelectCity = (cityId) => {
		const cur = settings.cities ?? [settings.city]
		const nextCities = cur.includes(cityId) ? cur : [...cur, cityId]
		dispatch(
			setSettings({
				...settings,
				city: cityId,
				cities: nextCities.length ? nextCities : [cityId],
			}),
		)
	}

	const parseCityValues = settings.cities?.length
		? settings.cities
		: [settings.city]

	const onParseCitiesChange = (ids) => {
		if (!ids.length) {
			message.warning("Нужен хотя бы один город для парсинга")
			return
		}
		dispatch(setSettings({ ...settings, cities: ids }))
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

			<Divider style={{ margin: "12px 0" }} />

			<Title level={5}>Города для парсинга</Title>
			<Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
				Отметьте один или несколько регионов — сбор пройдёт по каждому по
				очереди. В отчёте и истории у строк будет колонка «Город».
			</Text>
			<Checkbox.Group
				style={{ width: "100%" }}
				value={parseCityValues}
				onChange={onParseCitiesChange}
			>
				<Row gutter={[8, 8]}>
					{cityOptions.map((c) => (
						<Col key={c.id}>
							<Checkbox value={c.id}>{c.name}</Checkbox>
						</Col>
					))}
				</Row>
			</Checkbox.Group>

			<Divider style={{ margin: "12px 0" }} />

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
