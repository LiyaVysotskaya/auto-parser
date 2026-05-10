import React from "react"
import { useDispatch, useSelector } from "react-redux"

import { updateYears } from "@market-slice/application/slices/settings.js"
import { Col, InputNumber, Row, Space, Typography } from "antd"

const { Title, Text } = Typography

export function YearsSettings() {
	const dispatch = useDispatch()
	const years = useSelector((state) => state.settings.years)

	const handleChange = (field, value) => {
		dispatch(updateYears({ ...years, [field]: value }))
	}

	return (
		<Space direction="vertical" style={{ width: "100%" }} size="middle">
			<Title level={5}>Диапазон годов выпуска</Title>
			<Text type="secondary">
				Указывает, автомобили каких годов выпуска будут собираться при
				парсинге.
			</Text>
			<Row gutter={16} style={{ maxWidth: 400 }}>
				<Col span={12}>
					<label>Год от:</label>
					<InputNumber
						min={2000}
						max={2030}
						value={years.from}
						onChange={(value) => handleChange("from", value)}
						style={{ width: "100%", marginTop: 8 }}
					/>
				</Col>
				<Col span={12}>
					<label>Год до:</label>
					<InputNumber
						min={2000}
						max={2030}
						value={years.to}
						onChange={(value) => handleChange("to", value)}
						style={{ width: "100%", marginTop: 8 }}
					/>
				</Col>
			</Row>
		</Space>
	)
}
