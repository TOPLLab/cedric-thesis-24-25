import type { Context, DerivationFact, Fact, SyntaxAssumptionFact, Theorem, VariableAssumptionFact } from '@/types/context';
import EventEmitter from 'node:events';
import * as vscode from 'vscode';

export class ContextView extends EventEmitter<{
	'dispose': []
}> {
	private panel: vscode.WebviewPanel;

	constructor(extensionUri: vscode.Uri) {
		super();

		this.panel = vscode.window.createWebviewPanel(
			// Panel view type
			"sasylf",
			// Panel title
			"Sasylf Context",
			// The editor column the panel should be displayed in
			{ preserveFocus: true, viewColumn: vscode.ViewColumn.Two },
			// Extra panel configurations
			{
				// Enable JavaScript in the webview
				enableScripts: true,
				// Restrict the webview to only load resources from the `out` and `webview-ui/build` directories
				localResourceRoots: [
					vscode.Uri.joinPath(extensionUri, "packages", "extension", "dist"),
					vscode.Uri.joinPath(extensionUri, "packages", "goal-ui", "dist")
				],

				retainContextWhenHidden: true,

				enableFindWidget: true,
			}
		);

		this.panel.webview.html = this.getWebviewContent(this.panel.webview, extensionUri);

		this.panel.onDidDispose(() => {
			this.emit('dispose');
		});
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
 * @remarks This is also the place where references to the React webview build files
 * are created and inserted into the webview HTML.
 *
 * @param webview A reference to the extension webview
 * @param extensionUri The URI of the directory containing the extension
 * @returns A template string literal containing the HTML that should be
 * rendered within the webview panel
 */
	private getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
		// The CSS file from the React build output
		// const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "goal-ui", "dist", "assets", "index.css"));
		// The JS file from the React build output
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "packages", "goal-ui", "dist", "assets", "index.js"));

		const nonce = getNonce();

		// Tip: Install the es6-string-html VS Code extension to enable code highlighting below
		// TODO: <link rel="stylesheet" type="text/css" nonce="${nonce}" href="${stylesUri}">
		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
				<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				
				<title>Goal View</title>
				</head>
				<body>
				<div id="root"></div>
				<script type="module" nonce="${nonce}" src="${scriptUri}"></script>
				</body>
			</html>
		`;
	}

	// public renderContext(ctx: Context): void {
	// 	const theoremHtml = ctx.currentTheorem ? `
	// 	<div>
	// 		<p>
	// 			Theorem:</br>
	// 			<span style="padding-left: 1rem; color: var(--vscode-terminal-ansiGreen);">${this.renderTheorem(ctx.currentTheorem)}</span>
	// 		</p>
	// 	</div>
	// 	` : ``;

	// 	const goalHtml = ctx.currentGoal ? `
	// 	<div>
	// 		<p>
	// 			Goal:</br>
	// 			<span style="padding-left: 1rem; color: var(--vscode-terminal-ansiGreen);">${ctx.currentGoal}</span>
	// 		</p>
	// 	<div>
	// 	` : ``;

	// 	const currentCaseHtml = ctx.currentCaseAnalysisElement ? `
	// 	<div>
	// 		<p>
	// 			Case analysis over:</br>
	// 			<span style="padding-left: 1rem; color: var(--vscode-terminal-ansiGreen);">${ctx.currentCaseAnalysisElement}</span>
	// 		</p>
	// 	</div>
	// 	` : ``;

	// 	const casesHtml = ctx.cases ? `
	// 	<div>
	// 		<p>
	// 			Cases:
	// 		</p>
	// 		<div style="color: var(--vscode-terminal-ansiGreen);">
	// 			${this.renderCases(ctx.cases)}
	// 		</div>
	// 	</div>` : ``;

	// 	const derivationsHtmls = ctx.derivations ? ctx.derivations.map((d) => `<p>${this.renderFact(d)}</p>`).join('\n') : ``;

	// 	const line = (ctx.currentTheorem || ctx.currentGoal || ctx.cases) && ctx.derivations ? `<hr style="margin: .5rem 0; background-color: var(--vscode-editor-foreground); height: 1.5px; border: 0;"/>` : ``;

	// 	this.panel.webview.html = `
	// 	<!DOCTYPE html>
	// 	<html>
	// 		<head>
	// 			<meta charset="UTF-8">
	// 			<meta name="viewport" content="width=device-width, initial-scale=1.0">
	// 			<title>React Webview</title>
	// 		</head>
	// 		<body>
	// 			<div style="font-size: calc(var(--vscode-editor-font-size) * 1.2);">
	// 				${derivationsHtmls}

	// 				${line}

	// 				${theoremHtml}
	// 				${goalHtml}
	// 				${currentCaseHtml}
	// 				${casesHtml}
	// 			</div>
	// 		</body>
	// 	</html>`;
	// }

	// private renderTheorem(theorem: Theorem): string {
	// 	const foralls = theorem.foralls.map((f) => this.renderFact(f)).join(', ');
	// 	const exists = theorem.exists;
	// 	return `<span style="color: var(--vscode-terminal-ansiBlack);">∀</span> ${foralls} <span style="color: var(--vscode-terminal-ansiBlack);">∃</span> ${exists}`;
	// }

	// private renderFact(fact: Fact): string {

	// 	switch (fact.fact) {
	// 		case "Derivation":
	// 			return this.renderDerivation(fact);
	// 		case "SyntaxAssumption":
	// 			return this.renderSyntaxAssumption(fact);
	// 		case "VariableAssumption":
	// 			return this.renderVariableAssumption(fact);
	// 		default:
	// 			vscode.window.showErrorMessage(`<span style="color: var(--vscode-terminal-ansiRed);">Unable to render fact: ${JSON.stringify(fact)}<span>`);
	// 			return `Unable to render fact`;
	// 	}
	// }

	// private renderDerivation(derivation: DerivationFact): string {
	// 	return `<span style="color: var(--vscode-terminal-ansiBlue);">${derivation.name}</span> : <span style="color: var(--vscode-terminal-ansiGreen);">${derivation
	// 		.clause}</span>`;
	// }

	// private renderSyntaxAssumption(syntaxAssumption: SyntaxAssumptionFact): string {
	// 	return `<span style="color: var(--vscode-terminal-ansiBlue);">${syntaxAssumption.name}</span> : <span style="color: var(--vscode-terminal-ansiGreen);">${syntaxAssumption
	// 		.context}</span>`;
	// }

	// private renderVariableAssumption(variableAssumption: VariableAssumptionFact): string {
	// 	return `<span style="color: var(--vscode-terminal-ansiBlue);">${variableAssumption.name}</span> : <span style="color: var(--vscode-terminal-ansiGreen);">${variableAssumption
	// 		.variable}</span>`;
	// }

	// private renderCases(cases: string[]): string {
	// 	return `<ul>${cases.map(c => `<li>${c}</li>`).join("")}</ul>`;
	// }
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
