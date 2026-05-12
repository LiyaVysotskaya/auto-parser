import React from "react"
import { Button, Popover, Typography } from "antd"

const { Text } = Typography

const VISIBLE_MODELS = 3

function ModelsPopoverList({ names }) {
	return (
		<ul className="ms-parse-brand-popover-list ms-scrollbar">
			{names.map((n, i) => (
				<li
					key={`${n}-${i}`}
					className="ms-parse-brand-popover-list__item"
				>
					{n}
				</li>
			))}
		</ul>
	)
}

function ModelsSummary({ models }) {
	const names = (models || []).map((m) => String(m.name || m.id || "").trim()).filter(Boolean)

	if (!names.length) {
		return (
			<Text
				type="secondary"
				className="ms-parse-brand-row__hint"
			>
				Все модели каталога
			</Text>
		)
	}

	if (names.length <= VISIBLE_MODELS) {
		return (
			<span className="ms-parse-brand-row__models-text">{names.join(" · ")}</span>
		)
	}

	const head = names.slice(0, VISIBLE_MODELS).join(" · ")
	const rest = names.length - VISIBLE_MODELS

	return (
		<span className="ms-parse-brand-row__models-text">
			{head}
			{" · "}
			<Popover
				title="Модели"
				content={<ModelsPopoverList names={names} />}
				trigger="click"
				placement="bottomLeft"
				overlayClassName="ms-parse-brand-popover"
			>
				<Button
					type="link"
					size="small"
					className="ms-parse-brand-more-btn"
				>
					ещё {rest}
				</Button>
			</Popover>
		</span>
	)
}

/**
 * Компактный список брендов и моделей для карточки настроек парсинга.
 */
export function ParseBrandRoster({ brands = [], maxBrands = 14 }) {
	const list = (Array.isArray(brands) ? brands : []).slice(0, maxBrands)

	if (!list.length) {
		return (
			<Text
				type="secondary"
				className="ms-parse-brand-roster__empty"
			>
				Бренды не заданы
			</Text>
		)
	}

	return (
		<div className="ms-parse-brand-roster ms-scrollbar">
			{list.map((b) => {
				const models = b.models || []
				const selected = Boolean(b.selected)
				return (
					<div
						key={b.id}
						className={`ms-parse-brand-row ${selected ? "ms-parse-brand-row--selected" : "ms-parse-brand-row--off"}`}
					>
						<div className="ms-parse-brand-row__brand">
							<span className="ms-parse-brand-row__name">{b.name}</span>
							{selected ? (
								<span
									className="ms-parse-brand-row__dot"
									aria-hidden
								/>
							) : null}
						</div>
						<div className="ms-parse-brand-row__models">
							<ModelsSummary models={models} />
						</div>
					</div>
				)
			})}
		</div>
	)
}
