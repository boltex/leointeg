import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { RefreshType } from "./types";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { LeoSettingsWebview } from "./webviews/leoSettingsWebview";
import { LeoButtonNode } from "./leoButtonNode";

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
    const prefix = w_cmdPrefix;
    const cmd = Constants.COMMANDS;
    const w_commands: [string, (...args: any[]) => any][] = [

        // ! REMOVE TESTS ENTRIES FROM PACKAGE.JSON FOR MASTER BRANCH RELEASES !
        [prefix + "test", () => w_leoIntegration.test()], // * Test function useful when debugging
        [prefix + "testFromOutline", () => w_leoIntegration.test(true)], // * Test function useful when debugging

        [prefix + cmd.SET_OPENED_FILE, (p_index: number) => w_leoIntegration.selectOpenedLeoDocument(p_index)], // Test for undeclared commands VERDICT IT WORKS!
        [prefix + cmd.CLICK_BUTTON, (p_node: LeoButtonNode) => w_leoIntegration.clickButton(p_node)], // Test for undeclared commands VERDICT IT WORKS!
        [prefix + cmd.REMOVE_BUTTON, (p_node: LeoButtonNode) => w_leoIntegration.removeButton(p_node)], // Cannot be undeclared because its referenced in package.json

        [prefix + cmd.SHOW_WELCOME, () => w_leoSettingsWebview.openWebview()],
        [prefix + cmd.SHOW_SETTINGS, () => w_leoSettingsWebview.openWebview()], // Same as 'show welcome screen'
        [prefix + cmd.START_SERVER, () => w_leoIntegration.startServer()],
        [prefix + cmd.CONNECT, () => w_leoIntegration.connect()],
        [prefix + cmd.SHOW_LOG, () => w_leoIntegration.showLogPane()],
        [prefix + cmd.SHOW_BODY, () => w_leoIntegration.showBody(false)], // Also focuses on body
        [prefix + cmd.SHOW_OUTLINE, () => w_leoIntegration.showOutline(true)], // Also focuses on outline
        [prefix + cmd.NEW_FILE, () => w_leoIntegration.newLeoFile()],
        [prefix + cmd.SWITCH_FILE, () => w_leoIntegration.switchLeoFile()],

        [prefix + cmd.OPEN_FILE, () => w_leoIntegration.openLeoFile()],
        [prefix + cmd.SAVE_AS_FILE, () => w_leoIntegration.saveAsLeoFile()],
        [prefix + cmd.SAVE_FILE, () => w_leoIntegration.saveLeoFile()],
        [prefix + cmd.SAVE_FILE_FO, () => w_leoIntegration.saveLeoFile(true)],
        [prefix + cmd.CLOSE_FILE, () => w_leoIntegration.closeLeoFile()],

        [prefix + cmd.SELECT_NODE, (p_node: LeoNode) => w_leoIntegration.selectTreeNode(p_node, false, false)], // Called by nodes in tree when selected
        [prefix + cmd.OPEN_ASIDE, (p_node: LeoNode) => w_leoIntegration.selectTreeNode(p_node, false, true)],

        [prefix + cmd.CONTRACT_ALL, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CONTRACT_ALL, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.CONTRACT_ALL_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CONTRACT_ALL, undefined, RefreshType.RefreshTree, true)],

        [prefix + cmd.MARK, (p_node: LeoNode) => w_leoIntegration.changeMark(true, p_node, false)],
        [prefix + cmd.UNMARK, (p_node: LeoNode) => w_leoIntegration.changeMark(false, p_node, false)],
        [prefix + cmd.MARK_SELECTION, () => w_leoIntegration.changeMark(true, undefined, false)],
        [prefix + cmd.UNMARK_SELECTION, () => w_leoIntegration.changeMark(false, undefined, false)],
        [prefix + cmd.MARK_SELECTION_FO, () => w_leoIntegration.changeMark(true, undefined, true)],
        [prefix + cmd.UNMARK_SELECTION_FO, () => w_leoIntegration.changeMark(false, undefined, true)],

        [prefix + cmd.COPY, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.COPY_PNODE, p_node, RefreshType.NoRefresh, false)], // No refresh/focus
        [prefix + cmd.CUT, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CUT_PNODE, p_node, RefreshType.RefreshTree, false)],
        [prefix + cmd.PASTE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_PNODE, p_node, RefreshType.RefreshTree, false)],
        [prefix + cmd.PASTE_CLONE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_CLONE_PNODE, p_node, RefreshType.RefreshTree, false)],
        [prefix + cmd.DELETE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DELETE_PNODE, p_node, RefreshType.RefreshTree, false)],

        [prefix + cmd.COPY_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.COPY_PNODE, undefined, RefreshType.NoRefresh, false)], // No refresh/focus
        [prefix + cmd.CUT_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CUT_PNODE, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.CUT_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CUT_PNODE, undefined, RefreshType.RefreshTree, true)],
        [prefix + cmd.PASTE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.PASTE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_PNODE, undefined, RefreshType.RefreshTree, true)],
        [prefix + cmd.PASTE_CLONE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_CLONE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.PASTE_CLONE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PASTE_CLONE_PNODE, undefined, RefreshType.RefreshTree, true)],
        [prefix + cmd.DELETE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DELETE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.DELETE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DELETE_PNODE, undefined, RefreshType.RefreshTree, true)],

        [prefix + cmd.HEADLINE, (p_node: LeoNode) => w_leoIntegration.editHeadline(p_node, false)],
        [prefix + cmd.HEADLINE_SELECTION, () => w_leoIntegration.editHeadline(undefined, false)],
        [prefix + cmd.HEADLINE_SELECTION_FO, () => w_leoIntegration.editHeadline(undefined, true)],

        [prefix + cmd.MOVE_DOWN, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_DOWN, p_node, RefreshType.RefreshTree, false)],
        [prefix + cmd.MOVE_LEFT, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_LEFT, p_node, RefreshType.RefreshTree, false)],
        [prefix + cmd.MOVE_RIGHT, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_RIGHT, p_node, RefreshType.RefreshTree, false)],
        [prefix + cmd.MOVE_UP, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_UP, p_node, RefreshType.RefreshTree, false)],
        [prefix + cmd.INSERT, (p_node: LeoNode) => w_leoIntegration.insertNode(p_node, false)],
        [prefix + cmd.CLONE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CLONE_PNODE, p_node, RefreshType.RefreshTree, false)],
        [prefix + cmd.PROMOTE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PROMOTE_PNODE, p_node, RefreshType.RefreshTree, false)],
        [prefix + cmd.DEMOTE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DEMOTE_PNODE, p_node, RefreshType.RefreshTree, false)],
        [prefix + cmd.REFRESH_FROM_DISK, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.REFRESH_FROM_DISK_PNODE, p_node, RefreshType.RefreshTreeAndBody, false)],

        [prefix + cmd.MOVE_DOWN_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_DOWN, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.MOVE_DOWN_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_DOWN, undefined, RefreshType.RefreshTree, true)],
        [prefix + cmd.MOVE_LEFT_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_LEFT, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.MOVE_LEFT_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_LEFT, undefined, RefreshType.RefreshTree, true)],
        [prefix + cmd.MOVE_RIGHT_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_RIGHT, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.MOVE_RIGHT_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_RIGHT, undefined, RefreshType.RefreshTree, true)],
        [prefix + cmd.MOVE_UP_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_UP, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.MOVE_UP_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.MOVE_PNODE_UP, undefined, RefreshType.RefreshTree, true)],
        [prefix + cmd.INSERT_SELECTION, () => w_leoIntegration.insertNode(undefined, false)],
        [prefix + cmd.INSERT_SELECTION_FO, () => w_leoIntegration.insertNode(undefined, true)],

        // * Special command for when inserting rapidly more than one node without even specifying a headline label, such as spamming CTRL+I rapidly.
        [prefix + cmd.INSERT_SELECTION_INTERRUPT, () => w_leoIntegration.insertNode(undefined, undefined, true)],

        [prefix + cmd.CLONE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CLONE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.CLONE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CLONE_PNODE, undefined, RefreshType.RefreshTree, true)],
        [prefix + cmd.PROMOTE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PROMOTE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.PROMOTE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PROMOTE_PNODE, undefined, RefreshType.RefreshTree, true)],
        [prefix + cmd.DEMOTE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DEMOTE_PNODE, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.DEMOTE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DEMOTE_PNODE, undefined, RefreshType.RefreshTree, true)],

        [prefix + cmd.REFRESH_FROM_DISK_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.REFRESH_FROM_DISK_PNODE, undefined, RefreshType.RefreshTreeAndBody, false)],
        [prefix + cmd.REFRESH_FROM_DISK_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.REFRESH_FROM_DISK_PNODE, undefined, RefreshType.RefreshTreeAndBody, true)],

        [prefix + cmd.SORT_CHILDREN, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.SORT_CHILDREN, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.SORT_SIBLING, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.SORT_SIBLINGS, undefined, RefreshType.RefreshTree, false)],
        [prefix + cmd.SORT_SIBLING_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.SORT_SIBLINGS, undefined, RefreshType.RefreshTree, true)],

        [prefix + cmd.PAGE_UP, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PAGE_UP, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.PAGE_DOWN, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.PAGE_DOWN, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.GOTO_FIRST_VISIBLE, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_FIRST_VISIBLE, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.GOTO_LAST_VISIBLE, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_LAST_VISIBLE, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.GOTO_LAST_SIBLING, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_LAST_SIBLING, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.GOTO_NEXT_CLONE, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_NEXT_CLONE, p_node, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.GOTO_NEXT_CLONE_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_NEXT_CLONE, undefined, RefreshType.RefreshTreeAndBody, false)],
        [prefix + cmd.GOTO_NEXT_CLONE_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_NEXT_CLONE, undefined, RefreshType.RefreshTreeAndBody, true)],

        [prefix + cmd.GOTO_NEXT_VISIBLE, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_NEXT_VISIBLE, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.GOTO_PREV_VISIBLE, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_PREV_VISIBLE, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.GOTO_NEXT_MARKED, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.GOTO_NEXT_MARKED, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.CONTRACT_OR_GO_LEFT, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.CONTRACT_OR_GO_LEFT, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.EXPAND_AND_GO_RIGHT, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.EXPAND_AND_GO_RIGHT, undefined, RefreshType.RefreshTreeAndBody, true)],

        [prefix + cmd.UNDO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.UNDO, undefined, RefreshType.RefreshTreeAndBody, false)],
        [prefix + cmd.UNDO_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.UNDO, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.REDO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.REDO, undefined, RefreshType.RefreshTreeAndBody, false)],
        [prefix + cmd.REDO_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.REDO, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.EXECUTE, () => w_leoIntegration.executeScript()],

        [prefix + cmd.HOIST, (p_node: LeoNode) => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.HOIST_PNODE, p_node, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.HOIST_SELECTION, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.HOIST_PNODE, undefined, RefreshType.RefreshTreeAndBody, false)],
        [prefix + cmd.HOIST_SELECTION_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.HOIST_PNODE, undefined, RefreshType.RefreshTreeAndBody, true)],
        [prefix + cmd.DEHOIST, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DEHOIST, undefined, RefreshType.RefreshTreeAndBody, false)],
        [prefix + cmd.DEHOIST_FO, () => w_leoIntegration.nodeCommand(Constants.LEOBRIDGE.DEHOIST, undefined, RefreshType.RefreshTreeAndBody, true)],

        // TODO : @boltex More commands to implement #15, #23, #24
        [prefix + cmd.CLONE_FIND_ALL, () => vscode.window.showInformationMessage("TODO: cloneFindAll command")],
        [prefix + cmd.CLONE_FIND_ALL_FLATTENED, () => vscode.window.showInformationMessage("TODO: cloneFindAllFlattened command")],
        [prefix + cmd.CLONE_FIND_MARKED, () => vscode.window.showInformationMessage("TODO: cloneFindMarked command")],
        [prefix + cmd.CLONE_FIND_FLATTENED_MARKED, () => vscode.window.showInformationMessage("TODO: cloneFindFlattenedMarked command")],
        [prefix + cmd.EXTRACT, () => vscode.window.showInformationMessage("TODO: extract command")],
        [prefix + cmd.EXTRACT_NAMES, () => vscode.window.showInformationMessage("TODO: extractNames command")],
        [prefix + cmd.COPY_MARKED, () => vscode.window.showInformationMessage("TODO: copyMarked command")],
        [prefix + cmd.DIFF_MARKED_NODES, () => vscode.window.showInformationMessage("TODO: diffMarkedNodes command")],
        [prefix + cmd.MARK_CHANGED_ITEMS, () => vscode.window.showInformationMessage("TODO: markChangedItems command")],
        [prefix + cmd.MARK_SUBHEADS, () => vscode.window.showInformationMessage("TODO: markSubheads command")],
        [prefix + cmd.UNMARK_ALL, () => vscode.window.showInformationMessage("TODO: unmarkAll command")],
        [prefix + cmd.CLONE_MARKED_NODES, () => vscode.window.showInformationMessage("TODO: cloneMarkedNodes command")],
        [prefix + cmd.DELETE_MARKED_NODES, () => vscode.window.showInformationMessage("TODO: deleteMarkedNodes command")],
        [prefix + cmd.MOVE_MARKED_NODES, () => vscode.window.showInformationMessage("TODO: moveMarkedNode command")]
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
