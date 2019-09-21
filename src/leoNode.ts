import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoOutlineProvider } from "./leoOutline";

export class LeoNode extends vscode.TreeItem {
    public cursorSelection: any; // TODO : Keep body's cursor and selection position from vscode to get it back

    constructor(
        private leoIntegration: LeoIntegration,
        // For access to leo integration's globals (e.g. icons)
        public label: string, // Header
        public collapsibleState: vscode.TreeItemCollapsibleState, // computed in receiver/creator
        public apJson: string, // Key for leo/python side of things
        public cloned: boolean,
        public dirty: boolean,
        public marked: boolean,
        public hasBody: boolean,
        public command?: vscode.Command

    ) {
        super(label, collapsibleState);
        this.command = { title: "select", command: "leointeg.selectNode", arguments: [this] };
    }

    contextValue = "leoNode"; // for use in package.json

    get iconPath(): string {
        // For usage as: return path.join(__filename, "..", "..", "resources", "box00.svg");
        // 8=dirty, 4=cloned, 2=marked, 1=content (iconsInverted is dirty for light/dark inversion)
        let w_icon: number =
            //(+(this.leoIntegration.iconsInverted ? !this.dirty : this.dirty) << 3) |
            (+this.dirty << 3) |
            (+this.cloned << 2) |
            (+this.marked << 1) |
            +this.hasBody;
        return this.leoIntegration.icons[w_icon];
    }

    get tooltip(): string {
        // whole headline as tooltip is useful if outline pane is too narrow
        return `${this.label}`;
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