import * as vscode from 'vscode';
import { ChildProcess, spawn, spawnSync } from 'child_process';
import path from 'path';
import { Context } from '@/types/context';
import { Errors } from '@/types/errors';
import { SasylfResponse as Response } from '@/types/response';
import { EventEmitter } from 'node:events';

export type SasylfInput = {
	range: vscode.Range
	input: string
}

export class SasylfProcess extends EventEmitter<{
	'pending': [range: vscode.Range]
	'success': [range: vscode.Range, ctx: Context]
	'failure': [range: vscode.Range, errors: Errors]
}> {
	private stagedInput: SasylfInput[];
	private comittedInput: SasylfInput | null;
	private ps: ChildProcess;
	private buffer: string;

	constructor() {
		super();

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
			console.debug(`Process exited with code ${code}`);
		});

		this.ps.stdout?.on("data", (data) => this.handleStdOut(data));
		this.ps.stderr?.on("data", (data) => this.handleStdErr(data));

		this.stagedInput = [];
		this.comittedInput = null;
		this.buffer = "";
	}

	private handlePending(range: vscode.Range) {
		this.emit('pending', range);
	}

	private handleSucces(range: vscode.Range, ctx: Context) {
		this.emit('success', range, ctx);
		this.comittedInput = null;
		this.sendNextInput();
	}

	private handleFailure(range: vscode.Range, errors: Errors) {
		this.emit('failure', range, errors);
		this.comittedInput = null;
		this.stagedInput = [];
	}

	public close() {
		this.ps.removeAllListeners();
		this.ps.kill();

		this.stagedInput = [];
		this.comittedInput = null;
	}

	public stageInput(...input: SasylfInput[]) {
		const hasToStart = this.stagedInput.length === 0;
		this.stagedInput.push(...input);
		for (const inp of input) {
			this.handlePending(inp.range);
		}
		if (hasToStart) {
			this.sendNextInput();
		}
	}

	/// Send next value in the staged input to the process.
	/// If there's already a pending input, this will do nothing.
	/// If there's no staged input left, this will do nothing.
	private sendNextInput() {
		if (this.comittedInput !== null || this.stagedInput.length === 0) {
			return;
		}

		this.comittedInput = this.stagedInput[0];
		this.stagedInput = this.stagedInput.slice(1);

		let req = JSON.stringify({
			input: this.comittedInput.input
		});

		console.debug("Sending request", req);
		this.ps.stdin?.write(`${req}\n`);
	}

	private finalizeInput(res: Response) {
		console.debug("Response:", res);

		if (this.comittedInput === null) {
			return;
		}

		if (res.type === "errors") {
			this.handleFailure(this.comittedInput.range, res.errors);
			return;
		}

		this.handleSucces(this.comittedInput.range, res.context);
	}

	private handleStdOut(data: any) {
		this.buffer += data.toString(); // Append the new chunk to the buffer

		let delimiterIndex: number;
		while ((delimiterIndex = this.buffer.indexOf("\n")) !== -1) {
			const message = this.buffer.substring(0, delimiterIndex).trim();
			this.buffer = this.buffer.substring(delimiterIndex + 1);

			try {
				const res = JSON.parse(message);
				// TODO: consider the message ID
				this.finalizeInput(res);
			} catch (error) {
				vscode.window.showErrorMessage(`Could not parse the output of the sasylf process as a json object.\n${error}`);

				if (this.comittedInput === null) {
					return;
				}

				this.handleFailure(this.comittedInput.range, [message]);
			}
		}
	}

	private handleStdErr(data: any) {
		vscode.window.showErrorMessage(`An error occured in the sasylf process.\n${data.toString()}`);
	}
}