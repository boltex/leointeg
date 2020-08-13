import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { ReqRefresh } from "./types";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { LeoSettingsWebview } from "./webviews/leoSettingsWebview";
import { LeoButtonNode } from "./leoButtonNode";

/**
 * * Called when extension is activated.
 * It creates the leoIntegration and the 'welcome/Settings' webview instances.
 */
export function activate(p_context: vscode.ExtensionContext) {

    // * Reset Extension context flags (used in 'when' clauses in package.json)
    utils.setContext(Constants.CONTEXT_FLAGS.BRIDGE_READY, false); // Connected to a leobridge server?
    utils.setContext(Constants.CONTEXT_FLAGS.TREE_OPENED, false); // Having a Leo file opened on that server?

    const w_leoIntegExtension = vscode.extensions.getExtension(Constants.PUBLISHER + '.' + Constants.NAME)!;
    const w_leoIntegVersion = w_leoIntegExtension.packageJSON.version;
    const w_leo: LeoIntegration = new LeoIntegration(p_context);
    const w_leoSettingsWebview: LeoSettingsWebview = new LeoSettingsWebview(p_context, w_leo);
    const w_previousVersion = p_context.globalState.get<string>(Constants.VERSION_STATE_KEY);
    const w_start = process.hrtime(); // For calculating total startup time duration

    // Shortcut pointers for readability
    const U = undefined;
    const BRIDGE = Constants.LEOBRIDGE;
    const CMD = Constants.COMMANDS;
    const NO_REFRESH: ReqRefresh = {};
    const REFRESH_NODE_BODY: ReqRefresh = {
        node: true, // Reveal the returned 'selected position' without changes to the tree
        body: true, // Goto/select another node needs the body pane refreshed
        states: true
    };
    const REFRESH_TREE: ReqRefresh = {
        tree: true,
        states: true
    };
    const REFRESH_TREE_BODY: ReqRefresh = {
        tree: true,
        body: true,
        states: true
    };
    const showInfo = vscode.window.showInformationMessage;

    const w_commands: [string, (...args: any[]) => any][] = [

        // ! REMOVE TESTS ENTRIES FROM PACKAGE.JSON FOR MASTER BRANCH RELEASES !
        ["leointeg.test", () => w_leo.test()], // Test function useful when debugging
        ["leointeg.testFromOutline", () => w_leo.test(true)], // Test function useful when debugging.

        // * Define entries for all commands
        [CMD.MINIBUFFER, () => w_leo.minibuffer()], // Cannot be undeclared because its referenced in package.json
        [CMD.EXECUTE, () => w_leo.executeScript()],

        [CMD.CLICK_BUTTON, (p_node: LeoButtonNode) => w_leo.clickButton(p_node)], // not referenced in package.json
        [CMD.REMOVE_BUTTON, (p_node: LeoButtonNode) => w_leo.removeButton(p_node)],

        [CMD.CLOSE_FILE, () => w_leo.closeLeoFile()],
        [CMD.NEW_FILE, () => w_leo.newLeoFile()],

        [CMD.OPEN_FILE, (p_uri?: vscode.Uri) => w_leo.openLeoFile(p_uri)],

        [CMD.RECENT_FILES, () => w_leo.showRecentLeoFiles()],
        [CMD.SAVE_AS_FILE, () => w_leo.saveAsLeoFile()],
        [CMD.SAVE_FILE, () => w_leo.saveLeoFile()],
        [CMD.SAVE_FILE_FO, () => w_leo.saveLeoFile(true)],
        [CMD.SWITCH_FILE, () => w_leo.switchLeoFile()],

        // Test for undeclared commands VERDICT IT WORKS!
        [CMD.SET_OPENED_FILE, (p_index: number) => w_leo.selectOpenedLeoDocument(p_index)],

        [CMD.REFRESH_FROM_DISK, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.REFRESH_FROM_DISK_PNODE,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: false
        })],
        [CMD.REFRESH_FROM_DISK_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.REFRESH_FROM_DISK_PNODE,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: false
        })],
        [CMD.REFRESH_FROM_DISK_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.REFRESH_FROM_DISK_PNODE,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],
        [CMD.GIT_DIFF, () => w_leo.nodeCommand({
            action: BRIDGE.GIT_DIFF,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: false
        })],

        [CMD.HEADLINE, (p_node: LeoNode) => w_leo.editHeadline(p_node, true)],
        [CMD.HEADLINE_SELECTION, () => w_leo.editHeadline(U, false)],
        [CMD.HEADLINE_SELECTION_FO, () => w_leo.editHeadline(U, true)],

        // cut/copy/paste/delete given node.
        [CMD.COPY, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.COPY_PNODE,
            node: p_node,
            refreshType: NO_REFRESH,
            fromOutline: true,
            keepSelection: true
        })],
        [CMD.CUT, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.CUT_PNODE,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: true
        })],
        [CMD.DELETE, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.DELETE_PNODE,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: true
        })],
        [CMD.PASTE, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.PASTE_PNODE,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: false
        })],
        [CMD.PASTE_CLONE, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.PASTE_CLONE_PNODE,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: false
        })],

        // cut/copy/paste/delete current selection (self.commander.p)
        [CMD.COPY_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.COPY_PNODE,
            node: U,
            refreshType: NO_REFRESH,
            fromOutline: false
        })],
        [CMD.CUT_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.CUT_PNODE,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: false
        })],
        [CMD.CUT_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.CUT_PNODE,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],
        [CMD.DELETE_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.DELETE_PNODE,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: false
        })],
        [CMD.DELETE_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.DELETE_PNODE,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],
        [CMD.PASTE_CLONE_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.PASTE_CLONE_PNODE,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: false
        })],
        [CMD.PASTE_CLONE_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.PASTE_CLONE_PNODE,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],
        [CMD.PASTE_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.PASTE_PNODE,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: false
        })],
        [CMD.PASTE_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.PASTE_PNODE,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],

        [CMD.CONTRACT_ALL, () => w_leo.nodeCommand({
            action: BRIDGE.CONTRACT_ALL,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: false
        })],
        [CMD.CONTRACT_ALL_FO, () => w_leo.nodeCommand({
            action: BRIDGE.CONTRACT_ALL,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],
        [CMD.CONTRACT_OR_GO_LEFT, () => w_leo.nodeCommand({
            action: BRIDGE.CONTRACT_OR_GO_LEFT,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],
        [CMD.EXPAND_AND_GO_RIGHT, () => w_leo.nodeCommand({
            action: BRIDGE.EXPAND_AND_GO_RIGHT,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],

        [CMD.GOTO_NEXT_CLONE, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.GOTO_NEXT_CLONE,
            node: p_node,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: true
        })],
        [CMD.GOTO_NEXT_CLONE_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.GOTO_NEXT_CLONE,
            node: U,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: false
        })],
        [CMD.GOTO_NEXT_CLONE_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.GOTO_NEXT_CLONE,
            node: U,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: true
        })],

        [CMD.GOTO_NEXT_MARKED, () => w_leo.nodeCommand({
            action: BRIDGE.GOTO_NEXT_MARKED,
            node: U,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: true
        })],
        [CMD.GOTO_FIRST_VISIBLE, () => w_leo.nodeCommand({
            action: BRIDGE.GOTO_FIRST_VISIBLE,
            node: U,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: true
        })],
        [CMD.GOTO_LAST_SIBLING, () => w_leo.nodeCommand({
            action: BRIDGE.GOTO_LAST_SIBLING,
            node: U,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: true
        })],
        [CMD.GOTO_LAST_VISIBLE, () => w_leo.nodeCommand({
            action: BRIDGE.GOTO_LAST_VISIBLE,
            node: U,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: true
        })],
        [CMD.GOTO_NEXT_VISIBLE, () => w_leo.nodeCommand({
            action: BRIDGE.GOTO_NEXT_VISIBLE,
            node: U,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: true
        })],
        [CMD.GOTO_PREV_VISIBLE, () => w_leo.nodeCommand({
            action: BRIDGE.GOTO_PREV_VISIBLE,
            node: U,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: true
        })],

        [CMD.PAGE_UP, () => w_leo.nodeCommand({
            action: BRIDGE.PAGE_UP,
            node: U,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: true
        })],
        [CMD.PAGE_DOWN, () => w_leo.nodeCommand({
            action: BRIDGE.PAGE_DOWN,
            node: U,
            refreshType: REFRESH_NODE_BODY,
            fromOutline: true
        })],

        [CMD.DEHOIST, () => w_leo.nodeCommand({
            action: BRIDGE.DEHOIST,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: false
        })],
        [CMD.DEHOIST_FO, () => w_leo.nodeCommand({
            action: BRIDGE.DEHOIST,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],
        [CMD.HOIST, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.HOIST_PNODE,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],
        [CMD.HOIST_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.HOIST_PNODE,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: false
        })],
        [CMD.HOIST_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.HOIST_PNODE,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: true
        })],

        [CMD.CLONE, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.CLONE_PNODE,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],
        [CMD.CLONE_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.CLONE_PNODE,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: false
        })],
        [CMD.CLONE_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.CLONE_PNODE,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: true
        })],

        [CMD.INSERT, (p_node: LeoNode) => w_leo.insertNode(p_node, true)],
        [CMD.INSERT_SELECTION, () => w_leo.insertNode(U, false)],
        [CMD.INSERT_SELECTION_FO, () => w_leo.insertNode(U, true)],

        // Special command for when inserting rapidly more than one node without
        // even specifying a headline label, such as spamming CTRL+I rapidly.
        [CMD.INSERT_SELECTION_INTERRUPT, () => w_leo.insertNode(U, false, true)],

        [CMD.MARK, (p_node: LeoNode) => w_leo.changeMark(true, p_node, true)],
        [CMD.MARK_SELECTION, () => w_leo.changeMark(true, U, false)],
        [CMD.MARK_SELECTION_FO, () => w_leo.changeMark(true, U, true)],

        [CMD.UNMARK, (p_node: LeoNode) => w_leo.changeMark(false, p_node, true)],
        [CMD.UNMARK_SELECTION, () => w_leo.changeMark(false, U, false)],
        [CMD.UNMARK_SELECTION_FO, () => w_leo.changeMark(false, U, true)],

        [CMD.MOVE_DOWN, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_DOWN,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: true
        })],
        [CMD.MOVE_DOWN_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_DOWN,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: false
        })],
        [CMD.MOVE_DOWN_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_DOWN,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: true
        })],

        [CMD.MOVE_LEFT, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_LEFT,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: true
        })],
        [CMD.MOVE_LEFT_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_LEFT,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: false
        })],
        [CMD.MOVE_LEFT_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_LEFT,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: true
        })],

        [CMD.MOVE_RIGHT, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_RIGHT,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: true
        })],
        [CMD.MOVE_RIGHT_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_RIGHT,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: false
        })],
        [CMD.MOVE_RIGHT_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_RIGHT,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: true
        })],

        [CMD.MOVE_UP, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_UP,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: true
        })],
        [CMD.MOVE_UP_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_UP,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: false
        })],
        [CMD.MOVE_UP_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.MOVE_PNODE_UP,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: true
        })],

        [CMD.DEMOTE, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.DEMOTE_PNODE,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: true
        })],
        [CMD.DEMOTE_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.DEMOTE_PNODE,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: false
        })],
        [CMD.DEMOTE_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.DEMOTE_PNODE,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: true
        })],
        [CMD.PROMOTE, (p_node: LeoNode) => w_leo.nodeCommand({
            action: BRIDGE.PROMOTE_PNODE,
            node: p_node,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true,
            keepSelection: true
        })],
        [CMD.PROMOTE_SELECTION, () => w_leo.nodeCommand({
            action: BRIDGE.PROMOTE_PNODE,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: false
        })],
        [CMD.PROMOTE_SELECTION_FO, () => w_leo.nodeCommand({
            action: BRIDGE.PROMOTE_PNODE,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: true
        })],

        [CMD.SORT_CHILDREN, () => w_leo.nodeCommand({
            action: BRIDGE.SORT_CHILDREN,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: false,
            keepSelection: true
        })],
        [CMD.SORT_SIBLING, () => w_leo.nodeCommand({
            action: BRIDGE.SORT_SIBLINGS,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: false,
            keepSelection: true
        })],
        [CMD.SORT_SIBLING_FO, () => w_leo.nodeCommand({
            action: BRIDGE.SORT_SIBLINGS,
            node: U,
            refreshType: REFRESH_TREE,
            fromOutline: true,
            keepSelection: true
        })],

        [CMD.REDO, () => w_leo.nodeCommand({
            action: BRIDGE.REDO,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: false
        })],
        [CMD.REDO_FO, () => w_leo.nodeCommand({
            action: BRIDGE.REDO,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],
        [CMD.UNDO, () => w_leo.nodeCommand({
            action: BRIDGE.UNDO,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: false
        })],
        [CMD.UNDO_FO, () => w_leo.nodeCommand({
            action: BRIDGE.UNDO,
            node: U,
            refreshType: REFRESH_TREE_BODY,
            fromOutline: true
        })],

        [CMD.CONNECT, () => w_leo.connect()],
        [CMD.START_SERVER, () => w_leo.startServer()],

        // Called by nodes in tree when selected either by mouse, or with enter
        [CMD.SELECT_NODE, (p_node: LeoNode) => w_leo.selectTreeNode(p_node, false, false)],
        [CMD.OPEN_ASIDE, (p_node: LeoNode) => w_leo.selectTreeNode(p_node, false, true)],

        [CMD.SHOW_OUTLINE, () => w_leo.showOutline(true)], // Also focuses on outline

        [CMD.SHOW_LOG, () => w_leo.showLogPane()],
        [CMD.SHOW_BODY, () => w_leo.showBody(false)], // Also focuses on body

        [CMD.SHOW_WELCOME, () => w_leoSettingsWebview.openWebview()],
        [CMD.SHOW_SETTINGS, () => w_leoSettingsWebview.openWebview()], // Same as SHOW_WELCOME

        // TODO : @boltex More commands to implement #15, #23, #24
        [CMD.CLONE_FIND_ALL, () => showInfo("TODO: cloneFindAll command")],
        [CMD.CLONE_FIND_ALL_FLATTENED, () => showInfo("TODO: cloneFindAllFlattened command")],
        [CMD.CLONE_FIND_MARKED, () => showInfo("TODO: cloneFindMarked command")],
        [CMD.CLONE_FIND_FLATTENED_MARKED, () => showInfo("TODO: cloneFindFlattenedMarked command")],
        [CMD.EXTRACT, () => showInfo("TODO: extract command")],
        [CMD.EXTRACT_NAMES, () => showInfo("TODO: extractNames command")],
        [CMD.COPY_MARKED, () => showInfo("TODO: copyMarked command")],
        [CMD.DIFF_MARKED_NODES, () => showInfo("TODO: diffMarkedNodes command")],
        [CMD.MARK_CHANGED_ITEMS, () => showInfo("TODO: markChangedItems command")],
        [CMD.MARK_SUBHEADS, () => showInfo("TODO: markSubheads command")],
        [CMD.UNMARK_ALL, () => showInfo("TODO: unmarkAll command")],
        [CMD.CLONE_MARKED_NODES, () => showInfo("TODO: cloneMarkedNodes command")],
        [CMD.DELETE_MARKED_NODES, () => showInfo("TODO: deleteMarkedNodes command")],
        [CMD.MOVE_MARKED_NODES, () => showInfo("TODO: moveMarkedNode command")]

    ];

    w_commands.map(function (p_command) {
        p_context.subscriptions.push(vscode.commands.registerCommand(...p_command));
    });

    showWelcomeIfNewer(w_leoIntegVersion, w_previousVersion).then(() => {
        w_leo.startNetworkServices(); // Start server and/or connect to it, as specified in settings
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
        return vscode.commands.executeCommand(Constants.COMMANDS.SHOW_WELCOME);
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

