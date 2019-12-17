import { commands, Disposable, TextEditor, window } from 'vscode';

type BuiltInCommands = 'vscode.open' | 'setContext' | 'workbench.action.closeActiveEditor' | 'workbench.action.nextEditor';
const BuiltInCommands = {
    CloseActiveEditor: 'workbench.action.closeActiveEditor' as BuiltInCommands,
    NextEditor: 'workbench.action.nextEditor' as BuiltInCommands,
    Open: 'vscode.open' as BuiltInCommands,
    SetContext: 'setContext' as BuiltInCommands
};

export class ActiveEditorTracker extends Disposable {

    private _disposable: Disposable;
    private _resolver: undefined | ((value?: TextEditor | PromiseLike<TextEditor>) => void);

    constructor() {
        super(() => this.dispose());
		/**
		 * An [event](#Event) which fires when the [active editor](#window.activeTextEditor)
		 * has changed. *Note* that the event also fires when the active editor changes
		 * to `undefined`.
		 */
        this._disposable = window.onDidChangeActiveTextEditor(e => this._resolver && this._resolver(e));
    }

    dispose() {
        return this._disposable && this._disposable.dispose();
    }

    async awaitClose(timeout: number = 500): Promise<TextEditor> {
        this.close();
        return this.wait(timeout);
    }

    async awaitNext(timeout: number = 500): Promise<TextEditor> {
        this.next();
        return this.wait(timeout);
    }

    async close(): Promise<{} | undefined> {
        return commands.executeCommand(BuiltInCommands.CloseActiveEditor);
    }

    async next(): Promise<{} | undefined> {
        return commands.executeCommand(BuiltInCommands.NextEditor);
    }

    async wait(timeout: number = 500): Promise<TextEditor> {
        const editor = await new Promise<TextEditor>((resolve, reject) => {
            let timer: any;

            this._resolver = (p_editor: TextEditor | PromiseLike<TextEditor> | undefined) => {


                if (timer) {
                    clearTimeout(timer as any);
                    timer = 0;
                    // * test console output
                    console.log('from resolver:');
                    if (p_editor) {
                        console.log((p_editor as any)['_documentData']['_uri']);
                    } else {
                        console.log('no editor');
                    }
                    resolve(p_editor);
                }
            };

            timer = setTimeout(() => {
                // * test console output
                console.log("from timer: ");
                if (window.activeTextEditor) {
                    console.log((window.activeTextEditor as any)['_documentData']['_uri']);
                } else {
                    console.log('no editor');
                }

                resolve(window.activeTextEditor);
                // TODO : test if this._resolver should be cleared here ?!?
                timer = 0;
            }, timeout) as any;
        });
        this._resolver = undefined;
        return editor;
    }
}

