import * as vscode from "vscode";

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
    askForExitConfirmationIfDirty: boolean;


    collapseAllShortcut: boolean;
    activityViewShortcut: boolean;
    goAnywhereShortcut: boolean;

    showUnlOnStatusBar: boolean,

    treeInExplorer: boolean;

    showFileOnOutline: boolean;
    showHoistDehoistOnOutline: boolean;
    showPrevNextOnOutline: boolean;
    showPromoteDemoteOnOutline: boolean;
    showRecentFilesOnOutline: boolean;
    showSettingsOnOutline: boolean;
    showShowLogOnOutline: boolean;
    showUndoRedoOnOutline: boolean;

    showEditOnNodes: boolean;
    showAddOnNodes: boolean;
    showMarkOnNodes: boolean;
    showCloneOnNodes: boolean;
    showCopyOnNodes: boolean;
    showBranchInOutlineTitle: boolean;

    invertNodeContrast: boolean;
    leoEditorPath: string;
    leoPythonCommand: string;
    startServerAutomatically: boolean;
    connectToServerAutomatically: boolean;
    connectionAddress: string;
    connectionPort: number;

    setDetached: boolean;
    limitUsers: number

    uAsNumber?: boolean; // 'true' flag starting at leoInteg 1.0.8
}

/**
 * * Structure for configuration settings changes used along with welcome/settings webview.
 */
export interface ConfigSetting {
    code: string;
    value: any;
}

export interface Version {
    major: number;
    minor: number;
    patch: number;
}

/**
 * * Location of focus to be set when current/last command is resolved
 */
export const enum Focus {
    NoChange = 0, // Stays on goto pane, or other current panel.
    Body, // Forces body to appear, refresh leaves focus on body.
    Outline, // Forces outline to appear, refresh leaves focus on Outline.
    Goto
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
    excludeDetached?: boolean; // Body needs refresh EXCLUDE DETACHED
    scroll?: boolean; // Body needs to scroll to selection
    states?: boolean; // States needs refresh (changed, canUndo, canRedo, canDemote, canPromote, canDehoist)
    buttons?: boolean; // Buttons needs refresh
    documents?: boolean; // Documents needs refresh
    goto?: boolean; // Goto pane needs refresh
}

/**
 * * Stackable front end commands
 */
export interface UserCommand {
    action: string; // String from Constants.LEOBRIDGE, which are commands for leoserver.py
    node?: ArchivedPosition | undefined;  // We can START a stack with a targeted command
    name?: string | undefined; // If a string is required, for headline, etc.
    refreshType: ReqRefresh; // Minimal refresh level required by this command
    finalFocus: Focus; // Focus back on outline instead of body
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
    // * From server's _p_to_ap : childIndex, gnx and stack
    childIndex: number;     // p._childIndex
    gnx: string;            // p.v.gnx
    stack: {
        gnx: string;        // stack_v.gnx
        childIndex: number; // stack_childIndex
    }[];                    // for (stack_v, stack_childIndex) in p.stack]

    // * Attributes for UI appearance
    headline: string;       // p.h
    cloned: boolean;        // p.isCloned()
    dirty: boolean;         // p.isDirty()
    expanded: boolean;      // p.isExpanded()
    marked: boolean;        // p.isMarked()
    atFile: boolean         // p.isAnyAtFileNode():
    selected: boolean;      // p == commander.p
    hasBody: boolean;       // bool(p.b),
    hasChildren: boolean;   // p.hasChildren()

    // * ALPHA FEATURE : Only If called with get_structure instead of get_children
    children?: ArchivedPosition[];

    // * ALPHA FEATURE
    _isRoot?: boolean; // Added front side by leoInteg, for internal usage
    _lastBodyData?: string;

    // * unknown attributes
    u?: number;             // User-attributes displayed qty
    nodeTags?: number;      // 'tags' user-attributes displayed qty

}

/**
 * * Object sent back from leoInteg's 'getStates' command
 */
export interface LeoPackageStates {

    commanderId: string; // Commander's python 'id'.
    changed: boolean; // Leo document has changed (is dirty)

    canUndo: boolean; // Leo document can undo the last operation done
    canRedo: boolean; // Leo document can redo the last operation 'undone'

    canGoBack: boolean;
    canGoNext: boolean;

    canDemote: boolean; // Currently selected node can have its siblings demoted
    canPromote: boolean; // Currently selected node can have its children promoted

    canDehoist: boolean; // There least least one entry on stack
    canHoist: boolean; // c.p is not root position and not already the hoisted node

    inChapter: boolean; // cc.inChapter returned true
    topHoistChapter: boolean; // Has entry on stack and top begins with '@chapter'

}

