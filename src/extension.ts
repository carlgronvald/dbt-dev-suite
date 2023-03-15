// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as path from 'path';

function runInTerminal(command : string) {
	const terminal = vscode.window.activeTerminal ? vscode.window.activeTerminal : vscode.window.createTerminal();
	terminal.show();
	terminal.sendText(command);
}

function listFiles(dirPath: string, accPath : string = ''): string[] {
    const files: string[] = [];

    // Get all files and directories in the current directory
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    // Iterate over each entry
    for (const entry of entries) {
        // Construct the full path to the entry
        const entryPath = path.join(dirPath, entry.name);
		const relPath = path.join(accPath, entry.name);

        if (entry.isDirectory()) {
            // Recursively list files in subdirectories
            const subFiles = listFiles(entryPath, relPath);
            files.push(...subFiles);
        } else {
            // Add the file path to the list
            files.push(relPath);
        }
    }

    return files;
}


function updateFiles(context : vscode.ExtensionContext) {
	const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	if(!folder) {
		context.workspaceState.update('dbt-dev-suite.files', undefined);
		return;
	}
	// check if folder/models is a directory
	if (!fs.existsSync(path.join(folder, 'models'))) {
		context.workspaceState.update('dbt-dev-suite.files', undefined);
		return;
	}

	context.workspaceState.update('dbt-dev-suite.files', listFiles(path.join(folder, 'models'), 'models').filter(file => file.endsWith('.sql')));
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "dbt-dev-suite" is now active!');

	updateFiles(context);
	// Listen for changes to the workspace folders
	vscode.workspace.onDidChangeWorkspaceFolders(event => {
		updateFiles(context);
	});

	vscode.workspace.onDidCreateFiles(event => {
		updateFiles(context);
	});
	
	vscode.workspace.onDidDeleteFiles(event => {
		updateFiles(context);
	});


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('dbt-dev-suite.dbt-build', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user

		console.log("Hiiii");

		const files = context.workspaceState.get<string[]>('dbt-dev-suite.files');
		if (!files) {
			vscode.window.showInformationMessage('No dbt files found in workspace');
			return;
		}
		const models = files
		.map(file => {
			return {label : path.basename(file), description : file };
		});

		const modes = ['downstream', 'upstream'];
		//const models = ['stg_bi01__dim_apples', 'stg_bi01__dim_oranges', 'stg_bi01__dim_bananas'];
		
		vscode.window.showQuickPick(modes, {canPickMany : true, placeHolder : 'Selection mode'}).then(modes => {
			vscode.window.showQuickPick(models, {canPickMany : true, placeHolder :'Select models to build'}).then(models => {
				if (!models || !modes || models.length < 1) {
					vscode.window.showInformationMessage('No models selected. Aborting dbt build');
					return;
				}

				const postSelector = modes?.includes('downstream') ? '+' : '';
				const preSelector = modes?.includes('upstream') ? '+' : '';
				const modelSelector = models?.map(model => model.label);
				const selector = modelSelector.map(model => preSelector + model + postSelector).join(' ');

				runInTerminal("dbt build --select " + selector);
			});
		});

	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
