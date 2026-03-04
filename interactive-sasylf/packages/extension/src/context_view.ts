import type { Context } from '@live-sasylf/client';
import EventEmitter from 'node:events';
import * as vscode from 'vscode';

export class ContextView extends EventEmitter<{
	'dispose': [],
	'changeViewState': [vscode.WebviewPanelOnDidChangeViewStateEvent]
}> {
	private panel: vscode.WebviewPanel;

	constructor(ectx: vscode.ExtensionContext, fileName: string) {
		super();

		this.panel = vscode.window.createWebviewPanel(
			// Panel view type
			"sasylf",
			// Panel title
			`Context View: ${fileName}`,
			// The editor column the panel should be displayed in
			{ preserveFocus: true, viewColumn: vscode.ViewColumn.Two },
			// Extra panel configurations
			{
				// Enable JavaScript in the webview
				enableScripts: true,
				// Restrict the webview to only load resources from the `context-view` package
				localResourceRoots: [
					vscode.Uri.joinPath(ectx.extensionUri, "packages", "context-view", "dist")
				],

				retainContextWhenHidden: true,

				enableFindWidget: true,
			},
		);

		this.panel.webview.html = this.getWebviewContent(this.panel.webview, ectx);

		this.panel.onDidDispose(() => {
			this.emit('dispose');
		});

		this.panel.onDidChangeViewState(e => this.emit('changeViewState', e));
	}

	public postContext(ctx: Context): void {
		this.panel.webview.postMessage(ctx);
	}

	public reveal(): void {
		this.panel.reveal(undefined, true);
	}

	public dispose(): void {
		this.panel.dispose();
		this.emit("dispose");
		this.removeAllListeners();
	}

	/**
	 * Defines and returns the HTML that should be rendered within the webview panel.
	 *
	 * @remarks This is also the place where references to the Solidjs webview build files
	 * are created and inserted into the webview HTML.
	 *
	 * @param webview A reference to the extension webview
	 * @param extensionUri The URI of the directory containing the extension
	 * @returns A template string literal containing the HTML that should be
	 * rendered within the webview panel
	 */
	private getWebviewContent(webview: vscode.Webview, ectx: vscode.ExtensionContext) {
		// The CSS file from the Solidjs build output
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(ectx.extensionUri, "packages", "context-view", "dist", "assets", "index.css"));
		// The JS file from the Solidjs build output
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(ectx.extensionUri, "packages", "context-view", "dist", "assets", "index.js"));

		const nonce = getNonce();

		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
				<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<link rel="stylesheet" type="text/css" nonce="${nonce}" href="${styleUri}">
				
				<title>Context View</title>
				</head>
				<body>
				<div id="root"></div>
				<script type="module" nonce="${nonce}" src="${scriptUri}"></script>
				</body>
			</html>
		`;
	}
}

/**
 * A helper function that returns a unique alphanumeric identifier called a nonce.
 *
 * @remarks This function is primarily used to help enforce content security
 * policies for resources/scripts being executed in a webview context.
 *
 * @returns A nonce
 */
function getNonce(): string {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
