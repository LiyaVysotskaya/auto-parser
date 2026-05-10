import fs from "node:fs/promises"
import path from "node:path"

import * as autoRuTools from "@market-slice/auto-ru"
import puppeteer from "puppeteer-extra"
import stealth from "puppeteer-extra-plugin-stealth"
import * as XLSX from "xlsx"

import { getConfig } from "../config.js"
import * as store from "../store.js"

puppeteer.use(stealth())

function buildListingUrl(baseUrlStr, mark, year) {
	const u = new URL(baseUrlStr)
	const parts = u.pathname.split("/").filter(Boolean)
	const region = parts[0] ?? "sankt-peterburg"
	u.pathname = `/${region}/cars/${mark}/${year}-year/new/`
	u.searchParams.set("output_type", "list")
	return u.toString()
}

function buildLaunchOptions(effectiveOptions) {
	const { browser: browserOpts = {}, headless, userDataDir } = effectiveOptions
	const launch = {
		...browserOpts,
		headless: headless ?? false,
		userDataDir: userDataDir ?? path.join(process.cwd(), ".browser"),
	}
	if (!launch.executablePath) delete launch.executablePath
	return launch
}

export async function action(options = getConfig().autoRu) {
	let browser = null
	try {
		const effectiveOptions = options

		const startMs = Date.now()
		store.instance.dispatch(
			store.autoRu.slice.actions.setLastRun({
				startIso: new Date(startMs).toISOString(),
				startMs,
				endIso: null,
				endMs: null,
				durationMs: null,
			}),
		)
		store.instance.dispatch(store.autoRu.slice.actions.status("pending"))

		const reportGenerator = autoRuTools.report()
		reportGenerator.next()

		browser = await puppeteer.launch(buildLaunchOptions(effectiveOptions))
		const page = await browser.newPage()

		for (const mark of effectiveOptions.brands) {
			for (
				let year = effectiveOptions.years.from;
				year <= effectiveOptions.years.to;
				year++
			) {
				try {
					store.instance.dispatch(store.autoRu.slice.actions.status("pending"))
					const fullUrl = buildListingUrl(effectiveOptions.url, mark, year)
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
						store.instance.dispatch(
							store.autoRu.slice.actions.offer({
								offer: result.offer,
								pagination: result.pagination,
							}),
						)
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
		const lastRunStartMs =
			store.instance.getState().autoRu.lastRun?.startMs ?? startMs
		const durationMs = endMs - (lastRunStartMs || endMs)
		store.instance.dispatch(
			store.autoRu.slice.actions.setLastRun({
				endIso: new Date(endMs).toISOString(),
				endMs,
				durationMs,
			}),
		)

		store.instance.dispatch(store.autoRu.slice.actions.report(finalReport))
		await saveReportAutomatically(finalReport)

		store.instance.dispatch(store.autoRu.slice.actions.status("success"))
	} catch (error) {
		console.error("[auto-ru] Fatal:", error)
		const endMs = Date.now()
		const lastRunStartMs =
			store.instance.getState().autoRu.lastRun?.startMs ?? null
		const durationMs = lastRunStartMs ? endMs - lastRunStartMs : null
		store.instance.dispatch(
			store.autoRu.slice.actions.setLastRun({
				endIso: new Date(endMs).toISOString(),
				endMs,
				durationMs,
			}),
		)
		store.instance.dispatch(store.autoRu.slice.actions.status("failed"))
	} finally {
		await browser?.close()
	}
}

async function saveReportAutomatically(report) {
	try {
		await fs.mkdir(path.resolve("reports"), { recursive: true })

		const fileName = autoRuTools.reportName(report, "xlsx")
		const filePath = path.resolve("reports", fileName)

		const workbook = autoRuTools.xlsx(report)
		await fs.writeFile(
			filePath,
			XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }),
		)

		console.log("[auto-ru] Report saved:", filePath)

		store.instance.dispatch(
			store.log.slice.actions.push({
				level: "success",
				message: `Файл отчета сохранен: ${filePath}`,
				timestamp: new Date().toISOString(),
				scope: "autoRu",
			}),
		)

		return filePath
	} catch (error) {
		console.error("[auto-ru] Report save failed:", error)

		store.instance.dispatch(
			store.log.slice.actions.push({
				level: "error",
				message: `Не удалось сохранить файл отчета: ${error.message}`,
				timestamp: new Date().toISOString(),
				scope: "autoRu",
			}),
		)

		throw error
	}
}
