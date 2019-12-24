import { Disposable, ExtensionContext, TextEditor, window } from 'vscode';
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
            let w_comparedEqual = false;
            // * w_endLoopDetect to fix inconsistent loop total before ending.
            let w_endLoopDetectNeeded = 0;
            let w_endLoopDetectSoFar = 0;

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
                console.log('ask for next');

                editor = await editorTracker.awaitNext(500);
                if (editor !== undefined &&
                    openEditors.some(_ => TextEditorComparer.equals(_, editor, { useId: true, usePosition: true }))) {
                    if (w_endLoopDetectSoFar === 0) {
                        console.log('detected same! openEditors.length:', openEditors.length);
                        w_endLoopDetectNeeded = openEditors.length + 1;
                        w_endLoopDetectSoFar = 1;
                    } else {
                        w_endLoopDetectSoFar = w_endLoopDetectSoFar + 1;
                        console.log('detected same again! ', w_endLoopDetectSoFar, w_endLoopDetectNeeded);
                        if (w_endLoopDetectSoFar = w_endLoopDetectNeeded) {
                            w_comparedEqual = true;
                            console.log("w_endLoopDetectSoFar = w_endLoopDetectNeeded = ", w_endLoopDetectSoFar);
                            break;
                        }
                    }
                }
            } while ((w_endLoopDetectSoFar < w_endLoopDetectNeeded) || (
                (active === undefined && editor === undefined) ||
                !TextEditorComparer.equals(active, editor, { useId: true, usePosition: true })
            )
            );
            if (w_comparedEqual) {
                console.log('got out was already in openEditors: ', editor!.document.fileName);
            } else {
                console.log('got out because was equal ', active, editor);
            }

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

    async closeExpired(p_gnxToClose: string[]) {
        if (!window.visibleTextEditors.length) {
            console.log("No visible text editors at start");
            return ([]);
        }
        if (!p_gnxToClose.length) {
            console.log("No gnx to close");
            return ([]);
        }
        try {
            const editorTracker = new ActiveEditorTracker();

            let active = window.activeTextEditor;
            let editor = active;
            const openEditors: TextEditor[] = [];
            const totalVisibleAtStart = window.visibleTextEditors.length;
            let w_comparedEqual = false;
            // * w_endLoopDetect to fix inconsistent loop total before ending.
            let w_endLoopDetectNeeded = 0;
            let w_endLoopDetectSoFar = 0;
            // * flag distinction between 'deleted' and 'next'
            let w_hasDeleted = false; // default to 'next'
            do {
                w_hasDeleted = false; // reset in loop
                // tslint:disable-next-line: triple-equals
                if (editor != null) {
                    // If we didn't start with a valid editor, set one once we find it
                    if (active === undefined) {
                        active = editor;
                    }

                    if (p_gnxToClose.includes(editor.document.fileName.substr(1))) {
                        // remove
                        w_hasDeleted = true;
                    } else {

                        console.log('closeExpired Push Editor');
                        openEditors.push(editor);
                    }
                }
                if (w_hasDeleted) {
                    editor = await editorTracker.awaitClose(500);
                } else {
                    editor = await editorTracker.awaitNext(500);
                }
                if (w_hasDeleted && !window.visibleTextEditors.length) {
                    console.log("No visible text editors anymore");
                    break;
                }
                if (editor !== undefined &&
                    openEditors.some(_ => TextEditorComparer.equals(_, editor, { useId: true, usePosition: true }))) {
                    // break;
                    if (w_endLoopDetectSoFar === 0) {
                        console.log('detected same! openEditors.length:', openEditors.length);
                        if (totalVisibleAtStart > openEditors.length) {
                            w_endLoopDetectNeeded = totalVisibleAtStart + 1;
                        } else {
                            w_endLoopDetectNeeded = openEditors.length + 1;
                        }
                        w_endLoopDetectSoFar = 1;
                        console.log('w_endLoopDetectNeeded: ', w_endLoopDetectNeeded);
                    } else {
                        w_endLoopDetectSoFar = w_endLoopDetectSoFar + 1;
                        console.log('detected same again! ', w_endLoopDetectSoFar, w_endLoopDetectNeeded);
                        if (w_endLoopDetectSoFar = w_endLoopDetectNeeded) {
                            w_comparedEqual = true;
                            console.log("w_endLoopDetectSoFar = w_endLoopDetectNeeded = ", w_endLoopDetectSoFar);
                            break;
                        }
                    }

                }
            } while (
                (w_endLoopDetectSoFar < w_endLoopDetectNeeded) ||
                ((active === undefined && editor === undefined) ||
                    !TextEditorComparer.equals(active, editor, { useId: true, usePosition: true }))
            );

            if (w_comparedEqual) {
                console.log('got out was already in openEditors: ', editor!.document.fileName);
            } else {
                console.log('got out because was equal ', active, editor);
            }

            editorTracker.dispose();

            const editors = openEditors
                .filter(_ => _.document !== undefined)
                .map(_ => {
                    return {
                        uri: _.document.uri,
                        viewColumn: _.viewColumn
                    } as ISavedEditor;
                });

            console.log('Close finished');
            return editors;
        }
        catch (ex) {
            console.error(ex, 'DocumentManager.save');
        }
    }
}