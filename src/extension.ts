import * as vscode from "vscode";
import { Constants } from "./constants";
import { RevealType } from "./types";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { LeoSettingsWebview } from "./webviews/leoSettingsWebview";

export function activate(context: vscode.ExtensionContext) {
    const start = process.hrtime(); // For calculating total startup time duration

    const leoInteg = vscode.extensions.getExtension(Constants.PUBLISHER + '.' + Constants.NAME)!;

    const leoIntegVersion = leoInteg.packageJSON.version;

    const previousVersion = context.globalState.get<string>(Constants.VERSION_STATE_KEY);

    const leoIntegration: LeoIntegration = new LeoIntegration(context);
    const leoSettingsWebview: LeoSettingsWebview = new LeoSettingsWebview(context, leoIntegration);

    // * Reset Extension context flags (used in 'when' clauses in package.json)
    vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.BRIDGE_READY, false); // connected to a leobridge server?
    vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.TREE_OPENED, false); // Having a Leo file opened on that server?

    const w_cmdPrefix = Constants.NAME + ".";
    const w_commands: [string, (...args: any[]) => any][] = [

        [w_cmdPrefix + "test", () => leoIntegration.test()], // * Test function useful when debugging

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SHOW_WELCOME, () => leoSettingsWebview.openWebview()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SHOW_SETTINGS, () => leoSettingsWebview.openWebview()],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.START_SERVER, () => leoIntegration.startServer()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CONNECT, () => leoIntegration.connect()],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.OPEN_FILE, () => leoIntegration.openLeoFile()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLOSE_FILE, () => leoIntegration.closeLeoFile()],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SELECT_NODE, (p_node: LeoNode) => leoIntegration.selectTreeNode(p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.OPEN_ASIDE, (p_node: LeoNode) => leoIntegration.showBodyDocumentAside(p_node)],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MARK, (p_node: LeoNode) => leoIntegration.mark(p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.UNMARK, (p_node: LeoNode) => leoIntegration.unmark(p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MARK_SELECTION, () => leoIntegration.mark()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.UNMARK_SELECTION, () => leoIntegration.unmark()],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.COPY, (p_node: LeoNode) => leoIntegration.leoBridgeAction(Constants.LEOBRIDGE_ACTIONS.COPY_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CUT, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.CUT_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PASTE, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.PASTE_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PASTE_CLONE, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.PASTE_CLONE_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DELETE, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.DELETE_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.COPY_SELECTION, () => leoIntegration.leoBridgeAction(Constants.LEOBRIDGE_ACTIONS.COPY_PNODE)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CUT_SELECTION, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.CUT_PNODE)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PASTE_SELECTION, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.PASTE_PNODE)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PASTE_CLONE_SELECTION, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.PASTE_CLONE_PNODE)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DELETE_SELECTION, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.DELETE_PNODE)],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.HEADLINE, (p_node: LeoNode) => leoIntegration.editHeadline(p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.HEADLINE_SELECTION, () => leoIntegration.editHeadline()],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_DOWN, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_DOWN, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_LEFT, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_LEFT, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_RIGHT, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_RIGHT, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_UP, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_UP, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.INSERT, (p_node: LeoNode) => leoIntegration.insertNode(p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLONE, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.CLONE_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PROMOTE, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.PROMOTE_PNODE, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DEMOTE, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.DEMOTE_PNODE, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_DOWN_SELECTION, () => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_DOWN, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_LEFT_SELECTION, () => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_LEFT, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_RIGHT_SELECTION, () => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_RIGHT, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_UP_SELECTION, () => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_UP, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.INSERT_SELECTION, () => leoIntegration.insertNode()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLONE_SELECTION, () => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.CLONE_PNODE, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PROMOTE_SELECTION, () => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.PROMOTE_PNODE, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DEMOTE_SELECTION, () => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.DEMOTE_PNODE, undefined, RevealType.RevealSelectFocusShowBody)],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SORT_CHILDREN, () => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.SORT_CHILDREN, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SORT_SIBLING, () => leoIntegration.leoBridgeActionAndRefresh(Constants.LEOBRIDGE_ACTIONS.SORT_SIBLINGS, undefined, RevealType.RevealSelectFocusShowBody)],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.UNDO, () => leoIntegration.undo()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.REDO, () => leoIntegration.redo()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.EXECUTE, () => leoIntegration.executeScript()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SAVE_FILE, () => leoIntegration.saveLeoFile()],
    ];

    w_commands.map(function (p_command) { context.subscriptions.push(vscode.commands.registerCommand(...p_command)); });

    // Show Welcome / settings screen if the version is newer than last time leointeg started
    void showWelcome(leoIntegVersion, previousVersion);

    context.globalState.update(Constants.VERSION_STATE_KEY, leoIntegVersion);

    console.log('leoInteg startup launched in ', getDurationMilliseconds(start), 'ms');
}

export function deactivate() {
    console.log('deactivate called for extension "leointeg"');
}

async function showWelcome(version: string, previousVersion: string | undefined) {
    if (previousVersion === undefined) {
        console.log('leoInteg first-time install');
        await vscode.commands.executeCommand(Constants.NAME + "." + Constants.LEOINTEG_COMMANDS.SHOW_WELCOME);
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
        await vscode.commands.executeCommand(Constants.NAME + "." + Constants.LEOINTEG_COMMANDS.SHOW_WELCOME);
    }
}

function getDurationMilliseconds(start: [number, number]) {
    const [secs, nanosecs] = process.hrtime(start);
    return secs * 1000 + Math.floor(nanosecs / 1000000);
}
