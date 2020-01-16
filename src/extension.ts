import * as vscode from "vscode";
import { Constants } from "./constants";
import { RevealType } from "./types";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { LeoSettingsWebview } from "./webviews/leoSettingsWebview";

/*
* Note: Context variables for package.json "when" clauses
- treeInExplorer
- showOpenAside
- leoBridgeReady
- leoTreeOpened
- leoObjectSelected ( Leo keyboard mode ? )

TODO : React to file changes and other events: see https://github.com/leo-editor/leo-editor/issues/1281

TODO - Offer 'Real Clipboard' operations, instead of leo's 'internal' clipboard behavior -
TODO : ('Real Clipboard') Use globals.gui.clipboard and the real clipboard with g.app.gui.getTextFromClipboard()
TODO : ('Real Clipboard') For pasting, use g.app.gui.replaceClipboardWith(p_realClipboard)

TODO : Commands that create nodes from selected text
- Extract
- Extract-Names

TODO : Commands that use the 'marked' property of nodes
- copy-marked _Copies all marked nodes as children of a new node._
- diff-marked-nodes
- goto-next-marked
- mark-changed-items
- mark-subheads
- unmark-all
- clone-marked-nodes
- delete-marked-nodes
- move-marked-nodes

TODO : Commands that move clones of all nodes matching the search pattern under a single organizer node, created as the last top-level node.
- cfa clone-find-all
- cff clone-find-all-flattened (Flattened searches put all nodes as direct children of the organizer node)

TODO : 'Clone-marked' commands that move clones of all marked nodes under an organizer node.
- cfam clone-find-marked
- cffm clone-find-flattened-marked

*/

