const path = require("node:path")

const { flattenReport } = require("@market-slice/application")

let dbInstance = null

function requireSqlite() {
	try {
		return require("better-sqlite3")
	} catch {
		// In packaged app, better-sqlite3 is in extraResource
		const fromResource = path.join(
			process.resourcesPath,
			"node_modules",
			"better-sqlite3",
		)
		// Use __non_webpack_require__ to bypass webpack bundling
		return typeof __non_webpack_require__ !== "undefined"
			? __non_webpack_require__(fromResource)
			: require(fromResource)
	}
}

function getDb(app) {
	if (dbInstance) return dbInstance
	const Database = requireSqlite()
	if (typeof Database !== "function") {
		const keys = Database ? Object.keys(Database).join(", ") : "null"
		throw new Error(
			`better-sqlite3 вернул ${typeof Database} вместо конструктора. ` +
				`Keys: [${keys}]. Возможно, модуль не был корректно собран electron-rebuild.`,
		)
	}
	const dbPath = path.join(app.getPath("userData"), "price-history.db")
	const db = new Database(dbPath)
	db.pragma("journal_mode = WAL")
	db.exec(`
		CREATE TABLE IF NOT EXISTS runs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			started TEXT NOT NULL,
			finished TEXT,
			city TEXT NOT NULL,
			status TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS offers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			run_id INTEGER NOT NULL,
			brand TEXT NOT NULL,
			model TEXT NOT NULL,
			equipment TEXT,
			modification TEXT,
			year INTEGER,
			city TEXT,
			dealer TEXT,
			count INTEGER,
			price REAL,
			price_min REAL,
			second_price REAL,
			max_discount REAL,
			tradein_discount REAL,
			credit_discount REAL,
			insurance_discount REAL,
			FOREIGN KEY (run_id) REFERENCES runs(id)
		);
		CREATE INDEX IF NOT EXISTS idx_offers_run ON offers(run_id);
		CREATE INDEX IF NOT EXISTS idx_offers_brand ON offers(brand);
		CREATE INDEX IF NOT EXISTS idx_offers_dealer ON offers(dealer);
		CREATE INDEX IF NOT EXISTS idx_offers_model ON offers(brand, model);
		CREATE TABLE IF NOT EXISTS favorites (
			brand TEXT NOT NULL,
			model TEXT NOT NULL,
			equipment TEXT NOT NULL,
			modification TEXT NOT NULL,
			year TEXT NOT NULL,
			PRIMARY KEY (brand, model, equipment, modification, year)
		);
	`)
	dbInstance = db
	return db
}

function coerceYear(y) {
	if (typeof y === "number" && Number.isFinite(y)) return y
	const n = parseInt(String(y ?? "").replace(/\D/g, ""), 10)
	return Number.isFinite(n) ? n : null
}

function persistRun(app, payload) {
	const db = getDb(app)
	const { rowsFlat } = flattenReport(payload.report || [])
	const cityLabel =
		payload.cities && payload.cities.length ? payload.cities.join(",") : "—"
	const insertRun = db.prepare(
		`INSERT INTO runs (started, finished, city, status) VALUES (@started, @finished, @city, @status)`,
	)
	const info = insertRun.run({
		started: payload.startedIso,
		finished: payload.finishedIso,
		city: cityLabel,
		status: payload.status,
	})
	const runId = Number(info.lastInsertRowid)
	const ins = db.prepare(`
		INSERT INTO offers (
			run_id, brand, model, equipment, modification, year, city, dealer, count,
			price, price_min, second_price, max_discount,
			tradein_discount, credit_discount, insurance_discount
		) VALUES (
			@run_id, @brand, @model, @equipment, @modification, @year, @city, @dealer, @count,
			@price, @price_min, @second_price, @max_discount,
			@tradein_discount, @credit_discount, @insurance_discount
		)
	`)
	const tx = db.transaction((rows) => {
		for (const o of rows) {
			ins.run({
				run_id: runId,
				brand: String(o.brand ?? ""),
				model: String(o.model ?? ""),
				equipment: String(o.equipment ?? ""),
				modification: String(o.modification ?? ""),
				year: coerceYear(o.year),
				city: String(o.city ?? ""),
				dealer: String(o.dealer ?? ""),
				count: o.count ?? 0,
				price: o.price,
				price_min: o.priceMin,
				second_price: o.secondPrice,
				max_discount: o.maxDiscount,
				tradein_discount: o.tradeInDiscount,
				credit_discount: o.creditDiscount,
				insurance_discount: o.insuranceDiscount,
			})
		}
	})
	tx(rowsFlat)
}

