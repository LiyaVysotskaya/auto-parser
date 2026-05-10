export const DEFAULT_YEARS = Object.freeze({ from: 2023, to: 2025 })

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
	}
}