export function activate(context: vscode.ExtensionContext) {
    const start = process.hrtime();

    const leoInteg = vscode.extensions.getExtension("boltex.leoInteg")!;
    const leoIntegVersion = leoInteg.packageJSON.version;
    const previousVersion = context.globalState.get<string>("leoIntegVersion");

    const leoIntegration: LeoIntegration = new LeoIntegration(context);
    const leoSettingsWebview: LeoSettingsWebview = new LeoSettingsWebview(context, leoIntegration);

    // * Reset Extension context flags (used in 'when' clauses in package.json)
    vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.BRIDGE_READY, false); // connected to a leobridge server?
    vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.TREE_OPENED, false); // Having a Leo file opened on that server?

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.showWelcomePage", () => leoSettingsWebview.openWebview())); // openWebview
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.showSettingsPage", () => leoSettingsWebview.openWebview())); // openWebview

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.test", () => leoIntegration.test()));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.startServer", () => leoIntegration.startServer()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.connectToServer", () => leoIntegration.connect()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.openLeoFile", () => leoIntegration.openLeoFile()));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.closeLeoFile", () => leoIntegration.closeLeoFile()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.selectTreeNode", (p_node: LeoNode) => leoIntegration.selectTreeNode(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.openAside", (p_node: LeoNode) => leoIntegration.showBodyDocumentAside(p_node)));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.mark", (p_node: LeoNode) => leoIntegration.mark(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.unmark", (p_node: LeoNode) => leoIntegration.unmark(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.markSelection", () => leoIntegration.mark()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.unmarkSelection", () => leoIntegration.unmark()));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.copyNode", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("copyPNode", p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cutNode", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh("cutPNode", p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNode", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh("pastePNode", p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNodeAsClone", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh("pasteAsClonePNode", p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.delete", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh("deletePNode", p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.copyNodeSelection", () => leoIntegration.leoBridgeActionAndRefresh("copyPNode")));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cutNodeSelection", () => leoIntegration.leoBridgeActionAndFullRefresh("cutPNode")));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNodeAtSelection", () => leoIntegration.leoBridgeActionAndFullRefresh("pastePNode")));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNodeAsCloneAtSelection", () => leoIntegration.leoBridgeActionAndFullRefresh("pasteAsClonePNode")));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.deleteSelection", () => leoIntegration.leoBridgeActionAndFullRefresh("deletePNode")));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.editHeadline", (p_node: LeoNode) => leoIntegration.editHeadline(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.editSelectedHeadline", () => leoIntegration.editHeadline()));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineDown", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("movePNodeDown", p_node, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineLeft", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("movePNodeLeft", p_node, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineRight", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("movePNodeRight", p_node, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineUp", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("movePNodeUp", p_node, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.insertNode", (p_node: LeoNode) => leoIntegration.insertNode(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cloneNode", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("clonePNode", p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.promote", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("promotePNode", p_node, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.demote", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("demotePNode", p_node, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineDownSelection", () => leoIntegration.leoBridgeActionAndRefresh("movePNodeDown", undefined, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineLeftSelection", () => leoIntegration.leoBridgeActionAndRefresh("movePNodeLeft", undefined, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineRightSelection", () => leoIntegration.leoBridgeActionAndRefresh("movePNodeRight", undefined, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineUpSelection", () => leoIntegration.leoBridgeActionAndRefresh("movePNodeUp", undefined, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.insertNodeSelection", () => leoIntegration.insertNode()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cloneNodeSelection", () => leoIntegration.leoBridgeActionAndRefresh("clonePNode")));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.promoteSelection", () => leoIntegration.leoBridgeActionAndRefresh("promotePNode", undefined, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.demoteSelection", () => leoIntegration.leoBridgeActionAndRefresh("demotePNode", undefined, RevealType.RevealSelectFocusShowBody)));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.sortChildrenSelection", () => leoIntegration.leoBridgeActionAndRefresh("sortChildrenPNode", undefined, RevealType.RevealSelectFocusShowBody)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.sortSiblingsSelection", () => leoIntegration.leoBridgeActionAndRefresh("sortSiblingsPNode", undefined, RevealType.RevealSelectFocusShowBody)));

    // TODO : hoist, de-hoist & other leo commands
    // context.subscriptions.push(vscode.commands.registerCommand("leointeg.hoistSelection", () => leoIntegration.hoistSelection())); // hoistPNode
    // context.subscriptions.push(vscode.commands.registerCommand("leointeg.deHoist", () => leoIntegration.deHoist())); // deHoist

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.undo", () => leoIntegration.undo()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.executeScript", () => leoIntegration.executeScript()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.saveLeoFile", () => leoIntegration.saveLeoFile()));

    // Show Welcome / settings screen if the version is newer than last time leointeg started
    void showWelcome(leoIntegVersion, previousVersion);

    context.globalState.update("leoIntegVersion", leoIntegVersion);

    console.log('leoInteg startup launched in ', getDurationMilliseconds(start), 'ms');
}

export function deactivate() {
    console.log('deactivate called for extension "leointeg"');
}

async function showWelcome(version: string, previousVersion: string | undefined) {
    if (previousVersion === undefined) {
        console.log('leoInteg first-time install');
        await vscode.commands.executeCommand("leointeg.showWelcomePage");
        return;
    }

    if (previousVersion !== version) {
        console.log(`leoInteg upgraded from v${previousVersion} to v${version}`);
    }

    const [major, minor] = version.split('.').map(v => parseInt(v, 10));
    const [prevMajor, prevMinor] = previousVersion.split('.').map(v => parseInt(v, 10));

    if (
        (major === prevMajor && minor === prevMinor) ||
        // Don't notify on downgrades
        (major < prevMajor || (major === prevMajor && minor < prevMinor))
    ) {
        return;
    }
    // Will show on major or minor upgrade, Formated as 'Major.Minor.Revision' eg. 1.2.3
    if (major !== prevMajor || (major === prevMajor && minor > prevMinor)) {
        await vscode.commands.executeCommand("leointeg.showWelcomePage");
    }
}

function getDurationMilliseconds(start: [number, number]) {
    const [secs, nanosecs] = process.hrtime(start);
    return secs * 1000 + Math.floor(nanosecs / 1000000);
}
