import * as vscode from 'vscode';
import { DocumentManager } from '@/document_manager';

let dm: DocumentManager | null = null;

export function activate(context: vscode.ExtensionContext) {
	dm = new DocumentManager(context);

	context.subscriptions.push(vscode.commands.registerCommand('interactive-sasylf.runToCursor', () => {
		dm!.runToCursor();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('interactive-sasylf.openContextView', () => {
		dm!.openContextView();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('interactive-sasylf.restartCurrentProcess', () => {
		throw new Error("Unimplemented");
	}));
}

export function deactivate() {
	dm?.close();
	dm = null;
}