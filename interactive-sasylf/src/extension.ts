import * as vscode from 'vscode';
import { DocumentManager } from '@/document_manager';

let dm: DocumentManager | null = null;

export function activate(context: vscode.ExtensionContext) {
	dm = new DocumentManager(context);

	context.subscriptions.push(vscode.commands.registerCommand('interactive-sasylf.runToCursor', () => {
		dm!.runToCursor();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('interactive-sasylf.runNext', () => {
		dm!.runNext();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('interactive-sasylf.openContextView', () => {
		dm!.openContextView();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('interactive-sasylf.restartCurrentProcess', () => {
		dm!.restart();
	}));
}

export function deactivate() {
	dm?.close();
	dm = null;
}