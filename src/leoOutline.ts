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
  // public childIndex: number; // * not needed
  // public hasChildren: boolean; // * not needed after computing collapsibleState
  // public expanded: boolean; // * should be same as collapsibleState ?
  // public gnx: string; // * apJson is sufficient
  // public level: number; // * not needed
  // public headline; // * HEADLINE IS LABEL ?
  // public cloned: boolean; // needed for icon ?
  // public marked: boolean;

  constructor(
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState, // computed in receiver/creator
    public apJson: string,
    public cloned: boolean,
    public dirty: boolean,
    public marked: boolean,
    public command?: vscode.Command
  ) {
    super(label, collapsibleState);
    // const apObject: ApObject = JSON.parse(apJson);
    // this.childIndex = apObject.childIndex;
    // this.hasChildren = apObject.hasChildren;
    // this.cloned = apObject.cloned;
    //this.expanded = apObject.expanded;
    //this.gnx = apObject.gnx;
    //this.level = apObject.level;
    // this.marked = apObject.marked;
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
