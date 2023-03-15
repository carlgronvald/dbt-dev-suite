import * as vscode from 'vscode';
import * as path from 'path';

import { runInTerminal} from './utils';
import { Model, findUpstreamModels, gotoModel, ModelDownstreams} from './model';


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

/**
 * 
 * @param modelNames 
 * @param context 
 * @param warnOnNoMatch if true, a warning is displayed if a referenced model is not found
 * @param jumpIfSingle If true, jump directly if only one model is found
 * @returns 
 */
function chooseGotoModel(modelNames : string[], context : vscode.ExtensionContext, noMatchingModelsError : string, warnOnNoMatch : boolean = true, jumpIfSingle : boolean = false) {

    const models = context.workspaceState.get<Model[]>('dbt-dev-suite.models');

    if (!models) {
        vscode.window.showInformationMessage('No dbt files found in workspace');
        return;
    }

    const matchingModels = models.filter(model => {
        return modelNames.includes(model.name);
    });
    
    if (warnOnNoMatch) {
        const notMatchingModels = modelNames.filter(name => {
            return matchingModels.find(model => model.name === name) === undefined;
        });
        
        notMatchingModels.forEach(modelName => {
            vscode.window.showWarningMessage('Model ' + modelName + ' not found in workspace');
        });
    }


    if (matchingModels.length < 1) {
        vscode.window.showInformationMessage(noMatchingModelsError);
        return;
    }

    const modelSelection = matchingModels.map(model => {
        return {label : model.name, description : model.relativePath };
    });

    vscode.window.showQuickPick(modelSelection, {canPickMany : false, placeHolder :'Select downstream model to open'}).then(modelSelection => {
        if (!modelSelection) {
            vscode.window.showInformationMessage('No model selected. Aborting');
            return;
        }
        gotoModel(modelSelection.label, matchingModels);
    });
    
    if (matchingModels.length === 1 && jumpIfSingle) {
        gotoModel(matchingModels[0].name, matchingModels);
        return;
    }
    else {
        const quickSelection = matchingModels.map(model => {
            return {label : model.name, description : model.relativePath};
        });
        
    
        vscode.window.showQuickPick(quickSelection, {canPickMany : false, placeHolder : 'Select upstream model'}).then(selection => {
            if (!selection) {
                vscode.window.showInformationMessage('No model selected. Aborting');
                return;
            }
            gotoModel(selection.label, matchingModels);
        });
    }
}

function cmdGotoDownstream(context : vscode.ExtensionContext) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showInformationMessage('No active editor');
        return;
    }

    const doc = activeEditor.document;
    const modelName = path.basename(doc.fileName).split('.')[0];
    const downstreams = context.workspaceState.get<ModelDownstreams>('dbt-dev-suite.model-downstreams');
    if (!downstreams) {
        vscode.window.showInformationMessage('No downstreams found');
        return;
    }

    const downstreamModels = downstreams.downstreams.get(modelName) ?? [];
    if (downstreamModels.length < 1) {
        vscode.window.showInformationMessage('No downstream models found');
        return;
    }

    chooseGotoModel(downstreamModels, context, 'No valid downstream references found');
}

function cmdGotoUpstream(context : vscode.ExtensionContext) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showInformationMessage('No active editor');
        return;
    }

    const doc = activeEditor.document; //TODO: Deal with {{ ref ('')}} inside sql strings. Maybe unnecessary
    const upstreamModels = findUpstreamModels(doc.getText());
    console.log("Got upstream models"  + upstreamModels);
    if (!upstreamModels || upstreamModels.length < 1) {
        vscode.window.showInformationMessage('No upstream models found');
        return;
    }
    chooseGotoModel(upstreamModels, context, 'No valid upstream references found');
}

function cmdGotoModel(context : vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if(!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
    }
    const selection = editor.selection;
    if (!selection) {
        vscode.window.showInformationMessage('No selection');
        return;
    }
    const selectionText = editor.document.getText(selection);
    console.log("Selection text: " + selectionText);

    const upstreamModels = findUpstreamModels(selectionText);
    if (upstreamModels.length < 1) {
        vscode.window.showInformationMessage('No models found');
        return;
    }
    console.log("Found selected models " + upstreamModels);

    chooseGotoModel(upstreamModels, context, 'No valid model references found', true, true);
}

export function registerAllCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('dbt-dev-suite.dbt-build', () => cmdBuild(context)));
    context.subscriptions.push(vscode.commands.registerCommand('dbt-dev-suite.dbt-goto-upstream', () => cmdGotoUpstream(context)));
    context.subscriptions.push(vscode.commands.registerCommand('dbt-dev-suite.dbt-goto-model', () => cmdGotoModel(context)));
    context.subscriptions.push(vscode.commands.registerCommand('dbt-dev-suite.dbt-goto-downstream', () => cmdGotoDownstream(context)));
}