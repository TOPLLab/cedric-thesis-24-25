import type { Context, DerivationFact, Fact, SyntaxAssumptionFact, Theorem, VariableAssumptionFact } from '@/types/context';
import EventEmitter from 'node:events';
import * as vscode from 'vscode';

export class ContextView extends EventEmitter<{
	'dispose': []
}> {
	private panel: vscode.WebviewPanel;

	constructor() {
		super();

		this.panel = vscode.window.createWebviewPanel("context", "Sasylf Context", {
			viewColumn: vscode.ViewColumn.Two,
			preserveFocus: true,
		}, {});
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

	public renderContext(ctx: Context): void {
		const theoremHtml = ctx.currentTheorem ? `
		<div>
			<p>
				Theorem:</br>
				<span style="padding-left: 1rem; color: var(--vscode-terminal-ansiGreen);">${this.renderTheorem(ctx.currentTheorem)}</span>
			</p>
		</div>
		` : ``;

		const goalHtml = ctx.currentGoal ? `
		<div>
			<p>
				Goal:</br>
				<span style="padding-left: 1rem; color: var(--vscode-terminal-ansiGreen);">${ctx.currentGoal}</span>
			</p>
		<div>
		` : ``;

		const currentCaseHtml = ctx.currentCaseAnalysisElement ? `
		<div>
			<p>
				Case analysis over:</br>
				<span style="padding-left: 1rem; color: var(--vscode-terminal-ansiGreen);">${ctx.currentCaseAnalysisElement}</span>
			</p>
		</div>
		` : ``;

		const casesHtml = ctx.cases ? `
		<div>
			<p>
				Cases:
			</p>
			<div style="color: var(--vscode-terminal-ansiGreen);">
				${this.renderCases(ctx.cases)}
			</div>
		</div>` : ``;

		const derivationsHtmls = ctx.derivations ? ctx.derivations.map((d) => `<p>${this.renderFact(d)}</p>`).join('\n') : ``;

		const line = (ctx.currentTheorem || ctx.currentGoal || ctx.cases) && ctx.derivations ? `<hr style="margin: .5rem 0; background-color: var(--vscode-editor-foreground); height: 1.5px; border: 0;"/>` : ``;

		this.panel.webview.html = `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>React Webview</title>
			</head>
			<body>
				<div style="font-size: calc(var(--vscode-editor-font-size) * 1.2);">
					${derivationsHtmls}
					
					${line}

					${theoremHtml}
					${goalHtml}
					${currentCaseHtml}
					${casesHtml}
				</div>
			</body>
		</html>`;
	}

	private renderTheorem(theorem: Theorem): string {
		const foralls = theorem.foralls.map((f) => this.renderFact(f)).join(', ');
		const exists = theorem.exists;
		return `<span style="color: var(--vscode-terminal-ansiBlack);">∀</span> ${foralls} <span style="color: var(--vscode-terminal-ansiBlack);">∃</span> ${exists}`;
	}

	private renderFact(fact: Fact): string {

		switch (fact.fact) {
			case "Derivation":
				return this.renderDerivation(fact);
			case "SyntaxAssumption":
				return this.renderSyntaxAssumption(fact);
			case "VariableAssumption":
				return this.renderVariableAssumption(fact);
			default:
				vscode.window.showErrorMessage(`<span style="color: var(--vscode-terminal-ansiRed);">Unable to render fact: ${JSON.stringify(fact)}<span>`);
				return `Unable to render fact`;
		}
	}

	private renderDerivation(derivation: DerivationFact): string {
		return `<span style="color: var(--vscode-terminal-ansiBlue);">${derivation.name}</span> : <span style="color: var(--vscode-terminal-ansiGreen);">${derivation
			.clause}</span>`;
	}

	private renderSyntaxAssumption(syntaxAssumption: SyntaxAssumptionFact): string {
		return `<span style="color: var(--vscode-terminal-ansiBlue);">${syntaxAssumption.name}</span> : <span style="color: var(--vscode-terminal-ansiGreen);">${syntaxAssumption
			.context}</span>`;
	}

	private renderVariableAssumption(variableAssumption: VariableAssumptionFact): string {
		return `<span style="color: var(--vscode-terminal-ansiBlue);">${variableAssumption.name}</span> : <span style="color: var(--vscode-terminal-ansiGreen);">${variableAssumption
			.variable}</span>`;
	}

	private renderCases(cases: string[]): string {
		return `<ul>${cases.map(c => `<li>${c}</li>`).join("")}</ul>`;
	}
}
