import fs from "node:fs/promises"
import path from "node:path"

import * as autoRuTools from "@market-slice/auto-ru"
import puppeteer from "puppeteer-extra"
import stealth from "puppeteer-extra-plugin-stealth"
import { call, put, select, takeEvery } from "redux-saga/effects"
import * as XLSX from "xlsx"

import { getConfig } from "../config.js"
import * as store from "../store.js"

puppeteer.use(stealth())

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

		browser = await puppeteer.launch({
			...effectiveOptions.browser,
			headless: false,
			userDataDir: path.resolve(".browser"),
		})
		const page = await browser.newPage()

		for (const mark of effectiveOptions.brands) {
			for (
				let year = effectiveOptions.years.from;
				year <= effectiveOptions.years.to;
				year++
			) {
				try {
					store.instance.dispatch(store.autoRu.slice.actions.status("pending"))
					const url = new URL(effectiveOptions.url)
					url.pathname = `/sankt-peterburg/cars/${mark}/${year}-year/new/`
					url.searchParams.set("output_type", "list")

					const fullUrl = url.toString()
					console.log(effectiveOptions.url)
					console.log("Переходим на:", fullUrl)

					await page.goto(fullUrl, {
						waitUntil: "networkidle2",
						timeout: 60000,
					})

					const count = await autoRuTools.init(page)

					if (count === 0) {
						console.log(`Нет предложений для ${mark} ${year}, пропускаем`)
						continue
					}

					const offers = []
					for await (const result of autoRuTools.offers(page)) {
						offers.push(result.offer)
						store.instance.dispatch(
							store.autoRu.slice.actions.offer(result.offer),
						)
					}

					for (const offer of offers) {
						reportGenerator.next(offer)
					}

					console.log(`✓ ${mark} ${year}: ${offers.length} предложений`)
				} catch (error) {
					console.error(`✗ Ошибка ${mark} ${year}:`, error.message)
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
		console.error("Общая ошибка:", error)
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

		console.log("Отчет автоматически сохранен:", filePath)

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
		console.error("Ошибка автоматического сохранения отчета:", error)

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
