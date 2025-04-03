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

export function setPending(editor: vscode.TextEditor, range: vscode.Range) {
	editor.setDecorations(decorations.pending, [range]);
}

export function setSuccess(editor: vscode.TextEditor, range: vscode.Range) {
	editor.setDecorations(decorations.success, [range]);
}

export function setFailure(editor: vscode.TextEditor, range: vscode.Range) {
	throw new Error("Unimplemented");

	// const diagnostics = vscode.languages.createDiagnosticCollection("myExtension");

	// const editor = vscode.window.activeTextEditor;
	// if (editor) {
	// 	const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 0));
	// 	const diagnostic = new vscode.Diagnostic(range, "Syntax error", vscode.DiagnosticSeverity.Warning);
	// 	diagnostics.set(editor.document.uri, [diagnostic]);
	// }
}
