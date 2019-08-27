import * as child from "child_process";
import * as vscode from "vscode";
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
  stack: any; // approximated
}

export class LeoIntegration {
  public leoBridgeReady: boolean = false;
  public fileBrowserOpen: boolean = false;
  public fileOpenedReady: boolean = false;
  public outlineDataReady: boolean = false;
  public bodyDataReady: boolean = false;
  public actionBusy: boolean = false;

  private callStack: LeoAction[] = [];

  private leoBridgeReadyPromise: Promise<child.ChildProcess>; // set when leoBridge has a leo controller ready

  constructor(private context: vscode.ExtensionContext) {
    this.leoBridgeReadyPromise = new Promise<child.ChildProcess>(resolve => {
      this.initLeoProcess(resolve);
    });
  }

  public getChildren(p_apJson: string): Promise<LeoNode> {
    return new Promise((resolve, reject) => {
      const w_action: LeoAction = {
        action: "getChildren:",
        parameter: p_apJson,
        resolveFn: resolve,
        rejectFn: reject
      };
      this.callStack.push(w_action);
      this.tryResolve();
    });
  }

  private tryResolve(): void {
    if (!this.callStack.length || this.actionBusy) {
      return;
    }
    // resolve bottom one
    this.actionBusy = true;
    const w_action = this.callStack[0];
    this.stdin(w_action + w_action.parameter + "\n");
  }

  public test(): void {
    console.log("sending test");
    this.stdin("test\n");
  }
  public killLeoBridge(): void {
    this.stdin("exit\n"); // exit shoud kill it
  }
  public openLeoFile(): void {
    // ----------------------------------------------- // * CANCEL IF NEEDED * //
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
    // ----------------------------------------------- // * READY TO OPEN * //
    this.fileBrowserOpen = true;
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
          console.log("chosen leo file: ", p_chosenLeoFile[0].fsPath);
          this.stdin("openFile:" + p_chosenLeoFile[0].fsPath + "\n");
        } else {
          vscode.window.showInformationMessage("Open Cancelled");
        }
      });
  }

  private processAnswer(p_data: string): void {
    if (p_data.startsWith("outlineDataReady")) {
      if (!this.callStack.length) {
        console.log("ERROR STACK EMPTY");
        return;
      }
      let w_jsonArray: string = p_data.substring(16);
      // resolve promise from this.callStack's bottom
      let w_apDataArray: ApData[] = JSON.parse(w_jsonArray);

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
          new LeoNode(w_apData.headline, w_collaps, w_apJson, w_apData.cloned, w_apData.dirty, w_apData.marked)
        );
      }

      let w_bottomAction = this.callStack[0];
      w_bottomAction.resolveFn(w_leoNodesArray);
      return;
    }
    if (p_data === "fileOpenedReady") {
      this.fileOpenedReady = true;
      this.fileBrowserOpen = false;
    }
  }

  private stdin(p_message: string): any {
    this.leoBridgeReadyPromise.then(p_leoProcess => {
      p_leoProcess.stdin.write(p_message);
    });
  }

  private initLeoProcess(p_promiseResolve: (value?: any | PromiseLike<any>) => void): void {
    // * ONLY IF NOT READY *
    if (this.leoBridgeReady) {
      console.log("leoBridgeReady already Started");
      return;
    }
    // * START INIT PROCESS *
    const w_pythonProcess: child.ChildProcess = child.spawn("python3", [
      this.context.extensionPath + "/scripts/leobridge.py"
    ]);

    w_pythonProcess.stdout.on("data", (data: string) => {
      const w_data = data.toString();
      const w_lines = w_data.split("\n");
      w_lines.forEach(p_line => {
        p_line = p_line.trim();
        if (p_line && (1 || this.leoBridgeReady)) {
          // test
          console.log("from python", p_line);
        }
        if (p_line === "leoBridgeReady") {
          vscode.window.showInformationMessage("leoBridge Ready");
          this.leoBridgeReady = true;
          p_promiseResolve(w_pythonProcess);
        } else {
          this.processAnswer(p_line);
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
