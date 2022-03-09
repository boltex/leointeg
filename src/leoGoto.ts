import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoGotoNode } from "./leoGotoNode";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";
import { LeoGoto } from "./types";

/**
 * * Opened Leo documents shown as a list with this TreeDataProvider implementation
 */
export class LeoGotoProvider implements vscode.TreeDataProvider<LeoGotoNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<LeoGotoNode | undefined> = new vscode.EventEmitter<LeoGotoNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoGotoNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private _leoIntegration: LeoIntegration) { }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: LeoGotoNode): Thenable<LeoGotoNode> | LeoGotoNode {
        return element;
    }

    public getChildren(element?: LeoGotoNode): Thenable<LeoGotoNode[]> {

        // if called with element, or not ready, give back empty array as there won't be any children
        if (this._leoIntegration.leoStates.fileOpenedReady && !element) {
            // ! TEMPORARY TEST !
            return Promise.resolve([]); // Defaults to an empty list of children

        } else {
            return Promise.resolve([]); // Defaults to an empty list of children
        }
    }

    public getParent(element: LeoGotoNode): ProviderResult<LeoGotoNode> | null {
        // Leo documents are just a list, as such, entries are always child of root, so return null
        return null;
    }

}
