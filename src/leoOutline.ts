import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";

export class LeoOutlineProvider implements vscode.TreeDataProvider<LeoNode> {
    // * Leo outline implemented as a tree view with this TreeDataProvider implementation

    private _onDidChangeTreeData: vscode.EventEmitter<LeoNode | undefined> = new vscode.EventEmitter<LeoNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoNode | undefined> = this._onDidChangeTreeData.event;

    private _refreshSingleNodeFlag: boolean = false; // used in leoOutline.ts to check if getTreeItem(element: LeoNode) should fetch from Leo, or return as-is

    constructor(private _leoIntegration: LeoIntegration) { }

    public refreshTreeNode(p_node: LeoNode): void {
        this._refreshSingleNodeFlag = true; // Of course we want to do a real refresh!
        this._onDidChangeTreeData.fire(p_node);
    }

    public refreshTreeRoot(): void {
        console.log('RUNNING refreshTreeRoot, revealType is: ' + this._leoIntegration._revealType);

        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: LeoNode): Thenable<LeoNode> | LeoNode {
        if (this._refreshSingleNodeFlag) {
            this._refreshSingleNodeFlag = false;
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_PNODE, element.apJson)
                .then((p_result) => {
                    const w_node = this._leoIntegration.apToLeoNode(p_result.node, true, element);
                    return element.copyProperties(w_node);
                });
        } else {
            return element;
        }
    }

    public getChildren(element?: LeoNode): Thenable<LeoNode[]> {
        if (this._leoIntegration.fileOpenedReady) {
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_CHILDREN, element ? element.apJson : "null").then((p_result) => {
                return this._leoIntegration.arrayToLeoNodesArray(p_result.nodes);
            });
        } else {
            return Promise.resolve([]); // Defaults to an empty list of children
        }
    }

    public getParent(element: LeoNode): ProviderResult<LeoNode> | null {
        // * This method should be implemented in order to access reveal API.

        // ! This should NOT have to be called because we will only try to 'select' already revealed nodes
        console.log('OH NO! GET PARENT CALLED! on: ', element.label);

        if (this._leoIntegration.fileOpenedReady) {
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_PARENT, element ? element.apJson : "null").then((p_result) => {
                if (p_result.node === null) {
                    return null;
                } else {
                    return this._leoIntegration.apToLeoNode(p_result.node);
                }
            });
        } else {
            return null; // Default gives no parent
        }
    }
}