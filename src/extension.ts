import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";

export function activate(context: vscode.ExtensionContext) {
  const leoIntegration: LeoIntegration = new LeoIntegration(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.openLeoFile", () => leoIntegration.openLeoFile())
  );
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.test", () => leoIntegration.test()));
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.killLeo", () => leoIntegration.killLeoBridge()));

  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.selectNode", (p_node: LeoNode) => leoIntegration.selectNode(p_node))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("leointeg.editHeadline", (p_node: LeoNode) => leoIntegration.editHeadline(p_node))
  );
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.mark", (node: LeoNode) => leoIntegration.mark(node)));
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.copyNode", (node: LeoNode) => leoIntegration.copyNode(node)));
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.cutNode", (node: LeoNode) => leoIntegration.cutNode(node)));
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNode", (node: LeoNode) => leoIntegration.pasteNode(node)));
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNodeAsClone", (node: LeoNode) => leoIntegration.pasteNodeAsClone(node)));
  context.subscriptions.push(vscode.commands.registerCommand("leointeg.delete", (node: LeoNode) => leoIntegration.delete(node)));

  // * old test : register a content provider for the leo-scheme
  // const leoBodyProvider = new LeoBodyProvider(leoIntegration);
  // context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(leoSheme, leoBodyProvider));
  // vscode.workspace.openTextDocument(bodyUri).then(p_doc => vscode.window.showTextDocument(p_doc));
}

export function deactivate() {
  console.log('Extension "leointeg" is deactivated');
}
