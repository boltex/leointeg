import * as vscode from "vscode";
import { Constants } from "./constants";
import { RevealType } from "./types";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { LeoSettingsWebview } from "./webviews/leoSettingsWebview";

export function activate(context: vscode.ExtensionContext) {
    // * Called when extension is activated
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
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SHOW_LOG, () => leoIntegration.showLogPane()],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.OPEN_FILE, () => leoIntegration.openLeoFile()], // TODO : Support multiple simultaneous opened files
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLOSE_FILE, () => leoIntegration.closeLeoFile()], // TODO : Implement & support multiple simultaneous files
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SAVE_FILE, () => leoIntegration.saveLeoFile()], // TODO : Specify which file when supporting multiple simultaneous files

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CONTRACT_ALL, () => leoIntegration.contractAll()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SELECT_NODE, (p_node: LeoNode) => leoIntegration.selectTreeNode(p_node, false)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.OPEN_ASIDE, (p_node: LeoNode) => leoIntegration.selectTreeNode(p_node, false, true)],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MARK, (p_node: LeoNode) => leoIntegration.changeMark(true, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.UNMARK, (p_node: LeoNode) => leoIntegration.changeMark(false, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MARK_SELECTION, () => leoIntegration.changeMark(true)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.UNMARK_SELECTION, () => leoIntegration.changeMark(false)],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.COPY, (p_node: LeoNode) => leoIntegration.nodeAction(Constants.LEOBRIDGE_ACTIONS.COPY_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CUT, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.CUT_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PASTE, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.PASTE_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PASTE_CLONE, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.PASTE_CLONE_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DELETE, (p_node: LeoNode) => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.DELETE_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.COPY_SELECTION, () => leoIntegration.nodeAction(Constants.LEOBRIDGE_ACTIONS.COPY_PNODE)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CUT_SELECTION, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.CUT_PNODE)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PASTE_SELECTION, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.PASTE_PNODE)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PASTE_CLONE_SELECTION, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.PASTE_CLONE_PNODE)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DELETE_SELECTION, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.DELETE_PNODE)],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.HEADLINE, (p_node: LeoNode) => leoIntegration.editHeadline(p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.HEADLINE_SELECTION, () => leoIntegration.editHeadline()],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_DOWN, (p_node: LeoNode) => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_DOWN, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_LEFT, (p_node: LeoNode) => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_LEFT, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_RIGHT, (p_node: LeoNode) => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_RIGHT, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_UP, (p_node: LeoNode) => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_UP, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.INSERT, (p_node: LeoNode) => leoIntegration.insertNode(p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLONE, (p_node: LeoNode) => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.CLONE_PNODE, p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PROMOTE, (p_node: LeoNode) => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.PROMOTE_PNODE, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DEMOTE, (p_node: LeoNode) => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.DEMOTE_PNODE, p_node, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.REFRESH_FROM_DISK, (p_node: LeoNode) => leoIntegration.refreshFromDiskNode(p_node)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_DOWN_SELECTION, () => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_DOWN, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_LEFT_SELECTION, () => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_LEFT, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_RIGHT_SELECTION, () => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_RIGHT, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_UP_SELECTION, () => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.MOVE_PNODE_UP, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.INSERT_SELECTION, () => leoIntegration.insertNode()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLONE_SELECTION, () => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.CLONE_PNODE, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.PROMOTE_SELECTION, () => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.PROMOTE_PNODE, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DEMOTE_SELECTION, () => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.DEMOTE_PNODE, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.REFRESH_FROM_DISK_SELECTION, () => leoIntegration.refreshFromDiskNode(undefined)],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SORT_CHILDREN, () => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.SORT_CHILDREN, undefined, RevealType.RevealSelectFocusShowBody)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.SORT_SIBLING, () => leoIntegration.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.SORT_SIBLINGS, undefined, RevealType.RevealSelectFocusShowBody)],

        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.UNDO, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.UNDO, undefined, true)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.REDO, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.REDO, undefined, true)],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.EXECUTE, () => leoIntegration.leoBridgeActionAndFullRefresh(Constants.LEOBRIDGE_ACTIONS.EXECUTE_SCRIPT, undefined, true)],

        // TODO : More commands to implement
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.HOIST, () => leoIntegration.hoistNode()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.HOIST_SELECTION, () => leoIntegration.hoistSelection()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DEHOIST, () => leoIntegration.deHoist()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLONE_FIND_ALL, () => leoIntegration.cloneFindAll()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLONE_FIND_ALL_FLATTENED, () => leoIntegration.cloneFindAllFlattened()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLONE_FIND_MARKED, () => leoIntegration.cloneFindMarked()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLONE_FIND_FLATTENED_MARKED, () => leoIntegration.cloneFindFlattenedMarked()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.EXTRACT, () => leoIntegration.extract()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.EXTRACT_NAMES, () => leoIntegration.extractNames()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.COPY_MARKED, () => leoIntegration.copyMarked()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DIFF_MARKED_NODES, () => leoIntegration.diffMarkedNodes()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.GOTO_NEXT_MARKED, () => leoIntegration.gotoNextMarked()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MARK_CHANGED_ITEMS, () => leoIntegration.markChangedItems()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MARK_SUBHEADS, () => leoIntegration.markSubheads()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.UNMARK_ALL, () => leoIntegration.unmarkAll()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.CLONE_MARKED_NODES, () => leoIntegration.cloneMarkedNodes()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.DELETE_MARKED_NODES, () => leoIntegration.deleteMarkedNodes()],
        [w_cmdPrefix + Constants.LEOINTEG_COMMANDS.MOVE_MARKED_NODES, () => leoIntegration.moveMarkedNode()],
    ];

    w_commands.map(function (p_command) { context.subscriptions.push(vscode.commands.registerCommand(...p_command)); });

    // * Show Welcome / settings screen if the version is newer than last time, then start automatic server and connection
    showWelcome(leoIntegVersion, previousVersion).then(() => {
        // * Start server and / or connect to it (as specified in settings)
        leoIntegration.startNetworkServices();
        context.globalState.update(Constants.VERSION_STATE_KEY, leoIntegVersion);
        console.log('leoInteg startup launched in ', getDurationMilliseconds(start), 'ms');
    });
}

export function deactivate() {
    // * Called when extension is deactivated
    console.log('deactivate called for extension "leointeg"');
}

async function showWelcome(version: string, previousVersion: string | undefined): Promise<unknown> {
    // * Show welcome screen if needed, based on last version executed
    let w_showWelcomeScreen: boolean = false;
    if (previousVersion === undefined) {
        console.log('leoInteg first-time install');
        w_showWelcomeScreen = true;
    } else {
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
            w_showWelcomeScreen = false;
        } else if (major !== prevMajor || (major === prevMajor && minor > prevMinor)) {
            // Will show on major or minor upgrade, Formatted as 'Major.Minor.Revision' eg. 1.2.3
            w_showWelcomeScreen = true;
        }
    }
    if (w_showWelcomeScreen) {
        return vscode.commands.executeCommand(Constants.NAME + "." + Constants.LEOINTEG_COMMANDS.SHOW_WELCOME);
    } else {
        return Promise.resolve();
    }
}

function getDurationMilliseconds(start: [number, number]): number {
    // *
    const [secs, nanosecs] = process.hrtime(start);
    return secs * 1000 + Math.floor(nanosecs / 1000000);
}
