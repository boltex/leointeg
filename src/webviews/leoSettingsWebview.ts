import * as vscode from "vscode";
import * as path from 'path';
import { LeoIntegration } from "../leoIntegration";

export class LeoSettingsProvider {

    private _panel: vscode.WebviewPanel | undefined;
    private readonly _extensionPath: string;
    private _html: string | undefined;
    private _waitingForUpdate: boolean = false;

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {
        this._extensionPath = _context.extensionPath;
        vscode.workspace.onDidChangeConfiguration(p_event => this._onChangeConfiguration(p_event));
    }

    private _onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {
        if (this._panel && !this._waitingForUpdate) {
            this._panel.webview.postMessage({ command: 'newConfig', config: this._leoIntegration.config.getConfig() });
        }
    }

    public openWebview(): void {
        if (this._panel) {
            this._panel.reveal();
        } else {
            this._getBaseHtml().then(p_baseHtml => {
                this._panel = vscode.window.createWebviewPanel(
                    'leoSettings', // Identifies the type of the webview. Used internally
                    'Leo Integration Settings', // Title of the panel displayed to the user
                    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false }, // Editor column to show the new webview panel in.
                    {
                        retainContextWhenHidden: false,
                        enableFindWidget: true,
                        enableCommandUris: true,
                        enableScripts: true
                    }
                );
                let w_baseUri = this._panel.webview.asWebviewUri(vscode.Uri.file(
                    path.join(this._extensionPath)
                ));
                this._panel.iconPath = vscode.Uri.file(this._context.asAbsolutePath('resources/leoapp128px.png'));
                this._panel.webview.html = p_baseHtml.replace(
                    /#{root}/g,
                    w_baseUri.toString()
                ).replace(
                    /#{endOfBody}/g,
                    `<script type="text/javascript" nonce="Z2l0bGV1cy1ib290c3RyYXA=">window.leoConfig = ${JSON.stringify(
                        this._leoIntegration.config.getConfig()
                    )};</script>`
                );
                this._panel.webview.onDidReceiveMessage(
                    message => {
                        switch (message.command) {
                            case 'alert':
                                vscode.window.showErrorMessage(message.text);
                                break;
                            case 'chooseLeoEditorPath':
                                vscode.window.showOpenDialog(
                                    {
                                        title: "Locate Leo Editor Installation Folder",
                                        canSelectMany: false,
                                        openLabel: "Choose Folder",
                                        canSelectFiles: false,
                                        canSelectFolders: true

                                    }
                                ).then(p_chosenFile => {
                                    if (p_chosenFile && p_chosenFile.length) {
                                        this._panel!.webview.postMessage(
                                            {
                                                command: 'newEditorPath',
                                                editorPath: p_chosenFile[0].fsPath
                                            }
                                        );
                                    }
                                });
                                break;
                            case 'getNewConfig':
                                if (this._panel && !this._waitingForUpdate) {
                                    this._panel.webview.postMessage(
                                        {
                                            command: 'newConfig',
                                            config: this._leoIntegration.config.getConfig()
                                        }
                                    );
                                }
                                break;
                            case 'config':
                                this._waitingForUpdate = true;
                                this._leoIntegration.config.setLeoIntegSettings(message.changes).then(() => {
                                    this._panel!.webview.postMessage(
                                        {
                                            command: 'vscodeConfig',
                                            config: this._leoIntegration.config.getConfig()
                                        }
                                    );
                                    this._waitingForUpdate = false;
                                });
                                break;
                        }
                    },
                    null,
                    this._context.subscriptions
                );
                this._panel.onDidDispose(() => {
                    // console.log('disposed');
                    this._panel = undefined;
                },
                    null,
                    this._context.subscriptions);
            });
        }
    }

    private async _getBaseHtml(): Promise<string> {
        if (this._html !== undefined) {
            return this._html;
        } else {
            const w_filename = this._context.asAbsolutePath(path.join('dist/webviews/', 'settings.html'));
            const w_doc = await vscode.workspace.openTextDocument(w_filename);

            this._html = w_doc.getText();

            return this._html;
        }
    }
}
