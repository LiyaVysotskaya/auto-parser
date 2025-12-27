import * as dateFns from "date-fns"
import _ from "lodash"
import * as XLSX from "xlsx"

const safeGet = (obj, path, defaultValue = "") => {
	const value = _.get(obj, path, defaultValue)
	return value === null || value === undefined ? defaultValue : value
}

export async function init(page) {
	try {
		return await page.evaluate(() => {
			return new Promise((resolve) => {
				const noOffers = Array.from(document.querySelectorAll("button")).find(
					(btn) => /Нет предложений/i.test(btn.textContent),
				)
				if (noOffers) {
					resolve(0)
					return
				}

				const observer = new MutationObserver(() => {
					const button = Array.from(document.querySelectorAll("button")).find(
						(btn) =>
							/Показать[\w\s]+(предложение|предложения|предложений)/i.test(
								btn.textContent,
							),
					)
					if (button) {
						observer.disconnect()
						button.click()
						resolve(parseInt(button.textContent.replace(/\D/g, "")) || 0)
					}
				})

				observer.observe(document.body, { childList: true, subtree: true })
			})
		})
	} catch (error) {
		console.error("Init error:", error)
		return 0
	}
}

export async function* offers(page) {
	const yielded = []
	let pagination = null

	do {
		let response = null
		try {
			response = await page
				.waitForResponse(
					(res) => /\/ajax\/desktop-search\/listing\//.test(res.url()),
					{ timeout: 60000 },
				)
				.then((res) => res.json())
		} catch {
			console.log("Запрос /listing/ не пришёл — переходим к следующему URL")
			break
		}

		if (!response || response.status !== "SUCCESS") {
			continue
		}

		for (const offer of response.offers) {
			if (yielded.some((o) => o.id === offer.id)) continue
			yielded.push(offer)
			yield { offer, pagination: response.pagination }
		}

		if (pagination && response.pagination.current <= pagination.current) {
			continue
		}
		pagination = response.pagination
		if (pagination.current >= pagination.total_page_count) return

		await page.keyboard.down("ControlLeft")
		await page.keyboard.press("ArrowRight")
		await page.keyboard.up("ControlLeft")
	} while (true)
}

export const END_OF_REPORT = Symbol()
export function* report() {
	const result = []
	let next

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
export function xlsx(report) {
	const workbook = XLSX.utils.book_new()
	const headers = [
		[{ key: "model", title: "Модель" }, { wch: 25 }],
		[{ key: "equipment", title: "Комплектация" }, { wch: 25 }],
		[{ key: "modification", title: "Модификация" }, { wch: 45 }],
		[{ key: "year", title: "Год" }, { wch: 5 }],
		[{ key: "count", title: "Склад" }, { wch: 5 }],
		[{ key: "dealer", title: "Дилер" }, { wch: 35 }],
		[{ key: "price", title: "Основная цена" }, { wch: 15 }],
		[{ key: "priceMin", title: "Минимальная цена" }, { wch: 15 }],
		[{ key: "secondPrice", title: "Вторая цена" }, { wch: 15 }],
		[
			{ key: "specialistsProposal", title: "Предложение специалиста" },
			{ wch: 15 },
		],
		[{ key: "REKCProposal", title: "Предложение РЕКЦ" }, { wch: 15 }],
		[{ key: "agreedPrice", title: "Согласованная цена" }, { wch: 15 }],
		[
			{ key: "maxDiscount", title: "Максимально возможная скидка" },
			{ wch: 15 },
		],
		[{ key: "tradeInDiscount", title: "Скидка Trade-In" }, { wch: 15 }],
		[{ key: "creditDiscount", title: "Скидка за кредит" }, { wch: 15 }],
		[{ key: "insuranceDiscount", title: "Скидка КАСКО" }, { wch: 15 }],
	]

	for (const tab of report) {
		const aoa = [
			headers.map(([{ title }]) => title),
			...tab.rows.map((row) =>
				headers.map(([{ key }]) => row[key ?? ""] ?? undefined),
			),
		]
		const ws = XLSX.utils.aoa_to_sheet(aoa)
		ws["!cols"] = headers.map(([, obj]) => obj)
		XLSX.utils.book_append_sheet(workbook, ws, tab.name)
	}

	if (!report.length) {
		const ws = XLSX.utils.aoa_to_sheet([headers.map(([{ title }]) => title)])
		ws["!cols"] = headers.map(([, obj]) => obj)
		XLSX.utils.book_append_sheet(workbook, ws)
	}

	return workbook
}

export function reportName(report, extension) {
	const date = dateFns.format(new Date(), "dd_MM_yyyy")
	const brands = report
		.map((tab) => tab.name)
		.filter(Boolean)
		.join("_")

	let result = `AutoRu_${date}_${brands}`
	if (result.length > 120) {
		result = result.slice(0, 117) + "___"
	}

	return [result, extension].filter(Boolean).join(".")
}
