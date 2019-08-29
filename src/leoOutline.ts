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
    leoIntegration.setupRefreshFn(this._onDidChangeTreeData);
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
    console.log("Leo outline refresh");
  }

  getTreeItem(element: LeoNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: LeoNode): Thenable<LeoNode[]> {
    console.log("get children");

    if (this.leoIntegration.fileOpenedReady) {
      return this.leoIntegration.getChildren(element ? element.apJson : undefined);
    } else {
      return Promise.resolve([]); // default give an empty tree
    }
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
  // public hasBody: boolean; // * needed for icon

  constructor(
    private leoIntegration: LeoIntegration, // For access to leo integration's globals (e.g. icons)
    public label: string, // Header
    public collapsibleState: vscode.TreeItemCollapsibleState, // computed in receiver/creator
    public apJson: string, // Key for leo/python side of things
    public cloned: boolean,
    public dirty: boolean,
    public marked: boolean,
    public hasBody: boolean,
    public command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }

  contextValue = "leoNode"; // for use in package.json

  get iconPath(): string {
    //return path.join(__filename, "..", "..", "resources", "box00.svg");
    // * 8=dirty, 4=cloned, 2=marked, 1=content (iconsInverted is dirty for light/dark inversion)
    let w_icon: number =
      (+(this.dirty && this.leoIntegration.iconsInverted) << 3) |
      (+this.cloned << 2) |
      (+this.marked << 1) |
      +this.hasBody;
    return this.leoIntegration.icons[w_icon];
  }

  // * whole headline as tooltip is useful if outline pane is too narrow
  get tooltip(): string {
    return `${this.label}`;
  }

  // * some smaller grayed-out text acompanying the main label
  // get description(): string {
  //   return "a desc";
  // }
}
