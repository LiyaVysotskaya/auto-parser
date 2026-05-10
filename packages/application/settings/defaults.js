export const DEFAULT_YEARS = Object.freeze({ from: 2023, to: 2026 })

export const CITIES = Object.freeze([
	{ id: "sankt-peterburg", name: "Санкт-Петербург" },
	{ id: "moskva", name: "Москва" },
	{ id: "krasnodar", name: "Краснодар" },
	{ id: "novosibirsk", name: "Новосибирск" },
	{ id: "ekaterinburg", name: "Екатеринбург" },
	{ id: "kazan", name: "Казань" },
	{ id: "nizhniy_novgorod", name: "Нижний Новгород" },
	{ id: "chelyabinsk", name: "Челябинск" },
	{ id: "samara", name: "Самара" },
	{ id: "omsk", name: "Омск" },
	{ id: "rostov_na_donu", name: "Ростов-на-Дону" },
	{ id: "ufa", name: "Уфа" },
	{ id: "krasnoyarsk", name: "Красноярск" },
	{ id: "voronezh", name: "Воронеж" },
	{ id: "perm", name: "Пермь" },
	{ id: "volgograd", name: "Волгоград" },
	{ id: "tyumen", name: "Тюмень" },
	{ id: "irkutsk", name: "Иркутск" },
	{ id: "kaliningrad", name: "Калининград" },
	{ id: "tolyatti", name: "Тольятти" },
])

export const DEFAULT_CITY_ID = "sankt-peterburg"

const CITY_ID_SET = new Set(CITIES.map((c) => c.id))

export function isKnownCityId(id) {
	return typeof id === "string" && CITY_ID_SET.has(id)
}

export function normalizeExtraCityEntry(raw) {
	if (!raw || typeof raw !== "object") return null
	let id = String(raw.id ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "_")
		.replace(/[^a-z0-9_-]/g, "")
	let name = String(raw.name ?? "").trim()
	if (!name && id) name = id
	if (!id && name) {
		id = name
			.toLowerCase()
			.replace(/\s+/g, "_")
			.replace(/[^a-z0-9_-]/g, "")
	}
	if (!id) return null
	return { id, name: name || id }
}

export function mergeCityOptions(extraCities = []) {
	const extras = (Array.isArray(extraCities) ? extraCities : [])
		.map(normalizeExtraCityEntry)
		.filter(Boolean)
		.filter((e) => !CITY_ID_SET.has(e.id))
	const byId = new Map(CITIES.map((c) => [c.id, { ...c }]))
	for (const e of extras) {
		byId.set(e.id, e)
	}
	return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"))
}

export function isAllowedCityId(id, extraCities = []) {
	return (
		typeof id === "string" &&
		mergeCityOptions(extraCities).some((c) => c.id === id)
	)
}

const DEFAULT_BRANDS = Object.freeze([
	{ id: "exeed", name: "Exeed" },
	{ id: "geely", name: "Geely" },
	{ id: "haval", name: "Haval" },
	{ id: "chery", name: "Chery" },
	{ id: "omoda", name: "Omoda" },
	{ id: "jaecoo", name: "Jaecoo" },
	{ id: "belgee", name: "Belgee" },
	{ id: "jetour", name: "Jetour" },
	{ id: "aito", name: "Aito" },
	{ id: "seres", name: "Seres" },
	{ id: "tenet", name: "Tenet" },
])

export function getDefaultBrandIds() {
	return [...DEFAULT_BRANDS.map((b) => b.id)]
}

export function getDefaultSettings() {
	return {
		brands: DEFAULT_BRANDS.map((b) => ({ ...b, selected: true })),
		years: { ...DEFAULT_YEARS },
		city: DEFAULT_CITY_ID,
		extraCities: [],
	}
}
