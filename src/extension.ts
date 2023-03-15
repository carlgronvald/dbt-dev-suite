// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import { listFiles} from './utils';
import { registerAllCommands } from './commands';
import { Model, getModels, getModelDownstreams } from './model';
import { DbtSymbolProvider } from './symbolProvider';


export function updateModels(context : vscode.ExtensionContext) {
	const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	if(!folder) {
		context.workspaceState.update('dbt-dev-suite.models', undefined);
		return;
	}
    const allModels = getModels(folder);
	const modelDownstreams = allModels !== undefined ? getModelDownstreams(allModels) : undefined;
	context.workspaceState.update('dbt-dev-suite.models', allModels);
	context.workspaceState.update('dbt-dev-suite.model-downstreams', modelDownstreams);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


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

	
	const provider = new DbtSymbolProvider();
	const disposable = vscode.languages.registerDocumentSymbolProvider({language : 'sql'}, provider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
