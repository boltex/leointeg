import { TextDocumentShowOptions, TextEditor, Uri, ViewColumn, window, workspace } from 'vscode';

export interface ISavedEditor {
    uri: Uri;
    viewColumn: ViewColumn;
}

export class SavedEditor {

    uri: Uri;
    viewColumn: ViewColumn | undefined;

    constructor(savedEditor: ISavedEditor);
    constructor(uri: string, viewColumn: ViewColumn);
    constructor(savedEditorOrUri: ISavedEditor | string, viewColumn?: ViewColumn) {
        if (typeof savedEditorOrUri === 'string') {
            this.uri = Uri.parse(savedEditorOrUri);
            this.viewColumn = viewColumn;
        }
        else {
            if (typeof savedEditorOrUri.uri === 'string') {
                this.uri = Uri.parse(savedEditorOrUri.uri);
            }
            else if (savedEditorOrUri.uri instanceof Uri) {
                this.uri = savedEditorOrUri.uri;
            }
            else {
                console.log('FUNCTION SHOULD BE UNUSED');
                this.uri = savedEditorOrUri.uri;  // new Uri().with(savedEditorOrUri.uri);
            }
            this.viewColumn = savedEditorOrUri.viewColumn;
        }
    }

    async openEditor(uri: Uri, options?: TextDocumentShowOptions): Promise<TextEditor | undefined> {
        try {
            const defaults: TextDocumentShowOptions = {
                preserveFocus: false,
                preview: true,
                viewColumn: (window.activeTextEditor && window.activeTextEditor.viewColumn) || 1
            };

            const document = await workspace.openTextDocument(uri);
            return window.showTextDocument(document, { ...defaults, ...(options || {}) });
        }
        catch (ex) {
            console.error(ex, 'openEditor');
            return undefined;
        }
    }

    async open(options?: TextDocumentShowOptions) {
        const defaults: TextDocumentShowOptions = {
            viewColumn: this.viewColumn,
            preserveFocus: true,
            preview: true
        };

        this.openEditor(this.uri, { ...defaults, ...(options || {}) });
    }
}