import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";

/**
 * * Leo outline implemented as a tree view with this TreeDataProvider implementation
 */
export class LeoOutlineProvider implements vscode.TreeDataProvider<LeoNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<LeoNode | undefined> = new vscode.EventEmitter<LeoNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoNode | undefined> = this._onDidChangeTreeData.event;

    private _refreshSingleNodeFlag: boolean = false; // used in leoOutline.ts to check if getTreeItem(element: LeoNode) should fetch from Leo, or return as-is

    constructor(private _leoIntegration: LeoIntegration) { }

    /**
     * * Refresh a single node
     * @param p_node The outline's node itself as a LeoNode instance
     */
    public refreshTreeNode(p_node: LeoNode): void {
        this._refreshSingleNodeFlag = true; // We want to do a real refresh, not just giving back the same we've got as input in getTreeItem
        this._onDidChangeTreeData.fire(p_node);
    }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: LeoNode): Thenable<LeoNode> | LeoNode {
        if (this._refreshSingleNodeFlag) {
            this._refreshSingleNodeFlag = false;
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_PNODE, element.apJson)
                .then((p_package) => {
                    const w_node = this._leoIntegration.apToLeoNode(p_package.node, true, element);
                    return element.copyProperties(w_node);
                });
        } else {
            return element;
        }
    }

    public getChildren(element?: LeoNode): Thenable<LeoNode[]> {
        if (this._leoIntegration.fileOpenedReady) {
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_CHILDREN, element ? element.apJson : "null").then((p_package) => {
                return this._leoIntegration.arrayToLeoNodesArray(p_package.nodes);
            });
        } else {
            return Promise.resolve([]); // Defaults to an empty list of children
        }
    }

    public getParent(element: LeoNode): ProviderResult<LeoNode> | null {
        // * This method should be implemented in order to access reveal API.
        // ! But it should NOT have to be called because we will only try to 'select' already revealed nodes

        console.log('OH NO! GET PARENT CALLED! on: ', element.label);

        if (this._leoIntegration.fileOpenedReady) {
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_PARENT, element ? element.apJson : "null").then((p_package) => {
                if (p_package.node === null) {
                    return null;
                } else {
                    return this._leoIntegration.apToLeoNode(p_package.node);
                }
            });
        } else {
            return null; // Default gives no parent
        }
    }
}