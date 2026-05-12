import { useMemo, useState } from "react"

import { message } from "antd"

import { electron } from "../electron.js"

export function useCatalogModels() {
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const [brandId, setBrandId] = useState("")
	const [items, setItems] = useState([])
	const [query, setQuery] = useState("")
	const [picked, setPicked] = useState(() => new Set())

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return items
		return items.filter(
			(it) =>
				String(it.name || "")
					.toLowerCase()
					.includes(q) ||
				String(it.id || "")
					.toLowerCase()
					.includes(q),
		)
	}, [items, query])

	const openModal = async (brand) => {
		const bid = brand?.id
		if (!bid) return
		if (!electron?.fetchModelsFromAutoRu) {
			message.warning("Загрузка моделей доступна только в приложении Electron")
			return
		}
		setBrandId(bid)
		setOpen(true)
		setQuery("")
		setPicked(new Set())
		setItems([])
		setLoading(true)
		try {
			const res = await electron.fetchModelsFromAutoRu(bid)
			const fetched = Array.isArray(res?.items) ? res.items : []
			setItems(fetched)
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
			setLoading(false)
		}
	}

	const togglePick = (id) => {
		setPicked((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const closeModal = () => setOpen(false)

	return {
		open,
		loading,
		brandId,
		items,
		filtered,
		query,
		setQuery,
		picked,
		togglePick,
		openModal,
		closeModal,
	}
}
