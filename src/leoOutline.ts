import * as vscode from "vscode";

interface ApObject {
  childIndex: number;
  hasChildren: boolean;
  cloned: boolean;
  expanded: boolean;
  gnx: string;
  level: number;
  headline: string;
  marked: boolean;
  stack: ApStackObject[];
}

interface ApStackObject {
  gnx: string;
  childIndex: number;
  headline: string;
}

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
  public childIndex: number;
  public hasChildren: boolean;
  public cloned: boolean;
  public expanded: boolean; // * should be same as collapsibleState ?
  public gnx: string;
  public level: number;
  // public headline; // * HEADLINE IS LABEL ?
  public marked: boolean;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly apJson: string,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    const apObject: ApObject = JSON.parse(apJson);
    this.childIndex = apObject.childIndex;
    this.hasChildren = apObject.hasChildren;
    this.cloned = apObject.cloned;
    this.expanded = apObject.expanded;
    this.gnx = apObject.gnx;
    this.level = apObject.level;
    this.marked = apObject.marked;
    console.log("leoNode constructor");
  }

  // get tooltip(): string {
  //   return `${this.label} tooltip`;
  // }

  // get description(): string {
  //   return 'a desc';
  // }

  iconPath = "resources/leoNode.svg";

  contextValue = "leoNode"; // for use in package.json
}
