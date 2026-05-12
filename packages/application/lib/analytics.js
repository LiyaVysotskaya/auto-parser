import { flattenReport } from "./flatten-report.js"
import { offerFullKey, offerPositionKey } from "./offer-key.js"

export { flattenReport }

export function uniqueCitiesFromReport(report = []) {
	const { rowsFlat } = flattenReport(report)
	const s = new Set()
	for (const r of rowsFlat) {
		const c =
			r.city != null && String(r.city).trim() !== ""
				? String(r.city).trim()
				: "—"
		if (c !== "—") s.add(c)
	}
	return [...s].sort((a, b) => a.localeCompare(b, "ru"))
}

export function resolveReportCityScope(report = [], settings = {}) {
	const cities = uniqueCitiesFromReport(report)
	if (cities.length === 0) return null
	if (cities.length === 1) return cities[0]
	const primary = settings.city != null ? String(settings.city).trim() : ""
	if (primary && cities.includes(primary)) return primary
	const multi = Array.isArray(settings.cities) ? settings.cities : []
	for (const id of multi) {
		const sid = String(id || "").trim()
		if (sid && cities.includes(sid)) return sid
	}
	return cities[0]
}

export function filterRowsFlatByCity(rowsFlat, city) {
	if (city == null || String(city).trim() === "") return rowsFlat
	const c = String(city).trim()
	return rowsFlat.filter((r) => {
		const rc =
			r.city != null && String(r.city).trim() !== ""
				? String(r.city).trim()
				: "—"
		return rc === c
	})
}

function buildDealerCounts(rowsFlat) {
	const dealerCounts = {}
	for (const offer of rowsFlat) {
		dealerCounts[offer.dealer] =
			(dealerCounts[offer.dealer] || 0) + (offer.count || 0)
	}
	return dealerCounts
}

export function dealerModelBreakdown(rowsFlat, dealerName, limit = 80) {
	const d = String(dealerName || "").trim()
	if (!d) return []
	const map = new Map()
	for (const r of rowsFlat) {
		if (String(r.dealer || "").trim() !== d) continue
		const key = [
			r.brand,
			r.model,
			r.equipment,
			r.modification,
			String(r.year ?? ""),
		].join("\u0000")
		const prev = map.get(key) || {
			brand: r.brand,
			model: r.model,
			equipment: r.equipment,
			modification: r.modification,
			year: r.year,
			units: 0,
			minPrice: null,
		}
		prev.units += r.count || 0
		if (r.price != null && (prev.minPrice == null || r.price < prev.minPrice))
			prev.minPrice = r.price
		map.set(key, prev)
	}
	return [...map.values()].sort((a, b) => b.units - a.units).slice(0, limit)
}

export function computeSummary(rowsFlat) {
	let totalUnits = 0
	let totalPriceSum = 0
	let totalPriceUnits = 0
	let minPrice = Infinity
	let maxDiscount = 0

	for (const offer of rowsFlat) {
		const qty = offer.count || 0
		if (offer.price !== null) {
			totalUnits += qty
			totalPriceSum += offer.price * qty
			totalPriceUnits += qty
			if (offer.price < minPrice) minPrice = offer.price
		}
		if (offer.maxDiscount > maxDiscount) maxDiscount = offer.maxDiscount
	}

	const avgPrice = totalPriceUnits > 0 ? totalPriceSum / totalPriceUnits : 0

	return {
		totalOffers: totalUnits,
		avgPrice,
		minPrice: minPrice === Infinity ? 0 : minPrice,
		maxDiscount,
	}
}

export function computeTopLists(rowsFlat, dealerCounts) {
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

	return { topCheapest, topDiscounts, topValue, topDealers }
}

export function groupByModel(rowsFlat) {
	const groups = {}
	for (const r of rowsFlat) {
		const key = `${r.brand}||${r.model}||${r.equipment}||${r.modification}||${r.year}||${r.city || "—"}`
		groups[key] = groups[key] || {
			meta: {
				brand: r.brand,
				model: r.model,
				equipment: r.equipment,
				modification: r.modification,
				year: r.year,
				city: r.city || "—",
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
			city: g.meta.city,
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
			bestDiscountDealer: bestDiscountEntry?.dealer ?? null,
			rows,
		}
	})

	return perModelSummary
}

export function groupByBrand(perModelSummary) {
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
	return perBrand
}

export function analyticsForSingleTab(tab, opts = {}) {
	const slice = tab && Array.isArray(tab.rows) ? [tab] : []
	const { rowsFlat: rawFlat } = flattenReport(slice)
	const rowsFlat = filterRowsFlatByCity(rawFlat, opts.city)
	const dealerCounts = buildDealerCounts(rowsFlat)
	const summary = computeSummary(rowsFlat)
	const { topCheapest, topDiscounts, topValue, topDealers } = computeTopLists(
		rowsFlat,
		dealerCounts,
	)
	const perModelSummary = groupByModel(rowsFlat)

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

	return {
		summary,
		topCheapest,
		topDiscounts,
		topValue,
		topDealers,
		topModelsByPct,
		perModelSummary,
	}
}

