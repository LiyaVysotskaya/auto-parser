import React, { useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { Button, Card, Flex, Form, Input, Layout, message } from "antd"
import * as dateFns from "date-fns"

import { defaultRoutes } from "./index.js"

export function Authorization() {
	const navigate = useNavigate()
	const onFinish = useCallback(
		(values) => {
			fetch(process.env.ELECTRON_RENDERER_AUTH_ENDPOINT, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			})
				.then((res) => {
					if (!res.ok) return Promise.reject(new Error())
				})
				.then(() => {
					localStorage.setItem("authorized", new Date().toISOString())
					navigate(/** @type {string} */ (defaultRoutes.at(-1)))
				})
				.catch(() => {
					message.error("Не удалось авторизоваться")
				})
		},
		[navigate],
	)

	useEffect(() => {
		const value = localStorage.getItem("authorized") ?? ""
		if (
			value === "true" ||
			dateFns.differenceInDays(new Date(), new Date(value)) < 1
		)
			navigate(/** @type {string} */ (defaultRoutes.at(-1)))
	}, [])

	return (
		<Layout>
			<Layout.Content>
				<Flex
					justify="center"
					align="center"
					style={{ minHeight: "100vh" }}
				>
					<div style={{ marginBottom: 64 }}>
						<Card>
							<Form
								name="login"
								style={{
									maxWidth: 600,
									minWidth: 300,
								}}
								initialValues={{}}
								onFinish={onFinish}
								autoComplete="off"
								layout="vertical"
							>
								<Form.Item
									label="Имя пользователя"
									name="username"
									rules={[
										{
											required: true,
											message: "Необходимо ввести имя пользователя!",
										},
									]}
									style={{ width: "100%" }}
								>
									<Input />
								</Form.Item>

								<Form.Item
									label="Пароль"
									name="password"
									rules={[
										{
											required: true,
											message: "Необходимо ввести пароль!",
										},
									]}
								>
									<Input.Password />
								</Form.Item>

								<Flex justify="center">
									<Form.Item style={{ marginBottom: 0 }}>
										<Button
											type="primary"
											htmlType="submit"
										>
											Войти
										</Button>
									</Form.Item>
								</Flex>
							</Form>
						</Card>
					</div>
				</Flex>
			</Layout.Content>
		</Layout>
	)
}
