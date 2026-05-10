import React, { useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
	CloseCircleOutlined,
	CloudDownloadOutlined,
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
	Button,
	Card,
	Checkbox,
	Col,
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

	const [catalogBrandsOpen, setCatalogBrandsOpen] = useState(false)
	const [catalogBrandsLoading, setCatalogBrandsLoading] = useState(false)
	const [catalogBrandsItems, setCatalogBrandsItems] = useState([])
	const [catalogBrandsQuery, setCatalogBrandsQuery] = useState("")
	const [catalogBrandsPick, setCatalogBrandsPick] = useState(() => new Set())

	const [catalogModelsOpen, setCatalogModelsOpen] = useState(false)
	const [catalogModelsLoading, setCatalogModelsLoading] = useState(false)
	const [catalogModelsBrandId, setCatalogModelsBrandId] = useState("")
	const [catalogModelsItems, setCatalogModelsItems] = useState([])
	const [catalogModelsQuery, setCatalogModelsQuery] = useState("")
	const [catalogModelsPick, setCatalogModelsPick] = useState(() => new Set())

	const [modelsPanelBrandId, setModelsPanelBrandId] = useState(null)

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
				b === editingBrand
					? {
							id,
							name,
							selected: Boolean(brandSelected),
							models: Array.isArray(b.models) ? b.models : [],
						}
					: b,
			)
		} else {
			newBrands.push({
				id,
				name,
				selected: Boolean(brandSelected),
				models: [],
			})
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

	const filteredCatalogBrands = useMemo(() => {
		const q = catalogBrandsQuery.trim().toLowerCase()
		if (!q) return catalogBrandsItems
		return catalogBrandsItems.filter(
			(it) =>
				String(it.name || "")
					.toLowerCase()
					.includes(q) ||
				String(it.id || "")
					.toLowerCase()
					.includes(q),
		)
	}, [catalogBrandsItems, catalogBrandsQuery])

	const filteredCatalogModels = useMemo(() => {
		const q = catalogModelsQuery.trim().toLowerCase()
		if (!q) return catalogModelsItems
		return catalogModelsItems.filter(
			(it) =>
				String(it.name || "")
					.toLowerCase()
					.includes(q) ||
				String(it.id || "")
					.toLowerCase()
					.includes(q),
		)
	}, [catalogModelsItems, catalogModelsQuery])

	const openCatalogBrandsModal = async () => {
		if (!electron?.fetchBrandsFromAutoRu) {
			message.warning("Загрузка каталога доступна только в приложении Electron")
			return
		}
		setCatalogBrandsOpen(true)
		setCatalogBrandsQuery("")
		setCatalogBrandsPick(new Set())
		setCatalogBrandsItems([])
		setCatalogBrandsLoading(true)
		try {
			const res = await electron.fetchBrandsFromAutoRu()
			const items = Array.isArray(res?.items) ? res.items : []
			setCatalogBrandsItems(items)
			if (!res?.ok) {
				message.warning(
					res?.error
						? `Не удалось загрузить каталог: ${res.error}. Показан запасной список.`
						: "Показан запасной список брендов.",
				)
			}
		} catch (e) {
			console.error(e)
			message.error("Ошибка загрузки брендов с auto.ru")
		} finally {
			setCatalogBrandsLoading(false)
		}
	}

	const toggleCatalogBrandPick = (id) => {
		setCatalogBrandsPick((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const applyCatalogBrands = () => {
		const picked = catalogBrandsItems.filter((it) =>
			catalogBrandsPick.has(it.id),
		)
		if (!picked.length) {
			message.info("Выберите хотя бы один бренд")
			return
		}
		const existingIds = new Set((settings.brands || []).map((b) => b.id))
		let newBrands = [...(settings.brands || [])]
		for (const it of picked) {
			if (existingIds.has(it.id)) continue
			existingIds.add(it.id)
			newBrands.push({
				id: it.id,
				name: it.name || it.id,
				selected: true,
				models: [],
			})
		}
		dispatch(setSettings({ ...settings, brands: newBrands }))
		setCatalogBrandsOpen(false)
		message.success("Бренды добавлены (не забудьте сохранить настройки)")
	}

	const openCatalogModelsModal = async (brand) => {
		const bid = brand?.id
		if (!bid) return
		if (!electron?.fetchModelsFromAutoRu) {
			message.warning("Загрузка моделей доступна только в приложении Electron")
			return
		}
		setCatalogModelsBrandId(bid)
		setCatalogModelsOpen(true)
		setCatalogModelsQuery("")
		setCatalogModelsPick(new Set())
		setCatalogModelsItems([])
		setCatalogModelsLoading(true)
		try {
			const res = await electron.fetchModelsFromAutoRu(bid)
			const items = Array.isArray(res?.items) ? res.items : []
			setCatalogModelsItems(items)
			if (!res?.ok) {
				message.warning(
					res?.error
						? `Не удалось загрузить модели: ${res.error}`
						: "Не удалось загрузить модели.",
				)
			}
		} catch (e) {
			console.error(e)
			message.error("Ошибка загрузки моделей с auto.ru")
		} finally {
			setCatalogModelsLoading(false)
		}
	}

	const toggleCatalogModelPick = (id) => {
		setCatalogModelsPick((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const applyCatalogModels = () => {
		const bid = catalogModelsBrandId
		const picked = catalogModelsItems.filter((it) =>
			catalogModelsPick.has(it.id),
		)
		if (!picked.length) {
			message.info("Выберите хотя бы одну модель")
			return
		}
		const newBrands = (settings.brands || []).map((b) => {
			if (b.id !== bid) return b
			const byId = new Map((b.models || []).map((m) => [m.id, m]))
			for (const p of picked) {
				byId.set(p.id, { id: p.id, name: p.name || p.id })
			}
			return { ...b, models: [...byId.values()] }
		})
		dispatch(setSettings({ ...settings, brands: newBrands }))
		setCatalogModelsOpen(false)
		message.success("Модели добавлены к бренду")
	}

	const removeModelFromBrand = (brandId, modelId) => {
		const newBrands = (settings.brands || []).map((b) => {
			if (b.id !== brandId) return b
			return {
				...b,
				models: (b.models || []).filter((m) => m.id !== modelId),
			}
		})
		dispatch(setSettings({ ...settings, brands: newBrands }))
	}

	const clearBrandModels = (brandId) => {
		const newBrands = (settings.brands || []).map((b) =>
			b.id === brandId ? { ...b, models: [] } : b,
		)
		dispatch(setSettings({ ...settings, brands: newBrands }))
		message.success("Список моделей очищен")
	}

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
						renderItem={(brand) => {
							const modelCount = (brand.models || []).length
							return (
								<List.Item
									style={{ padding: 0, margin: 0, borderBottom: "none" }}
								>
									<Card
										size="small"
										bordered={true}
										bodyStyle={{
											padding: 8,
											display: "flex",
											flexDirection: "column",
											gap: 6,
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
												<Text
													type="secondary"
													style={{
														fontSize: 11,
														display: "block",
														marginTop: 4,
													}}
												>
													{modelCount
														? `Моделей в фильтре: ${modelCount}`
														: "Все модели бренда"}
												</Text>
											</div>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 6,
													flexShrink: 0,
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
										</div>
										<Space
											wrap
											size={4}
										>
											<Button
												size="small"
												type="link"
												style={{ padding: 0, height: "auto" }}
												onClick={() =>
													setModelsPanelBrandId((cur) =>
														cur === brand.id ? null : brand.id,
													)
												}
											>
												{modelsPanelBrandId === brand.id
													? "Скрыть модели"
													: "Модели…"}
											</Button>
										</Space>
										{modelsPanelBrandId === brand.id ? (
											<div
												style={{
													borderTop: "1px solid #f0f0f0",
													paddingTop: 6,
												}}
											>
												<Space
													direction="vertical"
													style={{ width: "100%" }}
													size={6}
												>
													{(brand.models || []).length ? (
														<List
															size="small"
															dataSource={brand.models || []}
															locale={{ emptyText: "Нет моделей" }}
															renderItem={(m) => (
																<List.Item
																	style={{ padding: "4px 0" }}
																	actions={[
																		<Button
																			key="rm"
																			size="small"
																			type="link"
																			danger
																			onClick={() =>
																				removeModelFromBrand(brand.id, m.id)
																			}
																		>
																			Убрать
																		</Button>,
																	]}
																>
																	<span>{m.name}</span>{" "}
																	<span style={{ color: "#888", fontSize: 11 }}>
																		{m.id}
																	</span>
																</List.Item>
															)}
														/>
													) : (
														<Text type="secondary">
															Список пуст — парсятся все модели
														</Text>
													)}
													<Space wrap>
														<Button
															size="small"
															icon={<CloudDownloadOutlined />}
															onClick={() => openCatalogModelsModal(brand)}
														>
															Загрузить с auto.ru
														</Button>
														{modelCount ? (
															<Popconfirm
																title="Очистить список моделей для этого бренда?"
																onConfirm={() => clearBrandModels(brand.id)}
																okText="Да"
																cancelText="Нет"
															>
																<Button size="small">Очистить фильтр</Button>
															</Popconfirm>
														) : null}
													</Space>
												</Space>
											</div>
										) : null}
									</Card>
								</List.Item>
							)
						}}
					/>
				</Space>
			</Card>

			<Space
				style={{ width: "100%", justifyContent: "flex-start" }}
				wrap
			>
				<Button
					icon={<PlusOutlined />}
					onClick={openAddModal}
				>
					Добавить бренд
				</Button>
				<Button
					icon={<CloudDownloadOutlined />}
					onClick={openCatalogBrandsModal}
				>
					Загрузить бренды с auto.ru
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
				title="Бренды с auto.ru"
				open={catalogBrandsOpen}
				onCancel={() => setCatalogBrandsOpen(false)}
				width={720}
				footer={[
					<Button
						key="close"
						onClick={() => setCatalogBrandsOpen(false)}
					>
						Закрыть
					</Button>,
					<Button
						key="add"
						type="primary"
						loading={catalogBrandsLoading}
						onClick={applyCatalogBrands}
					>
						Добавить выбранные
					</Button>,
				]}
			>
				<Space
					direction="vertical"
					style={{ width: "100%" }}
					size="middle"
				>
					<Search
						placeholder="Поиск по названию или id"
						value={catalogBrandsQuery}
						onChange={(e) => setCatalogBrandsQuery(e.target.value)}
						allowClear
					/>
					{catalogBrandsLoading && !catalogBrandsItems.length ? (
						<Text type="secondary">Загрузка…</Text>
					) : null}
					<div style={{ maxHeight: 420, overflow: "auto" }}>
						<List
							size="small"
							dataSource={filteredCatalogBrands}
							locale={{
								emptyText:
									"Нет данных — попробуйте позже или добавьте бренд вручную",
							}}
							renderItem={(it) => (
								<List.Item style={{ padding: "6px 0" }}>
									<Checkbox
										checked={catalogBrandsPick.has(it.id)}
										onChange={() => toggleCatalogBrandPick(it.id)}
									>
										<strong>{it.name}</strong>{" "}
										<span style={{ color: "#888", fontSize: 12 }}>{it.id}</span>
									</Checkbox>
								</List.Item>
							)}
						/>
					</div>
				</Space>
			</Modal>

			<Modal
				title={`Модели: ${catalogModelsBrandId}`}
				open={catalogModelsOpen}
				onCancel={() => setCatalogModelsOpen(false)}
				width={640}
				footer={[
					<Button
						key="c"
						onClick={() => setCatalogModelsOpen(false)}
					>
						Отмена
					</Button>,
					<Button
						key="ok"
						type="primary"
						loading={catalogModelsLoading}
						onClick={applyCatalogModels}
					>
						Добавить выбранные к бренду
					</Button>,
				]}
			>
				<Space
					direction="vertical"
					style={{ width: "100%" }}
					size="middle"
				>
					<Search
						placeholder="Поиск по названию или id"
						value={catalogModelsQuery}
						onChange={(e) => setCatalogModelsQuery(e.target.value)}
						allowClear
					/>
					{catalogModelsLoading && !catalogModelsItems.length ? (
						<Text type="secondary">Загрузка…</Text>
					) : null}
					<div style={{ maxHeight: 400, overflow: "auto" }}>
						<List
							size="small"
							dataSource={filteredCatalogModels}
							locale={{
								emptyText: "Модели не найдены — проверьте город и id бренда",
							}}
							renderItem={(it) => (
								<List.Item style={{ padding: "6px 0" }}>
									<Checkbox
										checked={catalogModelsPick.has(it.id)}
										onChange={() => toggleCatalogModelPick(it.id)}
									>
										<strong>{it.name}</strong>{" "}
										<span style={{ color: "#888", fontSize: 12 }}>{it.id}</span>
									</Checkbox>
								</List.Item>
							)}
						/>
					</div>
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
