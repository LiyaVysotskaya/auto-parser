import React from "react"

import { Alert, Button } from "antd"

export class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props)
		this.state = { error: null }
	}

	static getDerivedStateFromError(error) {
		return { error }
	}

	componentDidCatch(error, info) {
		console.error(error, info)
	}

	render() {
		const { error } = this.state
		if (error) {
			return (
				<Alert
					type="error"
					showIcon
					message={this.props.title || "Ошибка отображения"}
					description={
						<>
							<div className="ms-error-boundary-msg">
								{String(error?.message || error)}
							</div>
							<Button
								type="primary"
								size="small"
								className="ms-mt-6"
								onClick={() => {
									this.setState({ error: null })
									window.location.reload()
								}}
							>
								Перезагрузить страницу
							</Button>
						</>
					}
				/>
			)
		}
		return this.props.children
	}
}
