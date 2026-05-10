import React from "react"
import { Card, Col, Row, Table } from "antd"

export function TopListCard({ icon, title, data, columns }) {
	return (
		<Row style={{ marginBottom: 16 }}>
			<Col span={24}>
				<Card
					title={
						<>
							{icon} {title}
						</>
					}
					size="small"
				>
					<Table
						dataSource={data.map((item, index) => ({
							...item,
							key: index,
						}))}
						columns={columns}
						pagination={false}
						size="small"
					/>
				</Card>
			</Col>
		</Row>
	)
}
