import * as vscode from 'vscode';
import { SasylfDocument } from '@/sasylf_document';
import path from 'node:path';

export class DocumentManager {
	private documents: Map<string, SasylfDocument>;
	private currentDocument: string | null;

	constructor(ctx: vscode.ExtensionContext) {
		this.currentDocument = null;

		this.documents = new Map<string, SasylfDocument>();

		// If a text document opens, we need to load that document.
		//
		// Does not run on already open documents.
		ctx.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
			this.loadDocument(ctx, document);
		}));

		// It also has to be done for documents already opened.
		vscode.workspace.textDocuments.forEach(document => {
			this.loadDocument(ctx, document);
		});

		// If a document closes, we need to unload it.
		ctx.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => {
			this.unloadDocument(document);
		}));

		// When the active editor changes, we need to follow and open the correct document.
		//
		// Does not run on already active text editor.
		// Does run after onDidOpenTextDocument.
		// Has to be done after loading all in all open documents.
		ctx.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
			this.changeActiveDocument(ctx, editor ?? null);
		}));
		// It also has to be done for documents already active text editor
		this.changeActiveDocument(ctx, vscode.window.activeTextEditor ?? null);

		ctx.subscriptions.push(vscode.workspace.onDidChangeTextDocument(evt => {
			const uri = evt.document.uri.toString();
			const document = this.documents.get(uri);
			if (!document) { return; }

			if (evt.contentChanges.length === 0) { return; }

			const changes = [...evt.contentChanges];
			changes.sort((a, b) => a.range.start.compareTo(b.range.start));

			document.changedAt(ctx, changes[0].range.start);
		}));

		ctx.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(evt => {
			this.cursorChanged(evt.selections);
		}));
	}

	public close(): void {
		this.documents.forEach(document => document.close());
		this.documents.clear();
		this.currentDocument = null;
	}

	public runToCursor(): void {
		if (!this.getCurrentDocumentHandler()) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}
		this.getCurrentDocumentHandler()?.runToCursor();
	}

	public runNext(): void {
		if (!this.getCurrentDocumentHandler()) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}
		this.getCurrentDocumentHandler()?.runNext();
	}

	public openContextView(): void {
		if (!this.getCurrentDocumentHandler()) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}
		this.getCurrentDocumentHandler()?.revealContextView();
	}

	public restart(ctx: vscode.ExtensionContext): void {
		if (!this.getCurrentDocumentHandler()) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}
		this.getCurrentDocumentHandler()?.restart(ctx);
	}

	private getCurrentDocumentHandler(): SasylfDocument | null {
		if (!this.currentDocument) {
			return null;
		}

		if (!this.documents.has(this.currentDocument)) {
			throw new Error("Could not retrieve document that is not being tracked.");
		}

		return this.documents.get(this.currentDocument)!;
	}

	private loadDocument(ctx: vscode.ExtensionContext, document: vscode.TextDocument) {
		console.debug("Loading document", document.uri.toString());

		if (document.languageId !== 'sasylf') {
			console.debug("Not a sasylf document, not loading.");
			return;
		}

		const uri = document.uri.toString();

		if (!this.documents.has(uri)) {
			console.debug("Document not tracked. Adding to registry.");
			this.documents.set(uri, new SasylfDocument(ctx, path.basename(document.uri.path)));
		}

		const editors = vscode.window.visibleTextEditors.filter(
			(editor) => editor.document.uri === document.uri
		);

		if (editors.length === 0) {
			console.error("No editors for document being loaded.");
			throw Error("No editors for document being loaded.");
		}

		this.documents.get(uri)!.setEditors(editors);

		console.debug("Document loaded");
	}

	private unloadDocument(document: vscode.TextDocument) {
		console.debug("Unloading document", document.uri.toString());
		const uri = document.uri.toString();
		const doc = this.documents.get(uri);
		if (!doc) {
			console.debug("Document not tracked.");
			return;
		}
		doc.deactivate();
		doc.close();
		this.documents.delete(uri);
		console.debug("Document unloaded");
	}

	private changeActiveDocument(ctx: vscode.ExtensionContext, editor: vscode.TextEditor | null) {
		console.debug("Chaning active document");
		this.getCurrentDocumentHandler()?.deactivate();
		this.currentDocument = null;

		if (!editor) {
			return;
		}

		if (editor.document.languageId !== 'sasylf') {
			return;
		}

		this.currentDocument = editor.document.uri.toString();
		this.loadDocument(ctx, editor.document);
		this.getCurrentDocumentHandler()!.activate();
	}

	private cursorChanged(selections: readonly vscode.Selection[]) {
		this.getCurrentDocumentHandler()?.cursorChanged(selections);
	}
}
