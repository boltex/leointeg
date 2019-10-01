import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";
import { ProviderResult } from "vscode";

export class LeoOutlineProvider implements vscode.TreeDataProvider<LeoNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<LeoNode | undefined> =
    new vscode.EventEmitter<LeoNode | undefined>();
  readonly onDidChangeTreeData: vscode.Event<LeoNode | undefined> = this._onDidChangeTreeData.event;

  constructor(private leoIntegration: LeoIntegration) { }

  public refreshTreeNode(p_node: LeoNode): void {
    this.leoIntegration.refreshSingleNodeFlag = true; // of course we want to do a real refresh!
    this._onDidChangeTreeData.fire(p_node);
  }

  public refreshTreeRoot(p_revealSelection?: boolean): void {
    if (p_revealSelection) { // to check if selected node should self-select while redrawing whole tree
      this.leoIntegration.revealSelectedNode = true; // to be read/cleared (in arrayToLeoNodesArray instead of directly by nodes)
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: LeoNode): Thenable<LeoNode> | LeoNode {
    if (this.leoIntegration.refreshSingleNodeFlag) {
      this.leoIntegration.refreshSingleNodeFlag = false;
      return this.leoIntegration.leoBridgeAction("getPNode", element.apJson)
        .then((p_result) => {
          const w_node = this.leoIntegration.apToLeoNode(p_result.node);
          element.label = w_node.label;
          element.gnx = w_node.gnx;
          element.collapsibleState = w_node.collapsibleState;
          element.apJson = w_node.apJson;
          element.cloned = w_node.cloned;
          element.dirty = w_node.dirty;
          element.marked = w_node.marked;
          element.hasBody = w_node.hasBody;
          return element;
        });
    } else {
      return element;
    }
  }

  getParent(element: LeoNode): ProviderResult<LeoNode> | null {
    if (this.leoIntegration.fileOpenedReady) {
      return this.leoIntegration.leoBridgeAction('getParent', element ? element.apJson : "null").then((p_result) => {
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

  getChildren(element?: LeoNode): Thenable<LeoNode[]> {
    if (this.leoIntegration.fileOpenedReady) {
      return this.leoIntegration.leoBridgeAction('getChildren', element ? element.apJson : "null").then((p_result) => {
        return this.leoIntegration.arrayToLeoNodesArray(p_result.nodes);
      });
    } else {
      return Promise.resolve([]); // default give an empty tree
    }
  }
}


