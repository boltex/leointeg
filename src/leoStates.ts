import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { LeoPackageStates } from "./types";

/**
 * * Global states service
 * Holds state flags used to restrict command availability and icon visibility
 * Changes UI by changing vscode's context variables
 */
export class LeoStates {

    // * Currently establishing connection to a server
    private _leoConnecting: boolean = false;
    get leoConnecting(): boolean {
        return this._leoConnecting;
    }
    set leoConnecting(p_value: boolean) {
        this._leoConnecting = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.CONNECTING, p_value);
    }

    // * Finished startup check for server-start and auto-connect
    private _leoStartupFinished: boolean = false;
    get leoStartupFinished(): boolean {
        return this._leoStartupFinished;
    }
    set leoStartupFinished(p_value: boolean) {
        this._leoStartupFinished = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.STARTUP_FINISHED, p_value);
    }

    // * Connected to a Leo bridge server
    private _leoBridgeReady: boolean = false;
    get leoBridgeReady(): boolean {
        return this._leoBridgeReady;
    }
    set leoBridgeReady(p_value: boolean) {
        this._leoBridgeReady = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.BRIDGE_READY, p_value);
    }

    private _leoIDMissing: boolean = false;
    get leoIDMissing(): boolean {
        return this._leoIDMissing;
    }
    set leoIDMissing(p_value: boolean) {
        this._leoIDMissing = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEOID_MISSING, p_value);
    }

    // * A Leo file is opened
    private _fileOpenedReady: boolean = false; // Sets context flag along with treeview title
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

    // * Currently opened Leo file path and name, empty string if new unsaved file.
    private _leoOpenedFileName: string = "";
    get leoOpenedFileName(): string {
        return this._leoOpenedFileName;
    }
    set leoOpenedFileName(p_name: string) {
        if (p_name && p_name.length) {
            this._leoOpenedFileName = p_name;
            utils.setContext(Constants.CONTEXT_FLAGS.TREE_TITLED, true);
        } else {
            this._leoOpenedFileName = "";
            utils.setContext(Constants.CONTEXT_FLAGS.TREE_TITLED, false);
        }
    }

    // * 'states' flags for currently opened tree view
    private _leoChanged: boolean = false;
    get leoChanged(): boolean {
        return this._leoChanged;
    }
    set leoChanged(p_value: boolean) {
        if (this._leoChanged !== p_value) {
            // Refresh Documents Panel
            this._leoIntegration.refreshDocumentsPane();
        }
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

    private _leoCanGoBack: boolean = false;
    get leoCanGoBack(): boolean {
        return this._leoCanGoBack;
    }
    set leoCanGoBack(p_value: boolean) {
        this._leoCanGoBack = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_CAN_BACK, p_value);
    }

    private _leoCanGoNext: boolean = false;
    get leoCanGoNext(): boolean {
        return this._leoCanGoNext;
    }
    set leoCanGoNext(p_value: boolean) {
        this._leoCanGoNext = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_CAN_NEXT, p_value);
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

    private _leoCanHoist: boolean = false;
    get leoCanHoist(): boolean {
        return this._leoCanHoist;
    }
    set leoCanHoist(p_value: boolean) {
        this._leoCanHoist = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_CAN_HOIST, p_value);
    }

    private _leoCanDehoist: boolean = false;
    get leoCanDehoist(): boolean {
        return this._leoCanDehoist;
    }
    set leoCanDehoist(p_value: boolean) {
        this._leoCanDehoist = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_CAN_DEHOIST, p_value);
    }

    private _leoInChapter: boolean = false;
    get leoInChapter(): boolean {
        return this._leoInChapter;
    }
    set leoInChapter(p_value: boolean) {
        this._leoInChapter = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_IN_CHAPTER, p_value);
    }
    private _leoTopHoistChapter: boolean = false;
    get leoTopHoistChapter(): boolean {
        return this._leoTopHoistChapter;
    }
    set leoTopHoistChapter(p_value: boolean) {
        this._leoTopHoistChapter = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_TOP_HOIST_CHAPTER, p_value);
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

    private _leoChild: boolean = false; // Has child
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

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) { }

    public setSelectedNodeFlags(p_node: LeoNode): void {
        this.leoCanHoist = !p_node.isRoot; // * ALSO set in setRoot of LeoNode class

        this.leoMarked = p_node.marked;
        this.leoCloned = p_node.cloned;
        this.leoDirty = p_node.dirty;
        this.leoEmpty = !p_node.hasBody;
        this.leoChild = !(p_node.collapsibleState === vscode.TreeItemCollapsibleState.None);
        this.leoAtFile = p_node.atFile;
    }

    public setLeoStateFlags(p_states: LeoPackageStates): void {
        this.leoChanged = p_states.changed; // Documents will be refresh if this changes

        this.leoCanUndo = p_states.canUndo;
        this.leoCanRedo = p_states.canRedo;

        this.leoCanGoBack = p_states.canGoBack;
        this.leoCanGoNext = p_states.canGoNext;

        this.leoCanDemote = p_states.canDemote;
        this.leoCanPromote = p_states.canPromote;

        this.leoCanHoist = p_states.canHoist;
        this.leoCanDehoist = p_states.canDehoist;

        this.leoInChapter = p_states.inChapter;
        this.leoTopHoistChapter = p_states.topHoistChapter;

    }
}
