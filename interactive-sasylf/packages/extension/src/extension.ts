import * as vscode from 'vscode';
import { DocumentManager } from '@/document_manager';

let dm: DocumentManager | null = null;

export function activate(ctx: vscode.ExtensionContext): void {
	dm = new DocumentManager(ctx);

	ctx.subscriptions.push(vscode.commands.registerCommand('live-sasylf.runToCursor', () => {
		dm!.runToCursor();
	}));

	ctx.subscriptions.push(vscode.commands.registerCommand('live-sasylf.runNext', () => {
		dm!.runNext();
	}));

	ctx.subscriptions.push(vscode.commands.registerCommand('live-sasylf.openContextView', () => {
		dm!.openContextView();
	}));

	ctx.subscriptions.push(vscode.commands.registerCommand('live-sasylf.restartCurrentProcess', () => {
		dm!.restart(ctx);
	}));
}

export function deactivate(): void {
	dm?.close();
	dm = null;
}