function listRuns(app, { dateFrom, dateTo } = {}) {
	const db = getDb(app)
	let sql = `
		SELECT r.id, r.started, r.finished, r.city, r.status,
			(SELECT COUNT(*) FROM offers o WHERE o.run_id = r.id) AS offer_count
		FROM runs r
		WHERE 1=1
	`
	const params = {}
	if (dateFrom) {
		sql += ` AND r.started >= @df`
		params.df = dateFrom
	}
	if (dateTo) {
		sql += ` AND r.started <= @dt`
		params.dt = dateTo
	}
	sql += ` ORDER BY r.started DESC`
	return db.prepare(sql).all(params)
}

function queryOffers(app, filters) {
	const db = getDb(app)
	const { dateFrom, dateTo, brands, models, dealers, cities, runIds } =
		filters || {}
	let sql = `
		SELECT o.*, r.started AS run_started, r.status AS run_status
		FROM offers o
		JOIN runs r ON r.id = o.run_id
		WHERE 1=1
	`
	const params = {}
	if (dateFrom) {
		sql += ` AND r.started >= @df`
		params.df = dateFrom
	}
	if (dateTo) {
		sql += ` AND r.started <= @dt`
		params.dt = dateTo
	}
	if (Array.isArray(brands) && brands.length) {
		sql += ` AND o.brand IN (${brands.map((_, i) => `@b${i}`).join(",")})`
		brands.forEach((b, i) => {
			params[`b${i}`] = b
		})
	}
	if (Array.isArray(models) && models.length) {
		sql += ` AND o.model IN (${models.map((_, i) => `@m${i}`).join(",")})`
		models.forEach((m, i) => {
			params[`m${i}`] = m
		})
	}
	if (Array.isArray(dealers) && dealers.length) {
		sql += ` AND o.dealer IN (${dealers.map((_, i) => `@d${i}`).join(",")})`
		dealers.forEach((d, i) => {
			params[`d${i}`] = d
		})
	}
	if (Array.isArray(cities) && cities.length) {
		sql += ` AND o.city IN (${cities.map((_, i) => `@c${i}`).join(",")})`
		cities.forEach((c, i) => {
			params[`c${i}`] = c
		})
	}
	if (Array.isArray(runIds) && runIds.length) {
		sql += ` AND o.run_id IN (${runIds.map((_, i) => `@r${i}`).join(",")})`
		runIds.forEach((id, i) => {
			params[`r${i}`] = id
		})
	}
	sql += ` ORDER BY r.started DESC, o.brand, o.model`
	return db.prepare(sql).all(params)
}

function filterMeta(app) {
	const db = getDb(app)
	const brands = db
		.prepare(`SELECT DISTINCT brand FROM offers ORDER BY brand`)
		.all()
		.map((r) => r.brand)
	const dealers = db
		.prepare(
			`SELECT DISTINCT dealer FROM offers WHERE dealer != '' ORDER BY dealer`,
		)
		.all()
		.map((r) => r.dealer)
	const cities = db
		.prepare(`SELECT DISTINCT city FROM offers WHERE city != '' ORDER BY city`)
		.all()
		.map((r) => r.city)
	const models = db
		.prepare(`SELECT DISTINCT model FROM offers ORDER BY model`)
		.all()
		.map((r) => r.model)
	return { brands, dealers, cities, models }
}

