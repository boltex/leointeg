import * as vscode from 'vscode';
import { Constants } from '../constants';
import { LeoIntegration } from '../leoIntegration';
import * as utils from '../utils';

/**
 * Leo Find Panel provider
 */
export class LeoFindPanelProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

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
                    case 'gotFocus': {
                        // utils.setContext("sideBarFocus", true);
                        // utils.setContext("focusedView", "leoFindPanel");
                        utils.setContext("leoFindFocus", true);
                        break;
                    }
                    case 'lostFocus': {
                        // utils.setContext("sideBarFocus", false);
                        // utils.setContext("focusedView", "");
                        utils.setContext("leoFindFocus", false);
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
                    case 'refreshSearchConfig': {
                        // Leave a cycle before getting settings
                        setTimeout(() => {
                            this._leoIntegration.loadSearchSettings();
                        }, 0);
                        break;
                    }
                }
            })
        );
        this._leoIntegration.setFindPanel(this._view);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'find-panel', 'main.js')
        );
        // Do the same for the stylesheet.
        const styleResetUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'find-panel', 'reset.css')
        );
        const styleVSCodeUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'find-panel', 'vscode.css')
        );
        const styleMainUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'find-panel', 'main.css')
        );

        // Use a nonce to only allow a specific script to be run.
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
            <html lang="en" tabindex="-1">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleMainUri}" rel="stylesheet">

                <title>Leo Find Panel</title>
            </head>
            <body>
                <div class="row mb-0 nav-element">
                    <div class="col no-overflow">
                        <label for="navText">Nav:</label>
                        <select
                            name="searchOptions"
                            id="searchOptions"
                            title="Confine search to:&#013; - All: regular search for all nodes&#013; - Subtree: current node and it's children&#013; - File: only search under a node with an @<file> directive&#013; - Chapter: only search under a node with an @chapter directer&#013; - Node: only search currently selected node"
                        >
                            <option value="0">All</option>
                            <option value="1">Subtree</option>
                            <option value="2">File</option>
                            <option value="3">Chapter</option>
                            <option value="4">Node</option>
                        </select>
                    </div>
                    <div class="col-nav">
                        <input type="checkbox" id="isTag" name="isTag" >
                        <label class="label-fix" for="isTag" title="Search Tag attributes, set algebra is supported:&#013;&amp; both the given tags&#013;&vert; either of the given tags (or both)&#013;&#45; the first tag, but not the second tag&#013;&#94; either of the given tags (but *not* both)"
                        >Tag</label>

                        <input type="checkbox" id="showParents" name="showParents" >
                        <label class="label-fix" for="showParents" title="List parents of nodes in text searches">Show parents</label>
                    </div>
                </div>
                <div class="input-holder mt-0 mb-6 nav-element">
                    <input title="Typing searches headlines, Enter also searches body text and freeze" type="text" id="navText" name="navText" placeholder="<nav pattern here>">
                </div>
                <div class="nav-element" id="freeze" title="Clear field to unfreeze">&#x2744;</div>

                <label class="mb-0" for="findText">Find/Replace:</label>
                <div class="input-holder mt-4 mb-4">
                    <input title="Enter or F3 to find and goto the next match&#013;F2 for the previous match" type="text" id="findText" name="findText" placeholder="<find pattern here>" >
                </div>
                <div class="input-holder mb-4">
                    <input title="Replace (Ctrl+=)&#013;Replace &amp; Find Next (Ctrl+-)" type="text" id="replaceText" name="replaceText" placeholder="<replace pattern here>" >
                </div>
                <div class="row">
                    <div class="col">
                        <input type="checkbox" id="wholeWord" name="wholeWord" >
                        <label title="Match Whole Word (Ctrl+Alt+W)" class="label-fix" for="wholeWord">Whole <u>w</u>ord</label><br>
                        <input type="checkbox" id="ignoreCase" name="ignoreCase" >
                        <label title="Matches Ignore Case (Ctrl+Alt+I)" class="label-fix" for="ignoreCase"><u>I</u>gnore case</label><br>
                        <input type="checkbox" id="regExp" name="regExp" >
                        <label title="Use Regular Expression (Ctrl+Alt+X)" class="label-fix" for="regExp">Rege<u>x</u>p</label><br>
                        <input type="checkbox" id="markFinds" name="markFinds" >
                        <label title="Mark Found nodes (Ctrl+Alt+F)" class="label-fix" for="markFinds">Mark <u>f</u>inds</label><br>
                        <input type="checkbox" id="markChanges" name="markChanges" >
                        <label title="Mark Changed nodes (Ctrl+Alt+C)" class="label-fix" for="markChanges">Mark <u>c</u>hanges</label>
                    </div>
                    <div class="col">
                        <!-- RADIOS -->
                        <input type="radio" id="entireOutline" name="searchScope" value="0">
                        <label title="Search in Whole Outline (Ctrl+Alt+E)" class="label-fix" for="entireOutline"><u>E</u>ntire outline</label><br>
                        <input type="radio" id="subOutlineOnly" name="searchScope" value="1">
                        <label title="Limit to Selected Outline (Ctrl+Alt+S)" class="label-fix" for="subOutlineOnly"><u>S</u>uboutline Only</label><br>
                        <input type="radio" id="nodeOnly" name="searchScope" value="2">
                        <label title="Limit to Selected Node (Ctrl+Alt+N)" class="label-fix" for="nodeOnly"><u>N</u>ode only</label><br>
                        <input type="radio" id="fileOnly" name="searchScope" value="3">
                        <label title="Limit to External Files (Ctrl+Alt+L)" class="label-fix" for="fileOnly">Fi<u>l</u>e only</label><br>
                        <!-- CHECKBOXES -->
                        <input type="checkbox" id="searchHeadline" name="searchHeadline" >
                        <label title="Search in Headlines (Ctrl+Alt+H)" class="label-fix" for="searchHeadline">Search <u>h</u>eadline</label><br>
                        <input type="checkbox" id="searchBody" name="searchBody" >
                        <label title="Search in Body Text (Ctrl+Alt+B)" class="label-fix" for="searchBody">Search <u>b</u>ody</label>
                    </div>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
