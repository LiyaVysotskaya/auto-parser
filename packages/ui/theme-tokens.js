/**
 * Тема приложения: тёмный «кокпит» по ref (auto_ru_full_app.html) и светлый
 * вариант с единой сеткой отступов, теней и нейтральным фоном макета.
 */

export const REF = Object.freeze({
	bg0: "#0d0f14",
	bg1: "#111318",
	bg2: "#161b24",
	bg3: "#1c2230",
	t1: "#e8eaf0",
	t2: "rgba(232,234,240,0.55)",
	t3: "rgba(232,234,240,0.3)",
	b1: "rgba(255,255,255,0.08)",
	b2: "rgba(255,255,255,0.13)",
	acc: "#378ADD",
	acc2: "#185FA5",
	green: "#5DCAA5",
	red: "#F0997B",
	amber: "#FAC775",
	blueSoft: "#85B7EB",
})

/** Ant Design theme config for ConfigProvider */
export function buildAntdTheme(isDark) {
	if (isDark) {
		return {
			token: {
				colorPrimary: REF.acc,
				colorInfo: REF.acc,
				/* Приглушённые семантические — меньше «радуги» в таблицах и тегах */
				colorSuccess: "#6B9E86",
				colorWarning: "#B89A6A",
				colorError: "#C17B6E",
				colorBgBase: REF.bg0,
				colorBgLayout: REF.bg0,
				colorBgContainer: REF.bg2,
				colorBgElevated: REF.bg1,
				colorBorder: REF.b1,
				colorBorderSecondary: REF.b1,
				colorText: REF.t1,
				colorTextSecondary: REF.t2,
				colorTextTertiary: REF.t3,
				colorTextQuaternary: REF.t3,
				borderRadius: 10,
				borderRadiusLG: 12,
				borderRadiusSM: 8,
				wireframe: false,
				fontSize: 13,
				controlItemBgActive: "rgba(55,138,221,0.18)",
				controlItemBgHover: "rgba(255,255,255,0.06)",
				boxShadowTertiary: "0 1px 0 rgba(0,0,0,0.35)",
				boxShadowSecondary: "none",
			},
			components: {
				Layout: {
					siderBg: REF.bg1,
					bodyBg: REF.bg0,
					headerBg: REF.bg0,
					headerHeight: 56,
					headerPadding: "0 20px",
				},
				Menu: {
					darkItemBg: REF.bg1,
					darkItemSelectedBg: "rgba(55,138,221,0.14)",
					darkItemHoverBg: "rgba(255,255,255,0.05)",
					itemMarginInline: 10,
					itemBorderRadius: 8,
					itemHeight: 40,
					iconSize: 16,
					darkItemColor: REF.t2,
					darkDangerItemColor: REF.red,
				},
				Card: {
					headerBg: "transparent",
					paddingLG: 18,
				},
				Segmented: {
					trackBg: "rgba(255,255,255,0.06)",
				},
				Table: {
					headerBg: "rgba(255,255,255,0.04)",
					headerSplitColor: "transparent",
					rowHoverBg: "rgba(255,255,255,0.04)",
				},
			},
		}
	}
	return {
		token: {
			colorPrimary: "#2563eb",
			colorInfo: "#2563eb",
			colorSuccess: "#059669",
			colorWarning: "#d97706",
			colorError: "#dc2626",
			colorBgBase: "#ffffff",
			colorBgLayout: "#f1f5f9",
			colorBgContainer: "#ffffff",
			colorBgElevated: "#ffffff",
			colorBorder: "#e2e8f0",
			colorBorderSecondary: "#eef2f7",
			colorText: "#0f172a",
			colorTextSecondary: "#475569",
			colorTextTertiary: "#64748b",
			colorTextQuaternary: "#94a3b8",
			borderRadius: 10,
			borderRadiusLG: 14,
			borderRadiusSM: 8,
			wireframe: false,
			fontSize: 14,
			fontSizeLG: 15,
			lineHeight: 1.55,
			controlHeight: 38,
			controlHeightLG: 42,
			padding: 12,
			paddingLG: 20,
			paddingSM: 10,
			boxShadowSecondary:
				"0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04)",
			boxShadowTertiary: "0 1px 0 rgba(15, 23, 42, 0.06)",
		},
		components: {
			Layout: {
				siderBg: "#ffffff",
				bodyBg: "#f1f5f9",
				headerBg: "#f1f5f9",
				headerHeight: 56,
				headerPadding: "0 20px",
			},
			Menu: {
				itemBg: "transparent",
				itemSelectedBg: "rgba(37, 99, 235, 0.1)",
				itemSelectedColor: "#1d4ed8",
				itemHoverBg: "rgba(15, 23, 42, 0.04)",
				itemActiveBg: "rgba(37, 99, 235, 0.12)",
				itemMarginInline: 10,
				itemBorderRadius: 8,
				itemHeight: 40,
				iconSize: 16,
				fontSize: 14,
			},
			Card: {
				headerBg: "transparent",
				paddingLG: 20,
				headerFontSize: 15,
				headerHeight: 48,
			},
			Button: {
				contentFontSize: 14,
				controlHeight: 38,
			},
			Tabs: {
				titleFontSize: 14,
				horizontalMargin: "0 0 12px 0",
			},
			Table: {
				headerBg: "#f8fafc",
				headerColor: "#64748b",
				headerSplitColor: "transparent",
				rowHoverBg: "rgba(37, 99, 235, 0.04)",
				fontSize: 13,
			},
			Segmented: {
				trackBg: "rgba(15, 23, 42, 0.06)",
			},
			Alert: {
				withDescriptionPadding: "14px 16px",
			},
			Input: {
				activeBorderColor: "#2563eb",
				hoverBorderColor: "#93c5fd",
			},
			Select: {
				optionSelectedBg: "rgba(37, 99, 235, 0.08)",
			},
		},
	}
}

/** Statistic / semantic accents (use with theme.useToken() where needed) */
export function statValueColors(isDark) {
	if (!isDark) {
		return {
			offers: "#b91c1c",
			avgPrice: "#0f766e",
			minPrice: "#047857",
			discount: "#b45309",
			badgeTop: "#dc2626",
			badgeRest: "#2563eb",
		}
	}
	return {
		offers: "#8BA5C4",
		avgPrice: "#C4B89A",
		minPrice: "#8EAF9E",
		discount: "#C9A882",
		badgeTop: "#D4947A",
		badgeRest: "#6BA3E8",
	}
}

/**
 * Спокойная палитра линий/столбцов Recharts (в т.ч. тёмная — в одной холодной
 * гамме).
 */
export function chartSeriesColors(isDark) {
	if (isDark) {
		return [
			"#6BA3E8",
			"#5A8FBE",
			"#7B9EC9",
			"#8EADCC",
			"#6D8FB8",
			"#9BB4D4",
			"#5C7A9E",
			"#7A95B0",
			"#4D7299",
			"#8CA3C2",
		]
	}
	return [
		"#2563eb",
		"#3d5a80",
		"#475569",
		"#1d4ed8",
		"#64748b",
		"#0f766e",
		"#334155",
		"#0369a1",
		"#4f46e5",
		"#0e7490",
	]
}
