import React, { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
	CloudDownloadOutlined,
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	SearchOutlined,
	SelectOutlined,
	CloseCircleOutlined,
} from "@ant-design/icons"
import {
	setSettings,
	toggleBrand,
} from "@market-slice/application/slices/settings.js"
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

import { useCatalogBrands } from "../../hooks/useCatalogBrands.js"
import { useCatalogModels } from "../../hooks/useCatalogModels.js"

const { Search } = Input
const { Title, Text } = Typography

export function BrandSettings() {
	const dispatch = useDispatch()
	const settings = useSelector((state) => state.settings)

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingBrand, setEditingBrand] = useState(null)
	const [brandName, setBrandName] = useState("")
	const [brandId, setBrandId] = useState("")
	const [brandSelected, setBrandSelected] = useState(true)

	const [modelsPanelBrandId, setModelsPanelBrandId] = useState(null)

	const [query, setQuery] = useState("")
	const [debouncedQuery, setDebouncedQuery] = useState("")
	useEffect(() => {
		const t = setTimeout(
			() => setDebouncedQuery(query.trim().toLowerCase()),
			250,
		)
		return () => clearTimeout(t)
	}, [query])

	const catalogBrands = useCatalogBrands()
	const catalogModels = useCatalogModels()

	const generateId = (name) =>
		String(name || "")
			.trim()
			.toLowerCase()
			.replace(/\s+/g, "-")
			.replace(/[^a-z0-9\-]/g, "")

	useEffect(() => {
		if (!editingBrand) setBrandId(generateId(brandName))
	}, [brandName, editingBrand])

	const handleBrandToggle = (id) => {
		dispatch(toggleBrand(id))
	}

	const openAddModal = () => {
		setEditingBrand(null)
		setBrandName("")
		setBrandId("")
		setBrandSelected(true)
		setIsModalOpen(true)
	}

	const openEditModal = (brand) => {
		setEditingBrand(brand)
		setBrandName(brand.name)
		setBrandId(brand.id)
		setBrandSelected(Boolean(brand.selected))
		setIsModalOpen(true)
	}

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
			newBrands.push({ id, name, selected: Boolean(brandSelected), models: [] })
		}

		dispatch(setSettings({ ...settings, brands: newBrands }))
		setIsModalOpen(false)
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

	const applyCatalogBrands = () => {
		const picked = catalogBrands.items.filter((it) =>
			catalogBrands.picked.has(it.id),
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
		catalogBrands.closeModal()
		message.success("Бренды добавлены (не забудьте сохранить настройки)")
	}

	const applyCatalogModels = () => {
		const bid = catalogModels.brandId
		const picked = catalogModels.items.filter((it) =>
			catalogModels.picked.has(it.id),
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
		catalogModels.closeModal()
		message.success("Модели добавлены к бренду")
	}

	const removeModelFromBrand = (bId, modelId) => {
		const newBrands = (settings.brands || []).map((b) => {
			if (b.id !== bId) return b
			return { ...b, models: (b.models || []).filter((m) => m.id !== modelId) }
		})
		dispatch(setSettings({ ...settings, brands: newBrands }))
	}

	const clearBrandModels = (bId) => {
		const newBrands = (settings.brands || []).map((b) =>
			b.id === bId ? { ...b, models: [] } : b,
		)
		dispatch(setSettings({ ...settings, brands: newBrands }))
		message.success("Список моделей очищен")
	}

	const selectedCount = (settings.brands || []).filter(
		(b) => b.selected,
	).length

	const filteredBrands = useMemo(() => {
		if (!debouncedQuery) return settings.brands
		return (settings.brands || []).filter((b) => {
			const s = `${b.name} ${b.id}`.toLowerCase()
			return s.includes(debouncedQuery)
		})
	}, [settings.brands, debouncedQuery])

	return (
		<Space direction="vertical" style={{ width: "100%" }} size="middle">
			<Title level={5}>
				Бренды для парсинга ({selectedCount} из {settings.brands.length}{" "}
				выбрано)
			</Title>

			<Row gutter={12} style={{ alignItems: "center" }}>
				<Col flex="auto">
					<Space wrap>
						<Button icon={<SelectOutlined />} onClick={selectAll}>
							Выбрать всё
						</Button>
						<Button icon={<CloseCircleOutlined />} onClick={deselectAll}>
							Снять выбор
						</Button>
						<Button icon={<PlusOutlined />} onClick={openAddModal}>
							Добавить бренд
						</Button>
						<Button
							icon={<CloudDownloadOutlined />}
							onClick={catalogBrands.openModal}
						>
							Загрузить с auto.ru
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
									border: brand.selected
										? "2px solid var(--ant-color-primary)"
										: "1px solid #d9d9d9",
									margin: 4,
									boxSizing: "border-box",
									boxShadow: brand.selected
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
												checked={brand.selected}
												onChange={() => handleBrandToggle(brand.id)}
												style={{ margin: 0, padding: 0 }}
											/>
											<strong>{brand.name}</strong>
											<Text type="secondary" style={{ fontSize: 12 }}>
												{brand.id}
											</Text>
										</div>
										<Text
											type="secondary"
											style={{ fontSize: 11, display: "block", marginTop: 4 }}
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
												<Button size="small" danger icon={<DeleteOutlined />} />
											</Tooltip>
										</Popconfirm>
									</div>
								</div>
								<Button
									size="small"
									type="link"
									style={{ padding: 0, height: "auto", alignSelf: "flex-start" }}
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
								{modelsPanelBrandId === brand.id && (
									<div
										style={{
											borderTop: "1px solid #f0f0f0",
											paddingTop: 6,
										}}
									>
										<Space direction="vertical" style={{ width: "100%" }} size={6}>
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
															<Text type="secondary" style={{ fontSize: 11 }}>
																{m.id}
															</Text>
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
													onClick={() => catalogModels.openModal(brand)}
												>
													Загрузить с auto.ru
												</Button>
												{modelCount > 0 && (
													<Popconfirm
														title="Очистить список моделей для этого бренда?"
														onConfirm={() => clearBrandModels(brand.id)}
														okText="Да"
														cancelText="Нет"
													>
														<Button size="small">Очистить фильтр</Button>
													</Popconfirm>
												)}
											</Space>
										</Space>
									</div>
								)}
							</Card>
						</List.Item>
					)
				}}
			/>

			<Modal
				title={editingBrand ? "Редактирование бренда" : "Добавить бренд"}
				open={isModalOpen}
				onOk={handleModalOk}
				onCancel={() => setIsModalOpen(false)}
				okText="Сохранить"
				cancelText="Отмена"
			>
				<Space direction="vertical" style={{ width: "100%" }}>
					<label>Название (для отображения)</label>
					<Input
						value={brandName}
						onChange={(e) => setBrandName(e.target.value)}
						placeholder="Например: Geely"
					/>
					<label>
						ID (используется в URL; автоматически генерируется, можно
						изменить)
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

			<Modal
				title="Бренды с auto.ru"
				open={catalogBrands.open}
				onCancel={catalogBrands.closeModal}
				width={720}
				footer={[
					<Button key="close" onClick={catalogBrands.closeModal}>
						Закрыть
					</Button>,
					<Button
						key="add"
						type="primary"
						loading={catalogBrands.loading}
						onClick={applyCatalogBrands}
					>
						Добавить выбранные
					</Button>,
				]}
			>
				<Space direction="vertical" style={{ width: "100%" }} size="middle">
					<Search
						placeholder="Поиск по названию или id"
						value={catalogBrands.query}
						onChange={(e) => catalogBrands.setQuery(e.target.value)}
						allowClear
					/>
					{catalogBrands.loading && !catalogBrands.items.length && (
						<Text type="secondary">Загрузка…</Text>
					)}
					<div style={{ maxHeight: 420, overflow: "auto" }}>
						<List
							size="small"
							dataSource={catalogBrands.filtered}
							locale={{
								emptyText:
									"Нет данных — попробуйте позже или добавьте бренд вручную",
							}}
							renderItem={(it) => (
								<List.Item style={{ padding: "6px 0" }}>
									<Checkbox
										checked={catalogBrands.picked.has(it.id)}
										onChange={() => catalogBrands.togglePick(it.id)}
									>
										<strong>{it.name}</strong>{" "}
										<Text type="secondary" style={{ fontSize: 12 }}>
											{it.id}
										</Text>
									</Checkbox>
								</List.Item>
							)}
						/>
					</div>
				</Space>
			</Modal>

			<Modal
				title={`Модели: ${catalogModels.brandId}`}
				open={catalogModels.open}
				onCancel={catalogModels.closeModal}
				width={640}
				footer={[
					<Button key="c" onClick={catalogModels.closeModal}>
						Отмена
					</Button>,
					<Button
						key="ok"
						type="primary"
						loading={catalogModels.loading}
						onClick={applyCatalogModels}
					>
						Добавить выбранные к бренду
					</Button>,
				]}
			>
				<Space direction="vertical" style={{ width: "100%" }} size="middle">
					<Search
						placeholder="Поиск по названию или id"
						value={catalogModels.query}
						onChange={(e) => catalogModels.setQuery(e.target.value)}
						allowClear
					/>
					{catalogModels.loading && !catalogModels.items.length && (
						<Text type="secondary">Загрузка…</Text>
					)}
					<div style={{ maxHeight: 400, overflow: "auto" }}>
						<List
							size="small"
							dataSource={catalogModels.filtered}
							locale={{
								emptyText:
									"Модели не найдены — проверьте город и id бренда",
							}}
							renderItem={(it) => (
								<List.Item style={{ padding: "6px 0" }}>
									<Checkbox
										checked={catalogModels.picked.has(it.id)}
										onChange={() => catalogModels.togglePick(it.id)}
									>
										<strong>{it.name}</strong>{" "}
										<Text type="secondary" style={{ fontSize: 12 }}>
											{it.id}
										</Text>
									</Checkbox>
								</List.Item>
							)}
						/>
					</div>
				</Space>
			</Modal>
		</Space>
	)
}
