const INIT_BUTTON_WAIT_MS = 45_000

export async function init(page) {
	try {
		return await page.evaluate((timeoutMs) => {
			function findShowOffersButton() {
				const nodes = Array.from(
					document.querySelectorAll("button, a, [role='button']"),
				)
				return nodes.find((el) => {
					const t = (el.textContent || "").replace(/\s+/g, " ").trim()
					if (!t || /нет\s+предложений/i.test(t)) return false
					return /показать/i.test(t) && /предложен/i.test(t)
				})
			}

			return new Promise((resolve) => {
				let settled = false
				const finish = (value) => {
					if (settled) return
					settled = true
					resolve(value)
				}

				const tryClickShowOffers = () => {
					const button = findShowOffersButton()
					if (!button) return false
					button.click()
					finish(
						parseInt(String(button.textContent || "").replace(/\D/g, ""), 10) ||
							0,
					)
					return true
				}

				const noOffers = Array.from(
					document.querySelectorAll("button, a, [role='button']"),
				).find((el) => /нет\s+предложений/i.test(el.textContent || ""))
				if (noOffers) {
					finish(0)
					return
				}

				if (tryClickShowOffers()) return

				let observer = null
				let pollId = null
				const timer = window.setTimeout(() => {
					observer?.disconnect()
					if (pollId != null) window.clearInterval(pollId)
					finish(0)
				}, timeoutMs)

				observer = new MutationObserver(() => {
					if (tryClickShowOffers()) {
						window.clearTimeout(timer)
						if (pollId != null) window.clearInterval(pollId)
						observer.disconnect()
					}
				})

				observer.observe(document.body, { childList: true, subtree: true })

				pollId = window.setInterval(() => {
					if (tryClickShowOffers()) {
						window.clearTimeout(timer)
						if (pollId != null) window.clearInterval(pollId)
						pollId = null
						observer.disconnect()
					}
				}, 250)
			})
		}, INIT_BUTTON_WAIT_MS)
	} catch (error) {
		console.error("[auto-ru] init failed:", error)
		return 0
	}
}

/**
 * One listing page forward (Auto.Ru shortcut). Avoid DOM heuristics global
 * click — matched wrong controls and skipped pages.
 */
async function goToNextListingPage(page) {
	await page.keyboard.down("ControlLeft")
	await page.keyboard.press("ArrowRight")
	await page.keyboard.up("ControlLeft")
	await new Promise((r) => setTimeout(r, 450))
}

export async function* offers(page) {
	const yieldedIds = new Set()
	let pagination = null

	do {
		let response = null
		try {
			response = await page
				.waitForResponse(
					(res) => /\/ajax\/desktop-search\/listing\//.test(res.url()),
					{ timeout: 60000 },
				)
				.then((res) => res.json())
		} catch {
			console.warn(
				"[auto-ru] No /ajax/desktop-search/listing/ response (timeout); stop pagination.",
			)
			break
		}

		if (!response || response.status !== "SUCCESS") {
			continue
		}

		for (const offer of response.offers) {
			if (yieldedIds.has(offer.id)) continue
			yieldedIds.add(offer.id)
			yield { offer, pagination: response.pagination }
		}

		if (
			pagination &&
			response.pagination &&
			response.pagination.current <= pagination.current
		) {
			await new Promise((r) => setTimeout(r, 500))
			continue
		}
		pagination = response.pagination
		if (!pagination || pagination.current >= pagination.total_page_count) {
			return
		}

		await goToNextListingPage(page)
	} while (true)
}
