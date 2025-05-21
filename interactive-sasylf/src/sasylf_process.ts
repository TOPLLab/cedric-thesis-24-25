import * as vscode from 'vscode';
import { ChildProcess, spawn, spawnSync } from 'child_process';
import path from 'path';
import { Context } from '@/types/context';
import { Errors } from '@/types/errors';
import { SasylfResponse as Response } from '@/types/response';

export class SasylfProcess {
	private lastPosition: vscode.Position;
	private currentPosition: vscode.Position;
	private ps: ChildProcess;
	private pendingHandler: ((range: vscode.Range) => void) | null;
	private successHandler: ((range: vscode.Range, ctx: Context) => void) | null;
	private failureHandler: ((range: vscode.Range, errors: Errors) => void) | null;

	constructor() {
		const javaVersionPs = spawnSync("java", ["--version"]);
		if (javaVersionPs.error) {
			vscode.window.showErrorMessage("Please ensure java 21 or later is installed and available in PATH.");
			throw new Error("No Java Runtime found");
		}

		const javaVersion = javaVersionPs.stdout.toString().split(' ', 2)[1];
		const javaMajor = javaVersion.split('.', 1)[0];
		if (parseInt(javaMajor) < 21) {
			vscode.window.showErrorMessage(`The interactive SASyLF plugin needs a java runtime of at least 21 or later. You are currently hosting version ${javaVersion}`);
			throw new Error("Outdated Java Runtime");
		}

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

		this.pendingHandler = null;
		this.successHandler = null;
		this.failureHandler = null;
	}

	public onPending(handler: (range: vscode.Range) => void) {
		this.pendingHandler = handler;
	}

	private handlePending(range: vscode.Range) {
		this.pendingHandler?.(range);
	}

	public onSuccess(handler: (range: vscode.Range, ctx: Context) => void) {
		this.successHandler = handler;
	}

	private handleSucces(range: vscode.Range, ctx: Context) {
		this.successHandler?.(range, ctx);
	}

	public onFailure(handler: (range: vscode.Range, errors: Errors) => void) {
		this.failureHandler = handler;
	}

	private handleFailure(range: vscode.Range, errors: Errors) {
		this.failureHandler?.(range, errors);
	}

	public close() {
		this.ps.kill();

		this.pendingHandler = null;
		this.successHandler = null;
		this.failureHandler = null;
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
		console.debug("Sending request", req);
		this.ps.stdin?.write(JSON.stringify(req));
		this.ps.stdin?.write('\n');
	}

	private finalizeRunToCursor(res: Response) {
		console.debug("Response:", res);
		let range = new vscode.Range(this.lastPosition, this.currentPosition);

		if (res.type === "errors") {
			this.handleFailure(range, res.errors);
			return;
		}

		this.lastPosition = this.currentPosition;
		this.handleSucces(range, res.context);
	}

	private handleStdOut(data: any) {
		try {
			const res = JSON.parse(data.toString());
			this.finalizeRunToCursor(res);
		} catch (error) {
			vscode.window.showErrorMessage(`Could not parse the output of the sasylf process as a json object.\n${error}`);

			let range = new vscode.Range(this.lastPosition, this.currentPosition);
			this.handleFailure(range, [data.toString()]);
		}
	}

	private handleStdErr(data: any) {
		vscode.window.showErrorMessage(`An error occured in the sasylf process.\n${data.toString()}`);
	}
}