import * as autoRuTools from "@market-slice/auto-ru"

import { launchBrowser } from "./browser.js"
import { saveReport } from "./file-export.js"

function buildListingUrl(baseUrlStr, mark, year) {
	const u = new URL(baseUrlStr)
	const parts = u.pathname.split("/").filter(Boolean)
	const region = parts[0] ?? "sankt-peterburg"
	u.pathname = `/${region}/cars/${mark}/${year}-year/new/`
	u.searchParams.set("output_type", "list")
	return u.toString()
}

const noop = () => {}

export async function runAutoRu(options, callbacks = {}) {
	const {
		onStatus = noop,
		onLastRun = noop,
		onOffer = noop,
		onReport = noop,
		onLog = noop,
	} = callbacks
	let browser = null
	const startMs = Date.now()

	try {
		onLastRun({
			startIso: new Date(startMs).toISOString(),
			startMs,
			endIso: null,
			endMs: null,
			durationMs: null,
		})
		onStatus("pending")

		const reportGenerator = autoRuTools.report()
		reportGenerator.next()

		browser = await launchBrowser(options)
		const page = await browser.newPage()

		for (const mark of options.brands) {
			for (let year = options.years.from; year <= options.years.to; year++) {
				try {
					onStatus("pending")
					const fullUrl = buildListingUrl(options.url, mark, year)
					console.log("[auto-ru] Navigate:", fullUrl)

					await page.goto(fullUrl, {
						waitUntil: "networkidle2",
						timeout: 60000,
					})

					const count = await autoRuTools.init(page)

					if (count === 0) {
						console.log(`[auto-ru] No offers, skip: ${mark} ${year}`)
						continue
					}

					await new Promise((r) => setTimeout(r, 600))

					let offerCount = 0
					for await (const result of autoRuTools.offers(page)) {
						reportGenerator.next(result.offer)
						offerCount++
						onOffer({
							offer: result.offer,
							pagination: result.pagination,
						})
					}

					console.log(`[auto-ru] Done ${mark} ${year}: ${offerCount} offer(s)`)
				} catch (error) {
					console.error(`[auto-ru] Error ${mark} ${year}:`, error.message)
				}

				await new Promise((resolve) => setTimeout(resolve, 3000))
			}
		}

		const finalReport = reportGenerator.next(autoRuTools.END_OF_REPORT).value
		const endMs = Date.now()
		onLastRun({
			endIso: new Date(endMs).toISOString(),
			endMs,
			durationMs: endMs - startMs,
		})

		onReport(finalReport)
		const filePath = await saveReport(finalReport)
		console.log("[auto-ru] Report saved:", filePath)
		onLog({
			level: "success",
			message: `Файл отчета сохранен: ${filePath}`,
			timestamp: new Date().toISOString(),
			scope: "autoRu",
		})
		onStatus("success")

		return finalReport
	} catch (error) {
		console.error("[auto-ru] Fatal:", error)
		const endMs = Date.now()
		onLastRun({
			endIso: new Date(endMs).toISOString(),
			endMs,
			durationMs: endMs - startMs,
		})
		onStatus("failed")
		onLog({
			level: "error",
			message: `Не удалось выполнить парсинг: ${error.message}`,
			timestamp: new Date().toISOString(),
			scope: "autoRu",
		})
		throw error
	} finally {
		await browser?.close()
	}
}
