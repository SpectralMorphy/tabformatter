import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext){
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('tabformatter.format', () => {
			vscode.window.showInformationMessage('Hello World!');
		})
	)
}