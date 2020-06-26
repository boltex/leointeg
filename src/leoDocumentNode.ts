import * as vscode from "vscode";
import { Constants } from "./constants";


export class LeoDocumentNode extends vscode.TreeItem {

    constructor(
        public label: string, // Node headline
        public collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        // this.command = {        };
    }


}