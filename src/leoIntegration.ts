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
  stack: any; // approximated as any for now
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
          new LeoNode(w_apData.headline, w_collaps, w_apJson, w_apData.cloned, w_apData.dirty, w_apData.marked)
        );
      }
      w_bottomAction.resolveFn(w_leoNodesArray);
      this.actionBusy = false;
    } else {
      console.log("ERROR STACK EMPTY");
    }
  }

  public getChildren(p_apJson: string): Promise<LeoNode> {
    return new Promise((resolve, reject) => {
      const w_action: LeoAction = {
        action: "getChildren:", // ! INCLUDES THE COLON ':'
        parameter: p_apJson,
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
          console.log("chosen leo file: ", p_chosenLeoFile[0].fsPath);
          this.stdin("openFile:" + p_chosenLeoFile[0].fsPath + "\n");
        } else {
          vscode.window.showInformationMessage("Open Cancelled");
        }
      });
  }

  private processAnswer(p_data: string): void {
    if (p_data.startsWith("outlineDataReady")) {
      this.resolveGetChildren(p_data.substring(16)); // ANSWER to getChildren
    } else if (p_data === "fileOpenedReady") {
      this.fileOpenedReady = true; // ANSWER to openLeoFile
      this.fileBrowserOpen = false;
    }
    this.callAction(); // Maybe theres another action waiting to be launched, and resolved.
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
      console.log("leoBridgeReady already Started");
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
        if (p_line && (1 || this.leoBridgeReady)) {
          // test reception of python output
          console.log("from python", p_line);
        }
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
