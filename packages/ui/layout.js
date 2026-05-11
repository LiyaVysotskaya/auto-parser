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
	theme,
} from "antd"
import * as dateFns from "date-fns"

import { breadcrumbItemsFromPath, defaultRoutes, menu } from "./pages/index.js"
import { useTheme } from "./theme-context.js"

const { Content, Sider, Header } = AntdLayout

export function Layout() {
	const navigate = useNavigate()
	const location = useLocation()
	const logs = useSelector((state) => state.log)
	const { mode, setMode, isDark } = useTheme()
	const [collapsed, setCollapsed] = useState(false)
	const { token } = theme.useToken()

	const breadcrumbItems = breadcrumbItemsFromPath(location.pathname)

	const siderBg = isDark ? token.colorBgElevated : token.colorBgContainer
	const logoBorder = token.colorBorderSecondary

	return (
		<AntdLayout
			hasSider
			style={{ minHeight: "100vh", background: token.colorBgLayout }}
		>
			<Sider
				collapsible
				collapsed={collapsed}
				onCollapse={setCollapsed}
				trigger={null}
				width={220}
				collapsedWidth={80}
				style={{
					overflow: "auto",
					height: "100vh",
					position: "fixed",
					left: 0,
					top: 0,
					bottom: 0,
					background: siderBg,
					borderRight: `0.5px solid ${logoBorder}`,
				}}
			>
				<Menu
					className="ms-sider-menu"
					theme={isDark ? "dark" : "light"}
					mode="inline"
					items={menu()}
					onSelect={({ key }) => navigate(key)}
					selectedKeys={[location.pathname]}
					defaultOpenKeys={defaultRoutes}
					style={{
						background: "transparent",
						borderInlineEnd: "none",
						padding: "8px 6px 16px",
					}}
				/>
			</Sider>
			<AntdLayout
				style={{
					marginLeft: collapsed ? 80 : 220,
					transition: "margin-left 0.2s",
					background: token.colorBgLayout,
				}}
			>
				<Header
					className="ms-header-bar"
					style={{
						padding: "0 20px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						background: token.colorBgLayout,
						height: 56,
						borderBottom: `1px solid ${token.colorBorderSecondary}`,
					}}
				>
					<Space
						align="center"
						size={12}
					>
						<Button
							type="text"
							icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
							onClick={() => setCollapsed(!collapsed)}
							aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
						/>
						<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
							<Breadcrumb
								items={breadcrumbItems}
								style={{
									fontSize: 13,
									color: token.colorTextSecondary,
								}}
							/>
						</div>
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
					className="ms-main-content"
					style={{
						minHeight: "calc(100vh - 56px)",
						overflow: "initial",
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
							a.download = `${dateFns.format(new Date(), "dd MM yyyy HH mm")}.log`
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
