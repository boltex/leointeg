
import * as vscode from "vscode";
import * as path from 'path';

import { LeoIntegration } from "../leoIntegration";

export class LeoSettingsWebview {

    private panel: vscode.WebviewPanel | undefined;
    private readonly _extensionPath: string;
    private _html: string | undefined;
    private waitingForUpdate: boolean = false;

    constructor(private context: vscode.ExtensionContext, private leoIntegration: LeoIntegration) {
        this._extensionPath = context.extensionPath;
        vscode.workspace.onDidChangeConfiguration(p_event => this.onChangeConfiguration(p_event));
    }

    private onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {
        if (this.panel && !this.waitingForUpdate) {
            this.panel.webview.postMessage({ command: 'config', config: this.leoIntegration.config });
        }
    }

    public openWebview(): void {

        if (this.panel) {
            this.panel.reveal();
        } else {
            this.getBaseHtml().then(p_baseHtml => {
                this.panel = vscode.window.createWebviewPanel(
                    'leoSettings', // Identifies the type of the webview. Used internally
                    'Leo Integration Settings', // Title of the panel displayed to the user
                    { viewColumn: vscode.ViewColumn.One, preserveFocus: false }, // Editor column to show the new webview panel in.
                    {
                        retainContextWhenHidden: false,
                        enableFindWidget: true,
                        enableCommandUris: true,
                        enableScripts: true
                    }
                );
                let baseUri = this.panel.webview.asWebviewUri(vscode.Uri.file(
                    path.join(this._extensionPath)
                ));
                this.panel.iconPath = vscode.Uri.file(this.context.asAbsolutePath('resources/leoapp128px.png'));
                this.panel.webview.html = p_baseHtml.replace(
                    /#{root}/g,
                    baseUri.toString()
                ).replace(
                    /#{endOfBody}/g,
                    `<script type="text/javascript" nonce="Z2l0bGVucy1ib290c3RyYXA=">window.leoConfig = ${JSON.stringify(
                        this.leoIntegration.config
                    )};</script>`
                );
                this.panel.webview.onDidReceiveMessage(
                    message => {
                        switch (message.command) {
                            case 'alert':
                                vscode.window.showErrorMessage(message.text);
                                break;
                            case 'config':
                                this.waitingForUpdate = true;
                                this.leoIntegration.setLeoIntegSettings(message.changes).then(() => {
                                    this.panel!.webview.postMessage({ command: 'config', config: this.leoIntegration.config });
                                    this.waitingForUpdate = false;
                                });
                                break;
                        }
                    },
                    null,
                    this.context.subscriptions
                );
                this.panel.onDidDispose(() => {
                    console.log('disposed');
                    this.panel = undefined;
                },
                    null,
                    this.context.subscriptions);
            });
        }
    }

    private async getBaseHtml(): Promise<string> {
        const filename = this.context.asAbsolutePath(path.join('dist/webviews/', 'settings.html'));

        if (this._html !== undefined) { return this._html; }

        const doc = await vscode.workspace.openTextDocument(filename);
        this._html = doc.getText();

        return this._html;
    }

}