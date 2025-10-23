import * as vscode from 'vscode';
import type { Errors } from '@live-sasylf/client';

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
	private collection: vscode.DiagnosticCollection;

	constructor() {
		this.activePendingDecorations = [];
		this.activeSuccessDecorations = [];
		this.collection = vscode.languages.createDiagnosticCollection("SASyLF Interactive");
	}

	setPending(editor: vscode.TextEditor, range: vscode.Range): void {
		this.collection.clear();
		this.activePendingDecorations.push(range);
		this.render(editor);
	}

	setSuccess(editor: vscode.TextEditor, range: vscode.Range): void {
		this.collection.clear();
		this.activePendingDecorations = this.activePendingDecorations.filter(r => !r.isEqual(range));
		this.activeSuccessDecorations.push(range);
		this.render(editor);
	}

	setFailure(editor: vscode.TextEditor, range: vscode.Range, errors: Errors): void {
		this.collection.clear();
		this.activePendingDecorations = [];
		const diagnostics = errors.errors.map((error) => new vscode.Diagnostic(range, error, vscode.DiagnosticSeverity.Error));
		this.collection.set(editor.document.uri, diagnostics);
		this.render(editor);
	}

	render(editor: vscode.TextEditor): void {
		console.debug("Rendering decorations");
		editor.setDecorations(decorations.pending, this.activePendingDecorations);
		editor.setDecorations(decorations.success, this.activeSuccessDecorations);
	}

	clear(editor: vscode.TextEditor): void {
		console.debug("Clearing decorations");
		this.activePendingDecorations = [];
		this.activeSuccessDecorations = [];
		editor.setDecorations(decorations.pending, this.activePendingDecorations);
		editor.setDecorations(decorations.success, this.activeSuccessDecorations);
		this.collection.set(editor.document.uri, []);
	}
}
