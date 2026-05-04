export const electron = /**
 * @type {{
 * 			onActions: onActions
 * 			autoRu: autoRu
 * 			getSettings?: () => Promise<any>
 * 			saveSettings?: (s: any) => Promise<boolean>
 * 	  }
 * 	| undefined}
 */ (
	// @ts-ignore
	window.electronAPI
)

/**
 * @callback onActions
 * @param {any} action
 */

/** @callback autoRu */
