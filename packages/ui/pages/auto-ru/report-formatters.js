export const money = (v) =>
	v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString() + " ₽"

export const pct = (v) =>
	v == null || Number.isNaN(Number(v))
		? "—"
		: `${(Number(v) * 100).toFixed(1)}%`
