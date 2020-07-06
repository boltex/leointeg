import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { RefreshType } from "./types";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { LeoSettingsWebview } from "./webviews/leoSettingsWebview";

/**
 * * Called when extension is activated. It creates the leoIntegration and the 'welcome/Settings' webview instances
 */
export function activate(p_context: vscode.ExtensionContext) {

    const w_start = process.hrtime(); // For calculating total startup time duration

    const w_leoIntegExtension = vscode.extensions.getExtension(Constants.PUBLISHER + '.' + Constants.NAME)!;

    const w_leoIntegVersion = w_leoIntegExtension.packageJSON.version;

    const w_previousVersion = p_context.globalState.get<string>(Constants.VERSION_STATE_KEY);

    const w_leoIntegration: LeoIntegration = new LeoIntegration(p_context);
    const w_leoSettingsWebview: LeoSettingsWebview = new LeoSettingsWebview(p_context, w_leoIntegration);

    // * Reset Extension context flags (used in 'when' clauses in package.json)
    utils.setContext(Constants.CONTEXT_FLAGS.BRIDGE_READY, false); // Connected to a leobridge server?
    utils.setContext(Constants.CONTEXT_FLAGS.TREE_OPENED, false); // Having a Leo file opened on that server?

    const w_cmdPrefix = Constants.NAME + ".";
    const w_commands: [string, (...args: any[]) => any][] = [

        // ! REMOVE TESTS ENTRIES FROM PACKAGE.JSON FOR MASTER BRANCH RELEASES !
        [w_cmdPrefix + "test", () => w_leoIntegration.test()], // * Test function useful when debugging
        [w_cmdPrefix + "testFromOutline", () => w_leoIntegration.test(true)], // * Test function useful when debugging

        [w_cmdPrefix + Constants.COMMANDS.SET_OPENED_FILE, (p_index: number) => w_leoIntegration.selectOpenedLeoDocument(p_index)], // also a test for undeclared commands

        [w_cmdPrefix + Constants.COMMANDS.SHOW_WELCOME, () => w_leoSettingsWebview.openWebview()],
        [w_cmdPrefix + Constants.COMMANDS.SHOW_SETTINGS, () => w_leoSettingsWebview.openWebview()], // Same as 'show welcome screen'
        [w_cmdPrefix + Constants.COMMANDS.START_SERVER, () => w_leoIntegration.startServer()],
        [w_cmdPrefix + Constants.COMMANDS.CONNECT, () => w_leoIntegration.connect()],
        [w_cmdPrefix + Constants.COMMANDS.SHOW_LOG, () => w_leoIntegration.showLogPane()],
        [w_cmdPrefix + Constants.COMMANDS.SHOW_BODY, () => w_leoIntegration.showBody(false)], // Also focuses on body
        [w_cmdPrefix + Constants.COMMANDS.SHOW_OUTLINE, () => w_leoIntegration.showOutline(true)], // Also focuses on outline
        [w_cmdPrefix + Constants.COMMANDS.NEW_FILE, () => w_leoIntegration.newLeoFile()],
        [w_cmdPrefix + Constants.COMMANDS.SWITCH_FILE, () => w_leoIntegration.switchLeoFile()],

        [w_cmdPrefix + Constants.COMMANDS.OPEN_FILE, () => w_leoIntegration.openLeoFile()],
        [w_cmdPrefix + Constants.COMMANDS.SAVE_AS_FILE, () => w_leoIntegration.saveAsLeoFile()],
        [w_cmdPrefix + Constants.COMMANDS.SAVE_FILE, () => w_leoIntegration.saveLeoFile()],
        [w_cmdPrefix + Constants.COMMANDS.CLOSE_FILE, () => w_leoIntegration.closeLeoFile()],

        [w_cmdPrefix + Constants.COMMANDS.SELECT_NODE, (p_node: LeoNode) => w_leoIntegration.selectTreeNode(p_node, false, false)], // Called by nodes in tree when selected
        [w_cmdPrefix + Constants.COMMANDS.OPEN_ASIDE, (p_node: LeoNode) => w_leoIntegration.selectTreeNode(p_node, false, true)],

        [w_cmdPrefix + Constants.COMMANDS.CONTRACT_ALL, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CONTRACT_ALL, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.CONTRACT_ALL_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CONTRACT_ALL, undefined, RefreshType.RefreshTree, true)],

        [w_cmdPrefix + Constants.COMMANDS.MARK, (p_node: LeoNode) => w_leoIntegration.changeMark(true, p_node, false)],
        [w_cmdPrefix + Constants.COMMANDS.UNMARK, (p_node: LeoNode) => w_leoIntegration.changeMark(false, p_node, false)],
        [w_cmdPrefix + Constants.COMMANDS.MARK_SELECTION, () => w_leoIntegration.changeMark(true, undefined, false)],
        [w_cmdPrefix + Constants.COMMANDS.UNMARK_SELECTION, () => w_leoIntegration.changeMark(false, undefined, false)],
        [w_cmdPrefix + Constants.COMMANDS.MARK_SELECTION_FO, () => w_leoIntegration.changeMark(true, undefined, true)],
        [w_cmdPrefix + Constants.COMMANDS.UNMARK_SELECTION_FO, () => w_leoIntegration.changeMark(false, undefined, true)],

        [w_cmdPrefix + Constants.COMMANDS.COPY, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.COPY_PNODE, p_node, RefreshType.NoRefresh, false)], // No refresh/focus
        [w_cmdPrefix + Constants.COMMANDS.CUT, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CUT_PNODE, p_node, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.PASTE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_PNODE, p_node, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.PASTE_CLONE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_CLONE_PNODE, p_node, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.DELETE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DELETE_PNODE, p_node, RefreshType.RefreshTree, false)],

        [w_cmdPrefix + Constants.COMMANDS.COPY_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.COPY_PNODE, undefined, RefreshType.NoRefresh, false)], // No refresh/focus
        [w_cmdPrefix + Constants.COMMANDS.CUT_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CUT_PNODE, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.CUT_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CUT_PNODE, undefined, RefreshType.RefreshTree, true)],
        [w_cmdPrefix + Constants.COMMANDS.PASTE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.PASTE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_PNODE, undefined, RefreshType.RefreshTree, true)],
        [w_cmdPrefix + Constants.COMMANDS.PASTE_CLONE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_CLONE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.PASTE_CLONE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_CLONE_PNODE, undefined, RefreshType.RefreshTree, true)],
        [w_cmdPrefix + Constants.COMMANDS.DELETE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DELETE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.DELETE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DELETE_PNODE, undefined, RefreshType.RefreshTree, true)],

        [w_cmdPrefix + Constants.COMMANDS.HEADLINE, (p_node: LeoNode) => w_leoIntegration.editHeadline(p_node, false)],
        [w_cmdPrefix + Constants.COMMANDS.HEADLINE_SELECTION, () => w_leoIntegration.editHeadline(undefined, false)],
        [w_cmdPrefix + Constants.COMMANDS.HEADLINE_SELECTION_FO, () => w_leoIntegration.editHeadline(undefined, true)],

        [w_cmdPrefix + Constants.COMMANDS.MOVE_DOWN, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_DOWN, p_node, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_LEFT, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_LEFT, p_node, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_RIGHT, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_RIGHT, p_node, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_UP, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_UP, p_node, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.INSERT, (p_node: LeoNode) => w_leoIntegration.insertNode(p_node, false)],
        [w_cmdPrefix + Constants.COMMANDS.CLONE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CLONE_PNODE, p_node, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.PROMOTE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PROMOTE_PNODE, p_node, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.DEMOTE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DEMOTE_PNODE, p_node, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.REFRESH_FROM_DISK, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.REFRESH_FROM_DISK_PNODE, p_node, RefreshType.RefreshTreeAndBody, false)],

        [w_cmdPrefix + Constants.COMMANDS.MOVE_DOWN_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_DOWN, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_DOWN_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_DOWN, undefined, RefreshType.RefreshTree, true)],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_LEFT_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_LEFT, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_LEFT_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_LEFT, undefined, RefreshType.RefreshTree, true)],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_RIGHT_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_RIGHT, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_RIGHT_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_RIGHT, undefined, RefreshType.RefreshTree, true)],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_UP_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_UP, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_UP_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_UP, undefined, RefreshType.RefreshTree, true)],
        [w_cmdPrefix + Constants.COMMANDS.INSERT_SELECTION, () => w_leoIntegration.insertNode(undefined, false)],
        [w_cmdPrefix + Constants.COMMANDS.INSERT_SELECTION_FO, () => w_leoIntegration.insertNode(undefined, true)],

        // * Special command for when inserting rapidly more than one node without even specifying a headline label, such as spamming CTRL+I rapidly.
        [w_cmdPrefix + Constants.COMMANDS.INSERT_SELECTION_INTERRUPT, () => w_leoIntegration.insertNode(undefined, undefined, true)],

        [w_cmdPrefix + Constants.COMMANDS.CLONE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CLONE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.CLONE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CLONE_PNODE, undefined, RefreshType.RefreshTree, true)],
        [w_cmdPrefix + Constants.COMMANDS.PROMOTE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PROMOTE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.PROMOTE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PROMOTE_PNODE, undefined, RefreshType.RefreshTree, true)],
        [w_cmdPrefix + Constants.COMMANDS.DEMOTE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DEMOTE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.DEMOTE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DEMOTE_PNODE, undefined, RefreshType.RefreshTree, true)],

        [w_cmdPrefix + Constants.COMMANDS.REFRESH_FROM_DISK_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.REFRESH_FROM_DISK_PNODE, undefined, RefreshType.RefreshTreeAndBody, false)],
        [w_cmdPrefix + Constants.COMMANDS.REFRESH_FROM_DISK_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.REFRESH_FROM_DISK_PNODE, undefined, RefreshType.RefreshTreeAndBody, true)],

        [w_cmdPrefix + Constants.COMMANDS.SORT_CHILDREN, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.SORT_CHILDREN, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.SORT_SIBLING, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.SORT_SIBLINGS, undefined, RefreshType.RefreshTree, false)],
        [w_cmdPrefix + Constants.COMMANDS.SORT_SIBLING_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.SORT_SIBLINGS, undefined, RefreshType.RefreshTree, true)],

        [w_cmdPrefix + Constants.COMMANDS.GOTO_FIRST_VISIBLE, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_FIRST_VISIBLE, undefined, RefreshType.RefreshTreeAndBody, true)],
        [w_cmdPrefix + Constants.COMMANDS.GOTO_LAST_VISIBLE, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_LAST_VISIBLE, undefined, RefreshType.RefreshTreeAndBody, true)],
        [w_cmdPrefix + Constants.COMMANDS.GOTO_LAST_SIBLING, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_LAST_SIBLING, undefined, RefreshType.RefreshTreeAndBody, true)],
        [w_cmdPrefix + Constants.COMMANDS.GOTO_NEXT_VISIBLE, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_NEXT_VISIBLE, undefined, RefreshType.RefreshTreeAndBody, true)],
        [w_cmdPrefix + Constants.COMMANDS.GOTO_PREV_VISIBLE, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_PREV_VISIBLE, undefined, RefreshType.RefreshTreeAndBody, true)],
        [w_cmdPrefix + Constants.COMMANDS.GOTO_NEXT_MARKED, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_NEXT_MARKED, undefined, RefreshType.RefreshTreeAndBody, true)],
        [w_cmdPrefix + Constants.COMMANDS.CONTRACT_OR_GO_LEFT, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CONTRACT_OR_GO_LEFT, undefined, RefreshType.RefreshTreeAndBody, true)],
        [w_cmdPrefix + Constants.COMMANDS.EXPAND_AND_GO_RIGHT, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.EXPAND_AND_GO_RIGHT, undefined, RefreshType.RefreshTreeAndBody, true)],

        [w_cmdPrefix + Constants.COMMANDS.UNDO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.UNDO, undefined, RefreshType.RefreshTreeAndBody, false)],
        [w_cmdPrefix + Constants.COMMANDS.UNDO_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.UNDO, undefined, RefreshType.RefreshTreeAndBody, true)],
        [w_cmdPrefix + Constants.COMMANDS.REDO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.REDO, undefined, RefreshType.RefreshTreeAndBody, false)],
        [w_cmdPrefix + Constants.COMMANDS.REDO_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.REDO, undefined, RefreshType.RefreshTreeAndBody, true)],
        [w_cmdPrefix + Constants.COMMANDS.EXECUTE, () => w_leoIntegration.executeScript()],

        // TODO : More commands to implement #15, #23, #24, #25 @boltex
        [w_cmdPrefix + Constants.COMMANDS.HOIST, () => vscode.window.showInformationMessage("TODO: hoistNode command")],
        [w_cmdPrefix + Constants.COMMANDS.HOIST_SELECTION, () => vscode.window.showInformationMessage("TODO: hoistSelection command")],
        [w_cmdPrefix + Constants.COMMANDS.DEHOIST, () => vscode.window.showInformationMessage("TODO: deHoist command")],
        [w_cmdPrefix + Constants.COMMANDS.CLONE_FIND_ALL, () => vscode.window.showInformationMessage("TODO: cloneFindAll command")],
        [w_cmdPrefix + Constants.COMMANDS.CLONE_FIND_ALL_FLATTENED, () => vscode.window.showInformationMessage("TODO: cloneFindAllFlattened command")],
        [w_cmdPrefix + Constants.COMMANDS.CLONE_FIND_MARKED, () => vscode.window.showInformationMessage("TODO: cloneFindMarked command")],
        [w_cmdPrefix + Constants.COMMANDS.CLONE_FIND_FLATTENED_MARKED, () => vscode.window.showInformationMessage("TODO: cloneFindFlattenedMarked command")],
        [w_cmdPrefix + Constants.COMMANDS.EXTRACT, () => vscode.window.showInformationMessage("TODO: extract command")],
        [w_cmdPrefix + Constants.COMMANDS.EXTRACT_NAMES, () => vscode.window.showInformationMessage("TODO: extractNames command")],
        [w_cmdPrefix + Constants.COMMANDS.COPY_MARKED, () => vscode.window.showInformationMessage("TODO: copyMarked command")],
        [w_cmdPrefix + Constants.COMMANDS.DIFF_MARKED_NODES, () => vscode.window.showInformationMessage("TODO: diffMarkedNodes command")],
        [w_cmdPrefix + Constants.COMMANDS.MARK_CHANGED_ITEMS, () => vscode.window.showInformationMessage("TODO: markChangedItems command")],
        [w_cmdPrefix + Constants.COMMANDS.MARK_SUBHEADS, () => vscode.window.showInformationMessage("TODO: markSubheads command")],
        [w_cmdPrefix + Constants.COMMANDS.UNMARK_ALL, () => vscode.window.showInformationMessage("TODO: unmarkAll command")],
        [w_cmdPrefix + Constants.COMMANDS.CLONE_MARKED_NODES, () => vscode.window.showInformationMessage("TODO: cloneMarkedNodes command")],
        [w_cmdPrefix + Constants.COMMANDS.DELETE_MARKED_NODES, () => vscode.window.showInformationMessage("TODO: deleteMarkedNodes command")],
        [w_cmdPrefix + Constants.COMMANDS.MOVE_MARKED_NODES, () => vscode.window.showInformationMessage("TODO: moveMarkedNode command")]
    ];

    w_commands.map(function (p_command) { p_context.subscriptions.push(vscode.commands.registerCommand(...p_command)); });

    // * Show Welcome / settings screen if the version is newer than last time, then start automatic server and connection
    showWelcomeIfNewer(w_leoIntegVersion, w_previousVersion).then(() => {
        // * Start server and / or connect to it (as specified in settings)
        w_leoIntegration.startNetworkServices();
        p_context.globalState.update(Constants.VERSION_STATE_KEY, w_leoIntegVersion);
        console.log('leoInteg startup launched in ', getDurationMilliseconds(w_start), 'ms');
    });
}

