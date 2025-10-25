import * as vscode from 'vscode';
import type { ChildProcess } from 'child_process';
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import {
	ResponseSchema,
	type Response,
	RequestSchema,
	InputSchema,
} from '@/gen/sasylf/types/context_pb';
import { EventEmitter } from 'node:events';
import { create, fromJsonString, toJsonString } from "@bufbuild/protobuf";

export type SasylfInput = {
	range: vscode.Range
	input: string
}

export class Client extends EventEmitter<{
	'pending': [range: vscode.Range]
	'success': [range: vscode.Range, response: Response]
	'failure': [range: vscode.Range, response: Response]
}> {
	private stagedInput: SasylfInput[];
	private comittedInput: SasylfInput | null;
	private ps: ChildProcess;
	private buffer: string;

	constructor(ctx: vscode.ExtensionContext) {
		super();

		const javaVersionPs = spawnSync("java", ["--version"]);
		if (javaVersionPs.error) {
			vscode.window.showErrorMessage("Please ensure java 21 or later is installed and available in PATH.");
			throw new Error("No Java Runtime found");
		}

		const javaVersion = javaVersionPs.stdout.toString().split(' ', 2)[1];
		const javaMajor = javaVersion.split('.', 1)[0];
		if (parseInt(javaMajor) < 21) {
			vscode.window.showErrorMessage(`The Live SASyLF plugin needs a java runtime of at least 21 or later. You are currently hosting version ${javaVersion}`);
			throw new Error("Outdated Java Runtime");
		}

		console.debug("Starting sasylf process");
		const jarPath = path.join(ctx.extensionPath, "lib", "SASyLF.jar");
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

	private handleSucces(range: vscode.Range, response: Response) {
		this.emit('success', range, response);
		this.comittedInput = null;
		this.sendNextInput();
	}

	private handleFailure(range: vscode.Range, response: Response) {
		this.emit('failure', range, response);
		this.comittedInput = null;
		this.stagedInput = [];
	}

	public close(): void {
		this.ps.removeAllListeners();
		this.ps.kill();

		this.stagedInput = [];
		this.comittedInput = null;
	}

	public stageInput(...input: SasylfInput[]): void {
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

		const req = toJsonString(RequestSchema, create(RequestSchema, {
			value: {
				value: create(InputSchema, {
					input: this.comittedInput.input
				}),
				case: 'input'
			}
		}));
		console.debug("Sending request", req);
		this.ps.stdin?.write(`${req}\n`);
	}

	private finalizeInput(res: Response) {
		console.debug("Response:", res);

		if (this.comittedInput === null) {
			return;
		}

		if (res.errors.length > 0) {
			this.handleFailure(this.comittedInput.range, res);
		}

		this.handleSucces(this.comittedInput.range, res);
	}

	private handleStdOut(data: ArrayBuffer) {
		this.buffer += data.toString(); // Append the new chunk to the buffer

		let delimiterIndex: number;
		while ((delimiterIndex = this.buffer.indexOf("\n")) !== -1) {
			const message = this.buffer.substring(0, delimiterIndex).trim();
			this.buffer = this.buffer.substring(delimiterIndex + 1);

			try {
				const res = fromJsonString(ResponseSchema, message);
				this.finalizeInput(res);
			} catch (error) {
				console.error(`Could not parse the output of the sasylf process as a json object.\n${error}\nin message\n${message}`);

				if (this.comittedInput === null) {
					return;
				}

				this.handleFailure(this.comittedInput.range, create(ResponseSchema, {
					errors: [`Could not parse SASyLF response.`]
				}));
			}
		}
	}

	private handleStdErr(data: ArrayBuffer) {
		const stream = data.toString();

		if (this.comittedInput === null) {
			return;
		}

		this.handleFailure(this.comittedInput.range, create(ResponseSchema, {
			errors: [`An error occurred in the SASyLF process.`]
		}));

		console.error(`An error occurred in the SASyLF process: ${stream}`);
	}
}