export function computePerBrandAnalytics(report = [], opts = {}) {
	const out = {}
	for (const tab of report) {
		const brand = tab?.name || "Unknown"
		out[brand] = analyticsForSingleTab(tab, opts)
	}
	return out
}

export function compareDealers(rowsFlat, baseDealer, otherDealers = []) {
	const base = String(baseDealer || "").trim()
	const others = [
		...new Set(
			otherDealers
				.map((d) => String(d || "").trim())
				.filter((d) => d && d !== "—" && d !== base),
		),
	]
	if (!base || !others.length) {
		return {
			rows: [],
			summary: null,
		}
	}

	const byPos = new Map()
	for (const r of rowsFlat) {
		const key = offerPositionKey(r)
		if (!byPos.has(key)) byPos.set(key, {})
		byPos.get(key)[r.dealer] = r
	}

	const rows = []
	let baseCheaper = 0
	let baseExpensive = 0
	let ties = 0
	let diffSum = 0
	let pairCount = 0

	for (const dealers of byPos.values()) {
		const baseRow = dealers[base]
		if (!baseRow || baseRow.price == null) continue
		const bp = baseRow.price
		for (const od of others) {
			const otherRow = dealers[od]
			if (!otherRow || otherRow.price == null) continue
			const op = otherRow.price
			const diffAbs = bp - op
			const diffPct = op ? diffAbs / op : null
			if (diffAbs < 0) baseCheaper++
			else if (diffAbs > 0) baseExpensive++
			else ties++
			diffSum += diffAbs
			pairCount++
			rows.push({
				key: `${offerPositionKey(baseRow)}::${od}`,
				brand: baseRow.brand,
				model: baseRow.model,
				equipment: baseRow.equipment,
				modification: baseRow.modification,
				year: baseRow.year,
				city: baseRow.city,
				baseDealer: base,
				basePrice: bp,
				otherDealer: od,
				otherPrice: op,
				diffAbs,
				diffPct,
			})
		}
	}

	rows.sort((a, b) => Math.abs(b.diffAbs) - Math.abs(a.diffAbs))

	const summary = {
		baseCheaperCount: baseCheaper,
		baseExpensiveCount: baseExpensive,
		tieCount: ties,
		avgDiffAbs: pairCount ? diffSum / pairCount : null,
		comparedPairs: pairCount,
	}

	return { rows, summary }
}

export function generateComprehensiveAnalytics(report = [], opts = {}) {
	const { rowsFlat: allFlat } = flattenReport(report)
	const rowsFlat = filterRowsFlatByCity(allFlat, opts.city)
	const dealerCounts = buildDealerCounts(rowsFlat)
	const summary = computeSummary(rowsFlat)
	const { topCheapest, topDiscounts, topValue, topDealers } = computeTopLists(
		rowsFlat,
		dealerCounts,
	)
	const perModelSummary = groupByModel(rowsFlat)
	const perBrand = groupByBrand(perModelSummary)

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

	const perBrandAnalytics = computePerBrandAnalytics(report, opts)

	return {
		summary,
		topCheapest,
		topDiscounts,
		topValue,
		topDealers,
		topModelsByPct,
		topByDiscountPct,
		perBrand,
		perModelSummary,
		perBrandAnalytics,
	}
}

function pickOfferSummary(o) {
	return {
		brand: o.brand,
		model: o.model,
		equipment: o.equipment,
		modification: o.modification,
		year: o.year,
		city: o.city,
		dealer: o.dealer,
	}
}

export function diffFlattenedOffers(rowsA, rowsB) {
	const mapA = new Map()
	for (const row of rowsA) mapA.set(offerFullKey(row), row)
	const mapB = new Map()
	for (const row of rowsB) mapB.set(offerFullKey(row), row)
	const rows = []
	const keys = new Set([...mapA.keys(), ...mapB.keys()])
	for (const k of keys) {
		const ra = mapA.get(k)
		const rb = mapB.get(k)
		if (ra && !rb) {
			rows.push({
				key: k,
				change: "removed",
				...pickOfferSummary(ra),
				priceA: ra.price,
				priceB: null,
				pct: null,
			})
			continue
		}
		if (!ra && rb) {
			rows.push({
				key: k,
				change: "added",
				...pickOfferSummary(rb),
				priceA: null,
				priceB: rb.price,
				pct: null,
			})
			continue
		}
		const pa = ra.price
		const pb = rb.price
		if (pa == null && pb == null) {
			rows.push({
				key: k,
				change: "unchanged",
				...pickOfferSummary(ra),
				priceA: pa,
				priceB: pb,
				pct: null,
			})
			continue
		}
		if (pa === pb || (pa != null && pb != null && Math.abs(pa - pb) < 0.5)) {
			rows.push({
				key: k,
				change: "unchanged",
				...pickOfferSummary(ra),
				priceA: pa,
				priceB: pb,
				pct: 0,
			})
			continue
		}
		const pct = pa && pb ? (pb - pa) / pa : null
		rows.push({
			key: k,
			change: "price",
			...pickOfferSummary(ra),
			priceA: pa,
			priceB: pb,
			pct,
		})
	}
	const ord = { added: 0, removed: 1, price: 2, unchanged: 3 }
	return rows.sort((x, y) => (ord[x.change] ?? 9) - (ord[y.change] ?? 9))
}
