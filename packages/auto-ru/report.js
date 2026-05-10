import _ from "lodash"

const safeGet = (obj, path, defaultValue = "") => {
	const value = _.get(obj, path, defaultValue)
	return value === null || value === undefined ? defaultValue : value
}

export const END_OF_REPORT = Symbol()

export function* report() {
	const result = []

	let reportState = yield result

	while (reportState !== END_OF_REPORT) {
		const offer = reportState
		if (!offer || offer === END_OF_REPORT) break

		const mark = safeGet(offer, "vehicle_info.mark_info.name", "Unknown")

		let tab = result.find((t) => t.name === mark)
		if (!tab) {
			tab = { name: mark, rows: [] }
			result.push(tab)
		}

		const groupKey = {
			model: safeGet(offer, "vehicle_info.model_info.name", ""),
			equipment: safeGet(offer, "vehicle_info.complectation.name", ""),
			modification: safeGet(offer, "vehicle_info.tech_param.human_name", ""),
			year: safeGet(offer, "documents.year", 0),
			dealer: safeGet(offer, "salon.name", ""),
		}

		let row = tab.rows.find(
			(r) =>
				r.model === groupKey.model &&
				r.equipment === groupKey.equipment &&
				r.modification === groupKey.modification &&
				r.year === groupKey.year &&
				r.dealer === groupKey.dealer,
		)

		if (!row) {
			row = {
				...groupKey,
				count: 0,
				price: Infinity,
				priceMin: Infinity,
				secondPrice: null,
				specialistsProposal: null,
				REKCProposal: null,
				agreedPrice: null,
				maxDiscount: null,
				tradeInDiscount: null,
				creditDiscount: null,
				insuranceDiscount: null,
			}
			tab.rows.push(row)
		}

		row.count++
		const price = Number(safeGet(offer, "price_info.price", Infinity))

		if (price < row.price) {
			row.price = price
		}

		if (row.count > 1 && !row.secondPrice) {
			row.secondPrice = price
		}

		const maxDiscount = Number(
			safeGet(offer, "discount_options.max_discount", 0),
		)
		const priceMin = price - maxDiscount

		if (priceMin < row.priceMin) {
			row.priceMin = priceMin
			row.maxDiscount = maxDiscount
			row.tradeInDiscount = Number(
				safeGet(offer, "discount_options.tradein", null),
			)
			row.creditDiscount = Number(
				safeGet(offer, "discount_options.credit", null),
			)
			row.insuranceDiscount = Number(
				safeGet(offer, "discount_options.insurance", null),
			)
		}

		reportState = yield result
	}

	for (const tab of result) {
		tab.rows.sort(
			(a, b) =>
				a.model.localeCompare(b.model) ||
				a.equipment.localeCompare(b.equipment) ||
				a.modification.localeCompare(b.modification) ||
				a.year - b.year ||
				a.dealer.localeCompare(b.dealer),
		)
	}

	result.sort((a, b) => a.name.localeCompare(b.name))

	return result
}
