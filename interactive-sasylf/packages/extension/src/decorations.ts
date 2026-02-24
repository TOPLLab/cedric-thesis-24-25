import * as vscode from 'vscode';

const decorations = {
	pending: vscode.window.createTextEditorDecorationType({
		backgroundColor: 'color-mix(in srgb, var(--vscode-terminal-ansiBlue) 40%, transparent)'
	}),
	success: vscode.window.createTextEditorDecorationType({
		backgroundColor: 'color-mix(in srgb, var(--vscode-terminal-ansiGreen) 40%, transparent)'
	}),
};

export class DecorationsView {
	private activePendingDecorations: vscode.Range[];
	private activeSuccessDecorations: vscode.Range[];
	private diagnostics: vscode.Diagnostic[];
	private collection: vscode.DiagnosticCollection;

	constructor() {
		this.activePendingDecorations = [];
		this.activeSuccessDecorations = [];
		this.diagnostics = [];
		this.collection = vscode.languages.createDiagnosticCollection("SASyLF Interactive");
	}

	public setPending(editor: vscode.TextEditor, range: vscode.Range): void {
		this.activePendingDecorations.push(range);
		this.render(editor);
	}

	private setWarnings(range: vscode.Range, warnings: string[]) {
		this.diagnostics.push(...warnings.map((warning) => new vscode.Diagnostic(range, warning, vscode.DiagnosticSeverity.Warning)));
	}

	public setSuccess(editor: vscode.TextEditor, range: vscode.Range, warnings: string[]): void {
		this.activePendingDecorations = this.activePendingDecorations.filter(r => !r.isEqual(range));
		this.activeSuccessDecorations.push(range);
		this.setWarnings(range, warnings);
		this.render(editor);
	}

	public setFailure(editor: vscode.TextEditor, range: vscode.Range, errors: string[], warnings: string[]): void {
		this.activePendingDecorations = [];
		this.diagnostics.push(...errors.map((error) => new vscode.Diagnostic(range, error, vscode.DiagnosticSeverity.Error)));
		this.setWarnings(range, warnings);
		this.render(editor);
	}

	public render(editor: vscode.TextEditor): void {
		console.debug("Rendering decorations");
		editor.setDecorations(decorations.pending, this.activePendingDecorations);
		editor.setDecorations(decorations.success, this.activeSuccessDecorations);
		this.collection.set(editor.document.uri, this.diagnostics);
	}

	public clear(editor: vscode.TextEditor): void {
		console.debug("Clearing decorations");

		this.activePendingDecorations = [];
		this.activeSuccessDecorations = [];
		this.diagnostics = [];

		editor.setDecorations(decorations.pending, this.activePendingDecorations);
		editor.setDecorations(decorations.success, this.activeSuccessDecorations);
		this.collection.set(editor.document.uri, this.diagnostics);
	}
}
