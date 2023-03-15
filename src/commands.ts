import * as vscode from 'vscode';
import * as path from 'path';

import { runInTerminal} from './utils';
import { Model } from './model';


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

    const models = context.workspaceState.get<Model[]>('dbt-dev-suite.models');
    if (!models) {
        vscode.window.showInformationMessage('No dbt files found in workspace');
        return;
    }

    
    for (const model of models) {
        console.log(model);
    }

    const matchingModels = upstreamModels.flatMap(modelName => {
        const model = models.find(m => m.name === modelName);
        if (!model) {
            vscode.window.showInformationMessage('Could not find model ' + model);
            return [];
        }
        return [model];
    });

    if (matchingModels.length < 1) {
        vscode.window.showInformationMessage('No upstream models found');
        return;
    }

    const selection = matchingModels.map(model => {
        return {label : model.name, description : model.relativePath};
    });

    vscode.window.showQuickPick(selection, {canPickMany : false, placeHolder : 'Select upstream model'}).then(selection => {
        if (!selection) {
            vscode.window.showInformationMessage('No model selected. Aborting');
            return;
        }
        const selectedModel = matchingModels.find(model => model.name === selection.label);
        if (!selectedModel) {
            vscode.window.showInformationMessage('Could not find model ' + selection.label);
            return;
        }
        vscode.workspace.openTextDocument(selectedModel.absolutePath).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    });
}

export function registerAllCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('dbt-dev-suite.dbt-build', () => build(context)));
    context.subscriptions.push(vscode.commands.registerCommand('dbt-dev-suite.dbt-goto-upstream', () => gotoUpstream(context)));
}