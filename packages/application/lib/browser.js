import path from "node:path"

import puppeteer from "puppeteer-extra"
import stealth from "puppeteer-extra-plugin-stealth"

let stealthApplied = false

export function buildLaunchOptions(effectiveOptions) {
	const { browser: browserOpts = {}, headless, userDataDir } = effectiveOptions
	const launch = {
		...browserOpts,
		headless: headless ?? false,
		userDataDir: userDataDir ?? path.join(process.cwd(), ".browser"),
	}
	if (!launch.executablePath) delete launch.executablePath
	return launch
}

export function launchBrowser(effectiveOptions) {
	if (!stealthApplied) {
		puppeteer.use(stealth())
		stealthApplied = true
	}
	return puppeteer.launch(buildLaunchOptions(effectiveOptions))
}
