import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { ProviderResult } from "vscode";
import { RevealType } from "./types";

export class LeoOutlineProvider implements vscode.TreeDataProvider<LeoNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<LeoNode | undefined> =
        new vscode.EventEmitter<LeoNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<LeoNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private leoIntegration: LeoIntegration) { }

    public refreshTreeNode(p_node: LeoNode): void {
        this.leoIntegration.refreshSingleNodeFlag = true; // of course we want to do a real refresh!
        this._onDidChangeTreeData.fire(p_node);
    }

    public refreshTreeRoot(p_revealType?: RevealType): void {
        if (p_revealType) { // to check if selected node should self-select while redrawing whole tree
            this.leoIntegration.revealSelectedNode = p_revealType; // to be read/cleared (in arrayToLeoNodesArray instead of directly by nodes)
        }
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: LeoNode): Thenable<LeoNode> | LeoNode {
        if (this.leoIntegration.refreshSingleNodeFlag) {
            this.leoIntegration.refreshSingleNodeFlag = false;
            return this.leoIntegration.leoBridge.action("getPNode", element.apJson)
                .then((p_result) => {
                    const w_node = this.leoIntegration.apToLeoNode(p_result.node);
                    return element.copyProperties(w_node);
                });
        } else {
            return element;
        }
    }

    public getParent(element: LeoNode): ProviderResult<LeoNode> | null {
        if (this.leoIntegration.fileOpenedReady) {
            return this.leoIntegration.leoBridge.action('getParent', element ? element.apJson : "null").then((p_result) => {
                if (p_result.node === null) {
                    return null;
                } else {
                    return this.leoIntegration.apToLeoNode(p_result.node);
                }
            });
        } else {
            return null; // default give an empty tree
        }
    }

    public getChildren(element?: LeoNode): Thenable<LeoNode[]> {
        if (this.leoIntegration.fileOpenedReady) {
            return this.leoIntegration.leoBridge.action('getChildren', element ? element.apJson : "null").then((p_result) => {
                return this.leoIntegration.arrayToLeoNodesArray(p_result.nodes);
            });
        } else {
            return Promise.resolve([]); // default give an empty tree
        }
    }
}