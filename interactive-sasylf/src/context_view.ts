import { AbstractionTerm, ApplicationTerm, BoundVarTerm, ConstantTerm, Context, DerivationFact, Element, Fact, FreeVarTerm, SyntaxAssumptionFact, Term, Theorem, VariableAssumptionFact } from '@/types/context';
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

	public reveal() {
		this.panel.reveal(undefined, true);
	}

	public renderContext(ctx: Context) {
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
				<span style="padding-left: 1rem; color: var(--vscode-terminal-ansiGreen);">${this.renderTerm(ctx.currentGoal)}</span>
			</p>
		<div>
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
					${casesHtml}
				</div>
			</body>
		</html>`;
	}

	private renderTheorem(theorem: Theorem): string {
		const foralls = theorem.foralls.map((f) => f.name).join(', ');
		const exists = this.renderTerm(theorem.exists);
		return `∀ ${foralls} : ${exists}`;
	}

	private renderElement(element: Element): string {
		return this.renderTerm(element.term);
	}

	private renderTerm(term: Term): string {
		switch (term.term) {
			case "Abstraction":
				return this.renderAbstraction(term);
			case "Application":
				return this.renderApplication(term);
			case "FreeVar":
				return this.renderFreeVar(term);
			case "BoundVar":
				return this.renderBoundVar(term);
			case "Constant":
				return this.renderConstant(term);
			default:
				vscode.window.showErrorMessage(`<span style="color: var(--vscode-terminal-ansiRed);">Unable to render term: ${JSON.stringify(term)}<span>`);
				return `Unable to render term`;
		}
	}

	private renderAbstraction(app: AbstractionTerm): string {
		return `λ${app.varName}:${this.renderTerm(app.varType)}.${this.renderTerm(app.body)}`;
	}

	private renderApplication(app: ApplicationTerm): string {
		const fn = this.renderTerm(app.function);
		const fnFinal = app.function.term === "Abstraction" || app.function.term === "Application"
			? `(${fn})`
			: fn;

		const args = app.arguments.map((a) =>
			a.term === "Abstraction" || a.term === "Application"
				? `(${this.renderTerm(a)})`
				: this.renderTerm(a)
		).join(" ");
		return `${fnFinal} ${args}`;
	}

	private renderFreeVar(freeVar: FreeVarTerm): string {
		return freeVar.name;
	}

	private renderBoundVar(boundVar: BoundVarTerm): string {
		return boundVar.name;
	}

	private renderConstant(constant: ConstantTerm): string {
		return constant.name;
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
		return `<span style="color: var(--vscode-terminal-ansiBlue);">${derivation.name}</span> : <span style="color: var(--vscode-terminal-ansiGreen);">${this.renderElement(derivation
			.clause)}</span>`;
	}

	private renderSyntaxAssumption(syntaxAssumption: SyntaxAssumptionFact): string {
		return `<span style="color: var(--vscode-terminal-ansiBlue);">${syntaxAssumption.name}</span> : <span style="color: var(--vscode-terminal-ansiGreen);">${this.renderElement(syntaxAssumption
			.context)}</span>`;
	}

	private renderVariableAssumption(variableAssumption: VariableAssumptionFact): string {
		return `<span style="color: var(--vscode-terminal-ansiBlue);">${variableAssumption.name}</span> : <span style="color: var(--vscode-terminal-ansiGreen);">${this.renderElement(variableAssumption
			.variable)}</span>`;
	}

	private renderCases(cases: string[]): string {
		return `<ul>${cases.map(c => `<li>${c}</li>`).join("")}</ul>`;
	}
}