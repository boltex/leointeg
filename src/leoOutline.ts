import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import * as utils from './utils';
import { ProviderResult } from "vscode";
import { Constants } from "./constants";
import { LeoBridgePackage } from "./types";

/**
 * * Leo outline implemented as a tree view with this TreeDataProvider
 */
export class LeoOutlineProvider implements vscode.TreeDataProvider<LeoNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<LeoNode | undefined> = new vscode.EventEmitter<LeoNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoNode | undefined> = this._onDidChangeTreeData.event;

    private _rootNode: LeoNode | undefined;

    constructor(private _leoIntegration: LeoIntegration) { }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        // TODO : have this return a promise that resolves when the selected node is encountered by ap_to_p
        this._rootNode = undefined;
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
            return this._leoIntegration.sendAction(
                Constants.LEOBRIDGE.GET_CHILDREN,
                utils.buildNodeCommandJson(element.apJson)
            ).then((p_package: LeoBridgePackage) => {
                return this._leoIntegration.arrayToLeoNodesArray(p_package.children!);
            });
        } else {
            return this._leoIntegration.sendAction(
                Constants.LEOBRIDGE.GET_CHILDREN, "{}"
            ).then((p_package: LeoBridgePackage) => {
                const w_nodes = this._leoIntegration.arrayToLeoNodesArray(p_package.children!);
                if (w_nodes && w_nodes.length === 1) {
                    this._rootNode = w_nodes[0];
                    this._rootNode.setRoot();
                }
                return w_nodes;
            });
        }
    }

    public resolveTreeItem(item: LeoNode, element: LeoNode, token: vscode.CancellationToken): vscode.ProviderResult<LeoNode> {

        return this._leoIntegration.sendAction(
            Constants.LEOBRIDGE.GET_UA,
            element ? utils.buildNodeCommandJson(element.apJson) : "{}"
        ).then((p_package: LeoBridgePackage) => {
            if (p_package.ua && p_package.ua !== null) {

                let uaQty = Object.keys(p_package.ua).length;
                const tagQty = p_package.ua.__node_tags ? p_package.ua.__node_tags.length : 0;

                if (tagQty) {
                    // list tags instead
                    item.tooltip = item.label + "\n\u{1F3F7} " + p_package.ua.__node_tags.join('\n\u{1F3F7} ') + "\n";
                    delete p_package.ua.__node_tags;
                } else {
                    item.tooltip = item.label + "\n";
                }

                if ((uaQty + tagQty) > 1) {
                    item.tooltip = JSON.stringify(p_package.ua, undefined, 2);
                }

            } else {
                item.tooltip = item.label;
            }
            return item;

        });


    }

    public getParent(element: LeoNode): ProviderResult<LeoNode> | null {
        // * This method should be implemented in order to access reveal API.
        // ! But it should NOT have to be called if only trying to 'select' already revealed nodes
        // ! Called when revealing single nodes

        // ! Might be called if nodes are revealed while in vscode's refresh process
        // ! Parent asked for this way will go up till root and effectively refresh whole tree.
        if (this._leoIntegration.leoStates.fileOpenedReady) {
            // Check if joisted and is already up to root node
            if (this._rootNode && element.gnx === this._rootNode.gnx && element.childIndex === this._rootNode.childIndex) {
                if (
                    JSON.stringify(JSON.parse(this._rootNode.apJson).stack) ===
                    JSON.stringify(JSON.parse(element.apJson).stack)
                ) {
                    return null; // Default gives no parent
                }
            }

            return this._leoIntegration.sendAction(
                Constants.LEOBRIDGE.GET_PARENT,
                element ? utils.buildNodeCommandJson(element.apJson) : "{}"
            ).then((p_package: LeoBridgePackage) => {
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
