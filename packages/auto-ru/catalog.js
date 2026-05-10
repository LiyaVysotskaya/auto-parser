const GOTO_OPTIONS = Object.freeze({
	waitUntil: "networkidle2",
	timeout: 60_000,
})

const EXCLUDED_CAR_PATH_SLUGS = new Set([
	"new",
	"used",
	"all",
	"dealer",
	"electro",
	"moto",
	"scooters",
	"atv",
	"snowmobiles",
	"gruzoviki",
	"spectehnika",
	"price",
	"catalog",
	"podbor",
	"reviews",
	"compare",
	"stats",
	"report",
])

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms))
}

export async function fetchBrands(page, { city, signal } = {}) {
	const region = (city && String(city).trim()) || "sankt-peterburg"
	const url = `https://auto.ru/${region}/cars/new/?output_type=list`
	await page.goto(url, { ...GOTO_OPTIONS, signal })
	await sleep(450)

	const excluded = [...EXCLUDED_CAR_PATH_SLUGS]

	return page.evaluate(
		(regionArg, excludedArr) => {
			const excludedSet = new Set(excludedArr)
			const seen = new Map()
			const re = new RegExp(`^/${regionArg}/cars/([^/]+)(?:/|$)`)
			for (const a of document.querySelectorAll("a[href]")) {
				let href = a.getAttribute("href") || ""
				if (href.startsWith("//")) href = `https:${href}`
				let pathname = href
				try {
					const u = new URL(href, location.origin)
					pathname = u.pathname
				} catch {
					continue
				}
				const m = pathname.match(re)
				if (!m) continue
				const slug = m[1].toLowerCase()
				if (excludedSet.has(slug)) continue
				if (!/^[a-z0-9-]+$/.test(slug)) continue
				const text = (a.textContent || "").replace(/\s+/g, " ").trim()
				const name = text.length >= 1 && text.length <= 80 ? text : slug
				if (!seen.has(slug)) seen.set(slug, name)
			}
			return [...seen.entries()]
				.map(([id, name]) => ({ id, name }))
				.sort((a, b) => a.name.localeCompare(b.name, "ru"))
		},
		region,
		excluded,
	)
}

export async function fetchModels(page, { city, brandId, signal } = {}) {
	const region = (city && String(city).trim()) || "sankt-peterburg"
	const mark = String(brandId || "")
		.trim()
		.toLowerCase()
	if (!mark) return []

	const url = `https://auto.ru/${region}/cars/${mark}/new/?output_type=list`
	await page.goto(url, { ...GOTO_OPTIONS, signal })
	await sleep(450)

	const excluded = [...EXCLUDED_CAR_PATH_SLUGS, mark]

	return page.evaluate(
		({ regionArg, markArg, excludedArr }) => {
			const excludedSet = new Set(excludedArr)
			const seen = new Map()
			const re = new RegExp(`^/${regionArg}/cars/${markArg}/([^/]+)(?:/|$)`)
			for (const a of document.querySelectorAll("a[href]")) {
				let href = a.getAttribute("href") || ""
				if (href.startsWith("//")) href = `https:${href}`
				let pathname = href
				try {
					const u = new URL(href, location.origin)
					pathname = u.pathname
				} catch {
					continue
				}
				const m = pathname.match(re)
				if (!m) continue
				const slug = m[1].toLowerCase()
				if (excludedSet.has(slug)) continue
				if (!/^[a-z0-9-]+$/.test(slug)) continue
				const text = (a.textContent || "").replace(/\s+/g, " ").trim()
				const name = text.length >= 1 && text.length <= 80 ? text : slug
				if (!seen.has(slug)) seen.set(slug, name)
			}
			return [...seen.entries()]
				.map(([id, name]) => ({ id, name }))
				.sort((a, b) => a.name.localeCompare(b.name, "ru"))
		},
		{ regionArg: region, markArg: mark, excludedArr: excluded },
	)
}
