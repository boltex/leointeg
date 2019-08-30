import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";

export class LeoBodyProvider implements vscode.TextDocumentContentProvider {
  // emitter and its event
  private _onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChangeEmitter.event;

  constructor(private leoIntegration: LeoIntegration) {
    leoIntegration.setupRefreshBodyFn(this._onDidChangeEmitter);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    console.log("whats i");

    return this.leoIntegration.bodyText;
  }
}
