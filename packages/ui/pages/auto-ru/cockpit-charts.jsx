import React, { useMemo } from "react"
import {
	Area,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ComposedChart,
	Line,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import { theme } from "antd"

import { REF } from "../../theme-tokens.js"

function runPriceTrendTooltip({ active, payload, label }, token, getCityLabel) {
	if (!active || !payload?.length) return null
	const p = payload[0]?.payload || {}
	const minTitle = [p.minCarBrand, p.minCarModel].filter(Boolean).join(" ").trim()
	const minLoc = [
		p.minCarDealer,
		p.minCarCity && p.minCarCity !== "—" ? getCityLabel(p.minCarCity) : null,
	]
		.filter(Boolean)
		.join(" · ")
	return (
		<div
			style={{
				background: token.colorBgElevated,
				border: `0.5px solid ${token.colorBorder}`,
				borderRadius: 6,
				fontSize: 12,
				padding: "8px 10px",
				maxWidth: 300,
			}}
		>
			<div style={{ color: token.colorTextTertiary, fontSize: 11, marginBottom: 4 }}>
				{label}
			</div>
			<div style={{ fontWeight: 600, marginBottom: 2 }}>
				Медиана: {p.value != null ? `${p.value} тыс ₽` : "—"}
			</div>
			<div style={{ color: token.colorTextSecondary, fontSize: 11, marginBottom: 6 }}>
				По всем строкам отчёта в этом запуске (типичный уровень цен).
			</div>
			<div style={{ fontWeight: 500, marginBottom: 2 }}>
				Минимум: {p.minValue != null ? `${p.minValue} тыс ₽` : "—"}
			</div>
			{minTitle ? (
				<div style={{ color: token.colorText, marginBottom: 2, fontSize: 11 }}>{minTitle}</div>
			) : null}
			{minLoc ? (
				<div style={{ color: token.colorTextSecondary, fontSize: 11 }}>{minLoc}</div>
			) : minTitle ? (
				<div style={{ color: token.colorTextTertiary, fontSize: 11 }}>
					Нет привязки к дилеру в записи истории
				</div>
			) : null}
		</div>
	)
}

export function CockpitMinPriceLine({ data, height = 140, getCityLabel = (x) => x }) {
	const { token } = theme.useToken()
	const stroke = REF.acc
	const fill = "rgba(55,138,221,0.12)"
	const grid = token.colorBorderSecondary
	const minStroke = token.colorTextTertiary

	if (!data?.length) {
		return (
			<div
				style={{
					height,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: token.colorTextTertiary,
					fontSize: 12,
				}}
			>
				Нет данных истории
			</div>
		)
	}

	return (
		<div style={{ height, width: "100%" }}>
			<ResponsiveContainer width="100%" height="100%">
				<ComposedChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} opacity={0.45} />
					<XAxis
						dataKey="label"
						tick={{ fontSize: 10, fill: token.colorTextTertiary }}
						stroke={grid}
						interval="preserveStartEnd"
					/>
					<YAxis
						tick={{ fontSize: 10, fill: token.colorTextTertiary }}
						stroke={grid}
						tickFormatter={(v) => `${v}`}
						width={36}
					/>
					<Tooltip content={(props) => runPriceTrendTooltip(props, token, getCityLabel)} />
					<Area type="monotone" dataKey="value" stroke="none" fill={fill} fillOpacity={1} />
					<Line
						type="monotone"
						dataKey="minValue"
						stroke={minStroke}
						strokeWidth={1}
						strokeDasharray="4 3"
						dot={false}
						activeDot={{ r: 3, fill: minStroke }}
					/>
					<Line
						type="monotone"
						dataKey="value"
						stroke={stroke}
						strokeWidth={1.5}
						dot={{ r: 3, fill: stroke, strokeWidth: 0 }}
						activeDot={{ r: 4 }}
					/>
				</ComposedChart>
			</ResponsiveContainer>
		</div>
	)
}

export function CockpitBrandDonut({ slices, height = 140 }) {
	const { token } = theme.useToken()
	const data = useMemo(
		() =>
			(slices || [])
				.filter((s) => s.value > 0)
				.map((s) => ({
					name: s.name,
					value: s.value,
					fill: s.color,
				})),
		[slices],
	)

	if (!data.length) {
		return (
			<div
				style={{
					height,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: token.colorTextTertiary,
					fontSize: 12,
				}}
			>
				Загрузите отчёт
			</div>
		)
	}

	const inner = Math.round(height * 0.36)

	return (
		<div style={{ height, width: "100%" }}>
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
						data={data}
						dataKey="value"
						nameKey="name"
						cx="50%"
						cy="50%"
						innerRadius={inner}
						outerRadius={Math.round(height * 0.38)}
						paddingAngle={1}
						stroke={token.colorBgContainer}
						strokeWidth={2}
					>
						{data.map((e, i) => (
							<Cell key={i} fill={e.fill} />
						))}
					</Pie>
					<Tooltip
						contentStyle={{
							background: token.colorBgElevated,
							border: `0.5px solid ${token.colorBorder}`,
							borderRadius: 6,
							fontSize: 12,
						}}
						formatter={(v, n, p) => [
							`${Number(v).toLocaleString("ru-RU")} предл.`,
							p?.payload?.name,
						]}
					/>
				</PieChart>
			</ResponsiveContainer>
		</div>
	)
}

export function CockpitDonutLegend({ slices }) {
	const { token } = theme.useToken()
	const list = (slices || []).filter((s) => s.value > 0)
	if (!list.length) return null
	return (
		<div className="ms-donut-legend">
			{list.map((s) => (
				<div key={s.name} className="ms-donut-legend-item">
					<span className="ms-donut-legend-dot" style={{ background: s.color }} />
					<span style={{ color: token.colorTextSecondary, fontSize: 11 }}>
						{s.name} · {s.value.toLocaleString("ru-RU")}
					</span>
				</div>
			))}
		</div>
	)
}

export function CockpitModelHBar({ rows, height = 180 }) {
	const { token } = theme.useToken()
	const grid = token.colorBorderSecondary
	const colors = [REF.acc2, REF.acc2, REF.acc, "#0C447C", "#0C447C"]

	if (!rows?.length) {
		return (
			<div
				style={{
					height,
					color: token.colorTextTertiary,
					fontSize: 12,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				Нет данных
			</div>
		)
	}

	return (
		<div style={{ height, width: "100%" }}>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					layout="vertical"
					data={rows}
					margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
				>
					<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={grid} opacity={0.4} />
					<XAxis type="number" tick={{ fontSize: 10, fill: token.colorTextTertiary }} stroke={grid} />
					<YAxis
						type="category"
						dataKey="name"
						width={72}
						tick={{ fontSize: 10, fill: token.colorTextTertiary }}
					/>
					<Tooltip
						contentStyle={{
							background: token.colorBgElevated,
							border: `0.5px solid ${token.colorBorder}`,
							borderRadius: 6,
							fontSize: 12,
						}}
						formatter={(v) => [`${v} предл.`, ""]}
					/>
					<Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={18}>
						{rows.map((_, i) => (
							<Cell key={i} fill={colors[i % colors.length]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}
