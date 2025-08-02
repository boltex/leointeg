import * as vscode from "vscode";
import * as path from 'path';
import * as os from 'os';
import { LeoIntegration } from "./leoIntegration";
import * as utils from "./utils";
import { Constants } from "./constants";

export class LeoSettingsProvider {

    private _panel: vscode.WebviewPanel | undefined;
    private readonly _extensionUri: vscode.Uri;
    private _html: string | undefined;
    private _waitingForUpdate: boolean = false;

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {
        this._extensionUri = _context.extensionUri;
    }

    public async changedConfiguration(p_event?: vscode.ConfigurationChangeEvent): Promise<void> {
        if (this._panel && !this._waitingForUpdate) {
            await this._panel.webview.postMessage({ command: 'newConfig', config: this._leoIntegration.config.getConfig() });
        }
    }

    public openWebview(): Promise<unknown> {
        if (this._panel) {
            return Promise.resolve(this._panel.reveal());
        } else {
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

            return this._getBaseHtml().then(p_baseHtml => {
                if (this._panel) {

                    this._context.subscriptions.push(this._panel);

                    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
                    const scriptUri = this._panel.webview.asWebviewUri(
                        vscode.Uri.joinPath(this._extensionUri, 'settings-panel', 'main.js')
                    );
                    // Do the same for the stylesheet.
                    const style = this._panel.webview.asWebviewUri(
                        vscode.Uri.joinPath(this._extensionUri, 'settings-panel', 'style.css')
                    );

                    const w_baseUri = this._panel.webview.asWebviewUri(this._extensionUri);

                    this._panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'resources', 'leoapp128px.png');

                    const w_nonce = utils.getNonce();

                    this._context.subscriptions.push(
                        this._panel.webview.onDidReceiveMessage(
                            message => {
                                switch (message.command) {
                                    case 'alert':
                                        void vscode.window.showErrorMessage(message.text);
                                        break;
                                    case 'chooseLeoEditorPath':
                                        utils.chooseLeoFolderDialog(Constants.USER_MESSAGES.LOCATE_LEO_FOLDER).then(p_chosenPath => {
                                            if (this._panel && p_chosenPath && p_chosenPath.length) {
                                                this._panel.webview.postMessage(
                                                    {
                                                        command: 'newEditorPath',
                                                        editorPath: p_chosenPath[0].fsPath
                                                    }
                                                );
                                            }
                                        });
                                        break;
                                    case 'chooseVenvPath':
                                        utils.chooseLeoFolderDialog(Constants.USER_MESSAGES.LOCATE_VENV_FOLDER).then(p_chosenPath => {
                                            if (this._panel && p_chosenPath && p_chosenPath.length) {
                                                this._panel.webview.postMessage(
                                                    {
                                                        command: 'newVenvPath',
                                                        venvPath: p_chosenPath[0].fsPath
                                                    }
                                                );
                                            }
                                        });
                                        break;
                                    case 'getNewConfig':
                                        if (this._panel && !this._waitingForUpdate) {
                                            void this._panel.webview.postMessage(
                                                {
                                                    command: 'newConfig',
                                                    config: this._leoIntegration.config.getConfig()
                                                }
                                            );
                                        }
                                        break;
                                    case 'config':
                                        this._waitingForUpdate = true;
                                        void this._leoIntegration.config.setLeoIntegSettings(message.changes).then(() => {
                                            void this._panel!.webview.postMessage(
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
                        )
                    );

                    this._panel.webview.html = p_baseHtml
                        .replace(
                            /#{nonce}/g,
                            w_nonce
                        )
                        .replace(
                            /#{style}/g,
                            `${style}`
                        )
                        .replace(
                            /#{webview.cspSource}/g,
                            this._panel.webview.cspSource
                        )
                        .replace(
                            /#{root}/g,
                            `${w_baseUri}`
                        ).replace(
                            /#{endOfBody}/g,
                            `<script type="text/javascript" nonce="${w_nonce}">window.leoConfig = ${JSON.stringify(
                                this._leoIntegration.config.getConfig()
                            )};window.platform = ${JSON.stringify(
                                os.platform()
                            )};</script>
                        <script nonce="${w_nonce}" src="${scriptUri}"></script>
                        `
                        );

                    this._panel.onDidDispose(
                        () => { this._panel = undefined; },
                        null,
                        this._context.subscriptions
                    );
                }
            });
        }
    }

    private async _getBaseHtml(): Promise<string> {
        if (this._html !== undefined) {
            return this._html;
        } else {
            // 'Normal' uri, not a 'webview.asWebviewUri(...)' !
            const w_fileUri = vscode.Uri.joinPath(this._extensionUri, 'settings-panel', 'index.html');
            const w_doc = await vscode.workspace.openTextDocument(w_fileUri);
            this._html = w_doc.getText();
            return this._html;
        }
    }
}
