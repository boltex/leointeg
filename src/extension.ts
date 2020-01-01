import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { LeoSettingsWebview } from "./webviews/leoSettingsWebview";

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

    // TODO : Flesh out this function, also support closing, re-opening and multiple simultaneous Leo documents support
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.closeLeoFile", () => leoIntegration.closeLeoFile()));

    // * Select a LeoNode Action
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.selectTreeNode", (p_node: LeoNode) => leoIntegration.selectTreeNode(p_node)));

    // * LeoNode Context Menu Actions
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.openAside", (p_node: LeoNode) => leoIntegration.showBodyDocumentAside(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.editHeadline", (p_node: LeoNode) => leoIntegration.editHeadline(p_node)));

    // TODO : Flesh out the functions below and setup the rest of outline and body editing, scripting and other functionality of Leo!
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.mark", (p_node: LeoNode) => leoIntegration.mark(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.unmark", (p_node: LeoNode) => leoIntegration.unmark(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.copyNode", (p_node: LeoNode) => leoIntegration.copyNode(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cutNode", (p_node: LeoNode) => leoIntegration.cutNode(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNode", (p_node: LeoNode) => leoIntegration.pasteNode(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNodeAsClone", (p_node: LeoNode) => leoIntegration.pasteNodeAsClone(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.delete", (p_node: LeoNode) => leoIntegration.delete(p_node)));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.markSelection", () => leoIntegration.markSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.unmarkSelection", () => leoIntegration.unmarkSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.copyNodeSelection", () => leoIntegration.copyNodeSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cutNodeSelection", () => leoIntegration.cutNodeSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNodeAtSelection", () => leoIntegration.pasteNodeAtSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.pasteNodeAsCloneAtSelection", () => leoIntegration.pasteNodeAsCloneAtSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.deleteSelection", () => leoIntegration.deleteSelection()));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineDown", (p_node: LeoNode) => leoIntegration.moveOutlineDown(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineLeft", (p_node: LeoNode) => leoIntegration.moveOutlineLeft(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineRight", (p_node: LeoNode) => leoIntegration.moveOutlineRight(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineUp", (p_node: LeoNode) => leoIntegration.moveOutlineUp(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.insertNode", (p_node: LeoNode) => leoIntegration.insertNode(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cloneNode", (p_node: LeoNode) => leoIntegration.cloneNode(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.promote", (p_node: LeoNode) => leoIntegration.promote(p_node)));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.demote", (p_node: LeoNode) => leoIntegration.demote(p_node)));

    context.subscriptions.push(vscode.commands.registerCommand("leointeg.editSelectedHeadline", () => leoIntegration.editSelectedHeadline()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineDownSelection", () => leoIntegration.moveOutlineDownSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineLeftSelection", () => leoIntegration.moveOutlineLeftSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineRightSelection", () => leoIntegration.moveOutlineRightSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.moveOutlineUpSelection", () => leoIntegration.moveOutlineUpSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.insertNodeSelection", () => leoIntegration.insertNodeSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.cloneNodeSelection", () => leoIntegration.cloneNodeSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.promoteSelection", () => leoIntegration.promoteSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.demoteSelection", () => leoIntegration.demoteSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.sortChildrenSelection", () => leoIntegration.sortChildrenSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.sortSiblingsSelection", () => leoIntegration.sortSiblingsSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.hoistSelection", () => leoIntegration.hoistSelection()));
    context.subscriptions.push(vscode.commands.registerCommand("leointeg.deHoist", () => leoIntegration.deHoist()));

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
