// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import { listFiles} from './utils';
import { registerAllCommands } from './commands';
import { Model, getModels } from './model';


export function updateModels(context : vscode.ExtensionContext) {
	const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	if(!folder) {
		context.workspaceState.update('dbt-dev-suite.models', undefined);
		return;
	}
    const allModels = getModels(folder);
	context.workspaceState.update('dbt-dev-suite.models', allModels);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "dbt-dev-suite" is now active!');

	updateModels(context);
	// Listen for changes to the workspace folders
	vscode.workspace.onDidChangeWorkspaceFolders(event => {
		updateModels(context);
	});

	vscode.workspace.onDidCreateFiles(event => {
		updateModels(context);
	});
	
	vscode.workspace.onDidDeleteFiles(event => {
		updateModels(context);
	});

	registerAllCommands(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
