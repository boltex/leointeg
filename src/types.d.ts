import * as vscode from "vscode";
import { LeoNode } from "./leoNode";

/**
 * * Types of the various JSON configuration keys such as treeKeepFocus, defaultReloadIgnore, etc.
 */
export interface ConfigMembers {
    checkForChangeExternalFiles: string;
    defaultReloadIgnore: string;
    treeKeepFocus: boolean;
    treeKeepFocusWhenAside: boolean;
    statusBarString: string;
    statusBarColor: string;
    treeInExplorer: boolean;
    showOpenAside: boolean;
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
 * * When refreshing the outline and getting to Leo's selected node
 */
export const enum RevealType {
    NoReveal = 0, // In apToLeoNode conversion, If if the global revealType is "NoReveal" and its the selected node, re-use the old id
    Reveal,
    RevealSelect,
    RevealSelectFocus
}

/**
 * * User command's refresh-type for when coming back from executing the command
 */
export const enum RefreshType {
    NoRefresh = 0, // only for 'copy-node' so far
    RefreshTree,   // Refresh tree and show body pane if not already opened, but no need to refresh it
    RefreshTreeAndBody // undo, redo, execute and others can also modify the current body, so refresh the filesystem gnx too
}

/**
 * * Command parameter for when 'stacking' front end commands
 */
export interface UserCommand {
    action: string;
    node?: LeoNode | undefined;  // We can START a stack with a targeted command
    providedHeadline?: string | undefined;
    refreshType: RefreshType;
    fromOutline: boolean;
}

/**
 * * Actions to be performed by Leo, pushed and resolved as a stack
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
    stack: {
        gnx: string;        // stack_v.gnx
        childIndex: number; // stack_childIndex
        headline: string;   // stack_v.h
    }[];                    // for (stack_v, stack_childIndex) in p.stack]
}

/**
 * * Main JSON information package format used between leointeg and Leo
 */
export interface LeoBridgePackage {
    id: number;
    // TODO : ADD ALL POSSIBLE (FACULTATIVE) KEYS FROM leobridgeserver.py (should be in constants.ts)
    [key: string]: any;
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