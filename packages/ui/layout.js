import React, { useState } from "react"
import { useSelector } from "react-redux"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

import {
	BugOutlined,
	DesktopOutlined,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	MoonOutlined,
	SunOutlined,
} from "@ant-design/icons"
import {
	Layout as AntdLayout,
	Breadcrumb,
	Button,
	FloatButton,
	Menu,
	Segmented,
	Space,
} from "antd"
import * as dateFns from "date-fns"

import { defaultRoutes, menu, pages } from "./pages/index.js"
import { useTheme } from "./theme-context.js"

const { Content, Sider, Header } = AntdLayout

function buildBreadcrumb(pathname) {
	const segments = pathname.split("/").filter(Boolean)
	const items = [{ title: "Главная" }]

	function findLabel(nodes, path) {
		for (const node of nodes) {
			if (node.path === path) return node.label
			if (node.children) {
				const found = findLabel(node.children, path)
				if (found) return found
			}
		}
		return null
	}

	let current = ""
	for (const seg of segments) {
		current += "/" + seg
		const label = findLabel(pages, seg)
		if (label) items.push({ title: label })
	}

	return items
}

export function Layout() {
	const navigate = useNavigate()
	const location = useLocation()
	const logs = useSelector((state) => state.log)
	const { mode, setMode } = useTheme()
	const [collapsed, setCollapsed] = useState(false)

	const breadcrumbItems = buildBreadcrumb(location.pathname)

	return (
		<AntdLayout
			hasSider
			style={{ minHeight: "100vh" }}
		>
			<Sider
				collapsible
				collapsed={collapsed}
				onCollapse={setCollapsed}
				trigger={null}
				style={{
					overflow: "auto",
					height: "100vh",
					position: "fixed",
					left: 0,
					top: 0,
					bottom: 0,
				}}
			>
				<Menu
					theme="dark"
					mode="inline"
					items={menu()}
					onSelect={({ key }) => navigate(key)}
					selectedKeys={[location.pathname]}
					defaultOpenKeys={defaultRoutes}
				/>
			</Sider>
			<AntdLayout
				style={{
					marginLeft: collapsed ? 80 : 200,
					transition: "margin-left 0.2s",
				}}
			>
				<Header
					style={{
						padding: "0 16px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						background: "transparent",
						height: 48,
					}}
				>
					<Space>
						<Button
							type="text"
							icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
							onClick={() => setCollapsed(!collapsed)}
						/>
						<Breadcrumb items={breadcrumbItems} />
					</Space>
					<Segmented
						size="small"
						value={mode}
						onChange={setMode}
						options={[
							{ value: "light", icon: <SunOutlined /> },
							{ value: "system", icon: <DesktopOutlined /> },
							{ value: "dark", icon: <MoonOutlined /> },
						]}
					/>
				</Header>
				<Content
					style={{
						minHeight: "calc(100vh - 48px)",
						overflow: "initial",
						padding: 16,
					}}
				>
					<Outlet />
					<FloatButton
						tooltip="Скачать лог"
						icon={<BugOutlined />}
						onClick={() => {
							const a = document.createElement("a")
							const href = (a.href = URL.createObjectURL(
								new Blob(
									[logs.map((record) => JSON.stringify(record)).join("\n")],
									{ type: "text/plain" },
								),
							))
							a.download = `${dateFns.format(new Date(), "dd_MM_yyyy_HH_mm")}.log`
							document.body.appendChild(a)
							a.click()
							document.body.removeChild(a)
							URL.revokeObjectURL(href)
						}}
					/>
				</Content>
			</AntdLayout>
		</AntdLayout>
	)
}
