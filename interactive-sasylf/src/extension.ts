import * as vscode from 'vscode';
import { ContextView } from '@/context_view';
import { Sasylf } from '@/sasylf';
import { setFailure, setPending, setSuccess } from '@/decorations';

// TODO: Separate into document/process handler
type Document = {
	sasylf: Sasylf,
	editors: vscode.TextEditor[],
	// TODO: ctxView per document?
	// TODO: decorations per document
}
const documents = new Map<String, Document>();

let ctxView: ContextView | null = null;
let currentDocumentUri: String | null = null;
let sasylfListenerDisposers: (() => void)[] = [];

function disposeSasylfListeners() {
	sasylfListenerDisposers.forEach((fn) => fn());
	sasylfListenerDisposers = [];
}

function openDoc(document: vscode.TextDocument) {
	if (document.languageId !== 'sasylf') {
		return;
	}

	const uri = document.uri.toString();
	if (documents.has(uri)) { return; }

	const editors = vscode.window.visibleTextEditors.filter(
		(editor) => editor.document === document
	);
	if (editors.length === 0) {
		return;
	}

	console.debug("Opening document", document.uri.toString());
	documents.set(uri, { sasylf: new Sasylf(), editors });
	console.debug("Opened document");

	changedActiveTextEditor(vscode.window.activeTextEditor);
}

function closeDoc(document: vscode.TextDocument) {
	const uri = document.uri.toString();
	const doc = documents.get(uri);
	doc?.sasylf.close();
	documents.delete(uri);
}

function changedActiveTextEditor(editor?: vscode.TextEditor) {
	console.debug("Chaning active editor");
	currentDocumentUri = null;
	disposeSasylfListeners();
	if (!editor) {
		return;
	}

	if (editor.document.languageId !== 'sasylf') {
		return;
	}

	currentDocumentUri = editor.document.uri.toString();
	const doc = currentDocument();
	if (!doc) {
		return;
	}

	sasylfListenerDisposers.push(doc.sasylf.onPending((range) => {
		for (const editor of doc.editors) {
			setPending(editor, range);
		}
	}));

	sasylfListenerDisposers.push(doc.sasylf.onSuccess((range, ctx) => {
		ctxView?.renderContext(ctx);
		for (const editor of doc.editors) {
			setSuccess(editor, range);
		}
	}));

	sasylfListenerDisposers.push(doc.sasylf.onFailure((range) => {
		for (const editor of doc.editors) {
			setFailure(editor, range);
		}
	}));
}

function currentDocument(): Document | null {
	if (!currentDocumentUri) {
		return null;
	}

	const result = documents.get(currentDocumentUri) ?? null;
	return result;
}

function openContextView() {
	ctxView = new ContextView();
	const doc = currentDocument();
	if (!doc) {
		return;
	}

	ctxView.onDidDispose(() => {
		ctxView = null;
	});
}

export function activate(context: vscode.ExtensionContext) {
	// TODO: Reset/restart command

	context.subscriptions.push(vscode.commands.registerCommand('interactive-sasylf.runToCursor', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		currentDocument()?.sasylf.runToCursor();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('interactive-sasylf.openContextView', () => {
		openContextView();
	}));

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(changedActiveTextEditor));
	changedActiveTextEditor(vscode.window.activeTextEditor);

	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(openDoc));
	vscode.workspace.textDocuments.forEach(openDoc);
	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(closeDoc));
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((evt) => {
		// TODO: Handle changes to the text here
	}));
}

export function deactivate() {

}