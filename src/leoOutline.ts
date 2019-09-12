import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoNode } from "./leoNode";

export class LeoOutlineProvider implements vscode.TreeDataProvider<LeoNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<LeoNode | undefined> = new vscode.EventEmitter<
    LeoNode | undefined
  >();
  readonly onDidChangeTreeData: vscode.Event<LeoNode | undefined> = this._onDidChangeTreeData.event;

  // TODO : Save and restore selection / cursor position from selection object saved in each node
  // TODO : before / upon selection of other nodes

  constructor(private leoIntegration: LeoIntegration) {
    // give the event for 'refresh' of either root, without params, or a node when passed as parameter
    leoIntegration.setupRefreshFn(this._onDidChangeTreeData);
  }

  public refresh(): void {
    // * Not used for now. Kept as example from treeoutline extension template
    this._onDidChangeTreeData.fire();
    console.log("Leo outline refresh");
  }

  getTreeItem(element: LeoNode): vscode.TreeItem {
    return element;
  }

  //getParent( ){}

  getChildren(element?: LeoNode): Thenable<LeoNode[]> {
    console.log("get children");

    if (this.leoIntegration.fileOpenedReady) {
      return this.leoIntegration.getChildren(element ? element.apJson : undefined);
    } else {
      return Promise.resolve([]); // default give an empty tree
    }
  }
}


