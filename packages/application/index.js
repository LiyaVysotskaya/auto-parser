#!/usr/bin/env node
import fs from "node:fs/promises"
import path from "node:path"

import chalk from "chalk"
import { program } from "commander"
import * as dateFns from "date-fns"
import figlet from "figlet"
import _ from "lodash"
import { fileURLToPath } from "url"

import { getConfig } from "./config.js"
import * as autoRu from "./lib/auto-ru.js"
import { instance as store } from "./store.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pkg = JSON.parse(
	await fs.readFile(path.join(__dirname, "package.json"), "utf-8"),
)

const header =
	"\n" +
	chalk.blue(
		await new Promise((resolve, reject) =>
			figlet(pkg.name.split("/")[0], (err, data) =>
				err ? reject(err) : resolve(data),
			),
		),
	) +
	"\n\n"

if (!process.argv.includes("-V")) console.info(header)

program.version(pkg.version)

program
	.command("auto-ru")
	.option(
		`-u, --url ${getConfig().autoRu.url ? "[URL]" : "<URL>"}`,
		"Адрес страницы листинга",
		getConfig().autoRu.url ?? undefined,
	)
	.option(
		`-b, --browserPath ${getConfig().autoRu.browser.executablePath ? "[PATH]" : "<PATH>"}`,
		"Путь к исполняемому файлу Chrome",
		getConfig().autoRu.browser.executablePath ?? undefined,
	)
	.action((options) => {
		const config = getConfig()
		const effectiveOptions = {
			url: options.url || config.autoRu.url,
			city: config.autoRu.city,
			browser: {
				executablePath:
					options.browserPath || config.autoRu.browser.executablePath,
			},
			brands: config.autoRu.brands,
			years: config.autoRu.years,
		}

		autoRu.action(effectiveOptions)
	})

program.parse()

render()
store.subscribe(_.throttle(render, 500))

function render() {
	const { log, ...state } = store.getState()
	console.clear()
	console.info(header)
	;["autoRu"].forEach((scope) => {
		console.info(
			...formatScope(scope),
			`${state[scope].count} / ${state[scope].pagination?.total_offers_count ?? "-"}`,
			...formatStatus(state[scope].status),
			"\n",
		)
	})
	log.forEach((record) => {
		switch (record.level) {
			case "error":
				console.info(
					dateFns.format(new Date(record.timestamp), "dd.MM.yyyy HH:mm:ss"),
					...formatScope(record.scope),
					...formatStatus(record.level),
				)
				console.group()
				console.error(chalk.red(record.message))
				console.groupEnd()
				break
			case "info":
			case "success":
				console.info(
					dateFns.format(new Date(record.timestamp), "dd.MM.yyyy HH:mm:ss"),
					...formatScope(record.scope),
					...formatStatus(record.level),
					record.message,
				)
				break
			case "warning":
				console.info(
					dateFns.format(new Date(record.timestamp), "dd.MM.yyyy HH:mm:ss"),
					...formatScope(record.scope),
					...formatStatus(record.level),
				)
				console.group()
				console.warn(chalk.red(record.message))
				console.groupEnd()
				break
		}
	})
}

function formatStatus(status) {
	return [
		status === "info" && chalk.bgBlue(chalk.white(" Информация ")),
		status === "pending" && chalk.bgWhite(chalk.black(" В процессе ")),
		status === "success" && chalk.bgGreen(chalk.white(" Успех ")),
		status === "cancelled" && chalk.bgYellow(chalk.black(" Остановлено ")),
		status === "warning" && chalk.yellow(chalk.black(" Предупреждение ")),
		["failed", "error"].includes(status) &&
			chalk.bgRed(chalk.white(" Ошибка ")),
	].filter(Boolean)
}

function formatScope(scope) {
	switch (scope) {
		case "autoRu":
			return [chalk.bgMagenta(chalk.white(" Auto.Ru "))]
		default:
			return [chalk.bgGray(chalk.white(` ${scope} `))]
	}
}
