import * as vscode from 'vscode';
import { DocumentManager } from '@/document_manager';

let dm: DocumentManager | null = null;

export function activate(context: vscode.ExtensionContext): void {
	dm = new DocumentManager(context);

	context.subscriptions.push(vscode.commands.registerCommand('live-sasylf.runToCursor', () => {
		dm!.runToCursor();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('live-sasylf.runNext', () => {
		dm!.runNext();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('live-sasylf.openContextView', () => {
		dm!.openContextView();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('live-sasylf.restartCurrentProcess', () => {
		dm!.restart();
	}));
}

export function deactivate(): void {
	dm?.close();
	dm = null;
}
