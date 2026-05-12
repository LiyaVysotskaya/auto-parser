import * as autoRuTools from "@market-slice/auto-ru"

import { launchBrowser } from "./browser.js"

export async function fetchCatalogBrands(options, signal) {
	let browser = null
	try {
		browser = await launchBrowser(options)
		const page = await browser.newPage()
		return await autoRuTools.fetchBrands(page, {
			city: options.city,
			signal,
		})
	} finally {
		await browser?.close()
	}
}

export async function fetchCatalogModels(options, brandId, signal) {
	let browser = null
	try {
		browser = await launchBrowser(options)
		const page = await browser.newPage()
		return await autoRuTools.fetchModels(page, {
			city: options.city,
			brandId,
			signal,
		})
	} finally {
		await browser?.close()
	}
}
