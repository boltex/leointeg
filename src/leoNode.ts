import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";
import { ArchivedPosition, Icon } from "./types"; // ArchivedPosition included to help debug

/**
 * * Implementation of tree nodes for usage in a TreeDataProvider
 */
export class LeoNode extends vscode.TreeItem {

    public contextValue: string; // * Context string is checked in package.json with 'when' clauses

    public isRoot: boolean = false; // * for hoist/dehoist context flags purposes

    constructor(
        public label: string, // Node headline
        public gnx: string,
        public collapsibleState: vscode.TreeItemCollapsibleState, // Computed in receiver/creator
        public apJson: string, // Key for leo/python side of things
        public childIndex: number, // For debugging purposes
        public cloned: boolean,
        public dirty: boolean,
        public marked: boolean,
        public atFile: boolean,
        public hasBody: boolean,
        public u: any,
        private _leoIntegration: LeoIntegration,
        private _id: string
    ) {
        super(label, collapsibleState);
        this.contextValue = this._getNodeContextValue();
        this.command = {
            command: Constants.COMMANDS.SELECT_NODE,
            title: '',
            arguments: [this]
        };
    }

    // * TO HELP DEBUG
    // get description(): string {
    //     // * some smaller grayed-out text accompanying the main label
    //     const w_ap: ArchivedPosition = JSON.parse(this.apJson);
    //     return "child:" + w_ap.childIndex + " lvl:" + w_ap.level + " gnx:" + w_ap.gnx;
    // }

    // get description(): string {
    //     // * some smaller grayed-out text accompanying the main label
    //     return "id:" + this.id;
    // }

    /**
     * * Set this node as the root for hoist/dehoist context flags purposes
     */
    public setRoot(): void {
        this.isRoot = true;
        this._leoIntegration.leoStates.leoRoot = true; // Set this special global 'selected node' flag
        this.contextValue = this._getNodeContextValue();
    }

    private _getNodeContextValue(): string {
        // Start it with 'leoNodeMarked' or 'leoNodeUnmarked'
        let w_contextValue = Constants.CONTEXT_FLAGS.NODE_UNMARKED;
        if (this.marked) {
            w_contextValue = Constants.CONTEXT_FLAGS.NODE_MARKED;
        }
        // then append 'leoNodeAtFile' to existing if needed
        if (this.atFile) {
            w_contextValue += Constants.CONTEXT_FLAGS.NODE_ATFILE;
        }
        // then append 'leoNodeCloned' to existing if needed
        if (this.cloned) {
            w_contextValue += Constants.CONTEXT_FLAGS.NODE_CLONED;
        }
        // and finally, check for 'root' too
        if (this.isRoot) {
            w_contextValue += Constants.CONTEXT_FLAGS.NODE_ROOT;
        } else {
            w_contextValue += Constants.CONTEXT_FLAGS.NODE_NOT_ROOT;
        }
        return w_contextValue;
    }

    // @ts-ignore
    public get iconPath(): Icon {
        // From Leo's leoNodes.py computeIcon function
        // 1=has Body, 2=marked, 4=cloned, 8=dirty
        let w_dirty: boolean = this._leoIntegration.config.invertNodeContrast ? !this.dirty : this.dirty;
        let w_icon: number =
            (+w_dirty << 3) |
            (+this.cloned << 2) |
            (+this.marked << 1) |
            +this.hasBody;
        return this._leoIntegration.nodeIcons[w_icon];
    }

    // Optional id for the tree item that has to be unique across tree.
    // The id is used to preserve the selection and expansion state of the tree item.
    // If not provided, an id is generated using the tree item's label.
    // Note that when labels change, ids will change and that selection and expansion state cannot be kept stable anymore.
    // @ts-ignore
    public get id(): string { return this._id; }

    // @ts-ignore
    public get description(): string {
        // * some smaller grayed-out text accompanying the main label
        if (this.u) {
            return "\u{1F4CE} (" + Object.keys(this.u).length + ")";
        } else {
            // return "id:" + this.id; // ! debug test
            // return "gnx:" + this.gnx; // ! debug test
            return ""; // Falsy will not be shown
        }
    }

    // @ts-ignore
    public get tooltip(): string {
        if (this.u) {
            //  "\ntotal keys is :" + Object.keys(this.u).length
            return this.label + "\n" +
                JSON.stringify(this.u, undefined, 2);
        } else {
            return this.label; // * Whole headline as tooltip
        }
    }

}
