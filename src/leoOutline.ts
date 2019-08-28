import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";

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

  constructor(private leoIntegration: LeoIntegration) {
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
    // return this.leoIntegration.getChildren(element ? element.apJson : undefined);
    return Promise.resolve([]); // test : give an empty tree
  }
}

export class LeoNode extends vscode.TreeItem {
  // public childIndex: number; // * not needed
  // public hasChildren: boolean; // * not needed after computing collapsibleState
  // public expanded: boolean; // * should be same as collapsibleState ?
  // public gnx: string; // * apJson is sufficient
  // public level: number; // * not needed
  // public headline; // * HEADLINE IS LABEL
  // public cloned: boolean; // * needed for icon
  // public dirty: boolean; // * needed for icon
  // public marked: boolean; // * needed for icon

  constructor(
    public label: string, // Header
    public collapsibleState: vscode.TreeItemCollapsibleState, // computed in receiver/creator
    public apJson: string, // Key for leo/python side of things
    public cloned: boolean,
    public dirty: boolean,
    public marked: boolean,
    public command?: vscode.Command
  ) {
    super(label, collapsibleState);
    console.log("leoNode constructor");
  }

  iconPath = "resources/leoNode.svg";
  contextValue = "leoNode"; // for use in package.json

  get tooltip(): string {
    return `${this.label}`;
  }

  get description(): string {
    return "a desc";
  }
}
