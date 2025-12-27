import React from "react"
import { useSelector } from "react-redux"

import { DownloadOutlined, PlayCircleOutlined } from "@ant-design/icons"
import * as store from "@market-slice/application/store"
import * as autoRuTools from "@market-slice/auto-ru"
import {
	Alert,
	Button,
	Card,
	Flex,
	Progress,
	Space,
	Statistic,
	Tag,
} from "antd"
import * as dateFns from "date-fns"
import * as XLSX from "xlsx"

import { electron } from "../../electron.js"

export function AutoRu() {
	const state = useSelector(() => store.instance.getState().autoRu)
	const log = useSelector(() =>
		store.instance.getState().log.filter(({ scope }) => scope === "autoRu"),
	)
	const counters = {
		pagination: {
			current: state.pagination?.current ?? 0,
			total: state.pagination?.total_page_count ?? 0,
		},
		offers: {
			current: state.count ?? 0,
			total: Math.min(
				(state.pagination?.page_size ?? 0) *
					(state.pagination?.total_page_count ?? 0),
				state.pagination?.total_offers_count ?? 0,
			),
		},
	}

	return (
		<>
			<Space
				direction="vertical"
				style={{ width: "100%", marginTop: 16 }}
				size="large"
			>
				<Flex
					gap={16}
					justify="space-between"
					align="start"
				>
					<Space wrap>
						<Button
							icon={<PlayCircleOutlined />}
							disabled={state.status === "pending"}
							onClick={() => {
								electron?.autoRu()
							}}
						>
							Старт
						</Button>
						<Button
							icon={<DownloadOutlined />}
							disabled={state.status !== "success"}
							onClick={() => {
								XLSX.writeFile(
									autoRuTools.xlsx(store.instance.getState().autoRu.report),
									autoRuTools.reportName(
										store.instance.getState().autoRu.report,
										"xlsx",
									),
								)
							}}
						>
							Скачать отчет
						</Button>
					</Space>
					<Space wrap>
						{state.status === "success" && <Tag color="green">Успех</Tag>}
						{state.status === "pending" && <Tag color="blue">В процессе</Tag>}
						{state.status === "failed" && <Tag color="red">Ошибка</Tag>}
						{!state.status && <Tag>Ожидание</Tag>}
					</Space>
				</Flex>
				<Flex gap={16}>
					<Card title={"Страницы"}>
						<Space
							direction="vertical"
							style={{ width: "100%" }}
						>
							<Flex justify="center">
								<Progress
									type="dashboard"
									percent={Math.floor(
										(counters.pagination.current * 100) /
											counters.pagination.total,
									)}
								/>
							</Flex>
							<Flex justify="center">
								<Statistic
									value={counters.pagination.current}
									suffix={`/ ${counters.pagination.total.toLocaleString()}`}
								/>
							</Flex>
						</Space>
					</Card>
					<Card title="Объявления">
						<Space
							direction="vertical"
							style={{ width: "100%" }}
						>
							<Flex justify="center">
								<Progress
									type="dashboard"
									percent={Math.floor(
										(counters.offers.current * 100) / counters.offers.total,
									)}
								/>
							</Flex>
							<Flex justify="center">
								<Statistic
									value={counters.offers.current}
									suffix={`/ ${counters.offers.total.toLocaleString()}`}
								/>
							</Flex>
						</Space>
					</Card>
				</Flex>
				<Space
					direction="vertical"
					style={{ width: "100%" }}
				>
					{log.map((record, index) => (
						<Alert
							message={`${dateFns.format(new Date(), "HH:mm")} - ${record.message}`}
							type={record.level}
							key={index}
						/>
					))}
				</Space>
			</Space>
		</>
	)
}
