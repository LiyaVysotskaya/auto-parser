import {
	DEFAULT_YEARS,
	getDefaultSettings,
	isAllowedCityId,
	isKnownCityId,
	normalizeExtraCityEntry,
} from "./defaults.js"

function normalizeModelEntry(raw) {
	if (typeof raw === "string") {
		const id = String(raw).trim().toLowerCase()
		if (!id) return null
		return { id, name: id }
	}
	if (!raw || typeof raw !== "object") return null
	const id = String(raw.id ?? "")
		.trim()
		.toLowerCase()
	if (!id) return null
	const name = String(raw.name ?? raw.id ?? "").trim() || id
	return { id, name }
}

function normalizeBrand(brand) {
	if (typeof brand === "string") {
		const id = String(brand).toLowerCase()
		const name = String(brand).charAt(0).toUpperCase() + String(brand).slice(1)
		return { id, name, selected: true, models: [] }
	}

	const models = Array.isArray(brand.models)
		? brand.models.map(normalizeModelEntry).filter(Boolean)
		: []

	return {
		id: brand.id ?? String(brand.name ?? "").toLowerCase(),
		name: brand.name ?? (brand.id ? String(brand.id).toUpperCase() : ""),
		selected: typeof brand.selected === "boolean" ? brand.selected : true,
		models,
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

export function getSelectedBrandRuns(settings) {
	const normalized = normalizeSettingsOrDefault(settings)
	const selected = normalized.brands.filter((b) => b.selected === true)
	const list = selected.length ? selected : normalized.brands
	return list.map((b) => {
		const ids =
			Array.isArray(b.models) && b.models.length > 0
				? b.models.map((m) => m.id).filter(Boolean)
				: null
		return {
			id: b.id,
			models: ids && ids.length ? ids : null,
		}
	})
}
