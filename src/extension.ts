import * as vscode from "vscode";
import { Constants } from "./constants";
import { RevealType } from "./types";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { LeoSettingsWebview } from "./webviews/leoSettingsWebview";

/*
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
    const start = process.hrtime(); // For calculating total startup time duration

    const leoInteg = vscode.extensions.getExtension("boltex.leoInteg")!;
    const leoIntegVersion = leoInteg.packageJSON.version;
    const previousVersion = context.globalState.get<string>("leoIntegVersion");

    const leoIntegration: LeoIntegration = new LeoIntegration(context);
    const leoSettingsWebview: LeoSettingsWebview = new LeoSettingsWebview(context, leoIntegration);

    // * Reset Extension context flags (used in 'when' clauses in package.json)
    vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.BRIDGE_READY, false); // connected to a leobridge server?
    vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.TREE_OPENED, false); // Having a Leo file opened on that server?

    const w_commands: [string, (...args: any[]) => any][] = [
        ["leointeg.showWelcomePage", () => leoSettingsWebview.openWebview()],
        ["leointeg.showSettingsPage", () => leoSettingsWebview.openWebview()],

        ["leointeg.test", () => leoIntegration.test()],

        ["leointeg.startServer", () => leoIntegration.startServer()],
        ["leointeg.connectToServer", () => leoIntegration.connect()],

        ["leointeg.openLeoFile", () => leoIntegration.openLeoFile()],
        ["leointeg.closeLeoFile", () => leoIntegration.closeLeoFile()],

        ["leointeg.selectTreeNode", (p_node: LeoNode) => leoIntegration.selectTreeNode(p_node)],
        ["leointeg.openAside", (p_node: LeoNode) => leoIntegration.showBodyDocumentAside(p_node)],

        ["leointeg.mark", (p_node: LeoNode) => leoIntegration.mark(p_node)],
        ["leointeg.unmark", (p_node: LeoNode) => leoIntegration.unmark(p_node)],
        ["leointeg.markSelection", () => leoIntegration.mark()],
        ["leointeg.unmarkSelection", () => leoIntegration.unmark()],

        ["leointeg.copyNode", (p_node: LeoNode) => leoIntegration.leoBridgeAction("copyPNode", p_node)],
        ["leointeg.cutNode", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh("cutPNode", p_node)],
        ["leointeg.pasteNode", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh("pastePNode", p_node)],
        ["leointeg.pasteNodeAsClone", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh("pasteAsClonePNode", p_node)],
        ["leointeg.delete", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh("deletePNode", p_node)],
        ["leointeg.copyNodeSelection", () => leoIntegration.leoBridgeAction("copyPNode")],
        ["leointeg.cutNodeSelection", () => leoIntegration.leoBridgeActionAndFullRefresh("cutPNode")],
        ["leointeg.pasteNodeAtSelection", () => leoIntegration.leoBridgeActionAndFullRefresh("pastePNode")],
        ["leointeg.pasteNodeAsCloneAtSelection", () => leoIntegration.leoBridgeActionAndFullRefresh("pasteAsClonePNode")],
        ["leointeg.deleteSelection", () => leoIntegration.leoBridgeActionAndFullRefresh("deletePNode")],

        ["leointeg.editHeadline", (p_node: LeoNode) => leoIntegration.editHeadline(p_node)],
        ["leointeg.editSelectedHeadline", () => leoIntegration.editHeadline()],

        ["leointeg.moveOutlineDown", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("movePNodeDown", p_node, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.moveOutlineLeft", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("movePNodeLeft", p_node, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.moveOutlineRight", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("movePNodeRight", p_node, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.moveOutlineUp", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("movePNodeUp", p_node, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.insertNode", (p_node: LeoNode) => leoIntegration.insertNode(p_node)],
        ["leointeg.cloneNode", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("clonePNode", p_node)],
        ["leointeg.promote", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("promotePNode", p_node, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.demote", (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh("demotePNode", p_node, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.moveOutlineDownSelection", () => leoIntegration.leoBridgeActionAndRefresh("movePNodeDown", undefined, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.moveOutlineLeftSelection", () => leoIntegration.leoBridgeActionAndRefresh("movePNodeLeft", undefined, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.moveOutlineRightSelection", () => leoIntegration.leoBridgeActionAndRefresh("movePNodeRight", undefined, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.moveOutlineUpSelection", () => leoIntegration.leoBridgeActionAndRefresh("movePNodeUp", undefined, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.insertNodeSelection", () => leoIntegration.insertNode()],
        ["leointeg.cloneNodeSelection", () => leoIntegration.leoBridgeActionAndRefresh("clonePNode")],
        ["leointeg.promoteSelection", () => leoIntegration.leoBridgeActionAndRefresh("promotePNode", undefined, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.demoteSelection", () => leoIntegration.leoBridgeActionAndRefresh("demotePNode", undefined, RevealType.RevealSelectFocusShowBody)],

        ["leointeg.sortChildrenSelection", () => leoIntegration.leoBridgeActionAndRefresh("sortChildrenPNode", undefined, RevealType.RevealSelectFocusShowBody)],
        ["leointeg.sortSiblingsSelection", () => leoIntegration.leoBridgeActionAndRefresh("sortSiblingsPNode", undefined, RevealType.RevealSelectFocusShowBody)],

        // TODO : hoist, de-hoist & other leo commands
        // ["leointeg.hoistSelection", () => leoIntegration.hoistSelection())); // hoistPN],
        // ["leointeg.deHoist", () => leoIntegration.deHoist())); // deHo],

        ["leointeg.undo", () => leoIntegration.undo()],
        ["leointeg.executeScript", () => leoIntegration.executeScript()],
        ["leointeg.saveLeoFile", () => leoIntegration.saveLeoFile()],
    ];

    w_commands.map(function (p_command) { context.subscriptions.push(vscode.commands.registerCommand(...p_command)); });

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
