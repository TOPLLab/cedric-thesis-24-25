import * as vscode from 'vscode';
import { Errors } from '@/types/errors';

const decorations = {
	pending: vscode.window.createTextEditorDecorationType({
		borderWidth: '0px 0px 2px 0px',
		borderStyle: 'solid',
		borderSpacing: '2px',
		borderColor: new vscode.ThemeColor('terminal.ansiBlue')
	}),
	success: vscode.window.createTextEditorDecorationType({
		borderWidth: '0px 0px 2px 0px',
		borderStyle: 'solid',
		borderSpacing: '2px',
		borderColor: new vscode.ThemeColor('terminal.ansiGreen')
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

	setPending(editor: vscode.TextEditor, range: vscode.Range) {
		this.collection.clear();
		this.activePendingDecorations.push(range);
		this.render(editor);
	}

	setSuccess(editor: vscode.TextEditor, range: vscode.Range) {
		this.collection.clear();
		this.activePendingDecorations = this.activePendingDecorations.filter(r => !r.isEqual(range));
		this.activeSuccessDecorations.push(range);
		this.render(editor);
	}

	setFailure(editor: vscode.TextEditor, range: vscode.Range, errors: Errors) {
		this.collection.clear();
		this.activePendingDecorations = [];
		const diagnostics = errors.map(error => new vscode.Diagnostic(range, error, vscode.DiagnosticSeverity.Error));
		this.collection.set(editor.document.uri, diagnostics);
		this.render(editor);
	}

	render(editor: vscode.TextEditor) {
		console.debug("Rendering decorations");
		editor.setDecorations(decorations.pending, this.activePendingDecorations);
		editor.setDecorations(decorations.success, this.activeSuccessDecorations);
	}
}