export function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}

export function downloadJson(data, filename) {
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: "application/json;charset=utf-8",
	})
	downloadBlob(blob, filename)
}
