import { useMemo, useState } from "react"

import { message } from "antd"

import { electron } from "../../../electron.js"

export function useCatalogBrands() {
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
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

	const openModal = async () => {
		if (!electron?.fetchBrandsFromAutoRu) {
			message.warning("Загрузка каталога доступна только в приложении Electron")
			return
		}
		setOpen(true)
		setQuery("")
		setPicked(new Set())
		setItems([])
		setLoading(true)
		try {
			const res = await electron.fetchBrandsFromAutoRu()
			const fetched = Array.isArray(res?.items) ? res.items : []
			setItems(fetched)
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
