import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoOutlineProvider } from "./leoOutline";
import { LeoBodyProvider } from "./leoBody";

export function activate(context: vscode.ExtensionContext) {
  console.log('activate "leointeg" extension. filename:', __filename);

  const leoIntegration = new LeoIntegration(context);
  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.openLeoFile", () => leoIntegration.openLeoFile())
  );
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.test", () => leoIntegration.test()));
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.killLeo", () => leoIntegration.killLeoBridge()));
  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.selectNode", (p_para: any) => leoIntegration.selectNode(p_para))
  );

  // Tree provider needs a reference to the 'leoIntegration' main object class instance
  vscode.window.registerTreeDataProvider("leoIntegration", new LeoOutlineProvider(leoIntegration));

  // register a content provider for the leo-scheme
  const leoSheme = "leo";
  const leoBodyProvider = new LeoBodyProvider(leoIntegration);
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(leoSheme, leoBodyProvider));

  let uri = vscode.Uri.parse("leo:body");
  vscode.workspace.openTextDocument(uri).then(p_doc => vscode.window.showTextDocument(p_doc));
}

export function deactivate() {
  console.log('Extension "leointeg" is deactivated');
}
