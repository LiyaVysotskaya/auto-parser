import React from "react"

import {
	DashboardOutlined,
	LineChartOutlined,
	SettingOutlined,
	TableOutlined,
} from "@ant-design/icons"
import _ from "lodash"

import { Layout } from "../layout.js"
import { PriceHistory } from "./auto-ru/PriceHistory.jsx"
import { AutoRu } from "./auto-ru/index.js"
import { AutoRuReport } from "./auto-ru/report.js"
import { Settings } from "./settings/index.js"

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
						label: "Отчет",
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
