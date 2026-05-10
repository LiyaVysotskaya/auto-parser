import React, { useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
	CloseCircleOutlined,
	DeleteOutlined,
	DownloadOutlined,
	EditOutlined,
	PlusOutlined,
	ReloadOutlined,
	SaveOutlined,
	SearchOutlined,
	SelectOutlined,
	UploadOutlined,
} from "@ant-design/icons"
import {
	DEFAULT_CITY_ID,
	isKnownCityId,
	mergeCityOptions,
	normalizeExtraCityEntry,
} from "@market-slice/application/settings/defaults.js"
import { normalizeStoredSettings } from "@market-slice/application/settings/normalize.js"
import {
	reset,
	setSettings,
	toggleBrand,
	updateCity,
	updateYears,
} from "@market-slice/application/slices/settings.js"
import {
	Alert,
	Button,
	Card,
	Checkbox,
	Col,
	Divider,
	Input,
	InputNumber,
	List,
	Modal,
	Popconfirm,
	Row,
	Select,
	Space,
	Tooltip,
	Typography,
	message,
} from "antd"

import { electron } from "../../electron.js"

const { Search } = Input
const { Title, Text } = Typography

export function Settings() {
	const dispatch = useDispatch()
	const settings = useSelector((state) => state.settings)
	const [loading, setLoading] = useState(false)
	const [isModalVisible, setIsModalVisible] = useState(false)
	const [editingBrand, setEditingBrand] = useState(null)
	const [brandName, setBrandName] = useState("")
	const [brandId, setBrandId] = useState("")
	const [brandSelected, setBrandSelected] = useState(true)

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

	const fileInputRef = useRef(null)

	const handleBrandToggle = (brandId) => {
		dispatch(toggleBrand(brandId))
	}

	const handleYearsChange = (field, value) => {
		dispatch(updateYears({ ...settings.years, [field]: value }))
	}

	const handleSave = async () => {
		setLoading(true)
		try {
			const payload = {
				brands: settings.brands,
				years: settings.years,
				city: settings.city,
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

	const openAddModal = () => {
		setEditingBrand(null)
		setBrandName("")
		setBrandId("")
		setBrandSelected(true)
		setIsModalVisible(true)
	}

	const openEditModal = (brand) => {
		setEditingBrand(brand)
		setBrandName(brand.name)
		setBrandId(brand.id)
		setBrandSelected(Boolean(brand.selected))
		setIsModalVisible(true)
	}

	const generateId = (name) =>
		String(name || "")
			.trim()
			.toLowerCase()
			.replace(/\s+/g, "-")
			.replace(/[^a-z0-9\-]/g, "")

	useEffect(() => {
		if (!editingBrand) setBrandId(generateId(brandName))
	}, [brandName, editingBrand])

	const handleModalOk = () => {
		const id = String(brandId).trim()
		const name = String(brandName).trim()
		if (!id || !name) {
			message.error("Введите корректные имя и id бренда")
			return
		}

		const exists = settings.brands.some(
			(b) => b.id === id && b !== editingBrand,
		)
		if (exists) {
			message.error("Бренд с таким id уже существует")
			return
		}

		let newBrands = [...settings.brands]
		if (editingBrand) {
			newBrands = newBrands.map((b) =>
				b === editingBrand ? { id, name, selected: Boolean(brandSelected) } : b,
			)
		} else {
			newBrands.push({ id, name, selected: Boolean(brandSelected) })
		}

		dispatch(setSettings({ ...settings, brands: newBrands }))
		setIsModalVisible(false)
		message.success(editingBrand ? "Бренд отредактирован" : "Бренд добавлен")
	}

	const handleDelete = (brand) => {
		const newBrands = settings.brands.filter((b) => b.id !== brand.id)
		dispatch(setSettings({ ...settings, brands: newBrands }))
		message.success("Бренд удалён")
	}

	const selectAll = () => {
		const newBrands = settings.brands.map((b) => ({ ...b, selected: true }))
		dispatch(setSettings({ ...settings, brands: newBrands }))
	}
	const deselectAll = () => {
		const newBrands = settings.brands.map((b) => ({ ...b, selected: false }))
		dispatch(setSettings({ ...settings, brands: newBrands }))
	}

	const handleExport = () => {
		try {
			const payload = {
				brands: settings.brands,
				years: settings.years,
				city: settings.city,
				extraCities: settings.extraCities ?? [],
			}
			const data = JSON.stringify(payload, null, 2)
			const blob = new Blob([data], { type: "application/json;charset=utf-8" })
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

	const filteredBrands = useMemo(() => {
		if (!debouncedQuery) return settings.brands
		return (settings.brands || []).filter((b) => {
			const s = `${b.name} ${b.id}`.toLowerCase()
			return s.includes(debouncedQuery)
		})
	}, [settings.brands, debouncedQuery])

	const selectedCount = (settings.brands || []).filter((b) => b.selected).length

	const cityOptions = useMemo(
		() => mergeCityOptions(settings.extraCities ?? []),
		[settings.extraCities],
	)

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

	return (
		<Space
			direction="vertical"
			style={{ width: "100%" }}
			size="large"
		>
			<Card>
				<Space
					direction="vertical"
					style={{ width: "100%" }}
					size="middle"
				>
					<Title level={4}>Город для парсинга</Title>
					<Text type="secondary">
						Выберите город, откуда будут собираться предложения.
					</Text>
					<Select
						showSearch
						optionFilterProp="label"
						style={{ width: "100%", maxWidth: 480 }}
						placeholder="Выберите город"
						value={settings.city}
						onChange={(value) => dispatch(updateCity(value))}
						options={cityOptions.map((c) => ({
							value: c.id,
							label: c.name,
						}))}
					/>

					<Title level={5}>Свои города</Title>
					<Text type="secondary">
						Добавьте регион auto.ru по slug из URL (например{" "}
						<code>voronezh</code> из <code>auto.ru/voronezh/cars/...</code>).
						Встроенные города удалять нельзя.
					</Text>
					<Space
						wrap
						style={{ marginBottom: 8 }}
					>
						<Button
							type="dashed"
							icon={<PlusOutlined />}
							onClick={openCityModal}
						>
							Добавить город
						</Button>
					</Space>
					<List
						size="small"
						dataSource={settings.extraCities ?? []}
						locale={{ emptyText: "Нет пользовательских городов" }}
						renderItem={(c) => (
							<List.Item
								actions={[
									<Popconfirm
										key="del"
										title={`Удалить город «${c.name}»?`}
										onConfirm={() => handleRemoveExtraCity(c)}
										okText="Да"
										cancelText="Нет"
									>
										<Button
											size="small"
											danger
											type="link"
											icon={<DeleteOutlined />}
										/>
									</Popconfirm>,
								]}
							>
								<strong>{c.name}</strong>{" "}
								<span style={{ color: "#888", fontSize: 12 }}>{c.id}</span>
							</List.Item>
						)}
					/>

					<Title level={4}>Диапазон годов выпуска</Title>
					<Row gutter={16}>
						<Col span={12}>
							<label>Год от: </label>
							<InputNumber
								min={2000}
								max={2030}
								value={settings.years.from}
								onChange={(value) => handleYearsChange("from", value)}
								style={{ width: "100%", marginTop: "8px" }}
							/>
						</Col>
						<Col span={12}>
							<label>Год до: </label>
							<InputNumber
								min={2000}
								max={2030}
								value={settings.years.to}
								onChange={(value) => handleYearsChange("to", value)}
								style={{ width: "100%", marginTop: "8px" }}
							/>
						</Col>
					</Row>

					<Title level={4}>
						Бренды для парсинга ({selectedCount} из {settings.brands.length}{" "}
						выбрано)
					</Title>

					<Row
						gutter={12}
						style={{ alignItems: "center" }}
					>
						<Col flex="auto">
							<Space wrap>
								<Button
									icon={<SelectOutlined />}
									onClick={selectAll}
								>
									Выбрать всё
								</Button>
								<Button
									icon={<CloseCircleOutlined />}
									onClick={deselectAll}
								>
									Снять выбор
								</Button>
								<Button
									icon={<DownloadOutlined />}
									onClick={handleExport}
								>
									Экспорт
								</Button>
								<Button
									icon={<UploadOutlined />}
									onClick={() =>
										fileInputRef.current && fileInputRef.current.click()
									}
								>
									Импорт
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
							</Space>
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
						dataSource={filteredBrands}
						locale={{ emptyText: "Нет брендов по запросу" }}
						renderItem={(brand) => (
							<List.Item
								style={{ padding: 0, margin: 0, borderBottom: "none" }}
							>
								<Card
									size="small"
									bordered={true}
									bodyStyle={{
										padding: 8,
										display: "flex",
										alignItems: "center",
										gap: 8,
										minHeight: 48,
									}}
									style={{
										border: brand.selected
											? "2px solid #1890ff"
											: "1px solid #d9d9d9",
										margin: 4,
										boxSizing: "border-box",
									}}
								>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												gap: 8,
											}}
										>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
												}}
											>
												<Checkbox
													checked={brand.selected}
													onChange={() => handleBrandToggle(brand.id)}
													style={{ margin: 0, padding: 0 }}
												/>

												<strong style={{ display: "block" }}>
													{brand.name}
												</strong>
												<span style={{ color: "#888", fontSize: 12 }}>
													{brand.id}
												</span>
											</div>
										</div>
									</div>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 6,
											marginRight: 8,
										}}
									>
										<Tooltip title="Редактировать">
											<Button
												size="small"
												icon={<EditOutlined />}
												onClick={() => openEditModal(brand)}
											/>
										</Tooltip>
										<Popconfirm
											title={`Удалить бренд ${brand.name}?`}
											onConfirm={() => handleDelete(brand)}
											okText="Да"
											cancelText="Нет"
										>
											<Tooltip title="Удалить">
												<Button
													size="small"
													danger
													icon={<DeleteOutlined />}
												/>
											</Tooltip>
										</Popconfirm>
									</div>
								</Card>
							</List.Item>
						)}
					/>
				</Space>
			</Card>

			<Space style={{ width: "100%", justifyContent: "flex-start" }}>
				<Button
					icon={<PlusOutlined />}
					onClick={openAddModal}
				>
					Добавить бренд
				</Button>
				<Button
					type="primary"
					icon={<SaveOutlined />}
					onClick={handleSave}
					loading={loading}
				>
					Применить и сохранить
				</Button>
			</Space>

			<Modal
				title="Добавить город"
				open={cityModalVisible}
				onOk={handleCityModalOk}
				onCancel={() => setCityModalVisible(false)}
				okText="Добавить"
				cancelText="Отмена"
			>
				<Space
					direction="vertical"
					style={{ width: "100%" }}
				>
					<label>Название (для списка)</label>
					<Input
						value={newCityName}
						onChange={(e) => setNewCityName(e.target.value)}
						placeholder="Например: Владивосток"
					/>
					<label>ID региона (slug в URL auto.ru; можно править вручную)</label>
					<Input
						value={newCityId}
						onChange={(e) => setNewCityId(e.target.value)}
						placeholder="например: vladivostok"
					/>
				</Space>
			</Modal>

			<Modal
				title={editingBrand ? "Редактирование бренда" : "Добавить бренд"}
				visible={isModalVisible}
				onOk={handleModalOk}
				onCancel={() => setIsModalVisible(false)}
				okText="Сохранить"
				cancelText="Отмена"
			>
				<Space
					direction="vertical"
					style={{ width: "100%" }}
				>
					<label>Название (для отображения)</label>
					<Input
						value={brandName}
						onChange={(e) => setBrandName(e.target.value)}
						placeholder="Например: Geely"
					/>
					<label>
						ID (используется в URL; автоматически генерируется, можно изменить)
					</label>
					<Input
						value={brandId}
						onChange={(e) => setBrandId(e.target.value)}
						placeholder="например: geely"
					/>
					<Checkbox
						checked={brandSelected}
						onChange={(e) => setBrandSelected(e.target.checked)}
					>
						Выбран для парсинга
					</Checkbox>
				</Space>
			</Modal>
		</Space>
	)
}
