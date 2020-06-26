import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoDocumentNode } from "./leoDocumentNode";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";

/**
 * * Leo outline implemented as a tree view with this TreeDataProvider implementation
 */
export class LeoOutlineProvider implements vscode.TreeDataProvider<LeoDocumentNode> {


    private _onDidChangeTreeData: vscode.EventEmitter<LeoDocumentNode | undefined> = new vscode.EventEmitter<LeoDocumentNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoDocumentNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private _leoIntegration: LeoIntegration) { }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: LeoDocumentNode): Thenable<LeoDocumentNode> | LeoDocumentNode {
        return element;
    }

    public getChildren(element?: LeoDocumentNode): Thenable<LeoDocumentNode[]> {
        return Promise.resolve([]);
    }

    public getParent(element: LeoDocumentNode): ProviderResult<LeoDocumentNode> | null {
        return null;
    }
}