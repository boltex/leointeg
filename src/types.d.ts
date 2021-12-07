import * as vscode from "vscode";
import { LeoNode } from "./leoNode";

/**
 * * For simple interactions in webviews into vscode API
 */
export interface IVsCodeApi {
    postMessage(msg: {}): void;
    setState(state: {}): void;
    getState(): { [key: string]: any };
}

/**
 * * Types of the various JSON configuration keys such as treeKeepFocus, defaultReloadIgnore, etc.
 */
export interface ConfigMembers {
    checkForChangeExternalFiles: string;
    defaultReloadIgnore: string;
    leoTreeBrowse: boolean;
    treeKeepFocus: boolean;
    treeKeepFocusWhenAside: boolean;
    statusBarString: string;
    statusBarColor: string;
    treeInExplorer: boolean;
    showOpenAside: boolean;
    showEditOnNodes: boolean;
    showArrowsOnNodes: boolean;
    showAddOnNodes: boolean;
    showMarkOnNodes: boolean;
    showCloneOnNodes: boolean;
    showCopyOnNodes: boolean;

    showEditionOnBody: boolean; // clone delete insert(s)
    showClipboardOnBody: boolean; // cut copy paste(s)
    showPromoteOnBody: boolean; // promote demote
    showExecuteOnBody: boolean; // extract(s)
    showExtractOnBody: boolean;
    showImportOnBody: boolean;
    showRefreshOnBody: boolean;
    showHoistOnBody: boolean;
    showMarkOnBody: boolean;
    showSortOnBody: boolean;

    invertNodeContrast: boolean;
    leoEditorPath: string;
    leoPythonCommand: string;
    startServerAutomatically: boolean;
    connectToServerAutomatically: boolean;
    connectionAddress: string;
    connectionPort: number;

    setDetached: boolean;
    limitUsers: number
}

/**
 * * Structure for configuration settings changes used along with welcome/settings webview.
 */
export interface ConfigSetting {
    code: string;
    value: any;
}

export interface FontSettings {
    zoomLevel: number;
    fontSize: number;
}

/**
 * * When refreshing the outline and getting to Leo's selected node
 */
export const enum RevealType {
    NoReveal = 0, // In apToLeoNode conversion, If if the global revealType is "NoReveal" and its the selected node, re-use the old id
    Reveal,
    RevealSelect,
    RevealSelectFocus
}

/**
 * * Required Refresh Dictionary of "elements to refresh" flags
 */
export interface ReqRefresh {
    node?: boolean; // Reveal received selected node (Navigation only, no tree change)
    tree?: boolean; // Tree needs refresh
    body?: boolean; // Body needs refresh
    scroll?: boolean; // Body needs to scroll to selection
    states?: boolean; // States needs refresh (changed, canUndo, canRedo, canDemote, canPromote, canDehoist)
    buttons?: boolean; // Buttons needs refresh
    documents?: boolean; // Documents needs refresh
}

/**
 * * Stackable front end commands
 */
export interface UserCommand {
    action: string; // String from Constants.LEOBRIDGE, which are commands for leobridgeserver
    node?: LeoNode | undefined;  // We can START a stack with a targeted command
    name?: string | undefined; // If a string is required, for headline, etc.
    refreshType: ReqRefresh; // Minimal refresh level required by this command
    fromOutline: boolean; // Focus back on outline instead of body
    keepSelection?: boolean; // Should bring back selection on node prior to command
    resolveFn?: (result: any) => void; // call that with an answer from python's (or other) side
    rejectFn?: (reason: any) => void; // call if problem is encountered
}

/**
 * * Stackable leoBridge actions to be performed by Leo
 */
export interface LeoAction {
    parameter: string; // to pass along with action to python's side
    deferredPayload?: any | undefined; // Used when the action already has a return value ready but is also waiting for python's side
    resolveFn: (result: any) => void; // call that with an answer from python's (or other) side
    rejectFn: (reason: any) => void; // call if problem is encountered
}

/**
 * * Simple 'string log entry' package format
 */
export interface LeoLogEntry {
    log: string;
}

/**
 * * ArchivedPosition format package from Leo's leoflexx.py
 */
export interface ArchivedPosition {
    hasBody: boolean;       // bool(p.b),
    hasChildren: boolean;   // p.hasChildren()
    childIndex: number;     // p._childIndex
    cloned: boolean;        // p.isCloned()
    dirty: boolean;         // p.isDirty()
    expanded: boolean;      // p.isExpanded()
    gnx: string;            // p.v.gnx
    level: number;          // p.level()
    headline: string;       // p.h
    marked: boolean;        // p.isMarked()
    atFile: boolean         // p.isAnyAtFileNode():
    selected: boolean;      // p == commander.p
    u?: any;               // User Attributes
    stack: {
        gnx: string;        // stack_v.gnx
        childIndex: number; // stack_childIndex
        headline: string;   // stack_v.h
    }[];                    // for (stack_v, stack_childIndex) in p.stack]
}

/**
 * * Object sent back from leoInteg's 'getStates' command
 */
