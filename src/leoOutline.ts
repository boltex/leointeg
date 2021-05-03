import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";
import { LeoBridgePackage } from "./types";

/**
 * * Leo outline implemented as a tree view with this TreeDataProvider
 */
export class LeoOutlineProvider implements vscode.TreeDataProvider<LeoNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<LeoNode | undefined> = new vscode.EventEmitter<LeoNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private _leoIntegration: LeoIntegration) { }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        // TODO : have this return a promise that resolves when the selected node is encountered by ap_to_p
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: LeoNode): Thenable<LeoNode> | LeoNode {
        return element;
    }

    public getChildren(element?: LeoNode): Thenable<LeoNode[]> {
        if (!this._leoIntegration.leoStates.fileOpenedReady) {
            return Promise.resolve([]); // Defaults to an empty list of children
        }
        if (element) {
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_CHILDREN, element.apJson)
                .then((p_package: LeoBridgePackage) => {
                    return this._leoIntegration.arrayToLeoNodesArray(p_package.nodes!);
                });
        } else {
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_CHILDREN, "null")
                .then((p_package: LeoBridgePackage) => {
                    const w_nodes = this._leoIntegration.arrayToLeoNodesArray(p_package.nodes!);
                    if (w_nodes && w_nodes.length === 1) {
                        w_nodes[0].setRoot();
                    }
                    return w_nodes;
                });
        }
    }

    public getParent(element: LeoNode): ProviderResult<LeoNode> | null {
        // * This method should be implemented in order to access reveal API.
        // ! But it should NOT have to be called if only trying to 'select' already revealed nodes
        // ! Called when revealing single nodes

        // ! Might be called if nodes are revealed while in vscode's refresh process
        // ! Parent asked for this way will go up till root and effectively refresh whole tree.
        // console.log('ERROR! GET PARENT CALLED! on: ', element.label);

        if (this._leoIntegration.leoStates.fileOpenedReady) {
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_PARENT, element ? element.apJson : "null")
                .then((p_package: LeoBridgePackage) => {
                    if (p_package.node === null) {
                        return null;
                    } else {
                        return this._leoIntegration.apToLeoNode(p_package.node!);
                    }
                });
        } else {
            return null; // Default gives no parent
        }
    }

}
