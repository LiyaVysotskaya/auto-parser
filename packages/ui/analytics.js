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

export function generateComprehensiveAnalytics(report = []) {
	const rowsFlat = []
	const dealerCounts = {}
	let totalUnits = 0
	let totalPriceSum = 0
	let totalPriceUnits = 0
	let minPrice = Infinity
	let maxDiscount = 0

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

			if (offer.price !== null) {
				totalUnits += qty
				totalPriceSum += offer.price * qty
				totalPriceUnits += qty
				if (offer.price < minPrice) minPrice = offer.price
			}

			if (offer.maxDiscount > maxDiscount) maxDiscount = offer.maxDiscount
		}
	}

	const avgPrice = totalPriceUnits > 0 ? totalPriceSum / totalPriceUnits : 0
	const topCheapest = [...rowsFlat]
		.filter((o) => o.price != null)
		.sort((a, b) => a.price - b.price)
		.slice(0, 15)
	const topDiscounts = [...rowsFlat]
		.filter((o) => o.maxDiscount > 0)
		.sort((a, b) => b.maxDiscount - a.maxDiscount)
		.slice(0, 15)
	const topValue = [...rowsFlat]
		.filter((o) => o.price != null && o.maxDiscount > 0)
		.map((o) => ({
			...o,
			discountRatio: o.maxDiscount / o.price,
			finalPrice: o.price - o.maxDiscount,
		}))
		.sort((a, b) => b.discountRatio - a.discountRatio)
		.slice(0, 15)
	const topDealers = Object.entries(dealerCounts)
		.map(([dealer, units]) => ({ dealer, units }))
		.sort((a, b) => b.units - a.units)
		.slice(0, 10)

	const groups = {}
	for (const r of rowsFlat) {
		const key = `${r.brand}||${r.model}||${r.equipment}||${r.modification}||${r.year}`
		groups[key] = groups[key] || {
			meta: {
				brand: r.brand,
				model: r.model,
				equipment: r.equipment,
				modification: r.modification,
				year: r.year,
			},
			rows: [],
		}
		groups[key].rows.push(r)
	}

	const perModelSummary = Object.values(groups).map((g) => {
		const rows = g.rows
		const totalUnitsInGroup = rows.reduce((s, x) => s + (x.count || 0), 0)
		const sortedByPrice = rows
			.filter((x) => x.price != null)
			.sort((a, b) => a.price - b.price)
		const min = sortedByPrice[0] || null
		const second = sortedByPrice[1] || null
		const sumPriceTimesQty = rows.reduce(
			(s, x) => s + (x.price != null ? x.price * (x.count || 0) : 0),
			0,
		)
		const avgWeighted =
			totalUnitsInGroup > 0 ? sumPriceTimesQty / totalUnitsInGroup : null
		const bestDiscountAbs = Math.max(...rows.map((r) => r.maxDiscount || 0))
		const bestDiscountEntry =
			rows.find((r) => (r.maxDiscount || 0) === bestDiscountAbs) || null
		const bestDiscountPct =
			bestDiscountEntry && bestDiscountEntry.price
				? bestDiscountAbs / bestDiscountEntry.price
				: null

		const priceMinVal = rows.reduce((acc, r) => {
			if (r.priceMin != null && (acc == null || r.priceMin < acc))
				return r.priceMin
			return acc
		}, null)
		const priceMinDealer =
			priceMinVal != null
				? rows.find((r) => r.priceMin === priceMinVal)?.dealer || null
				: null

		return {
			brand: g.meta.brand,
			model: g.meta.model,
			equipment: g.meta.equipment,
			modification: g.meta.modification,
			year: g.meta.year,
			totalOffers: totalUnitsInGroup,
			minPrice: min?.price ?? null,
			minDealer: min?.dealer ?? null,
			secondPrice: second?.price ?? null,
			secondDealer: second?.dealer ?? null,
			priceGapAbs: min && second ? second.price - min.price : null,
			priceGapPct:
				min && second ? (second.price - min.price) / second.price : null,
			priceMin: priceMinVal,
			priceMinDealer,
			avgPrice: avgWeighted,
			bestDiscountAbs,
			bestDiscountPct,
			rows,
		}
	})

	const topModelsByPct = perModelSummary
		.filter((m) => m.bestDiscountPct != null)
		.map((m) => ({
			brand: m.brand,
			model: m.model,
			equipment: m.equipment,
			modification: m.modification,
			year: m.year,
			priceMin: m.priceMin,
			priceMinDealer: m.priceMinDealer,
			minPrice: m.minPrice,
			minDealer: m.minDealer,
			bestDiscountAbs: m.bestDiscountAbs,
			bestDiscountPct: m.bestDiscountPct,
			totalOffers: m.totalOffers,
		}))
		.sort((a, b) => (b.bestDiscountPct || 0) - (a.bestDiscountPct || 0))
		.slice(0, 10)

	const topByDiscountPct = perModelSummary
		.filter((x) => x.bestDiscountPct != null)
		.sort((a, b) => (b.bestDiscountPct || 0) - (a.bestDiscountPct || 0))
		.slice(0, 10)
		.map((item) => ({ ...item, topDealer: item.minDealer || "—" }))

	const perBrand = {}
	for (const row of perModelSummary) {
		perBrand[row.brand] = perBrand[row.brand] || { models: [] }
		perBrand[row.brand].models.push(row)
	}
	for (const b of Object.keys(perBrand)) {
		perBrand[b].models.sort((a, b) => {
			if (a.minPrice == null && b.minPrice == null) return 0
			if (a.minPrice == null) return 1
			if (b.minPrice == null) return -1
			return a.minPrice - b.minPrice
		})
	}

	return {
		summary: {
			totalOffers: totalUnits,
			avgPrice,
			minPrice: minPrice === Infinity ? 0 : minPrice,
			maxDiscount,
		},
		topCheapest,
		topDiscounts,
		topValue,
		topDealers,
		topModelsByPct,
		topByDiscountPct,
		perBrand,
		perModelSummary,
	}
}
