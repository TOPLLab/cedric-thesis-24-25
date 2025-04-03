import { AbstractionTerm, ApplicationTerm, BoundVarTerm, ConstantTerm, Context, DerivationFact, Element, Fact, FreeVarTerm, SyntaxAssumptionFact, Term, Theorem, VariableAssumptionFact } from '@/types/context';
import * as vscode from 'vscode';

export class ContextView {
	panel: vscode.WebviewPanel;
	disposeHandlers: (() => void)[];

	constructor() {
		this.panel = vscode.window.createWebviewPanel("context", "Sasylf Context", vscode.ViewColumn.Two, {});
		this.disposeHandlers = [];
		this.panel.onDidDispose(() => {
			this.disposeHandlers.forEach((h) => h());
		});
	}

	public close() {
		this.panel.dispose();
	}

	public reveal() {
		this.panel.reveal();
	}

	public onDidDispose(handler: () => void): () => void {
		this.disposeHandlers.push(handler);

		return () => {
			this.disposeHandlers = this.disposeHandlers.filter((h) => h !== handler);
		};
	}

	public renderContext(ctx: Context) {
		const theoremHtml = ctx.currentTheorem ? `<div>Current Theorem: ${this.renderTheorem(ctx.currentTheorem)}</div>` : ``;
		const goalHtml = ctx.currentGoal ? `<div>Current Goal: ${this.renderTerm(ctx.currentGoal)}</div>` : ``;
		const casesHtml = ctx.cases ? `<div>Current Cases: ${this.renderCases(ctx.cases)}</div>` : ``;
		const derivationsHtmls = ctx.derivations ? `<div>Available Facts: ${ctx.derivations.map((d) => this.renderFact(d))}</div>` : ``;

		this.panel.webview.html = `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>React Webview</title>
			</head>
			<body>
				<div>
					${theoremHtml}
					${goalHtml}
					${casesHtml}
					${derivationsHtmls}
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
				vscode.window.showErrorMessage(`Unable to render term: ${JSON.stringify(term)}`);
				return `Unable to render term`;
		}
	}

	private renderAbstraction(app: AbstractionTerm): string {
		return `λ${app.varName}:${app.varType}.${this.renderTerm(app.body)}`;
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
				vscode.window.showErrorMessage(`Unable to render fact: ${JSON.stringify(fact)}`);
				return `Unable to render fact`;
		}
	}

	private renderDerivation(derivation: DerivationFact): string {
		return `${derivation.name}: ${this.renderElement(derivation.clause)}`;
	}

	private renderSyntaxAssumption(syntaxAssumption: SyntaxAssumptionFact): string {
		return `${syntaxAssumption.name}: ${this.renderElement(syntaxAssumption
			.context)}`;
	}

	private renderVariableAssumption(variableAssumption: VariableAssumptionFact): string {
		return `${variableAssumption.name}: ${this.renderElement(variableAssumption
			.variable)}`;
	}

	private renderCases(cases: string[]): string {
		return cases.join(", ");
	}
}