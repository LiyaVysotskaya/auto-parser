export function money(v) {
	return v == null || Number.isNaN(Number(v))
		? "—"
		: Number(v).toLocaleString() + " ₽"
}

export function pct(v) {
	return v == null || Number.isNaN(Number(v))
		? "—"
		: `${(Number(v) * 100).toFixed(1)}%`
}
