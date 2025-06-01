import * as vscode from 'vscode';
import { SasylfProcess } from '@/sasylf_process';
import { ContextView } from '@/context_view';
import { DecorationsView } from '@/decorations';
import { parseIntoAtoms } from '@/basic_parser';

export class SasylfDocument {
	private process: SasylfProcess;
	private editors: vscode.TextEditor[];
	private ctxView: ContextView | null;
	private decorations: DecorationsView;
	private lastPosition: vscode.Position;

	constructor() {
		this.process = new SasylfProcess();
		this.editors = [];
		this.ctxView = null;
		this.decorations = new DecorationsView();
		this.openContextView();
		this.lastPosition = new vscode.Position(0, 0);
	}

	public close() {
		this.process.close();
		this.process.removeAllListeners();
		this.ctxView?.dispose();
		this.ctxView = null;
	}

	public restart() {
		this.process.close();
		this.process.removeAllListeners();
		this.process = new SasylfProcess();
		if (this.ctxView) {
			this.ctxView.dispose();
			this.openContextView();
		}
		this.decorations = new DecorationsView();
		for (const editor of this.editors) {
			this.decorations.render(editor);
		}
	}

	public setEditors(editors: vscode.TextEditor[]) {
		this.editors = editors;
		for (const editor of this.editors) {
			this.decorations.render(editor);
		}
	}

	public runToCursor() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}

		const parsed = parseIntoAtoms(
			new vscode.Position(0, 0),
			editor.document.getText(),
			false);

		const filtered = parsed
			.filter(i =>
				i.range.start.isAfterOrEqual(this.lastPosition)
				&& (i.range.end.isBefore(editor.selection.end)
					|| i.range.contains(editor.selection.end)));

		this.lastPosition = filtered[filtered.length - 1].range.end;

		this.process.stageInput(...filtered);
	}

	public runNext() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}

		const parsed = parseIntoAtoms(
			new vscode.Position(0, 0),
			editor.document.getText(),
			false);

		const item = parsed.find(v => v.range.start.isEqual(this.lastPosition));
		if (item === undefined) {
			return;
		}

		this.lastPosition = item.range.end;

		this.process.stageInput(item);
	}

	public runAll() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}

		const parsed = parseIntoAtoms(
			new vscode.Position(0, 0),
			editor.document.getText(),
			false);

		this.process.stageInput(...parsed);
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

	public deactivate() {
		this.process.removeAllListeners();
	}

	public activate() {
		this.process.on('pending', (range) => {
			for (const editor of this.editors) {
				this.decorations.setPending(editor, range);
			}
		});

		this.process.on('success', (range, ctx) => {
			this.ctxView?.renderContext(ctx);
			for (const editor of this.editors) {
				this.decorations.setSuccess(editor, range);
			}
		});

		this.process.on('failure', (range, errors) => {
			this.lastPosition = range.start; // Reset the last position to just before the failure

			for (const editor of this.editors) {
				this.decorations.setFailure(editor, range, errors);
			}
		});

		this.openContextView();

		for (const editor of this.editors) {
			this.decorations.render(editor);
		}
	}
}