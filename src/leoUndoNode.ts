import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";
import { LeoUndo } from "./types";

/**
 * * Opened Leo documents tree view node item implementation for usage in a TreeDataProvider
 */
export class LeoUndoNode extends vscode.TreeItem {

    // Context string is checked in package.json with 'when' clauses
    public contextValue: string = "leoUndoNode";

    constructor(
        public label: string,
        public description: string,
        public id: string,
        // public contextValue: string,
        public beadIndex: number
    ) {
        super(label);
    }

}
