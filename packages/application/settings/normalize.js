import {
	DEFAULT_YEARS,
	getDefaultSettings,
	isAllowedCityId,
	isKnownCityId,
	normalizeExtraCityEntry,
} from "./defaults.js"

function normalizeBrand(brand) {
	if (typeof brand === "string") {
		const id = String(brand).toLowerCase()
		const name = String(brand).charAt(0).toUpperCase() + String(brand).slice(1)
		return { id, name, selected: true }
	}

	return {
		id: brand.id ?? String(brand.name ?? "").toLowerCase(),
		name: brand.name ?? (brand.id ? String(brand.id).toUpperCase() : ""),
		selected: typeof brand.selected === "boolean" ? brand.selected : true,
	}
}

function dedupeExtraCities(entries) {
	const out = []
	const seen = new Set()
	for (const e of entries) {
		if (!e?.id || seen.has(e.id)) continue
		seen.add(e.id)
		out.push(e)
	}
	return out
}

export function normalizeStoredSettings(saved) {
	if (!saved || !Array.isArray(saved.brands)) return null
	const defaults = getDefaultSettings()
	const rawExtra = Array.isArray(saved.extraCities) ? saved.extraCities : []
	const extraCities = dedupeExtraCities(
		rawExtra
			.map(normalizeExtraCityEntry)
			.filter(Boolean)
			.filter((e) => !isKnownCityId(e.id)),
	)
	const city = isAllowedCityId(saved.city, extraCities)
		? saved.city
		: defaults.city
	return {
		...saved,
		brands: saved.brands.filter(Boolean).map(normalizeBrand),
		years: saved.years ?? { ...DEFAULT_YEARS },
		city,
		extraCities,
	}
}

export function normalizeSettingsOrDefault(saved) {
	return normalizeStoredSettings(saved) ?? getDefaultSettings()
}

export function getSelectedBrandIds(settings) {
	const normalized = normalizeSettingsOrDefault(settings)
	const selected = normalized.brands
		.filter((brand) => brand.selected === true)
		.map((brand) => brand.id)
		.filter(Boolean)

	return selected.length ? selected : normalized.brands.map((brand) => brand.id)
}
