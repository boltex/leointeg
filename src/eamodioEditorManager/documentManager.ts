import { commands, Disposable, ExtensionContext, TextEditor, window } from 'vscode';
import { ActiveEditorTracker } from './activeEditorTracker';
import { TextEditorComparer } from './comparers';

import { ISavedEditor, SavedEditor } from './savedEditor';

export * from './savedEditor';

export class DocumentManager extends Disposable {

    public savedDocuments: ISavedEditor[] = [];

    constructor(private context: ExtensionContext) {
        super(() => this.dispose());
    }

    dispose() { }

    get(): SavedEditor[] {
        const data = this.savedDocuments; // this.context.workspaceState.get<ISavedEditor[]>(WorkspaceState.SavedDocuments);
        return (data && data.map(_ => new SavedEditor(_))) || [];
    }

    async countOpen() {
        try {
            const editorTracker = new ActiveEditorTracker();

            let active = window.activeTextEditor;
            let editor = active;
            const openEditors: TextEditor[] = [];
            do {
                // tslint:disable-next-line: triple-equals
                if (editor != null) {
                    // If we didn't start with a valid editor, set one once we find it
                    if (active === undefined) {
                        active = editor;
                    }

                    console.log('DocumentManager Push Editor');
                    openEditors.push(editor);
                }

                editor = await editorTracker.awaitNext(500);
                if (editor !== undefined &&
                    openEditors.some(_ => TextEditorComparer.equals(_, editor, { useId: true, usePosition: true }))) {
                    break;
                }
            } while ((active === undefined && editor === undefined) ||
                !TextEditorComparer.equals(active, editor, { useId: true, usePosition: true }));

            editorTracker.dispose();

            const editors = openEditors
                .filter(_ => _.document !== undefined)
                .map(_ => {
                    return {
                        uri: _.document.uri,
                        viewColumn: _.viewColumn
                    } as ISavedEditor;
                });

            // save documents
            console.log('DocumentManager save documents');
            this.savedDocuments = editors; // this.context.workspaceState.update(WorkspaceState.SavedDocuments, editors);
            return this.savedDocuments; // this.context.workspaceState.update(WorkspaceState.SavedDocuments, editors);
        }
        catch (ex) {
            console.error(ex, 'DocumentManager.save');
        }
    }

    async closeExpired(p_exp: any) {
        try {
            const editorTracker = new ActiveEditorTracker();

            let active = window.activeTextEditor;
            let editor = active;
            const openEditors: TextEditor[] = [];
            do {
                // tslint:disable-next-line: triple-equals
                if (editor != null) {
                    // If we didn't start with a valid editor, set one once we find it
                    if (active === undefined) {
                        active = editor;
                    }

                    console.log('DocumentManager Push Editor');
                    openEditors.push(editor);
                }

                editor = await editorTracker.awaitNext(500);
                if (editor !== undefined &&
                    openEditors.some(_ => TextEditorComparer.equals(_, editor, { useId: true, usePosition: true }))) {
                    break;
                }
            } while ((active === undefined && editor === undefined) ||
                !TextEditorComparer.equals(active, editor, { useId: true, usePosition: true }));

            editorTracker.dispose();

            const editors = openEditors
                .filter(_ => _.document !== undefined)
                .map(_ => {
                    return {
                        uri: _.document.uri,
                        viewColumn: _.viewColumn
                    } as ISavedEditor;
                });

            // save documents
            console.log('DocumentManager save documents');
            this.savedDocuments = editors; // this.context.workspaceState.update(WorkspaceState.SavedDocuments, editors);
            return this.savedDocuments; // this.context.workspaceState.update(WorkspaceState.SavedDocuments, editors);
        }
        catch (ex) {
            console.error(ex, 'DocumentManager.save');
        }
    }
}