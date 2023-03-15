import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { listFiles } from './utils';

export interface Model {
    /**
     * 
     */
    name: string;
    /**
     * Relative path of the model in the workspace.
     */
    relativePath : string;
    /**
     * absolute path of the model.
     */
    absolutePath:  string;
    upstreamModels : string[];
}

export function findUpstreamModels(fileText : string) : string[]{
    
    const upstreamModels = fileText.match(/\{\{\s*ref\('(.*)'\)\s*\}\}/g)?.map(match => {
        const model = match.match(/'(.*)'/)?.[1];
        console.log(model);
        return model;
    }).filter(model => model !== undefined);
    if (upstreamModels === undefined) {
        return [];
    } else {
        return upstreamModels as string[];
    }
}

export function getModels(baseFolder : string) : Model[] | undefined {
    if (!fs.existsSync(path.join(baseFolder, 'models'))) {
        return undefined;
    }

	const modelFiles = listFiles(path.join(baseFolder, 'models'), 'models').filter(file => file.endsWith('.sql'));
    const seedFiles = fs.existsSync(path.join(baseFolder, 'seeds')) ? listFiles(path.join(baseFolder, 'seeds'), 'seeds').filter(file => file.endsWith('.csv')) : [];
    const allFiles = modelFiles.concat(seedFiles);
    const allModels = allFiles.map(file => {
        const absolutePath = path.join(baseFolder, file);
        const fileContent = fs.readFileSync(absolutePath, 'utf8');
        const upstreamModels = findUpstreamModels(fileContent);
        
        return {name : path.basename(file).split('.')[0], relativePath : file, absolutePath, upstreamModels};
    });
    
    return allModels;
}

export function gotoModel(modelName : string, models : Model[]) {
    const selectedModel = models.find(model => model.name === modelName);
    if (!selectedModel) {
        vscode.window.showInformationMessage('Could not find model ' + modelName);
        return;
    }
    vscode.workspace.openTextDocument(selectedModel.absolutePath).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}