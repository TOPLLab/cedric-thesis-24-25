import * as vscode from 'vscode';

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

	constructor() {
		this.activePendingDecorations = [];
		this.activeSuccessDecorations = [];
	}

	setPending(editor: vscode.TextEditor, range: vscode.Range) {
		this.activePendingDecorations.push(range);
		this.render(editor);
	}

	setSuccess(editor: vscode.TextEditor, range: vscode.Range) {
		this.activeSuccessDecorations.push(range);
		this.render(editor);
	}

	setFailure(editor: vscode.TextEditor, range: vscode.Range) {
		throw new Error("Unimplemented");

		// const diagnostics = vscode.languages.createDiagnosticCollection("myExtension");

		// const editor = vscode.window.activeTextEditor;
		// if (editor) {
		// 	const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 0));
		// 	const diagnostic = new vscode.Diagnostic(range, "Syntax error", vscode.DiagnosticSeverity.Warning);
		// 	diagnostics.set(editor.document.uri, [diagnostic]);
		// }
	}

	render(editor: vscode.TextEditor) {
		console.debug("Rendering decorations");
		editor.setDecorations(decorations.pending, this.activePendingDecorations);
		editor.setDecorations(decorations.success, this.activeSuccessDecorations);
	}
}