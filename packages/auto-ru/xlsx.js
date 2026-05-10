import * as dateFns from "date-fns"
import * as XLSX from "xlsx"

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
