import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import * as vscode from 'vscode';
import { Context } from '@/types/context';

export class Sasylf {
	lastPosition: vscode.Position;
	currentPosition: vscode.Position;
	ps: ChildProcess;
	pendingHandlers: ((range: vscode.Range) => void)[];
	successHandlers: ((range: vscode.Range, ctx: Context) => void)[];
	failureHandlers: ((range: vscode.Range) => void)[];

	constructor() {
		console.debug("Starting sasylf process");
		const jarPath = path.join(__dirname, "lib", "SASyLF.jar");
		this.ps = spawn("java", ["-jar", jarPath, "--interactive"]);

		this.ps.on("close", (code) => {
			console.log(`Process exited with code ${code}`);
		});

		this.ps.stdout?.on("data", (data) => this.handleStdOut(data));
		this.ps.stderr?.on("data", (data) => this.handleStdErr(data));

		this.lastPosition = new vscode.Position(0, 0);
		this.currentPosition = this.lastPosition;

		this.pendingHandlers = [];
		this.successHandlers = [];
		this.failureHandlers = [];
	}

	public onPending(handler: (range: vscode.Range) => void): () => void {
		this.pendingHandlers.push(handler);

		return () => {
			this.pendingHandlers = this.pendingHandlers.filter((h) => h !== handler);
		};
	}

	private handlePending(range: vscode.Range) {
		this.pendingHandlers.forEach((h) => h(range));
	}

	public onSuccess(handler: (range: vscode.Range, ctx: Context) => void): () => void {
		this.successHandlers.push(handler);

		return () => {
			this.successHandlers = this.successHandlers.filter((h) => h !== handler);
		};
	}

	private handleSucces(range: vscode.Range, ctx: Context) {
		this.successHandlers.forEach((h) => h(range, ctx));
	}

	public onFailure(handler: (range: vscode.Range) => void): () => void {
		this.failureHandlers.push(handler);

		return () => {
			this.failureHandlers = this.failureHandlers.filter((h) => h !== handler);
		};
	}

	private handleFailure(range: vscode.Range) {
		this.failureHandlers.forEach((h) => h(range));
	}

	public close() {
		this.ps.kill();
	}

	public runToCursor() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		this.currentPosition = editor.selection.active;

		let range = new vscode.Range(this.lastPosition, this.currentPosition);
		let textInRange = vscode.window.activeTextEditor?.document.getText(range);

		if (textInRange === undefined) {
			this.currentPosition = this.lastPosition;
			return;
		}

		this.handlePending(range);

		let req = {
			input: textInRange
		};
		this.ps.stdin?.write(JSON.stringify(req));
		this.ps.stdin?.write('\n');
	}

	private finalizeRunToCursor(ctx: Context) {
		console.log(ctx);
		// TODO: only commit when correct, changes need to be made in sasylf-jar
		let range = new vscode.Range(this.lastPosition, this.currentPosition);
		this.lastPosition = this.currentPosition;
		this.handleSucces(range, ctx);
		// TODO: Set range to succes or failed
	}

	private handleStdOut(data: any) {
		try {
			const res = JSON.parse(data.toString());
			this.finalizeRunToCursor(res);
		} catch (error) {
			vscode.window.showErrorMessage(`Could not parse the output of the sasylf process as a json object.\n${error}`);
		}
	}

	private handleStdErr(data: any) {
		vscode.window.showErrorMessage(`An error occured in the sasylf process.\n${data.toString()}`);
	}
}