/**
 * Стабильный ключ позиции и расчёт Δ цены между запусками (история цен,
 * дашборд).
 */

export function stableOfferKey(r) {
	return [
		r.brand,
		r.model,
		r.equipment || "—",
		r.modification || "—",
		String(r.year ?? ""),
		r.dealer || "—",
		r.city || "—",
	].join("\u0000")
}

export function attachPriceDeltas(rows) {
	const byKey = new Map()
	for (const r of rows) {
		const k = stableOfferKey(r)
		if (!byKey.has(k)) byKey.set(k, [])
		byKey.get(k).push(r)
	}
	for (const list of byKey.values()) {
		list.sort((a, b) =>
			String(a.run_started).localeCompare(String(b.run_started)),
		)
		for (let i = 0; i < list.length; i++) {
			const cur = list[i]
			const prev = list[i - 1]
			let delta = null
			let deltaPct = null
			if (
				prev &&
				cur.price != null &&
				prev.price != null &&
				prev.run_started !== cur.run_started
			) {
				delta = cur.price - prev.price
				deltaPct = prev.price ? delta / prev.price : null
			}
			cur._delta = delta
			cur._deltaPct = deltaPct
		}
	}
	return rows
}
