import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { ProviderResult } from "vscode";
import { RevealType } from "./types";
import { Constants } from "./constants";


export class LeoOutlineProvider implements vscode.TreeDataProvider<LeoNode> {
    // * Leo outline implemented as a tree view with this TreeDataProvider implementation

    private _onDidChangeTreeData: vscode.EventEmitter<LeoNode | undefined> = new vscode.EventEmitter<LeoNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private _leoIntegration: LeoIntegration) { }

    public refreshTreeNode(p_node: LeoNode): void {
        this._leoIntegration.refreshSingleNodeFlag = true; // Of course we want to do a real refresh!
        this._onDidChangeTreeData.fire(p_node);
    }

    public refreshTreeRoot(p_revealType?: RevealType): void {
        this._leoIntegration.outlineRefreshCount += 1;
        if (p_revealType) { // To check if selected node should self-select while redrawing whole tree
            this._leoIntegration.revealSelectedNode = p_revealType; // To be read/cleared (in arrayToLeoNodesArray instead of directly by nodes)
        }
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: LeoNode): Thenable<LeoNode> | LeoNode {
        if (this._leoIntegration.refreshSingleNodeFlag) {
            this._leoIntegration.refreshSingleNodeFlag = false;
            return this._leoIntegration.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.GET_PNODE, element.apJson)
                .then((p_result) => {
                    const w_node = this._leoIntegration.apToLeoNode(p_result.node);
                    return element.copyProperties(w_node);
                });
        } else {
            return element;
        }
    }

    public getParent(element: LeoNode): ProviderResult<LeoNode> | null {
        console.log('Get Parent called! on: ', element.label);

        if (this._leoIntegration.fileOpenedReady) {
            return this._leoIntegration.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.GET_PARENT, element ? element.apJson : "null").then((p_result) => {
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

    public getChildren(element?: LeoNode): Thenable<LeoNode[]> {
        if (this._leoIntegration.fileOpenedReady) {
            return this._leoIntegration.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.GET_CHILDREN, element ? element.apJson : "null").then((p_result) => {
                return this._leoIntegration.arrayToLeoNodesArray(p_result.nodes);
            });
        } else {
            return Promise.resolve([]); // Defaults to an empty list of children
        }
    }
}