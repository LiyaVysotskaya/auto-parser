import React from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

import { BugOutlined } from "@ant-design/icons"
import * as store from "@market-slice/application/store"
import { Layout as AntdLayout, FloatButton, Menu } from "antd"
import * as dateFns from "date-fns"

import { defaultRoutes, menu } from "./pages/index.js"

const { Content, Sider } = AntdLayout

export function Layout() {
	const navigate = useNavigate()

	return (
		<AntdLayout hasSider>
			<Sider
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
					onSelect={({ key }) => {
						navigate(key)
					}}
					selectedKeys={[useLocation().pathname]}
					defaultOpenKeys={defaultRoutes}
				/>
			</Sider>
			<AntdLayout
				style={{
					marginLeft: 200,
				}}
			>
				<Content
					style={{
						minHeight: "100vh",
						overflow: "initial",
						padding: "16px",
					}}
				>
					<Outlet />
					<FloatButton
						tooltip={"Скачать лог"}
						icon={<BugOutlined />}
						onClick={() => {
							const a = document.createElement("a")
							const href = (a.href = URL.createObjectURL(
								new Blob(
									[
										store.log.list
											.map((record) => JSON.stringify(record))
											.join("\n"),
									],
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