/**
 * * Main interface for JSON sent from Leo back to leoInteg
 */
export interface LeoBridgePackage {
    // * Common to all result packages
    id: number;
    // * Possible answers from a "Constants.LEOBRIDGE" command
    leoID?: string;
    valid?: boolean;
    gnx?: string[]; // get_all_gnx
    len?: number; // get_body_length
    body?: string; // get_body
    buttons?: LeoButton[]; // get_buttons
    branch?: string;
    commit?: string;
    chapters?: string[], // get_chapters
    history?: string[],
    navList?: LeoGoto[]; // get_goto
    navText?: string; // get_goto
    messages?: string[]; // get_goto
    navOptions?: { isTag: boolean, showParents: boolean }; // get_goto
    commands?: vscode.QuickPickItem[]; // getCommands
    commander?: {
        changed: boolean,
        fileName: string;
        id: string;
    }
    "position-data-list"?: ArchivedPosition[];
    "position-data-dict"?: { [key: string]: ArchivedPosition };
    filename?: string; // set_opened_file, open_file(s), ?close_file
    files?: LeoDocument[]; // get_all_open_commanders
    focus?: string; // find_next, find_previous
    found?: boolean; // find_next, find_previous
    use_nav_pane?: boolean;
    range?: [number, number]; // find_next, find_previous
    index?: number; // get_all_open_commanders
    language?: string; // get_body_states
    wrap?: boolean; // get_body_states
    tabWidth?: number | boolean; // get_body_states either the tabwidth or falsy
    node?: ArchivedPosition; // get_parent, set_opened_file, open_file(s), ?close_file
    children?: ArchivedPosition[]; // get_children
    searchSettings?: LeoGuiFindTabManagerSettings; // get_search_settings
    selection?: BodySelectionInfo; // get_body_states
    states?: LeoPackageStates; // get_ui_states
    string?: string; // from cut / copy outline
    total?: number; // set_opened_file, open_file(s), close_file
    ua?: any;
    version?: string;
    major?: number;
    minor?: number;
    patch?: number;
    bead?: number;
    undos?: string[];
    unl?: string;
}

/**
 * * Leo document structure used in the 'Opened Leo Documents' tree view provider sent back by the server
 */
export interface LeoDocument {
    id: string; // Commander's id
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
    rclicks?: RClick[];
    index: string; // STRING KEY
}

export type TGotoTypes = "tag" | "headline" | "body" | "parent" | "generic";

export interface LeoGoto {
    key: number; // id from python
    h: string;
    t: TGotoTypes;
}

export const enum LeoGotoNavKey {
    prev = 0,
    next,
    first,
    last
}

/**
 * * LeoInteg's Enum type for the search scope radio buttons of the find panel.
 */
export const enum LeoSearchScope {
    entireOutline = 0,
    subOutlineOnly,
    nodeOnly,
    fileOnly
}

/**
 * * LeoInteg search settings structure for use with the 'find' webview
 */
export interface LeoSearchSettings {
    // Nav options
    navText: string;
    isTag: boolean;
    showParents: boolean;
    searchOptions: number;
    // Find/change strings...
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
    searchScope: LeoSearchScope; // 0, 1, 2  or 3 for outline, sub-outline, node-only or file-only.
}

/**
 * * Leo's GUI search settings internal structure
 */
export interface LeoGuiFindTabManagerSettings {
    // Nav options
    nav_text: string;
    is_tag: boolean;
    show_parents: boolean;
    search_options: number;
    //Find/change strings...
    find_text: string,
    change_text: string,
    // Find options...
    ignore_case: boolean,
    mark_changes: boolean,
    mark_finds: boolean,
    node_only: boolean,
    file_only: boolean,
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
    light: string | vscode.Uri;
    dark: string | vscode.Uri;
}

/**
 * * LeoBody virtual file time information object
 */
export interface BodyTimeInfo {
    ctime: number;
    mtime: number;
    lastBodyLength?: number;
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
    commanderId?: string,
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

export interface ChosePositionItem extends vscode.QuickPickItem {
    position: ArchivedPosition;
}

/**
 * * Used in switch Leo document to get answer from user interaction
 */
export interface ChooseDocumentItem extends vscode.QuickPickItem {
    value: number;
}

/**
 * * Used to select a button's rclick by index
 */
export interface ChooseRClickItem extends vscode.QuickPickItem {
    index: number;
    rclick?: RClick;
}

/**
 * * Returned from Leo with buttons data
 */
export interface RClick {
    name: string;
    children: RClick[];
}

export type UnlType = 'shortGnx' | 'fullGnx' | 'shortLegacy' | 'fullLegacy';

