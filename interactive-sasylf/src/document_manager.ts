import * as vscode from 'vscode';
import { SasylfDocument } from '@/sasylf_document';

export class DocumentManager {
	documents: Map<String, SasylfDocument>;
	currentDocument: String | null;

	constructor(context: vscode.ExtensionContext) {
		this.currentDocument = null;

		this.documents = new Map<String, SasylfDocument>();

		// If a text document opens, we need to load that document.
		//
		// Does not run on already open documents.
		context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
			this.loadDocument(document);
		}));

		// It also has to be done for documents already opened.
		console.debug(vscode.workspace.textDocuments);
		vscode.workspace.textDocuments.forEach(document => {
			this.loadDocument(document);
		});

		// If a documenet closes, we need to unload it.
		context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => {
			this.unloadDocument(document);
		}));

		// When the active editor changes, we need to follow and open the correct document.
		//
		// Does not run on already active text editor.
		// Does run after onDidOpenTextDocument.
		// Has to be done after loading all in all open documents.
		context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
			this.changeActiveDocument(editor ?? null);
		}));
		// It also has to be done for documents already active text editor
		this.changeActiveDocument(vscode.window.activeTextEditor ?? null);

		// TODO: If the text in a document changes, it has to be communicated with the sasylf process
		// context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((evt) => {
		// 	// TODO: Handle changes to the text here
		// }));
	}

	public close() {
		this.documents.forEach(document => document.close());
		this.documents.clear();
		this.currentDocument = null;
	}

	public runToCursor() {
		if (!this.getCurrentDocument()) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}
		this.getCurrentDocument()?.runToCursor();
	}

	public openContextView() {
		if (!this.getCurrentDocument()) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}
		this.getCurrentDocument()?.openContextView();
	}

	private getCurrentDocument(): SasylfDocument | null {
		if (!this.currentDocument) {
			return null;
		}

		if (!this.documents.has(this.currentDocument)) {
			throw new Error("Could not retrieve document that is not being tracked.");
		}

		return this.documents.get(this.currentDocument)!;
	}

	private loadDocument(document: vscode.TextDocument) {
		console.debug("Loading document", document.uri.toString());

		if (document.languageId !== 'sasylf') {
			console.debug("Not a sasylf document, not loading.");
			return;
		}

		const uri = document.uri.toString();

		if (!this.documents.has(uri)) {
			console.debug("Document not tracked. Adding to registry.");
			this.documents.set(uri, new SasylfDocument());
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
		doc.close();
		this.documents.delete(uri);
		console.debug("Document unloaded");
	}

	private changeActiveDocument(editor: vscode.TextEditor | null) {
		console.debug("Chaning active document");
		this.currentDocument = null;

		if (!editor) {
			return;
		}

		if (editor.document.languageId !== 'sasylf') {
			console.debug("Not sasylf");
			return;
		}

		this.currentDocument = editor.document.uri.toString();
		this.loadDocument(editor.document);
		this.getCurrentDocument()!.activate();
		console.debug("Active document set");
	}
}