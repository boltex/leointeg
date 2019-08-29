import * as child from "child_process";
import * as vscode from "vscode";
import * as path from "path";
import { LeoNode } from "./leoOutline";
import { Uri } from "vscode";

interface LeoAction {
  action: string;
  parameter: string;
  resolveFn: (result: any) => void;
  rejectFn: (result: any) => void;
}

interface ApData {
  hasBody: boolean;
  hasChildren: boolean;
  childIndex: number;
  cloned: boolean;
  dirty: boolean;
  expanded: boolean;
  gnx: string;
  level: number;
  headline: string;
  marked: boolean;
  stack: any; // approximated as any for now
}

export class LeoIntegration {
  public leoBridgeReady: boolean = false;
  public fileBrowserOpen: boolean = false;
  public fileOpenedReady: boolean = false;
  public outlineDataReady: boolean = false;
  public bodyDataReady: boolean = false;
  public actionBusy: boolean = false;

  public icons: string[] = [];
  public iconsInverted: boolean = false; // used to flip dirty/pristine outline of icon

  private callStack: LeoAction[] = [];
  private onDidChangeTreeDataObject: any;

  private leoBridgeReadyPromise: Promise<child.ChildProcess>; // set when leoBridge has a leo controller ready

  constructor(private context: vscode.ExtensionContext) {
    this.leoBridgeReadyPromise = new Promise<child.ChildProcess>(resolve => {
      this.initLeoProcess(resolve);
      this.initIconPaths();
    });
  }

  private initIconPaths(): void {
    // build icons so that 8=dirty, 4=cloned, 2=marked, 1=content
    for (let index = 0; index < 16; index++) {
      this.icons.push(path.join(__filename, "..", "..", "resources", "box" + ("0" + index).slice(-2) + ".svg"));
    }
    // * example for light/dark themes
    // iconPath = {
    //   light: path.join(__filename, "..", "..", "resources", "dependency.svg"),
    //   dark: path.join(__filename, "..", "..", "resources", "dependency.svg")
    // };
  }

  public setupRefreshFn(p_refreshObj: any): void {
    this.onDidChangeTreeDataObject = p_refreshObj;
  }

  private resolveGetChildren(p_jsonArray: string) {
    let w_bottomAction = this.callStack.shift();
    if (w_bottomAction) {
      let w_apDataArray: ApData[] = JSON.parse(p_jsonArray);

      const w_leoNodesArray: LeoNode[] = [];
      for (let w_apData of w_apDataArray) {
        const w_apJson: string = JSON.stringify(w_apData); //  just this part back to JSON

        let w_collaps: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
        if (w_apData.hasChildren) {
          if (w_apData.expanded) {
            w_collaps = vscode.TreeItemCollapsibleState.Expanded;
          } else {
            w_collaps = vscode.TreeItemCollapsibleState.Collapsed;
          }
        }

        w_leoNodesArray.push(
          new LeoNode(
            this,
            w_apData.headline,
            w_collaps,
            w_apJson,
            w_apData.cloned,
            w_apData.dirty,
            w_apData.marked,
            w_apData.hasBody
          )
        );
      }
      w_bottomAction.resolveFn(w_leoNodesArray);
      this.actionBusy = false;
    } else {
      console.log("ERROR STACK EMPTY");
    }
  }

  public getChildren(p_apJson?: string): Promise<LeoNode[]> {
    return new Promise((resolve, reject) => {
      const w_action: LeoAction = {
        action: "getChildren:", // ! INCLUDES THE COLON ':'
        parameter: p_apJson || "", // nothing shoud get root
        resolveFn: resolve,
        rejectFn: reject
      };
      this.callStack.push(w_action);
      this.callAction();
    });
  }

  private callAction(): void {
    if (!this.callStack.length || this.actionBusy) {
      return;
    }
    // launch / resolve bottom one
    this.actionBusy = true;
    const w_action = this.callStack[0];

    // * example "getChildren:{blablabla some JSON blablabla}"
    this.stdin(w_action.action + w_action.parameter + "\n");
  }

