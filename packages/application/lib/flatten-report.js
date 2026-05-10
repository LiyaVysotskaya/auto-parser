function parseNumberLoose(v) {
	if (v == null) return null
	if (typeof v === "number") return v
	const s = String(v).trim()
	if (s === "") return null
	let cleaned = s.replace(/\s+/g, "").replace(/[^0-9,.\-]/g, "")
	if (cleaned.indexOf(",") >= 0 && cleaned.indexOf(".") === -1) {
		cleaned = cleaned.replace(",", ".")
	}
	const n = Number(cleaned)
	return Number.isFinite(n) ? n : null
}

function parseQty(v) {
	const n = parseNumberLoose(v)
	if (n == null) return 1
	return Math.max(0, Math.floor(n))
}

export function flattenReport(report = []) {
	const rowsFlat = []
	const dealerCounts = {}

	for (const tab of report) {
		const brand = tab.name || "Unknown"
		for (const r of tab.rows || []) {
			const qty = parseQty(r.count ?? r.stock ?? r.quantity)
			const price = parseNumberLoose(r.price)
			const priceMin = parseNumberLoose(r.priceMin)
			const secondPrice = parseNumberLoose(r.secondPrice)
			const maxDiscountAbs = parseNumberLoose(r.maxDiscount) || 0

			const offer = {
				brand,
				model: r.model || "—",
				equipment: r.equipment || "—",
				modification: r.modification || "—",
				year: r.year || "—",
				count: qty,
				city: r.city || "—",
				dealer: r.dealer || "—",
				price: price != null ? price : null,
				priceMin: priceMin != null ? priceMin : null,
				secondPrice: secondPrice != null ? secondPrice : null,
				maxDiscount: maxDiscountAbs,
				tradeInDiscount: parseNumberLoose(r.tradeInDiscount) || 0,
				creditDiscount: parseNumberLoose(r.creditDiscount) || 0,
				insuranceDiscount: parseNumberLoose(r.insuranceDiscount) || 0,
			}

			rowsFlat.push(offer)
			dealerCounts[offer.dealer] = (dealerCounts[offer.dealer] || 0) + qty
		}
	}

	return { rowsFlat, dealerCounts }
}
