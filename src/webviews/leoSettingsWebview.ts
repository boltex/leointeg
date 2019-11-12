
import * as vscode from "vscode";
import * as path from 'path';

export class LeoSettingsWebview {

    private panel: vscode.WebviewPanel | undefined;
    private readonly _extensionPath: string;
    private _html: string | undefined;

    constructor(private context: vscode.ExtensionContext) {
        console.log("init LeoSettingsWebview control class");
        this._extensionPath = context.extensionPath;
    }

    public openWebview(): void {
        // Create and show a new webview

        console.log('this._extensionPath : ', this._extensionPath);

        console.log("path.join(this._extensionPath, 'dist', 'webviews', 'test.js') : ", path.join(this._extensionPath, 'dist', 'webviews', 'test.js'));

        if (this.panel) {
            console.log("already opened");
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

                // * set HTML
                // this.getHtml(this.panel.webview).then(p_html => {
                //     if (this.panel) {

                //         this.panel.webview.html = p_html;
                //     }
                // });
                //this.panel.webview.html = this.getHtmlOld(this.panel.webview);

                let testuri = this.panel.webview.asWebviewUri(vscode.Uri.file(
                    path.join(this._extensionPath)
                ));



                let html = p_baseHtml.replace(
                    /#{root}/g,
                    testuri.toString()
                );

                console.log('new html: ', html);
                //return;

                // this.panel.webview.html = this.getHtmlOld(this.panel.webview); // html;
                this.panel.webview.html = html;

                this.panel.iconPath = vscode.Uri.file(this.context.asAbsolutePath('resources/leoapp128px.png'));




                this.panel.webview.onDidReceiveMessage(
                    message => {
                        console.log('received message: ', message.command);
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
            });
        }


    }

    private async getBaseHtml(): Promise<string> {
        const filename = this.context.asAbsolutePath(path.join('dist/webviews/', 'settings.html'));

        let content;
        // When we are debugging avoid any caching so that we can change the html and have it update without reloading

        if (this._html !== undefined) { return this._html; }

        const doc = await vscode.workspace.openTextDocument(filename);
        return doc.getText();
    }

    private async getHtml(webview: vscode.Webview): Promise<string> {
        console.log('Fetching filename');

        const filename = this.context.asAbsolutePath(path.join('dist/webviews/', 'settings.html'));

        let content;
        // When we are debugging avoid any caching so that we can change the html and have it update without reloading

        if (this._html !== undefined) { return this._html; }

        const doc = await vscode.workspace.openTextDocument(filename);
        content = doc.getText();


        let html = content.replace(
            /#{root}/g,
            vscode.Uri.file(this.context.asAbsolutePath('.'))
                .with({ scheme: 'vscode-resource' })
                .toString()
        );

        this._html = html;

        // console.log(html);
        return html;

        // return `<!DOCTYPE html>
        // <html lang="en">
        // <head>
        //     <meta charset="UTF-8">

        //     <meta http-equiv="Content-Security-Policy" content="default-src 'none';">

        //     <meta name="viewport" content="width=device-width, initial-scale=1.0">

        //     <title>Cat Coding</title>
        // </head>
        // <body>
        //     ...
        // </body>
        // </html>`;
    }

    private getHtmlOld(webview: vscode.Webview): string {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.file(
            // path.join(this._extensionPath, 'src', 'webviews', 'apps', 'test.js')
            path.join(this._extensionPath, 'dist', 'webviews', 'test1.js')
        );
        const imgPathOnDisk = vscode.Uri.file(
            // path.join(this._extensionPath, 'src', 'webviews', 'apps', 'images', 'testimg1.png')
            path.join(this._extensionPath, 'resources', 'testimg1.png')
        );

        // And the uri we use to load this script in the webview
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
        const imgUri = webview.asWebviewUri(imgPathOnDisk);

        // Use a nonce to whitelist which scripts can be run
        const nonce = this.getNonce();

        const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <!--
        Use a content security policy to only allow loading images from https or from our extension directory,
        and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'unsafe-eval' 'nonce-${nonce}';">
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
        console.log('old html: ', html);

        return html;
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