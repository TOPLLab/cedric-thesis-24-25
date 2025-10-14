import * as vscode from 'vscode';
import { SasylfProcess } from '@/sasylf_process';
import { ContextView } from '@/context_view';
import { DecorationsView } from '@/decorations';
import { preparse } from '@/pre_parser';
import type { Context } from '@/types/context';
import type { Errors } from '@/types/errors';

export class SasylfDocument {
	private process: SasylfProcess;
	private editors: vscode.TextEditor[];
	private ctxView: ContextView | null;
	private decorations: DecorationsView;
	private lastPosition: vscode.Position;
	private contexts: Map<vscode.Range, Context>;

	constructor() {
		this.process = new SasylfProcess();
		this.editors = [];
		this.ctxView = new ContextView();
		this.ctxView.reveal();
		this.decorations = new DecorationsView();
		this.lastPosition = new vscode.Position(0, 0);
		this.contexts = new Map();
	}

	public close(): void {
		this.process.removeAllListeners();
		this.process.close();
		this.ctxView?.dispose();
		this.ctxView = null;
	}

	/**
	 * Assume the pane is activated, otherwise the restart call would never happen
	 */
	public restart(): void {
		this.deactivate();
		this.process.removeAllListeners();
		this.process.close();
		this.process = new SasylfProcess();
		this.lastPosition = new vscode.Position(0, 0);
		this.contexts = new Map();

		for (const editor of this.editors) {
			this.decorations.clear(editor);
		}

		this.activate();
	}

	public setEditors(editors: vscode.TextEditor[]): void {
		this.editors = editors;
		for (const editor of this.editors) {
			this.decorations.render(editor);
		}
	}

	public runToCursor(): void {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}

		const parsed = preparse(editor.document.getText());

		const filtered = parsed
			.filter(i =>
				i.range.start.isAfterOrEqual(this.lastPosition)
				&& (i.range.end.isBefore(editor.selection.end)
					|| i.range.contains(editor.selection.end)));

		this.lastPosition = filtered[filtered.length - 1].range.end;

		this.process.stageInput(...filtered);
	}

	public runNext(): void {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}

		const parsed = preparse(editor.document.getText());

		const item = parsed.find(v => v.range.start.isEqual(this.lastPosition));
		if (item === undefined) {
			return;
		}

		this.lastPosition = item.range.end;

		this.process.stageInput(item);
	}

	public changedAt(position: vscode.Position): void {
		const runRange = new vscode.Range(new vscode.Position(0, 0), this.lastPosition);
		if (!runRange.contains(position)) {
			return;
		}

		// Restart process
		this.restart();

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}

		const parsed = preparse(editor.document.getText());

		const filtered = parsed
			.filter(i =>
				i.range.start.isAfterOrEqual(this.lastPosition)
				&& i.range.end.isBeforeOrEqual(position));


		this.lastPosition = filtered[filtered.length - 1].range.end;

		this.process.stageInput(...filtered);
	}

	public runAll(): void {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}

		const parsed = preparse(editor.document.getText());

		this.process.stageInput(...parsed);
	}

	public cursorChanged(selections: readonly vscode.Selection[]): void {
		if (selections.length === 0) {
			return;
		}

		const position = selections[0].start;
		const key = [...this.contexts.keys()].find(range => range.start.isBeforeOrEqual(position) && range.end.isAfter(position));
		if (key === undefined) {
			console.debug("Range has no context yet");
			this.ctxView?.renderContext({});
			return;
		}

		const context = this.contexts.get(key);
		if (context === undefined) {
			vscode.window.showWarningMessage("No context found where one was expected.");
			this.ctxView?.renderContext({});
			return;
		}

		this.ctxView?.renderContext(context);
	}

	public deactivate(): void {
		this.process.removeAllListeners();
	}

	public revealContextView(): void {
		this.ctxView?.reveal();
	}

	public activate(): void {
		this.process.on('pending', (range: vscode.Range) => {
			for (const editor of this.editors) {
				this.decorations.setPending(editor, range);
			}
		});

		this.process.on('success', (range: vscode.Range, ctx: Context) => {
			this.contexts.set(range, ctx);

			this.ctxView?.renderContext(ctx);
			for (const editor of this.editors) {
				this.decorations.setSuccess(editor, range);
			}
		});

		this.process.on('failure', (range: vscode.Range, errors: Errors) => {
			for (const editor of this.editors) {
				this.decorations.setFailure(editor, range, errors);
			}
		});

		this.ctxView?.reveal();

		for (const editor of this.editors) {
			this.decorations.render(editor);
		}
	}
}
