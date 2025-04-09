import * as vscode from 'vscode';
import { SasylfProcess } from '@/sasylf_process';
import { ContextView } from '@/context_view';
import { DecorationsView } from '@/decorations';

export class SasylfDocument {
	private process: SasylfProcess;
	private editors: vscode.TextEditor[];
	private ctxView: ContextView | null;
	private decorations: DecorationsView;

	constructor() {
		this.process = new SasylfProcess();
		this.editors = [];
		this.ctxView = null;
		this.decorations = new DecorationsView();
		this.openContextView();
	}

	public close() {
		this.process.close();
		this.ctxView?.close();
		this.ctxView = null;
	}

	public setEditors(editors: vscode.TextEditor[]) {
		this.editors = editors;
		for (const editor of this.editors) {
			console.log(editor === vscode.window.activeTextEditor);
			this.decorations.render(editor);
		}
	}

	public runToCursor() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}
		this.process.runToCursor();
	}

	public openContextView() {
		if (!this.ctxView) {
			this.ctxView = new ContextView();
			this.ctxView.onDidDispose(() => {
				this.ctxView = null;
			});
		}

		this.ctxView.reveal();
	}

	public activate() {
		this.process.onPending((range) => {
			for (const editor of this.editors) {
				this.decorations.setPending(editor, range);
			}
		});

		this.process.onSuccess((range, ctx) => {
			this.ctxView?.renderContext(ctx);
			for (const editor of this.editors) {
				this.decorations.setSuccess(editor, range);
			}
		});

		this.process.onFailure((range) => {
			for (const editor of this.editors) {
				this.decorations.setFailure(editor, range);
			}
		});

		this.openContextView();
		for (const editor of this.editors) {
			this.decorations.render(editor);
		}
	}
}