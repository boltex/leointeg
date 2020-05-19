import * as vscode from "vscode";
import { LeoNode } from "./leoNode";

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
    bodyEditDelay: number;
    leoPythonCommand: string;
    startServerAutomatically: boolean;
    connectToServerAutomatically: boolean;
    connectionAddress: string;
    connectionPort: number;
}

export const enum RevealType {
    // * When refreshing the outline and getting to Leo's selected node
    NoReveal = 0, // In apToLeoNode conversion, If if the global revealType is "NoReveal" and its the selected node, re-use the old id
    Reveal,
    RevealSelect,
    RevealSelectFocus,
    RevealSelectFocusShowBody, // TODO : Should not be part of outline-node's reveal types
    RevealSelectShowBody // TODO : Should not be part of outline-node's reveal types
}

export const enum RefreshType {
    // * Front command refresh type for when coming back from executing the command
    NoRefresh = 0, // only for 'copy-node' so far
    // RefreshNode NOT USED : expand, collapse, select and open aside do not
    RefreshTree,   // Open body if not already opened but no need to refresh if already opened
    RefreshTreeAndBody // undo, redo, execute and others can also modify the current body
}

export interface UserCommand {
    // * Command parameter for when 'stacking' front end commands
    action: string;
    fromOutline: boolean;
    node: LeoNode | undefined;  // We can START a stack with a targeted command,
    refreshType: RefreshType;
}

export interface LeoAction { // pushed and resolved as a stack
    parameter: string; // to pass along with action to python's side
    deferredPayload?: any | undefined; // Used when the action already has a return value ready but is also waiting for python's side
    resolveFn: (result: any) => void; // call that with an answer from python's (or other) side
    rejectFn: (reason: any) => void; // call if problem is encountered
}

export interface LeoLogEntry {
    log: string;
}

export interface ArchivedPosition {
    // * from Leo's leoflexx.py
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

export interface LeoBridgePackage { // TODO : Document
    id: number;
    [key: string]: any;
}

export interface Icon {
    // * Icon path names used in leoNodes for rendering in treeview
    light: string;
    dark: string;
}

export interface AskPickItem extends vscode.QuickPickItem {
    value: string;
}

export interface AskMessageItem extends vscode.MessageItem {
    value: string;
}