import path from "node:path"
import { after, before, describe, it } from "node:test"

import retry from "promise-retry"
import puppeteer from "puppeteer"

import * as lib from "./index.js"

const browser = await puppeteer.launch({
	headless: true,
	userDataDir: path.resolve(".browser"),
})

const [page] = await browser.pages()

const receivedOffers = Promise.withResolvers()

describe("offers", () => {
	after(async () => {
		await browser.close()
	})

	it(`Получает объявления`, async () => {
		await retry(async (handle) => {
			try {
				await page.goto(
					"https://auto.ru/sankt-peterburg/cars/new/?output_type=list",
				)
				await page
					.evaluateHandle(() => {
						return Array.from(document.querySelectorAll("button")).find(
							(element) =>
								/Показать[\w\s]+(предложение|предложения|предложений)/i.test(
									element.textContent ?? "",
								),
						)
					})
					.then((button) => button.asElement())
					.then((element) => element?.click())
				const result = []
				try {
					for await (const item of lib.offers(page)) {
						result.push(item.offer)
						if (result.length > 100) break
					}
				} finally {
					receivedOffers.resolve(result)
				}
				if (result.length < 1) throw new Error("Не получены объявления")
			} catch (error) {
				handle(error)
			}
		})
	})
})

describe("report", () => {
	it("Генерирует отчет по полученным объявлениям", async () => {
		const reportGenerator = lib.report()
		for (const offer of await receivedOffers.promise) {
			reportGenerator.next(offer)
		}
		const receivedReport = reportGenerator.next(lib.END_OF_REPORT).value
		lib.xlsx(receivedReport)
	})
})
