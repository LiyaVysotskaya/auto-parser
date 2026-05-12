import React from "react"
import { useDispatch, useSelector } from "react-redux"

import { StarFilled, StarOutlined } from "@ant-design/icons"
import {
	addFavorite,
	removeFavorite,
} from "@market-slice/application/slices/favorites.js"
import { offerIdentityKey } from "@market-slice/application/lib/offer-key.js"
import { Button, Tooltip } from "antd"

import { electron } from "../../electron.js"

export function FavoriteStar({ row }) {
	const dispatch = useDispatch()
	const items = useSelector((s) => s.favorites.items)
	const active = items.some((x) => offerIdentityKey(x) === offerIdentityKey(row))

	const toggle = async () => {
		const payload = {
			brand: row.brand,
			model: row.model,
			equipment: row.equipment ?? "—",
			modification: row.modification ?? "—",
			year: String(row.year ?? "—"),
		}
		try {
			if (active) {
				if (electron?.favoritesRemove) {
					const res = await electron.favoritesRemove(payload)
					if (!res?.ok) return
				}
				dispatch(removeFavorite(payload))
			} else {
				if (electron?.favoritesAdd) {
					const res = await electron.favoritesAdd(payload)
					if (!res?.ok) return
				}
				dispatch(addFavorite(payload))
			}
		} catch {
			/* ignore */
		}
	}

	return (
		<Tooltip title={active ? "Убрать из избранного" : "В избранное"}>
			<Button
				type="text"
				size="small"
				aria-label={active ? "Убрать из избранного" : "В избранное"}
				icon={
					active ? (
						<StarFilled style={{ color: "var(--ant-color-warning)" }} />
					) : (
						<StarOutlined />
					)
				}
				onClick={(e) => {
					e.stopPropagation()
					toggle()
				}}
			/>
		</Tooltip>
	)
}
