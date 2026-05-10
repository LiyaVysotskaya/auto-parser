import fs from "node:fs/promises"
import path from "node:path"

import * as autoRuTools from "@market-slice/auto-ru"
import * as XLSX from "xlsx"

export async function saveReport(report, outputDir = "reports") {
	await fs.mkdir(path.resolve(outputDir), { recursive: true })

	const fileName = autoRuTools.reportName(report, "xlsx")
	const filePath = path.resolve(outputDir, fileName)
	const workbook = autoRuTools.xlsx(report)

	await fs.writeFile(
		filePath,
		XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }),
	)

	return filePath
}
