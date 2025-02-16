import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import path from 'path';

let process: ChildProcess | null = null;

export function activate(context: vscode.ExtensionContext) {
	const jarPath = path.join(__dirname, "bin", "SASyLF.jar");
	process = spawn("java", ["-jar", jarPath, "--interactive", "--stdin"]);

	process.stdout?.on("data", (data) => {
		console.log(`Output: ${data}`);
	});
	
	process.stderr?.on("data", (data) => {
		console.error(`Error: ${data}`);
	});
	
	process.on("close", (code) => {
		console.log(`Process exited with code ${code}`);
	});

	console.log('Congratulations, your extension "interactive-sasylf" is now active!');

	const disposable = vscode.commands.registerCommand('interactive-sasylf.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Interactive SASyLF!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (process) {
		process.kill();
	}
}
