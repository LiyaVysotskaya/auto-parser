import fs from "node:fs/promises"
import path from "node:path"

import * as autoRuTools from "@market-slice/auto-ru"
import puppeteer from "puppeteer-extra"
import stealth from "puppeteer-extra-plugin-stealth"
import { call, put, select, takeEvery } from "redux-saga/effects"
import * as XLSX from "xlsx"

import { config } from "../config.js"
import * as store from "../store.js"

puppeteer.use(stealth())

export async function action(options = config().autoRu) {
	let browser = null
	try {
		const reportGenerator = autoRuTools.report()
		reportGenerator.next()

		browser = await puppeteer.launch({
			...options.browser,
			headless: false,
			userDataDir: path.resolve(".browser"),
		})
		const page = await browser.newPage()

		for (const mark of options.brands) {
			for (let year = options.years.from; year <= options.years.to; year++) {
				try {
					const url = new URL(options.url)
					url.pathname = `/sankt-peterburg/cars/${mark}/${year}-year/new/`
					url.searchParams.set("output_type", "list")

					const fullUrl = url.toString()
					console.log(options.url)
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

		store.instance.dispatch(store.autoRu.slice.actions.report(finalReport))
		store.instance.dispatch(store.autoRu.slice.actions.status("success"))
	} catch (error) {
		console.error("Общая ошибка:", error)
	} finally {
		await browser?.close()
	}
}

export function* xlsxReportFsSaga() {
	yield takeEvery(store.autoRu.slice.actions.report.type, function* (action) {
		try {
			const report = action.payload
			yield call(() => fs.mkdir(path.resolve("reports"), { recursive: true }))

			const file = path.resolve(
				"reports",
				autoRuTools.reportName(report, "xlsx"),
			)

			yield call(() =>
				fs.writeFile(
					file,
					XLSX.write(autoRuTools.xlsx(report), {
						bookType: "xlsx",
						type: "buffer",
					}),
				),
			)

			yield put(
				store.log.slice.actions.push({
					level: "success",
					message: `Файл отчета сохранен: ${file}`,
					timestamp: new Date().toISOString(),
					scope: "autoRu",
				}),
			)
		} catch (error) {
			yield put(
				store.log.slice.actions.push({
					level: "error",
					message: `Не удалось сохранить файл отчета: ${error.stack ? error.stack : error.message}`,
					timestamp: new Date().toISOString(),
					scope: "autoRu",
				}),
			)
		}
	})
}
