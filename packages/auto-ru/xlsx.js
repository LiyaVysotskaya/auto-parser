import * as dateFns from "date-fns"
import * as XLSX from "xlsx"

const COLUMNS = [
	{ key: "model", title: "Модель", width: 25 },
	{ key: "equipment", title: "Комплектация", width: 25 },
	{ key: "modification", title: "Модификация", width: 45 },
	{ key: "year", title: "Год", width: 5 },
	{ key: "count", title: "Склад", width: 5 },
	{ key: "dealer", title: "Дилер", width: 35 },
	{ key: "price", title: "Основная цена", width: 15 },
	{ key: "priceMin", title: "Минимальная цена", width: 15 },
	{ key: "secondPrice", title: "Вторая цена", width: 15 },
	{ key: "specialistsProposal", title: "Предложение специалиста", width: 15 },
	{ key: "REKCProposal", title: "Предложение РЕКЦ", width: 15 },
	{ key: "agreedPrice", title: "Согласованная цена", width: 15 },
	{ key: "maxDiscount", title: "Максимально возможная скидка", width: 15 },
	{ key: "tradeInDiscount", title: "Скидка Trade-In", width: 15 },
	{ key: "creditDiscount", title: "Скидка за кредит", width: 15 },
	{ key: "insuranceDiscount", title: "Скидка КАСКО", width: 15 },
]

function columnWidths() {
	return COLUMNS.map((c) => ({ wch: c.width }))
}

export function xlsx(report) {
	const workbook = XLSX.utils.book_new()

	for (const tab of report) {
		const aoa = [
			COLUMNS.map((c) => c.title),
			...tab.rows.map((row) =>
				COLUMNS.map((c) => row[c.key ?? ""] ?? undefined),
			),
		]
		const ws = XLSX.utils.aoa_to_sheet(aoa)
		ws["!cols"] = columnWidths()
		XLSX.utils.book_append_sheet(workbook, ws, tab.name)
	}

	if (!report.length) {
		const ws = XLSX.utils.aoa_to_sheet([COLUMNS.map((c) => c.title)])
		ws["!cols"] = columnWidths()
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
