import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";

export function activate(context: vscode.ExtensionContext) {
  console.log('activate "leointeg" extension');

  const leoIntegration = new LeoIntegration(context);
  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.openLeoFile", () =>
      leoIntegration.openLeoFile()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.test", () =>
      leoIntegration.test()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.killLeo", () =>
      leoIntegration.killLeoBridge()
    )
  );

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
