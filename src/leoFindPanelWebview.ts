import * as vscode from 'vscode';
import { Constants } from './constants';
import { LeoIntegration } from './leoIntegration';
import * as utils from './utils';

/**
 * Leo Find Panel provider
 */
export class LeoFindPanelProvider implements vscode.WebviewViewProvider {

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) { }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): Promise<void> {

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [this._extensionUri],
        };

        this._context.subscriptions.push(
            webviewView.webview.onDidReceiveMessage((data) => {
                switch (data.type) {
                    case 'leoNavEnter': {
                        this._leoIntegration.navEnter();
                        break;
                    }
                    case 'leoNavTextChange': {
                        this._leoIntegration.navTextChange();
                        break;
                    }
                    case 'leoNavClear': {
                        this._leoIntegration.navTextClear();
                        break;
                    }
                    case 'leoNavMarkedList': {
                        this._leoIntegration.findQuickMarked(true);
                        break;
                    }
                    case 'gotFocus': {
                        utils.setContext(Constants.CONTEXT_FLAGS.FOCUS_FIND, true);
                        break;
                    }
                    case 'lostFocus': {
                        utils.setContext(Constants.CONTEXT_FLAGS.FOCUS_FIND, false);
                        break;
                    }
                    case 'leoFindNext': {
                        vscode.commands.executeCommand(Constants.COMMANDS.FIND_NEXT);
                        break;
                    }
                    case 'leoFindPrevious': {
                        vscode.commands.executeCommand(Constants.COMMANDS.FIND_PREVIOUS);
                        break;
                    }
                    case 'searchConfig': {
                        this._leoIntegration.saveSearchSettings(data.value);
                        break;
                    }
                    case 'replace': {
                        this._leoIntegration.replace(true, false);
                        break;
                    }
                    case 'replaceThenFind': {
                        this._leoIntegration.replace(true, true);
                        break;
                    }
                    case 'navigateNavEntry': {
                        void this._leoIntegration.navigateNavEntry(data.value);
                    }
                    case 'refreshSearchConfig': {
                        // Leave a cycle before getting settings
                        setTimeout(() => {
                            this._leoIntegration.loadSearchSettings();
                        }, 0);
                        break;
                    }
                    case 'gotoCommand': {
                        try {
                            const w_index = Number(data.value);
                            if (!isNaN(w_index) && this._leoIntegration.leoGotoProvider.nodeList[w_index]) {
                            }
                            void this._leoIntegration.gotoNavEntry(this._leoIntegration.leoGotoProvider.nodeList[w_index]);
                        } catch (e) {
                            console.log('goto nav entry failed for index: ', data.value);
                        }
                        break;
                    }
                }
            })
        );
        webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);
        this._leoIntegration.setFindPanel(webviewView);
    }

    private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'find-panel', 'main.js')
        );
        // Do the same for the stylesheet.
        const style = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'find-panel', 'style.css')
        );
        // Use a nonce to only allow a specific script to be run.
        const nonce = utils.getNonce();

        const baseHtml = await this._getBaseHtml();

        return baseHtml.replace(
            /#{nonce}/g,
            nonce
        )
            .replace(
                /#{style}/g,
                `${style}`
            )
            .replace(
                /#{webview.cspSource}/g,
                webview.cspSource
            )
            .replace(
                /#{scriptUri}/g,
                `${scriptUri}`
            );
    }

    private async _getBaseHtml(): Promise<string> {
        // 'Normal' uri, not a 'webview.asWebviewUri(...)' !
        const w_fileUri = vscode.Uri.joinPath(this._extensionUri, 'find-panel', 'index.html');
        const w_doc = await vscode.workspace.openTextDocument(w_fileUri);
        return w_doc.getText();
    }

}
