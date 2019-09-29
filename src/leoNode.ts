import * as vscode from "vscode";
import { LeoIcons } from "./leoIcons";

export class LeoNode extends vscode.TreeItem {
    public cursorSelection: any; // TODO : Keep body's cursor and selection position from vscode to get it back

    constructor(
        public label: string, // Header
        public gnx: string,
        public collapsibleState: vscode.TreeItemCollapsibleState, // computed in receiver/creator
        public apJson: string, // Key for leo/python side of things
        public cloned: boolean,
        public dirty: boolean,
        public marked: boolean,
        public hasBody: boolean

    ) {
        super(label, collapsibleState);
        this.command = {
            command: 'leointeg.selectTreeNode',
            title: '',
            arguments: [this]
        };
    }

    contextValue = "leoNode"; // for use in package.json

    get iconPath(): string {
        // From Leo's leoNodes.py computeIcon function
        // 1=has Body, 2=marked, 4=cloned, 8=dirty (iconsInverted is dirty for light/dark inversion)
        let w_icon: number =
            (+this.dirty << 3) | // flip this bit with this.leoIntegration.iconsInverted
            (+this.cloned << 2) |
            (+this.marked << 1) |
            +this.hasBody;
        return LeoIcons.icons[w_icon];
    }

    get tooltip(): string {
        // whole headline as tooltip is useful if outline pane is too narrow
        return this.label;
    }

    getCursorSelection(): any {
        return this.cursorSelection;
    }

    setCursorSelection(p_cursorSelection: any): void {
        this.cursorSelection = p_cursorSelection;
    }

    // * some smaller grayed-out text acompanying the main label
    // get description(): string {
    //   return "a desc";
    // }
}