  public test(): void {
    console.log("sending test");
    this.stdin("test\n");
  }
  public killLeoBridge(): void {
    this.stdin("exit\n"); // exit. should kill the python script
  }
  public openLeoFile(): void {
    // * prevent opening if already open/opening
    let w_returnMessage: string | undefined;
    if (!this.leoBridgeReady) {
      w_returnMessage = "leoBridge not ready";
    }
    if (this.fileOpenedReady || this.fileBrowserOpen) {
      w_returnMessage = "leo file already opened!";
    }
    if (w_returnMessage) {
      vscode.window.showInformationMessage(w_returnMessage);
      return;
    }
    this.fileBrowserOpen = true; // flag for multiple click prevention
    // * find a folder to propose when opening the browse-for-leo-file chooser
    let w_openedFileEnvUri: Uri | boolean = false;
    const w_activeUri: Uri | undefined = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.document.uri
      : undefined;
    if (w_activeUri) {
      const w_defaultFolder = vscode.workspace.getWorkspaceFolder(w_activeUri);
      if (w_defaultFolder) {
        w_openedFileEnvUri = w_defaultFolder.uri; // set as current opened document-path's folder
      }
    }
    if (!w_openedFileEnvUri) {
      w_openedFileEnvUri = Uri.file("~"); // set as home folder
    }
    // * found a folder to propose: now open the file browser
    vscode.window
      .showOpenDialog({
        canSelectMany: false,
        defaultUri: w_openedFileEnvUri,
        filters: {
          "Leo Files": ["leo"]
        }
      })
      .then(p_chosenLeoFile => {
        if (p_chosenLeoFile) {
          this.stdin("openFile:" + p_chosenLeoFile[0].fsPath + "\n");
        } else {
          vscode.window.showInformationMessage("Open Cancelled");
          this.fileBrowserOpen = false;
        }
      });
  }

  private processAnswer(p_data: string): void {
    if (p_data.startsWith("outlineDataReady")) {
      // * ----------------------------------------- outlineDataReady
      this.resolveGetChildren(p_data.substring(16)); // ANSWER to getChildren
      this.callAction(); // Maybe theres another action waiting to be launched, and resolved.
      return;
    } else if (p_data === "fileOpenedReady") {
      // * ----------------------------------------- fileOpenedReady
      this.fileOpenedReady = true; // ANSWER to openLeoFile
      this.fileBrowserOpen = false;
      if (this.onDidChangeTreeDataObject) {
        this.onDidChangeTreeDataObject.fire();
      } else {
        console.log("ERROR onDidChangeTreeDataObject NOT READY");
      }
      this.callAction(); // Maybe theres another action waiting to be launched, and resolved.
      return;
    }
    // * ----------------------------------------- NO PROCESSED ANSWER : LOG STRING
  }

  private stdin(p_message: string): any {
    // not using 'this.leoBridgeReady' : using '.then' to be buffered before process ready.
    this.leoBridgeReadyPromise.then(p_leoProcess => {
      p_leoProcess.stdin.write(p_message); // * std in interaction sending to python script
    });
  }

  private initLeoProcess(p_promiseResolve: (value?: any | PromiseLike<any>) => void): void {
    // * prevent re-init
    if (this.leoBridgeReady) {
      console.log("ERROR : leoBridgeReady already Started");
      return;
    }
    // * start leo via leoBridge python script.
    const w_pythonProcess: child.ChildProcess = child.spawn("python3", [
      this.context.extensionPath + "/scripts/leobridge.py"
    ]);
    // * interact via std in out
    w_pythonProcess.stdout.on("data", (data: string) => {
      const w_data = data.toString();
      const w_lines = w_data.split("\n");
      w_lines.forEach(p_line => {
        p_line = p_line.trim();
        if (p_line === "leoBridgeReady") {
          vscode.window.showInformationMessage("leoBridge Ready");
          this.leoBridgeReady = true;
          p_promiseResolve(w_pythonProcess);
        } else {
          this.processAnswer(p_line); // * std out interaction listening
        }
      });
    });

    w_pythonProcess.stderr.on("data", (data: string) => {
      console.log(`stderr: ${data}`);
    });

    w_pythonProcess.on("close", (code: any) => {
      console.log(`child process exited with code ${code}`);
      this.leoBridgeReady = false;
    });
  }
}
