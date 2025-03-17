import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import { clean } from './input';

let process: ChildProcess;

let lastPosition = new vscode.Position(0, 0);

export function activate(context: vscode.ExtensionContext) {
	const jarPath = path.join(__dirname, "lib", "SASyLF.jar");
	process = spawn("java", ["-jar", jarPath, "--interactive"]);

	process.stdout?.on("data", (data) => {
		console.log(`StdOut: ${data}`);
	});

	process.stderr?.on("data", (data) => {
		console.error(`StdErr: ${data}`);
	});

	process.on("close", (code) => {
		console.log(`Process exited with code ${code}`);
	});

	console.log('Congratulations, your extension "interactive-sasylf" is now active!');

	const disposable = vscode.commands.registerCommand('interactive-sasylf.runToCursor', () => {
		const currentPosition = vscode.window.activeTextEditor?.selection.active;
		if (currentPosition === undefined) {
			return;
		}

		let range = new vscode.Range(lastPosition, currentPosition);
		let textInRange = vscode.window.activeTextEditor?.document.getText(range);
		if (textInRange === undefined) {
			return;
		}

		let formattedInput = `{"input":"${clean(textInRange)}"}\n`;
		console.log("Writing input", formattedInput);
		process.stdin?.write(formattedInput);
		// TODO: Only commit text if succeeded
		lastPosition = currentPosition;
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (process) {
		process.kill();
	}
}
