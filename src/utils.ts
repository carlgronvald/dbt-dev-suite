import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function listFiles(dirPath: string, accPath : string = ''): string[] {
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


export function runInTerminal(command : string) {
	const terminal = vscode.window.activeTerminal ? vscode.window.activeTerminal : vscode.window.createTerminal();
	terminal.show();
	terminal.sendText(command);
}