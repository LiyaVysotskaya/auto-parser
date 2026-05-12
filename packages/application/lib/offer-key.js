const SEP = "\u0000"

export function offerFullKey(r) {
	return [
		r.brand,
		r.model,
		r.equipment || "—",
		r.modification || "—",
		String(r.year ?? ""),
		r.dealer || "—",
		r.city || "—",
	].join(SEP)
}

export function offerIdentityKey(row) {
	return [
		row.brand,
		row.model,
		row.equipment ?? "—",
		row.modification ?? "—",
		String(row.year ?? "—"),
	].join(SEP)
}

export function offerPositionKey(offer) {
	return [
		offer.brand,
		offer.model,
		offer.equipment,
		offer.modification,
		String(offer.year ?? ""),
		String(offer.city ?? "—"),
	].join(SEP)
}
