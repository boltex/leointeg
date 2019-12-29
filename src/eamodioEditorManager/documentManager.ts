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
        // test to cycle and count opened text editors
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
        // if no text editors are opened, or if list 'to-close' is empty, just exit
        if (!window.visibleTextEditors.length || !p_gnxToClose.length) {
            return ([]);
        }
        // eamodio method of cycling tabs to get to each text editors
        try {
            const editorTracker = new ActiveEditorTracker();
            let w_noEditorCount = 0;
            let w_noEditorNeeded = window.visibleTextEditors.length; // may end up with as many as editor panes are in use
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
                        openEditors.push(editor);
                    }
                }
                if (w_hasDeleted) {
                    console.log(' - CloseActiveEditor - ');
                    editor = await editorTracker.awaitClose(500); // perform "BuiltInCommands.CloseActiveEditor"
                    // falls back on one already scanned?
                    // better push limit back for w_endLoopDetectNeeded and w_noEditorNeeded !
                    w_endLoopDetectNeeded = w_endLoopDetectNeeded + 1;
                    w_noEditorNeeded = w_noEditorNeeded + 1;
                } else {
                    editor = await editorTracker.awaitNext(500);
                }
                if (w_hasDeleted && !window.visibleTextEditors.length) {
                    console.log("break : No more visible text editors");
                    break;
                }
                if (editor !== undefined &&
                    openEditors.some(_ => TextEditorComparer.equals(_, editor, { useId: true, usePosition: true }))) {
                    if (w_endLoopDetectSoFar === 0) {
                        if (totalVisibleAtStart > openEditors.length) {
                            w_endLoopDetectNeeded = totalVisibleAtStart + 1;
                        } else {
                            w_endLoopDetectNeeded = openEditors.length + 1;
                        }
                        w_endLoopDetectSoFar = 1;
                    } else {
                        w_endLoopDetectSoFar = w_endLoopDetectSoFar + 1;
                        if (w_endLoopDetectSoFar >= w_endLoopDetectNeeded) {
                            w_comparedEqual = true;
                            console.log("break : DetectSoFar = DetectNeeded = ", w_endLoopDetectSoFar);
                            break;
                        }
                    }
                } else {
                    w_noEditorCount = w_noEditorCount + 1;
                    if (w_noEditorCount >= w_noEditorNeeded) {
                        console.log('break : noEditorCount = noEditorNeeded = ', w_noEditorNeeded);
                        break;
                    }

                }


            } while (
                (w_endLoopDetectSoFar < w_endLoopDetectNeeded) ||
                ((active === undefined && editor === undefined) ||
                    !TextEditorComparer.equals(active, editor, { useId: true, usePosition: true }))
            );

            editorTracker.dispose();

            const editors = openEditors
                .filter(_ => _.document !== undefined)
                .map(_ => {
                    return {
                        uri: _.document.uri,
                        viewColumn: _.viewColumn
                    } as ISavedEditor;
                });

            return editors;
        }
        catch (ex) {
            console.error(ex, 'DocumentManager.save');
        }
    }
}