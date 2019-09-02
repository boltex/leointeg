import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";

export class LeoBodyProvider implements vscode.TextDocumentContentProvider {
  // emitter and its event
  private _onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChangeEmitter.event;

  constructor(private leoIntegration: LeoIntegration) {
    leoIntegration.setupRefreshBodyFn(this._onDidChangeEmitter);
  }

  provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    if (this.leoIntegration.bodyText) {
      return Promise.resolve(this.leoIntegration.bodyText);
    } else {
      return Promise.resolve(" ");
    }
  }
}
