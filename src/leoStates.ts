import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { LeoPackageStates } from "./types";

/**
 * * Holds state flags used to restrict command and icon availability
 */
export class LeoStates {

    private _leoBridgeReady: boolean = false; // Used along with executeCommand 'setContext' with Constants.CONTEXT_FLAGS.BRIDGE_READY
    get leoBridgeReady(): boolean {
        return this._leoBridgeReady;
    }
    set leoBridgeReady(p_value: boolean) {
        this._leoBridgeReady = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.BRIDGE_READY, p_value);
    }

    private _fileOpenedReady: boolean = false; // Used along with executeCommand 'setContext' with Constants.CONTEXT_FLAGS.TREE_OPENED
    get fileOpenedReady(): boolean {
        return this._fileOpenedReady;
    }
    set fileOpenedReady(p_value: boolean) {
        this._fileOpenedReady = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.TREE_OPENED, p_value);
        this._leoIntegration.setTreeViewTitle(
            p_value ? Constants.GUI.TREEVIEW_TITLE : Constants.GUI.TREEVIEW_TITLE_INTEGRATION
        );
    }

    // * 'states' flags for currently opened tree view
    private _leoChanged: boolean = false;
    get leoChanged(): boolean {
        return this._leoChanged;
    }
    set leoChanged(p_value: boolean) {
        this._leoChanged = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_CHANGED, p_value);
    }

    private _leoCanUndo: boolean = false;
    get leoCanUndo(): boolean {
        return this._leoCanUndo;
    }
    set leoCanUndo(p_value: boolean) {
        this._leoCanUndo = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_CAN_UNDO, p_value);
    }

    private _leoCanRedo: boolean = false;
    get leoCanRedo(): boolean {
        return this._leoCanRedo;
    }
    set leoCanRedo(p_value: boolean) {
        this._leoCanRedo = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_CAN_REDO, p_value);
    }

    private _leoCanDemote: boolean = false;
    get leoCanDemote(): boolean {
        return this._leoCanDemote;
    }
    set leoCanDemote(p_value: boolean) {
        this._leoCanDemote = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_CAN_DEMOTE, p_value);
    }

    private _leoCanPromote: boolean = false;
    get leoCanPromote(): boolean {
        return this._leoCanPromote;
    }
    set leoCanPromote(p_value: boolean) {
        this._leoCanPromote = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_CAN_PROMOTE, p_value);
    }

    private _leoCanDehoist: boolean = false;
    get leoCanDehoist(): boolean {
        return this._leoCanDehoist;
    }
    set leoCanDehoist(p_value: boolean) {
        this._leoCanDehoist = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_CAN_DEHOIST, p_value);
    }

    // * 'states' flags about current selection, for visibility and commands availability
    private _leoMarked: boolean = false;
    get leoMarked(): boolean {
        return this._leoMarked;
    }
    set leoMarked(p_value: boolean) {
        this._leoMarked = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_MARKED, p_value);
    }

    private _leoCloned: boolean = false;
    get leoCloned(): boolean {
        return this._leoCloned;
    }
    set leoCloned(p_value: boolean) {
        this._leoCloned = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_CLONE, p_value);
    }

    private _leoDirty: boolean = false;
    get leoDirty(): boolean {
        return this._leoDirty;
    }
    set leoDirty(p_value: boolean) {
        this._leoDirty = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_DIRTY, p_value);
    }

    private _leoEmpty: boolean = false;
    get leoEmpty(): boolean {
        return this._leoEmpty;
    }
    set leoEmpty(p_value: boolean) {
        this._leoEmpty = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_EMPTY, p_value);
    }

    private _leoChild: boolean = false;
    get leoChild(): boolean {
        return this._leoChild;
    }
    set leoChild(p_value: boolean) {
        this._leoChild = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_CHILD, p_value);
    }

    private _leoAtFile: boolean = false;
    get leoAtFile(): boolean {
        return this._leoAtFile;
    }
    set leoAtFile(p_value: boolean) {
        this._leoAtFile = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_ATFILE, p_value);
    }

    // * Special is-root 'state' flag about current selection, for visibility and commands availability
    private _leoRoot: boolean = false;
    get leoRoot(): boolean {
        return this._leoRoot;
    }
    set leoRoot(p_value: boolean) {
        this._leoRoot = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_ROOT, p_value);
    }

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) { }

    public selectedNodeFlags(p_node: LeoNode): void {
        this.leoRoot = false; // * RESET the root flag : It is set by vscode instead right after getting list of children for root of outline
        this.leoMarked = p_node.marked;
        this.leoCloned = p_node.cloned;
        this.leoDirty = p_node.dirty;
        this.leoEmpty = !p_node.hasBody;
        this.leoChild = !(p_node.collapsibleState === vscode.TreeItemCollapsibleState.None);
        this.leoAtFile = p_node.atFile;
    }

    public leoStateFlags(p_states: LeoPackageStates): void {
        this.leoChanged = p_states.changed;
        this.leoCanUndo = p_states.canUndo;
        this.leoCanRedo = p_states.canRedo;
        this.leoCanDemote = p_states.canDemote;
        this.leoCanPromote = p_states.canPromote;
        this.leoCanDehoist = p_states.canDehoist;
    }
}