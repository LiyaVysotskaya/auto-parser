import _ from "lodash"

const safeGet = (obj, path, defaultValue = "") => {
	const value = _.get(obj, path, defaultValue)
	return value === null || value === undefined ? defaultValue : value
}

function rowGroupKey(groupKey) {
	return [
		groupKey.model,
		groupKey.equipment,
		groupKey.modification,
		String(groupKey.year),
		groupKey.dealer,
		String(groupKey.city ?? ""),
	].join("\u0000")
}

export class ReportBuilder {
	constructor() {
		this._tabsByName = new Map()
		this._city = ""
	}

	setCity(cityId) {
		this._city = cityId != null ? String(cityId).trim() : ""
	}

	snapshot() {
		return [...this._tabsByName.values()].map((tab) => ({
			name: tab.name,
			rows: tab.rows,
		}))
	}

	add(offer) {
		if (!offer) return

		const mark = safeGet(offer, "vehicle_info.mark_info.name", "Unknown")

		let tab = this._tabsByName.get(mark)
		if (!tab) {
			tab = { name: mark, rows: [], rowsByKey: new Map() }
			this._tabsByName.set(mark, tab)
		}

		const groupKey = {
			model: safeGet(offer, "vehicle_info.model_info.name", ""),
			equipment: safeGet(offer, "vehicle_info.complectation.name", ""),
			modification: safeGet(offer, "vehicle_info.tech_param.human_name", ""),
			year: safeGet(offer, "documents.year", 0),
			dealer: safeGet(offer, "salon.name", ""),
			city: this._city || "—",
		}

		const rKey = rowGroupKey(groupKey)
		let row = tab.rowsByKey.get(rKey)

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
			tab.rowsByKey.set(rKey, row)
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
	}

	finalize() {
		const result = [...this._tabsByName.values()].map((tab) => ({
			name: tab.name,
			rows: [...tab.rows],
		}))

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
}

export function createReport() {
	return new ReportBuilder()
}
