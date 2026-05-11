import React from "react"

import {
	DashboardOutlined,
	LineChartOutlined,
	SettingOutlined,
	ShopOutlined,
	TableOutlined,
} from "@ant-design/icons"
import { instance as reduxStore } from "@market-slice/application/store"
import _ from "lodash"

import { Layout } from "../layout.js"
import { Competitors } from "./auto-ru/Competitors.jsx"
import { PriceHistory } from "./auto-ru/PriceHistory.jsx"
import { AutoRu } from "./auto-ru/index.js"
import { AutoRuReport } from "./auto-ru/report.js"
import { Settings } from "./settings/index.js"

function reportRowsBadgeCount() {
	try {
		const report = reduxStore.getState().autoRu?.report || []
		let n = 0
		for (const t of report) {
			if (Array.isArray(t.rows)) n += t.rows.length
		}
		return n
	} catch {
		return 0
	}
}

function reportMenuLabel() {
	const n = reportRowsBadgeCount()
	return (
		<span
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				width: "100%",
				gap: 8,
			}}
		>
			<span>Отчёт</span>
			{n > 0 ? (
				<span className="ms-nav-badge">
					{n > 9999 ? "9999+" : n.toLocaleString("ru-RU")}
				</span>
			) : null}
		</span>
	)
}

export const pages = [
	{
		Component: Layout,
		children: [
			{
				path: "/auto-ru",
				label: "Auto.Ru",
				children: [
					{
						path: "index",
						element: <AutoRu />,
						icon: <DashboardOutlined />,
						label: "Главная",
					},
					{
						path: "report",
						element: <AutoRuReport />,
						icon: <TableOutlined />,
						label: reportMenuLabel(),
					},
					{
						path: "competitors",
						element: <Competitors />,
						icon: <ShopOutlined />,
						label: "Конкуренты",
					},
					{
						path: "price-history",
						element: <PriceHistory />,
						icon: <LineChartOutlined />,
						label: "История цен",
					},
					{
						path: "settings",
						label: "Настройки",
						icon: <SettingOutlined />,
						element: <Settings />,
					},
				],
			},
		],
	},
]

export const defaultRoutes = ["/auto-ru", "/auto-ru/index"]

export const initialEntries = defaultRoutes

export function routes(current = pages) {
	if (_.isArray(current)) return current.map((route) => routes(route))
	return {
		..._.pick(current, ["Component", "element", "path"]),
		...(current.children && { children: routes(current.children) }),
	}
}

export function menu(current = pages, parent) {
	if (_.isArray(current))
		return current
			.map((route) => menu(route, parent))
			.flat()
			.filter(Boolean)
	if (!current.path)
		return menu(current.children, current).flat().filter(Boolean)
	const key = [parent?.path, current.path].filter(Boolean).join("/")
	if (current.hidden) return null
	return {
		key,
		..._.pick(current, ["icon", "label", "disabled"]),
		...(current.children && {
			children: menu(current.children, {
				...current,
				path: key,
			}),
		}),
	}
}

/** Хлебные крошки по дереву меню — без дублирования «Главная / Главная». */
export function breadcrumbItemsFromPath(pathname) {
	function walk(items, path) {
		for (const it of items || []) {
			if (it.key === path) return [{ title: it.label }]
			if (it.children?.length) {
				const inner = walk(it.children, path)
				if (inner) return [{ title: it.label }, ...inner]
			}
		}
		return null
	}
	function labelToTitle(label) {
		if (label == null || typeof label === "string" || typeof label === "number")
			return label
		if (React.isValidElement(label)) {
			const ch = label.props?.children
			if (typeof ch === "string" || typeof ch === "number") return ch
			if (Array.isArray(ch)) {
				for (const c of ch) {
					if (typeof c === "string" || typeof c === "number") return c
					if (
						React.isValidElement(c) &&
						typeof c.props?.children === "string"
					) {
						return c.props.children
					}
				}
			}
			if (React.isValidElement(ch) && typeof ch.props?.children === "string") {
				return ch.props.children
			}
		}
		return "Раздел"
	}
	const trail = walk(menu(), pathname)
	if (trail?.length) {
		return trail.map((t) => ({ title: labelToTitle(t.title) }))
	}
	return [{ title: "Раздел" }]
}
