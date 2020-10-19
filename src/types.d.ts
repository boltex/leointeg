import * as vscode from "vscode";
import { LeoNode } from "./leoNode";

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
    invertNodeContrast: boolean;
    leoPythonCommand: string;
    startServerAutomatically: boolean;
    connectToServerAutomatically: boolean;
    connectionAddress: string;
    connectionPort: number;
}

/**
 * * Structure for configuration settings changes used along with welcome/settings webview.
 */
export interface ConfigSetting {
    code: string;
    value: any;
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
    states?: boolean; // States needs refresh (changed, canUndo, canRedo, canDemote, canPromote, canDehoist)
    buttons?: boolean; // Buttons needs refresh
    documents?: boolean; // Documents needs refresh
}

/**
 * * Stackable front end commands
 */
export interface UserCommand {
    action: string; // String from Constants.LEOBRIDGE, which are commands for leobridgeserver.py
    node?: LeoNode | undefined;  // We can START a stack with a targeted command
    text?: string | undefined; // If a string is required, for headline, etc.
    refreshType: ReqRefresh; // Minimal refresh level required by this command
    fromOutline: boolean; // Focus back on outline instead of body
    keepSelection?: boolean; // Should bring back selection on node prior to command
}

/**
 * * Object container for parameters of leoIntegration's "apply-selected-node-to-body" method
 */
export interface ShowBodyParam {
    node: LeoNode,
    aside: boolean,
    showBodyKeepFocus: boolean,
    force_open?: boolean
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
 * * Returned info about currently opened and editing document
 * Used after opening, switching or setting the opened document
 */
export interface LeoBridgePackageOpenedInfo {
    total: number;
    filename: string;
    node: ArchivedPosition;
}

/**
 * * Main interface for JSON sent from Leo back to leoInteg
 */
export interface LeoBridgePackage {
    id: number; // TODO : Could be used for error checking
    // * Each of those top level member is an answer from a "Constants.LEOBRIDGE" command
    allGnx?: string[];
    bodyLength?: number;
    bodyData?: string;
    bodyStates?: {
        language: string;
        selection: BodySelectionInfo;
    }
    node?: ArchivedPosition;
    nodes?: ArchivedPosition[];
    states?: LeoPackageStates;
    closed?: {
        total: number;
        filename?: string;
        node?: ArchivedPosition;
    },
    opened?: LeoBridgePackageOpenedInfo,
    setOpened?: LeoBridgePackageOpenedInfo,
    openedFiles?: {
        index: number;
        files: LeoDocument[];
    }
    buttons?: LeoButton[];
    commands?: MinibufferCommand[];
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
    gnx: string;
    ctime: number;
    mtime: number;
}

/**
 * * LeoBody cursor active position and text selection state, along with gnx
 */
export interface BodySelectionInfo {
    gnx: string;
    activeLine: number;
    activeCol: number;
    startLine: number;
    startCol: number;
    endLine: number;
    endCol: number;
}

/**
 * * Parameter structure used in the 'runSaveFileDialog' equivalent when asking user input
 */
export interface showSaveAsDialogParameters {
    // See TODO in leoAsync.ts
    "initialFile": string;
    "title": string;
    "message": string;
    "filetypes": string[];
    "defaultExtension": string;
}

/**
 * * Parameter structure used in the 'runAskYesNoDialog' equivalent when asking user input
 */
export interface runAskYesNoDialogParameters {
    "ask": string;
    "message": string;
    "yes_all": boolean;
    "no_all": boolean;
}

/**
 * * Parameter structure used in the 'runAskOkDialog' equivalent when showing a warning
 */
export interface runWarnMessageDialogParameters {
    "warn": string;
    "message": string;
}

/**
 * * Parameter structure for non-blocking info message about detected file changes
 */
export interface runInfoMessageDialogParameters {
    "message": string;
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

/**
 * * Used by the minibuffer command pallette
 * Acquired from the getCommands method in leobridgeserver.py
 */
export interface MinibufferCommand extends vscode.QuickPickItem {
    func: string;
}
