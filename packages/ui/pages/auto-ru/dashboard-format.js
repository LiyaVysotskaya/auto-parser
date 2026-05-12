export function medianFromPrices(prices) {
	if (!prices?.length) return null
	const s = [...prices].sort((a, b) => a - b)
	const mid = Math.floor(s.length / 2)
	return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function formatDuration(ms) {
	if (!ms && ms !== 0) return "—"
	const s = Math.floor(ms / 1000)
	const hh = Math.floor(s / 3600)
	const mm = Math.floor((s % 3600) / 60)
	const ss = s % 60
	if (hh) return `${hh}ч ${mm}м ${ss}с`
	if (mm) return `${mm}м ${ss}с`
	return `${ss}с`
}
