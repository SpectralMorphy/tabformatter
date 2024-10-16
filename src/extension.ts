import * as vscode from 'vscode';

interface TextSelection {
	line: number
	char: number
	offset: number
	text: string
	replace: string
	split: string[]
}

function print(text: string){
	vscode.window.showInformationMessage(text)
}

function format(editor: vscode.TextEditor, edit: vscode.TextEditorEdit){
	const sels = parseSelection(editor)
	if(!formatSels(sels, getSeparator())){
		if(!formatSels(sels, ' ')){
			return
		}
	}

	for(const sel of sels){
		edit.replace(new vscode.Range(sel.line, sel.char, sel.line, sel.char + sel.text.length), sel.replace)
	}

	editor.selection = new vscode.Selection(editor.selection.end, editor.selection.end)
}

function setSeparator(editor: vscode.TextEditor, edit: vscode.TextEditorEdit){
	(async ()=> {
		const resp = await vscode.window.showInputBox({
			placeHolder: 'preferred separator',
		})
		vscode.workspace.getConfiguration().update('tabformatter.separator', resp, true)
	})();
}

function getSeparator(): string | null | undefined {
	return vscode.workspace.getConfiguration().get<string>('tabformatter.separator')
}

function parseSelection(editor: vscode.TextEditor): TextSelection[]{
	const result: TextSelection[] = []
	for(const selection of editor.selections){
		if(selection.end.isAfter(selection.start)){
			let offset = selection.start.character
			let char = offset
			if(offset != 0){
				const prefix = editor.document.getText(new vscode.Range(selection.start.line, 0, selection.start.line, offset))
				const tabs = prefix.match(/\t/g)
				if(tabs){
					offset += tabs.length * 3
				}
			}
			let line = selection.start.line
			for(const text of editor.document.getText(selection).split('\n')){
				result.push({
					line: line,
					char: char,
					offset: offset,
					text: text,
					replace: text,
					split: []
				})
				offset = 0
				char = 0
				line++
			}
		}
	}
	return result
}

function formatSels(sels: TextSelection[], separator: string | null | undefined): boolean{
	if(!separator){
		return false
	}

	const sizes: number[] = []
	let maxi = 0
	let maxoffset = 0

	for(const sel of sels){
		const split = sel.text.split(separator == ' ' ? /\s+/ : separator)
		let i = 0
		sel.split = []
		split.forEach((value) => {
			value = value.replace(/\t/g, '    ').trim()
			if(separator == ' ' && value == ''){
				return
			}
			sizes[i] = Math.max(sizes[i] ?? 0, value.length)
			sel.split.push(value)
			i++
		})
		maxi = Math.max(maxi, split.length - 1)
		maxoffset = Math.max(maxoffset, sel.offset)
	}

	if(maxi == 0){
		return false
	}

	for(const sel of sels){
		sel.replace = ''
		sel.split.forEach((value, i, arr) => {
			sel.replace += value;
			if(i != arr.length - 1){
				if(value.length < sizes[i]){
					sel.replace += (' ').repeat(sizes[i] - value.length)
				}
				sel.replace += separator
			}
		})
		if(sel.offset < maxoffset){
			sel.replace = (' ').repeat(maxoffset - sel.offset) + sel.replace
		}
	}

	return true
}

export function activate(context: vscode.ExtensionContext){
	function register(command: string, callback: (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => void){
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(command, callback))
	}

	register('tabformatter.format', format)
	register('tabformatter.setSeparator', setSeparator)
}