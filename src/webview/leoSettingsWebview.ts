
import * as vscode from "vscode";
import * as path from 'path';

export class LeoSettingsWebview {

    private panel: vscode.WebviewPanel | undefined;
    private readonly _extensionPath: string;

    constructor(private context: vscode.ExtensionContext) {
        console.log("init webview");
        this._extensionPath = context.extensionPath;
    }

    public openWebview(): void {
        // Create and show a new webview
        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel(
                'leoSettings', // Identifies the type of the webview. Used internally
                'Leo Integration Settings', // Title of the panel displayed to the user
                { viewColumn: vscode.ViewColumn.One, preserveFocus: false }, // Editor column to show the new webview panel in.
                {
                    retainContextWhenHidden: true,
                    enableFindWidget: true,
                    enableCommandUris: true,
                    enableScripts: true
                }
            );
            this.panel.webview.html = this.getHtml(this.panel.webview);
            // this.panel.iconPath = vscode.Uri.file(this.context.asAbsolutePath('images/gitlens-icon.png'));

            this.panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'alert':
                            vscode.window.showErrorMessage(message.text);
                            return;
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
        } else {
            console.log("already opened");
            this.panel.reveal();
        }
    }

    private getHtml(webview: vscode.Webview): string {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'src', 'webview', 'apps', 'test.js')
        );
        const imgPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'src', 'webview', 'apps', 'images', 'testimg1.png')
        );

        // And the uri we use to load this script in the webview
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
        const imgUri = webview.asWebviewUri(imgPathOnDisk);

        // Use a nonce to whitelist which scripts can be run
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <!--
        Use a content security policy to only allow loading images from https or from our extension directory,
        and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cat Coding</title>
    </head>
    <body>
        <h1 id="lines-of-code-counter">0</h1>
            <img src="${imgUri}" width="300" />
            <p>Test Webview</p>
        <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
    }
    // <img src="${catGifPath}" width="300" />

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

}