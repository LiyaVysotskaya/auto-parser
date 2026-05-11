import * as dateFns from "date-fns"
import * as XLSX from "xlsx"

const COLUMNS = [
	{ key: "model", title: "Модель", width: 25 },
	{ key: "equipment", title: "Комплектация", width: 25 },
	{ key: "modification", title: "Модификация", width: 45 },
	{ key: "year", title: "Год", width: 5 },
	{ key: "count", title: "Склад", width: 5 },
	{ key: "dealer", title: "Дилер", width: 35 },
	{ key: "city", title: "Город", width: 18 },
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

const TITLE_TO_KEY = Object.fromEntries(COLUMNS.map((c) => [c.title, c.key]))

const TEXT_KEYS = new Set([
	"model",
	"equipment",
	"modification",
	"dealer",
	"city",
])

const INTEGER_KEYS = new Set(["year", "count"])

const NUMERIC_KEYS = new Set([
	"price",
	"priceMin",
	"secondPrice",
	"specialistsProposal",
	"REKCProposal",
	"agreedPrice",
	"maxDiscount",
	"tradeInDiscount",
	"creditDiscount",
	"insuranceDiscount",
])

function parseNumberLoose(v) {
	if (v == null || v === "") return null
	if (typeof v === "number") {
		return Number.isFinite(v) ? v : null
	}
	const s = String(v).trim()
	if (s === "") return null
	let cleaned = s.replace(/\s+/g, "").replace(/[^0-9,.\-]/g, "")
	if (cleaned.indexOf(",") >= 0 && cleaned.indexOf(".") === -1) {
		cleaned = cleaned.replace(",", ".")
	}
	const n = Number(cleaned)
	return Number.isFinite(n) ? n : null
}

function coerceImportedCell(key, raw) {
	if (raw == null || raw === "") return null
	if (TEXT_KEYS.has(key)) {
		const t = String(raw).trim()
		return t || null
	}
	if (INTEGER_KEYS.has(key)) {
		const n = parseNumberLoose(raw)
		if (n == null) return null
		if (key === "count") return Math.max(0, Math.floor(n))
		return Math.floor(n)
	}
	if (NUMERIC_KEYS.has(key)) {
		return parseNumberLoose(raw)
	}
	return null
}

export function parseXlsx(buffer) {
	const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
	const workbook = XLSX.read(data, { type: "array", cellDates: false })
	const report = []

	for (const sheetName of workbook.SheetNames) {
		const ws = workbook.Sheets[sheetName]
		if (!ws) continue

		const aoa = XLSX.utils.sheet_to_json(ws, {
			header: 1,
			raw: true,
			defval: null,
		})
		if (!aoa.length) {
			report.push({ name: sheetName.trim() || "Unknown", rows: [] })
			continue
		}

		const headerRow = (aoa[0] || []).map((h) =>
			h == null ? "" : String(h).trim(),
		)
		const colIndexToKey = headerRow.map((title) => TITLE_TO_KEY[title] ?? null)

		if (!colIndexToKey.some(Boolean)) {
			continue
		}

		const rows = []
		for (let i = 1; i < aoa.length; i++) {
			const line = aoa[i] || []
			const row = {}
			let hasData = false

			for (let j = 0; j < colIndexToKey.length; j++) {
				const key = colIndexToKey[j]
				if (!key) continue
				const cell = line[j]
				const coerced = coerceImportedCell(key, cell)
				row[key] = coerced
				if (coerced != null && coerced !== "") hasData = true
			}

			if (!hasData) continue
			rows.push(row)
		}

		report.push({
			name: sheetName.trim() || "Unknown",
			rows,
		})
	}

	return report
}

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
	const date = dateFns.format(new Date(), "dd MM yyyy")
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
