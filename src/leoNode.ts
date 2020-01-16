import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { ArchivedPosition } from "./types"; // Kept in case we need to log from 'ap' sub objects

export class LeoNode extends vscode.TreeItem {
    public cursorSelection: any; // TODO : Keep body's cursor and selection position from vscode to get it back
    public contextValue: string;

    constructor(
        public label: string, // Tree node header
        public gnx: string,
        public collapsibleState: vscode.TreeItemCollapsibleState, // Computed in receiver/creator
        public apJson: string, // Key for leo/python side of things
        public cloned: boolean,
        public dirty: boolean,
        public marked: boolean,
        public hasBody: boolean,
        private _leoIntegration: LeoIntegration
    ) {
        super(label, collapsibleState);
        if (marked) {
            this.contextValue = "leoNodeMarked"; // For use in package.json
        } else {
            this.contextValue = "leoNode"; // For use in package.json
        }
        this.command = {
            command: 'leointeg.selectTreeNode',
            title: '',
            arguments: [this]
        };
    }

    public copyProperties(p_node: LeoNode): LeoNode {
        this.label = p_node.label;
        this.gnx = p_node.gnx;
        this.collapsibleState = p_node.collapsibleState;
        this.apJson = p_node.apJson;
        this.cloned = p_node.cloned;
        this.dirty = p_node.dirty;
        this.marked = p_node.marked;
        this.hasBody = p_node.hasBody;
        this.contextValue = p_node.contextValue;
        return this;
    }

    public get iconPath(): { light: string; dark: string } {
        // From Leo's leoNodes.py computeIcon function
        // 1=has Body, 2=marked, 4=cloned, 8=dirty
        let w_dirty: boolean = this._leoIntegration.config.invertNodeContrast ? !this.dirty : this.dirty;
        let w_icon: number =
            (+w_dirty << 3) |
            (+this.cloned << 2) |
            (+this.marked << 1) |
            +this.hasBody;

        return this._leoIntegration.icons[w_icon];
    }

    public get tooltip(): string {
        // * Whole headline as tooltip is useful if it is wider than the outline pane
        return this.label;
        // const w_ap: ArchivedPosition = JSON.parse(this.apJson);
        // return "child:" + w_ap.childIndex + " gnx:" + w_ap.gnx + " lvl:" + w_ap.level;
    }

    public getCursorSelection(): any {
        return this.cursorSelection;
    }

    public setCursorSelection(p_cursorSelection: any): void {
        this.cursorSelection = p_cursorSelection;
    }

    // * some smaller grayed-out text accompanying the main label
    // get description(): string {
    //   return "here's a description";
    // }
}