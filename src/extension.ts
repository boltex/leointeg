import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoOutlineProvider } from "./leoOutline";
import { LeoBodyFsProvider } from "./leoBodyFs";

export function activate(context: vscode.ExtensionContext) {

  console.log('activate "leointeg" extension.');

  const leoSheme = "leoBody"; // Not sure is Sheme is the right construct...
  let bodyUri = vscode.Uri.parse("leoBody:/");

  const leoIntegration = new LeoIntegration(context, bodyUri);
  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.openLeoFile", () => leoIntegration.openLeoFile())
  );
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.test", () => leoIntegration.test()));
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.killLeo", () => leoIntegration.killLeoBridge()));
  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.selectNode", (p_para: any) => leoIntegration.selectNode(p_para))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.editHeadline", (p_para: any) => leoIntegration.editHeadline())
  );

  // Tree provider needs a reference to the 'leoIntegration' main object class instance
  vscode.window.registerTreeDataProvider("leoIntegration", new LeoOutlineProvider(leoIntegration));

  // register a content provider for the leo-scheme

  //const leoBodyProvider = new LeoBodyProvider(leoIntegration);
  //context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(leoSheme, leoBodyProvider));

  // vscode.workspace.openTextDocument(bodyUri).then(p_doc => vscode.window.showTextDocument(p_doc));

  const leoBodyProvider = new LeoBodyFsProvider(leoIntegration);
  context.subscriptions.push(vscode.workspace.registerFileSystemProvider(leoSheme, leoBodyProvider, { isCaseSensitive: true }));

}

export function deactivate() {
  console.log('Extension "leointeg" is deactivated');
}
