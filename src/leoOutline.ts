import * as vscode from "vscode";

export class LeoOutlineProvider implements vscode.TreeDataProvider<LeoNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<LeoNode | undefined> = new vscode.EventEmitter<
    LeoNode | undefined
  >();
  readonly onDidChangeTreeData: vscode.Event<LeoNode | undefined> = this._onDidChangeTreeData.event;

  constructor() {
    console.log("LeoOutlineProvider constructor");
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
    console.log("Leo refresh");
  }

  getTreeItem(element: LeoNode): vscode.TreeItem {
    console.log("leo getTreeItem");
    return element;
  }

  getChildren(element?: LeoNode): Thenable<LeoNode[]> {
    console.log("leo getChildren");
    return Promise.resolve([]);
  }
}

export class LeoNode extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private version: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    console.log("leoNode constructor");
  }

  get tooltip(): string {
    return `${this.label}-${this.version}`;
  }

  get description(): string {
    return this.version;
  }

  iconPath = "resources/leoNode.svg";

  contextValue = "leoNode"; // for use in package.json
}