/**
 * * Called when extension is deactivated
 */
export function deactivate() {
    console.log('deactivate called for extension "leointeg"');
}

/**
 * * Show welcome screen if needed, based on last version executed
 * @param p_version Current version, as a string, from packageJSON.version
 * @param p_previousVersion Previous version, as a string, from context.globalState.get service
 * @returns a promise that triggers when command to show the welcome screen is finished, or immediately if not needed
 */
async function showWelcomeIfNewer(p_version: string, p_previousVersion: string | undefined): Promise<unknown> {
    let w_showWelcomeScreen: boolean = false;
    if (p_previousVersion === undefined) {
        console.log('leoInteg first-time install');
        w_showWelcomeScreen = true;
    } else {
        if (p_previousVersion !== p_version) {
            console.log(`leoInteg upgraded from v${p_previousVersion} to v${p_version}`);
        }
        const [w_major, w_minor] = p_version.split('.').map(p_stringVal => parseInt(p_stringVal, 10));
        const [w_prevMajor, w_prevMinor] = p_previousVersion.split('.').map(p_stringVal => parseInt(p_stringVal, 10));
        if (
            (w_major === w_prevMajor && w_minor === w_prevMinor) ||
            // Don't notify on downgrades
            (w_major < w_prevMajor || (w_major === w_prevMajor && w_minor < w_prevMinor))
        ) {
            w_showWelcomeScreen = false;
        } else if (w_major !== w_prevMajor || (w_major === w_prevMajor && w_minor > w_prevMinor)) {
            // Will show on major or minor upgrade (Formatted as 'Major.Minor.Revision' eg. 1.2.3)
            w_showWelcomeScreen = true;
        }
    }
    if (w_showWelcomeScreen) {
        return vscode.commands.executeCommand(Constants.NAME + "." + Constants.COMMANDS.SHOW_WELCOME);
    } else {
        return Promise.resolve();
    }
}

/**
 * * Returns the milliseconds between a given starting process.hrtime tuple and the current call to process.hrtime
 * @param p_start starting process.hrtime to subtract from current immediate time
 * @returns number of milliseconds passed since the given start hrtime
 */
function getDurationMilliseconds(p_start: [number, number]): number {
    const [secs, nanosecs] = process.hrtime(p_start);
    return secs * 1000 + Math.floor(nanosecs / 1000000);
}