function exportHistory(app, { dateFrom, dateTo } = {}) {
	const db = getDb(app)
	let runSql = `SELECT * FROM runs WHERE 1=1`
	const rp = {}
	if (dateFrom) {
		runSql += ` AND started >= @df`
		rp.df = dateFrom
	}
	if (dateTo) {
		runSql += ` AND started <= @dt`
		rp.dt = dateTo
	}
	const runs = db.prepare(runSql).all(rp)
	const ids = runs.map((r) => r.id)
	if (!ids.length) return { runs: [], offers: [] }
	const placeholders = ids.map(() => "?").join(",")
	const offers = db
		.prepare(
			`SELECT * FROM offers WHERE run_id IN (${placeholders}) ORDER BY run_id, id`,
		)
		.all(...ids)
	return { runs, offers }
}

function importHistory(app, data) {
	const db = getDb(app)
	const runs = Array.isArray(data?.runs) ? data.runs : []
	const offers = Array.isArray(data?.offers) ? data.offers : []
	let imported = 0
	let skipped = 0
	const checkDup = db.prepare(
		`SELECT id FROM runs WHERE started = @started AND city = @city LIMIT 1`,
	)
	const insRun = db.prepare(
		`INSERT INTO runs (started, finished, city, status) VALUES (@started, @finished, @city, @status)`,
	)
	const insOffer = db.prepare(`
		INSERT INTO offers (
			run_id, brand, model, equipment, modification, year, city, dealer, count,
			price, price_min, second_price, max_discount,
			tradein_discount, credit_discount, insurance_discount
		) VALUES (
			@run_id, @brand, @model, @equipment, @modification, @year, @city, @dealer, @count,
			@price, @price_min, @second_price, @max_discount,
			@tradein_discount, @credit_discount, @insurance_discount
		)
	`)
	const tx = db.transaction(() => {
		for (const run of runs) {
			const dup = checkDup.get({
				started: run.started,
				city: run.city,
			})
			if (dup) {
				skipped++
				continue
			}
			const info = insRun.run({
				started: run.started,
				finished: run.finished ?? null,
				city: run.city,
				status: run.status ?? "success",
			})
			const newId = Number(info.lastInsertRowid)
			imported++
			const oldId = run.id
			for (const o of offers) {
				if (Number(o.run_id) !== Number(oldId)) continue
				insOffer.run({
					run_id: newId,
					brand: o.brand,
					model: o.model,
					equipment: o.equipment ?? "",
					modification: o.modification ?? "",
					year: o.year,
					city: o.city ?? "",
					dealer: o.dealer ?? "",
					count: o.count ?? 0,
					price: o.price,
					price_min: o.price_min,
					second_price: o.second_price,
					max_discount: o.max_discount,
					tradein_discount: o.tradein_discount,
					credit_discount: o.credit_discount,
					insurance_discount: o.insurance_discount,
				})
			}
		}
	})
	tx()
	return { imported, skipped }
}

function clearHistory(app) {
	const db = getDb(app)
	db.exec(`DELETE FROM offers; DELETE FROM runs;`)
}

function flattenRowsForRun(db, runId) {
	return db
		.prepare(
			`
		SELECT brand, model, equipment, modification, year, city, dealer, count,
			price, price_min, second_price, max_discount,
			tradein_discount, credit_discount, insurance_discount
		FROM offers WHERE run_id = ?
	`,
		)
		.all(runId)
		.map((o) => ({
			brand: o.brand,
			model: o.model,
			equipment: o.equipment,
			modification: o.modification,
			year: o.year,
			city: o.city,
			dealer: o.dealer,
			count: o.count,
			price: o.price,
			priceMin: o.price_min,
			secondPrice: o.second_price,
			maxDiscount: o.max_discount,
			tradeInDiscount: o.tradein_discount,
			creditDiscount: o.credit_discount,
			insuranceDiscount: o.insurance_discount,
		}))
}

