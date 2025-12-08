import * as vscode from 'vscode';
import { Client, ContextSchema, type Context } from '@live-sasylf/client';
import { ContextView } from '@/context_view';
import { DecorationsView } from '@/decorations';
import { preparse } from '@/pre_parser';
import { create } from '@bufbuild/protobuf';

export class SasylfDocument {
	private process: Client;
	private editors: vscode.TextEditor[];
	private ctxView: ContextView | null;
	private decorations: DecorationsView;
	private lastPosition: vscode.Position;
	private contexts: Map<vscode.Range, Context>;
	private hasError: boolean;

	constructor(ctx: vscode.ExtensionContext, fileName: string) {
		this.process = new Client(ctx);
		this.editors = [];
		this.ctxView = new ContextView(ctx, fileName);
		this.ctxView.reveal();
		this.decorations = new DecorationsView();
		this.lastPosition = new vscode.Position(0, 0);
		this.contexts = new Map();
		this.hasError = false;
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
	public restart(ctx: vscode.ExtensionContext): void {
		this.deactivate();
		this.process.removeAllListeners();
		this.process.close();
		this.process = new Client(ctx);
		this.lastPosition = new vscode.Position(0, 0);
		this.contexts = new Map();
		this.hasError = false;

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
		if (this.hasError) {
			vscode.window.showInformationMessage("First solve the present error.");
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage("No SASyLF file active");
			return;
		}

		if (this.contexts.keys().find((range) => range.contains(editor.selection.start))) {
			return;
		}

		const parsed = preparse(editor.document.getText());

		const filtered = parsed
			.filter(i =>
				i.range.start.isAfterOrEqual(this.lastPosition)
				&& (i.range.end.isBefore(editor.selection.start)
					|| i.range.contains(editor.selection.start)));

		this.lastPosition = filtered[filtered.length - 1].range.end;

		this.process.stageInput(...filtered);
	}

	public runNext(): void {
		if (this.hasError) {
			vscode.window.showInformationMessage("First solve the present error.");
			return;
		}

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

	public changedAt(ctx: vscode.ExtensionContext, position: vscode.Position): void {
		const runRange = new vscode.Range(new vscode.Position(0, 0), this.lastPosition);
		if (!runRange.contains(position)) {
			return;
		}

		// Restart process
		this.restart(ctx);

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

	public cursorChanged(selections: readonly vscode.Selection[]): void {
		if (selections.length === 0) {
			return;
		}

		const position = selections[0].start;
		const key =
			// get the range with the cursor inside
			[...this.contexts.keys()].find(range => range.start.isBeforeOrEqual(position) && range.end.isAfter(position))
			// fallback to the last context
			?? [...this.contexts.keys()].reduce((last, range) => range.start.isAfterOrEqual(last.end) ? range : last);

		if (key === undefined) {
			this.ctxView?.postContext(create(ContextSchema));
			return;
		}

		const context = this.contexts.get(key);
		if (context === undefined) {
			vscode.window.showWarningMessage("No context found where one was expected.");
			this.ctxView?.postContext(create(ContextSchema));
			return;
		}

		this.ctxView?.postContext(context);
	}

	public deactivate(): void {
		this.process.removeAllListeners();
	}

	public revealContextView(): void {
		this.ctxView?.reveal();
	}

	public activate(): void {
		this.process.on('pending', (range) => {
			for (const editor of this.editors) {
				this.decorations.setPending(editor, range);
			}
		});

		this.process.on('success', (range, response) => {
			this.contexts.set(range, response.context!);

			this.ctxView?.postContext(response.context!);
			for (const editor of this.editors) {
				this.decorations.setSuccess(editor, range, response.warnings);
			}
		});

		this.process.on('failure', (range, response) => {
			this.hasError = true;
			for (const editor of this.editors) {
				this.decorations.setFailure(editor, range, response.errors, response.warnings);
			}
		});

		this.ctxView?.reveal();

		for (const editor of this.editors) {
			this.decorations.render(editor);
		}
	}
}
