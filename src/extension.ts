import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";

export function activate(context: vscode.ExtensionContext) {
    const leoIntegration: LeoIntegration = new LeoIntegration(context);

    // * Reset Extension context flags (used in 'when' clauses in package.json)
    vscode.commands.executeCommand('setContext', 'leoBridgeReady', false); // connected to a leobridge server?
    vscode.commands.executeCommand('setContext', 'leoTreeOpened', false); // Having a Leo file opened on that server?

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.test", () => leoIntegration.test()));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.startServer", () => leoIntegration.startServer()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.connectToServer", () => leoIntegration.connect()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.openLeoFile", () => leoIntegration.openLeoFile()));
    // TODO : Fleshout this function, also support closing, re-opening and multiple simultaneous Leo documents support
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.closeLeoFile", () => leoIntegration.closeLeoFile()));

    // * Select a LeoNode Action
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.selectTreeNode", (p_node: LeoNode) => leoIntegration.selectTreeNode(p_node)));

    // * LeoNode Context Menu Actions
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.openAside", (node: LeoNode) => leoIntegration.showBodyDocumentAside(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.editHeadline", (p_node: LeoNode) => leoIntegration.editHeadline(p_node)));

    // TODO : Fleshout the functions below and setup the rest of outline and body editing, scripting and other functionality of Leo!
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.mark", (node: LeoNode) => leoIntegration.mark(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.unmark", (node: LeoNode) => leoIntegration.unmark(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.copyNode", (node: LeoNode) => leoIntegration.copyNode(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cutNode", (node: LeoNode) => leoIntegration.cutNode(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNode", (node: LeoNode) => leoIntegration.pasteNode(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNodeAsClone", (node: LeoNode) => leoIntegration.pasteNodeAsClone(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.delete", (node: LeoNode) => leoIntegration.delete(node)));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.markSelection", () => leoIntegration.markSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.unmarkSelection", () => leoIntegration.unmarkSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.copyNodeSelection", () => leoIntegration.copyNodeSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cutNodeSelection", () => leoIntegration.cutNodeSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNodeAtSelection", () => leoIntegration.pasteNodeAtSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNodeAsCloneAtSelection", () => leoIntegration.pasteNodeAsCloneAtSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.deleteSelection", () => leoIntegration.deleteSelection()));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineDown", (node: LeoNode) => leoIntegration.moveOutlineDown(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineLeft", (node: LeoNode) => leoIntegration.moveOutlineLeft(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineRight", (node: LeoNode) => leoIntegration.moveOutlineRight(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineUp", (node: LeoNode) => leoIntegration.moveOutlineUp(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.insertNode", (node: LeoNode) => leoIntegration.insertNode(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cloneNode", (node: LeoNode) => leoIntegration.cloneNode(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.promote", (node: LeoNode) => leoIntegration.promote(node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.demode", (node: LeoNode) => leoIntegration.demode(node)));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineDownSelection", () => leoIntegration.moveOutlineDownSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineLeftSelection", () => leoIntegration.moveOutlineLeftSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineRightSelection", () => leoIntegration.moveOutlineRightSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineUpSelection", () => leoIntegration.moveOutlineUpSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.insertNodeSelection", () => leoIntegration.insertNodeSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cloneNodeSelection", () => leoIntegration.cloneNodeSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.promoteSelection", () => leoIntegration.promoteSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.demodeSelection", () => leoIntegration.demodeSelection()));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.undo", () => leoIntegration.undo()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.executeScript", () => leoIntegration.executeScript()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.saveFile", () => leoIntegration.saveFile()));
}

export function deactivate() {
    console.log('Extension "leointeg" is deactivated');
}
