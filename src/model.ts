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
}

export function getModels(baseFolder : string) : Model[] | undefined {
    if (!fs.existsSync(path.join(baseFolder, 'models'))) {
        return undefined;
    }
	const modelFiles = listFiles(path.join(baseFolder, 'models'), 'models').filter(file => file.endsWith('.sql'));
    const seedFiles = fs.existsSync(path.join(baseFolder, 'seeds')) ? listFiles(path.join(baseFolder, 'seeds'), 'seeds').filter(file => file.endsWith('.csv')) : [];
    const allFiles = modelFiles.concat(seedFiles);
    const allModels = allFiles.map(file => {
        return {name : path.basename(file).split('.')[0], relativePath : file, absolutePath : path.join(baseFolder, file) };
    });
    return allModels;
}