import * as child from "child_process";
import * as vscode from "vscode";
import { Uri } from "vscode";

export class LeoIntegration {
  public leoBridgeReady: boolean = false;
  public fileOpenedReady: boolean = false;
  public outlineDataReady: boolean = false;
  public bodyDataReady: boolean = false;

  private leoBridgeReadyPromise: Promise<child.ChildProcess>; // set when leoBridge has a leo controller ready

  constructor(private context: vscode.ExtensionContext) {
    this.leoBridgeReadyPromise = new Promise<child.ChildProcess>(resolve => {
      this.initLeoProcess(resolve);
    });
  }

  public test(): void {
    console.log("sending test");

    this.stdin("test\n");
  }
  public killLeoBridge(): void {
    this.stdin("exit\n"); // exit shoud kill it
  }
  public openLeoFile(): void {
    if (!this.leoBridgeReady) {
      vscode.window.showInformationMessage("leoBridge Not Ready Yet!");
      return;
    }
    // ----------------------------------------------- // * ONLY IF READY * //
    let w_openedFileEnvUri: Uri | boolean = false;
    const w_activeUri: Uri | undefined = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.document.uri
      : undefined;
    if (w_activeUri) {
      const w_defaultFolder = vscode.workspace.getWorkspaceFolder(w_activeUri);
      if (w_defaultFolder) {
        w_openedFileEnvUri = w_defaultFolder.uri;
      }
    }
    if (!w_openedFileEnvUri) {
      w_openedFileEnvUri = Uri.file("~"); // set as home
    }

    vscode.window
      .showOpenDialog({
        canSelectMany: false,
        defaultUri: w_openedFileEnvUri, // vscode.Uri.file(vscode.window.wor),
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
    switch (p_data) {
      case "fileOpenedReady": {
        this.fileOpenedReady = true;
        break;
      }
      case "outlineDataReady": {
        this.outlineDataReady = true;
        break;
      }
      case "bodyDataReady": {
        this.bodyDataReady = true;
        break;
      }
      default: {
        //pass
      }
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
