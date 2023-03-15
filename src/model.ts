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

export interface ModelDownstreams {
    /**
     * Downstream of every model indexed by the model name
     */
    downstreams : Map<string, string[]>;
}

/**
 * Finds all upstream models in a given text.
 * @param text text to search for upstream models
 * @returns upstream models contained in text
 */
export function findUpstreamModels(text : string) : string[]{
    // Match on refs
    const matches = text.match(/\{\{\s*ref\s*\(\s*'[a-zA-Z0-9_]+'\s*\)\s*\}\}/g);
    const upstreamModels = matches?.map(match => {
        const model = match.match(/'[a-zA-Z0-9_]+'/)?.[0];

        return model?.substring(1, model.length - 1);
    }).filter(model => model !== undefined);
    if (upstreamModels === undefined) {
        // Match on raw model names that are the entire string
        const match1 = text.match(/^[a-zA-Z0-9_]+$/);
        if (match1 !== null) {
            return [match1[0]];
        }

        // Match on incomplete ref statements
        const match2 = text.match(/^\s*(((((r)?e)?f\s*)?\()?\s*\')?[a-zA-Z0-9_]+('((\s*\))?)?\s*)?$/);
        if (match2 !== null) {
            for (const match of match2) {
                const textMatch = match.match(/'[a-zA-Z0-9_]+'/)?.[0];
                if (textMatch !== undefined) {
                    return [textMatch.substring(1, textMatch.length - 1)];
                }
            }
        }

        return [];
    } else {
        console.log("Returning upstream models");
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
        const name = path.basename(file).split('.')[0];
        console.log("Model " + name + " has upstream models " + upstreamModels);
        
        return {name : path.basename(file).split('.')[0], relativePath : file, absolutePath, upstreamModels};
    });
    
    return allModels;
}

export function getModelDownstreams(models : Model[]) : ModelDownstreams {
    let downstreams : Map<string, string[]> = new Map();
    for (const model of models) {
        if (!downstreams.has(model.name)) {
            downstreams.set(model.name, []);
        }
        for (const upstreamModel of model.upstreamModels) {
            if (!downstreams.has(upstreamModel)) {
                downstreams.set(upstreamModel, []);
            }
            downstreams.get(upstreamModel)?.push(model.name);
        }
    }
    return { downstreams };
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