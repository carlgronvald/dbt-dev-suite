import * as vscode from 'vscode';

export class DbtSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {

        console.log("Providing symbols");
        return new Promise((resolve, reject) => {
            let symbols: vscode.SymbolInformation[] = [];
            let pattern = /(with|,)\s+[a-zA-Z0-9]+\s+as\s*\(/g;
            let text = document.getText();
            let match;
            while (match = pattern.exec(text)) {
                let symbol = new vscode.SymbolInformation(match[1], vscode.SymbolKind.Struct, '', new vscode.Location(document.uri, document.positionAt(match.index)));
                symbols.push(symbol);
            }
            resolve(symbols);
        });
    }
}