export interface LeoPackageStates {
    changed: boolean; // Leo document has changed (is dirty)
    canUndo: boolean; // Leo document can undo the last operation done
    canRedo: boolean; // Leo document can redo the last operation 'undone'
    canDemote: boolean; // Currently selected node can have its siblings demoted
    canPromote: boolean; // Currently selected node can have its children promoted
    canDehoist: boolean; // Leo Document is currently hoisted and can be de-hoisted
}

/**
 * * Main interface for JSON sent from Leo back to leoInteg
 */
export interface LeoBridgePackage {
    // * Common to all result packages
    id: number;
    // * Possible answers from a "Constants.LEOBRIDGE" command
    gnx?: string[]; // get_all_gnx
    len?: number; // get_body_length
    body?: string; // get_body
    buttons?: LeoButton[]; // get_buttons
    commands?: vscode.QuickPickItem[]; // getCommands
    commander?: {
        changed: boolean,
        fileName: string;
    }
    filename?: string; // set_opened_file, open_file(s), ?close_file
    files?: LeoDocument[]; // get_all_open_commanders
    focus?: string; // find_next, find_previous
    found?: boolean // find_next, find_previous
    index?: number; // get_all_open_commanders
    language?: string; // get_body_states
    wrap?: boolean; // get_body_states
    tabWidth?: number | boolean; // get_body_states either the tabwidth or falsy
    node?: ArchivedPosition; // get_parent, set_opened_file, open_file(s), ?close_file
    children?: ArchivedPosition[]; // get_children
    searchSettings?: LeoGuiFindTabManagerSettings // get_search_settings
    selection?: BodySelectionInfo; // get_body_states
    states?: LeoPackageStates; // get_ui_states
    total?: number; // set_opened_file, open_file(s), close_file
    version?: string;
    major?: number;
    minor?: number;
    patch?: number;
}

/**
 * * Leo document structure used in the 'Opened Leo Documents' tree view provider sent back by the server
 */
export interface LeoDocument {
    name: string;
    index: number;
    changed: boolean;
    selected: boolean;
}

/**
 * * Leo '@button' structure used in the '@buttons' tree view provider sent back by the server
 */
export interface LeoButton {
    name: string;
    index: string; // STRING KEY
}

/**
 * * LeoInteg's Enum type for the search scope radio buttons of the find panel.
 */
export const enum LeoSearchScope {
    entireOutline = 0,
    subOutlineOnly,
    nodeOnly
}

/**
 * * LeoInteg search settings structure for use with the 'find' webview
 */
export interface LeoSearchSettings {
    //Find/change strings...
    findText: string;
    replaceText: string;
    // Find options...
    wholeWord: boolean;
    ignoreCase: boolean;
    regExp: boolean;
    markFinds: boolean;
    markChanges: boolean;
    searchHeadline: boolean;
    searchBody: boolean;
    searchScope: LeoSearchScope; // 0, 1 or 2 for outline, sub-outline, or node.
}

/**
 * * Leo's GUI search settings internal structure
 */
export interface LeoGuiFindTabManagerSettings {
    //Find/change strings...
    find_text: string,
    change_text: string,
    // Find options...
    ignore_case: boolean,
    mark_changes: boolean,
    mark_finds: boolean,
    node_only: boolean,
    pattern_match: boolean,
    search_body: boolean,
    search_headline: boolean,
    suboutline_only: boolean,
    whole_word: boolean
}

/**
 * * Icon path names used in leoNodes for rendering in treeview
 */
export interface Icon {
    light: string;
    dark: string;
}

/**
 * * LeoBody virtual file time information object
 */
export interface BodyTimeInfo {
    ctime: number;
    mtime: number;
}

/**
 * * Body position
 * Used in BodySelectionInfo interface
 */
export interface BodyPosition {
    line: number;
    col: number;
}

/**
 * * LeoBody cursor active position and text selection state, along with gnx
 */
export interface BodySelectionInfo {
    gnx: string;
    // scroll is stored as-is as the 'scrollBarSpot' in Leo
    // ! TEST scroll as single number only (for Leo vertical scroll value)
    scroll: number;
    // scroll: {
    //     start: BodyPosition;
    //     end: BodyPosition;
    // }
    insert: BodyPosition;
    start: BodyPosition;
    end: BodyPosition;
}

/**
 * * Parameter structure used in the 'runSaveFileDialog' equivalent when asking user input
 */
export interface showSaveAsDialogParameters {
    // See TODO in leoAsync.ts
    initialFile: string;
    title: string;
    message: string;
    filetypes: string[];
    defaultExtension: string;
}

/**
 * * Parameter structure used in the 'runAskYesNoDialog' equivalent when asking user input
 */
export interface runAskYesNoDialogParameters {
    ask: string;
    message: string;
    yes_all: boolean;
    no_all: boolean;
}

/**
 * * Parameter structure used in the 'runAskOkDialog' equivalent when showing a warning
 */
export interface runWarnMessageDialogParameters {
    warn: string;
    message: string;
}

/**
 * * Parameter structure for non-blocking info message about detected file changes
 */
export interface runInfoMessageDialogParameters {
    message: string;
}

/**
 * * Used in showAskModalDialog to get answer from user interaction
 */
export interface AskMessageItem extends vscode.MessageItem {
    value: string;
}

/**
 * * Used in switch Leo document to get answer from user interaction
 */
export interface ChooseDocumentItem extends vscode.QuickPickItem {
    value: number;
}

