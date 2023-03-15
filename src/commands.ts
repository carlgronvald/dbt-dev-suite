import * as vscode from 'vscode';
import * as path from 'path';

import { runInTerminal, getAbsoluteModelPath} from './utils';


function build(context : vscode.ExtensionContext) {

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

}

function gotoUpstream(context : vscode.ExtensionContext) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showInformationMessage('No active editor');
        return;
    }

    const doc = activeEditor.document;
    const upstreamModels = doc.getText().match(/\{\{\s*ref\('(.*)'\)\s*\}\}/g)?.map(match => {
        const model = match.match(/'(.*)'/)?.[1];
        console.log(model);
        return model;
    }); //TODO: Deal with {{ ref ('')}} inside sql strings. Maybe unnecessary

    if (!upstreamModels || upstreamModels.length < 1) {
        vscode.window.showInformationMessage('No upstream models found');
        return;
    }

    const files = context.workspaceState.get<string[]>('dbt-dev-suite.files');
    if (!files) {
        vscode.window.showInformationMessage('No dbt files found in workspace');
        return;
    }

    const models = files.map(file => {
        return {name : path.basename(file).split('.sql')[0], path : file };
    });

    
    for (const model of models) {
        console.log(model);
    }


    const upstreamModelPaths = upstreamModels.map(model => {
        const modelPath = models.find(m => m.name === model)?.path;
        if (!modelPath) {
            vscode.window.showInformationMessage('Could not find model ' + model);
            return;
        }
        return modelPath;
    });

    const modelPaths = upstreamModelPaths.filter(modelPath => modelPath !== undefined) as string[];

    if (modelPaths.length < 1) {
        vscode.window.showInformationMessage('No upstream models found');
        return;
    }

    vscode.window.showQuickPick(modelPaths, {canPickMany : false, placeHolder : 'Select upstream model'}).then(modelPath => {
        if (!modelPath) {
            vscode.window.showInformationMessage('No model selected. Aborting');
            return;
        }
        vscode.workspace.openTextDocument( getAbsoluteModelPath(modelPath)).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    });
}

export function registerAllCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('dbt-dev-suite.dbt-build', () => build(context)));
    context.subscriptions.push(vscode.commands.registerCommand('dbt-dev-suite.dbt-goto-upstream', () => gotoUpstream(context)));
}