import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "leointeg" is now active!');
  const leoIntegration = new LeoIntegration(context);

  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "extension.openLeoFile",
    () => {
      const w_message = "Open Leo File";
      vscode.window.showInformationMessage(w_message);
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand("extension.test", () => {
    const w_message = "Testing... ";
    vscode.window.showInformationMessage(w_message);
    leoIntegration.stdin("allo\n"); // exit shoud kill it
    // leoIntegration.stdin("\n");
  });
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand("extension.killLeo", () => {
    const w_message = "sending exit";
    vscode.window.showInformationMessage(w_message);
    leoIntegration.stdin("exit\n"); // exit shoud kill it
  });
  context.subscriptions.push(disposable);

  // register a content provider for the leo-scheme
  const leoSheme = "leo";
  const leoProvider = new (class implements vscode.TextDocumentContentProvider {
    // emitter and its event
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: vscode.Uri): string {
      return "Body pane content";
    }
  })();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(leoSheme, leoProvider)
  );

  let uri = vscode.Uri.parse("leo:body");
  vscode.workspace
    .openTextDocument(uri)
    .then(doc => vscode.window.showTextDocument(doc));
}

export function deactivate() {
  console.log('Extension "leointeg" is deactivated');
}
