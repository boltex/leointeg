import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";
import { LeoGuiFindTabManagerSettings, LeoSearchSettings } from "./types";

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
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'leoFindNext':
					{
						vscode.commands.executeCommand(Constants.COMMANDS.FIND_NEXT);
						break;
					}
				case 'searchConfig':
					{
						this._leoIntegration.saveSearchSettings(data.value);
						break;
					}
			}
		});
		this._leoIntegration.setFindPanel(this._view);
	}

	public selectFindField() {
		if (this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({ type: 'selectFindField' });
		}
	}
	public selectReplaceField() {
		if (this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({ type: 'selectReplaceField' });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = this.getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
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
				<label for="findText">Find:</label>
				<input type="text" id="findText" name="findText" placeholder="<find pattern here>" >
				<label for="replaceText">Replace:</label>
				<input type="text" id="replaceText" name="replaceText" >
				<div class="row">
					<div class="col">
						<input type="checkbox" id="wholeWord" name="wholeWord" >
						<label for="wholeWord">whole Word</label><br>
						<input type="checkbox" id="ignoreCase" name="ignoreCase" >
						<label for="ignoreCase">Ignore case</label><br>
						<input type="checkbox" id="regExp" name="regExp" >
						<label for="regExp">regeXp</label><br>
						<input type="checkbox" id="markFinds" name="markFinds" >
						<label for="markFinds">mark Finds</label><br>
						<input type="checkbox" id="markChanges" name="markChanges" >
						<label for="markChanges">mark Changes</label>
					</div>
					<div class="col">
						<input type="radio" id="entireOutline" name="searchScope" value="0">
						<label for="entireOutline">entireOutline</label><br>
						<input type="radio" id="subOutlineOnly" name="searchScope" value="1">
						<label for="subOutlineOnly">subOutlineOnly</label><br>
						<input type="radio" id="nodeOnly" name="searchScope" value="2">
						<label for="nodeOnly">nodeOnly</label><br>
						<input type="checkbox" id="searchHeadline" name="searchHeadline" >
						<label for="searchHeadline">search Headline</label><br>
						<input type="checkbox" id="searchBody" name="searchBody" >
						<label for="searchBody">search Body</label>
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