function diffKey(o) {
	return [
		o.brand,
		o.model,
		o.equipment || "—",
		o.modification || "—",
		String(o.year ?? ""),
		o.dealer || "—",
		o.city || "—",
	].join("\u0000")
}

function diffRuns(app, runIdA, runIdB) {
	const db = getDb(app)
	const a = flattenRowsForRun(db, runIdA)
	const b = flattenRowsForRun(db, runIdB)
	const mapA = new Map()
	for (const row of a) mapA.set(diffKey(row), row)
	const mapB = new Map()
	for (const row of b) mapB.set(diffKey(row), row)
	const rows = []
	const keys = new Set([...mapA.keys(), ...mapB.keys()])
	for (const k of keys) {
		const ra = mapA.get(k)
		const rb = mapB.get(k)
		if (ra && !rb) {
			rows.push({
				key: k,
				change: "removed",
				...pickRow(ra),
				priceA: ra.price,
				priceB: null,
				pct: null,
			})
			continue
		}
		if (!ra && rb) {
			rows.push({
				key: k,
				change: "added",
				...pickRow(rb),
				priceA: null,
				priceB: rb.price,
				pct: null,
			})
			continue
		}
		const pa = ra.price
		const pb = rb.price
		if (pa == null && pb == null) {
			rows.push({
				key: k,
				change: "unchanged",
				...pickRow(ra),
				priceA: pa,
				priceB: pb,
				pct: null,
			})
			continue
		}
		if (pa === pb || (pa != null && pb != null && Math.abs(pa - pb) < 0.5)) {
			rows.push({
				key: k,
				change: "unchanged",
				...pickRow(ra),
				priceA: pa,
				priceB: pb,
				pct: 0,
			})
			continue
		}
		const pct = pa && pb ? (pb - pa) / pa : null
		rows.push({
			key: k,
			change: "price",
			...pickRow(ra),
			priceA: pa,
			priceB: pb,
			pct,
		})
	}
	return rows.sort((x, y) => {
		const ord = { added: 0, removed: 1, price: 2, unchanged: 3 }
		return (ord[x.change] ?? 9) - (ord[y.change] ?? 9)
	})
}

function pickRow(o) {
	return {
		brand: o.brand,
		model: o.model,
		equipment: o.equipment,
		modification: o.modification,
		year: o.year,
		city: o.city,
		dealer: o.dealer,
	}
}

function listFavorites(app) {
	const db = getDb(app)
	return db
		.prepare(
			`SELECT brand, model, equipment, modification, year FROM favorites ORDER BY brand, model`,
		)
		.all()
}

function addFavorite(app, row) {
	const db = getDb(app)
	db.prepare(
		`
		INSERT OR REPLACE INTO favorites (brand, model, equipment, modification, year)
		VALUES (@brand, @model, @equipment, @modification, @year)
	`,
	).run({
		brand: String(row.brand ?? ""),
		model: String(row.model ?? ""),
		equipment: String(row.equipment ?? "—"),
		modification: String(row.modification ?? "—"),
		year: String(row.year ?? "—"),
	})
}

function removeFavorite(app, row) {
	const db = getDb(app)
	db.prepare(
		`
		DELETE FROM favorites WHERE brand = @brand AND model = @model
			AND equipment = @equipment AND modification = @modification AND year = @year
	`,
	).run({
		brand: String(row.brand ?? ""),
		model: String(row.model ?? ""),
		equipment: String(row.equipment ?? "—"),
		modification: String(row.modification ?? "—"),
		year: String(row.year ?? "—"),
	})
}

module.exports = {
	persistRun,
	listRuns,
	queryOffers,
	filterMeta,
	exportHistory,
	importHistory,
	clearHistory,
	diffRuns,
	listFavorites,
	addFavorite,
	removeFavorite,
}
