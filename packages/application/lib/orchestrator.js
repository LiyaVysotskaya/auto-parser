import * as autoRuTools from "@market-slice/auto-ru"

import { launchBrowser } from "./browser.js"
import { saveReport } from "./file-export.js"

const DELAYS = Object.freeze({
	afterInit: 600,
	betweenCombinations: 3000,
})

const GOTO_OPTIONS = Object.freeze({
	waitUntil: "networkidle2",
	timeout: 60_000,
})

function buildListingUrl(baseUrlStr, mark, year, options = {}) {
	const u = new URL(baseUrlStr)
	const parts = u.pathname.split("/").filter(Boolean)
	const region =
		(options.city && String(options.city).trim()) ||
		parts[0] ||
		"sankt-peterburg"
	u.pathname = `/${region}/cars/${mark}/${year}-year/new/`
	u.searchParams.set("output_type", "list")
	return u.toString()
}

const noop = () => {}

function delay(ms, signal) {
	if (!ms) return Promise.resolve()
	if (!signal) {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(Object.assign(new Error("Aborted"), { name: "AbortError" }))
			return
		}
		const t = setTimeout(resolve, ms)
		const onAbort = () => {
			clearTimeout(t)
			reject(Object.assign(new Error("Aborted"), { name: "AbortError" }))
		}
		signal.addEventListener("abort", onAbort, { once: true })
	})
}

async function scrapeBrandYear(
	page,
	mark,
	year,
	options,
	reportBuilder,
	{ onOffer },
	signal,
) {
	const fullUrl = buildListingUrl(options.url, mark, year, options)
	console.log("[auto-ru] Navigate:", fullUrl)

	await page.goto(fullUrl, GOTO_OPTIONS)

	const count = await autoRuTools.init(page)

	if (count === 0) {
		console.log(`[auto-ru] No offers, skip: ${mark} ${year}`)
		return
	}

	await delay(DELAYS.afterInit, signal)

	let offerCount = 0
	for await (const result of autoRuTools.offers(page, { signal })) {
		reportBuilder.add(result.offer)
		offerCount++
		onOffer({
			offer: result.offer,
			pagination: result.pagination,
		})
	}

	console.log(`[auto-ru] Done ${mark} ${year}: ${offerCount} offer(s)`)
}

async function finalizeRun(reportBuilder, callbacks, startMs, { cancelled }) {
	const {
		onLastRun = noop,
		onReport = noop,
		onLog = noop,
		onStatus = noop,
	} = callbacks

	const finalReport = reportBuilder.finalize()
	const endMs = Date.now()

	onLastRun({
		endIso: new Date(endMs).toISOString(),
		endMs,
		durationMs: endMs - startMs,
	})

	onReport(finalReport)

	const filePath = await saveReport(finalReport)
	console.log("[auto-ru] Report saved:", filePath)

	if (cancelled) {
		onLog({
			level: "warning",
			message: `Парсинг остановлен. Частичный отчёт сохранён: ${filePath}`,
			timestamp: new Date().toISOString(),
			scope: "autoRu",
		})
		onStatus("cancelled")
	} else {
		onLog({
			level: "success",
			message: `Файл отчета сохранен: ${filePath}`,
			timestamp: new Date().toISOString(),
			scope: "autoRu",
		})
		onStatus("success")
	}

	return finalReport
}

export async function runAutoRu(options, callbacks = {}, signal) {
	const {
		onStatus = noop,
		onLastRun = noop,
		onOffer = noop,
		onLog = noop,
	} = callbacks
	let browser = null
	const startMs = Date.now()
	const reportBuilder = new autoRuTools.ReportBuilder()
	let cancelled = false

	try {
		onLastRun({
			startIso: new Date(startMs).toISOString(),
			startMs,
			endIso: null,
			endMs: null,
			durationMs: null,
		})
		onStatus("pending")

		browser = await launchBrowser(options)
		const page = await browser.newPage()

		outer: for (const mark of options.brands) {
			for (let year = options.years.from; year <= options.years.to; year++) {
				if (signal?.aborted) {
					cancelled = true
					break outer
				}

				try {
					onStatus("pending")
					await scrapeBrandYear(
						page,
						mark,
						year,
						options,
						reportBuilder,
						{ onOffer },
						signal,
					)
				} catch (error) {
					if (error?.name === "AbortError" || signal?.aborted) {
						cancelled = true
						break outer
					}
					console.error(`[auto-ru] Error ${mark} ${year}:`, error.message)
				}

				if (signal?.aborted) {
					cancelled = true
					break outer
				}

				try {
					await delay(DELAYS.betweenCombinations, signal)
				} catch (error) {
					if (error?.name === "AbortError" || signal?.aborted) {
						cancelled = true
						break outer
					}
					throw error
				}
			}
		}

		return await finalizeRun(reportBuilder, callbacks, startMs, { cancelled })
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
