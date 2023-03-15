import * as vscode from 'vscode';
import * as path from 'path';

import { runInTerminal} from './utils';
import { Model, findUpstreamModels, gotoModel} from './model';


function cmdBuild(context : vscode.ExtensionContext) {

    const models = context.workspaceState.get<Model[]>('dbt-dev-suite.models');
    if (!models) {
        vscode.window.showInformationMessage('No dbt files found in workspace');
        return;
    }
    const modelSelection = models.map(model => {
        return {label : model.name, description : model.relativePath };
    });

    const modes = ['downstream', 'upstream'];
    
    vscode.window.showQuickPick(modes, {canPickMany : true, placeHolder : 'Selection mode'}).then(modes => {
        vscode.window.showQuickPick(modelSelection, {canPickMany : true, placeHolder :'Select models to build'}).then(modelSelection => {
            if (!modelSelection || !modes || modelSelection.length < 1) {
                vscode.window.showInformationMessage('No models selected. Aborting dbt build');
                return;
            }

            const postSelector = modes?.includes('downstream') ? '+' : '';
            const preSelector = modes?.includes('upstream') ? '+' : '';
            const modelSelector = modelSelection?.map(model => model.label);
            const selector = modelSelector.map(model => preSelector + model + postSelector).join(' ');

            runInTerminal("dbt build --select " + selector);
        });
    });

}

function cmdGotoUpstream(context : vscode.ExtensionContext) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showInformationMessage('No active editor');
        return;
    }

    const doc = activeEditor.document; //TODO: Deal with {{ ref ('')}} inside sql strings. Maybe unnecessary
    const upstreamModels = findUpstreamModels(doc.getText());
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
        gotoModel(selection.label, matchingModels);
    });
}

function cmdGotoModel(context : vscode.ExtensionContext) {
    //TODO
}

export function registerAllCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('dbt-dev-suite.dbt-build', () => cmdBuild(context)));
    context.subscriptions.push(vscode.commands.registerCommand('dbt-dev-suite.dbt-goto-upstream', () => cmdGotoUpstream(context)));
}