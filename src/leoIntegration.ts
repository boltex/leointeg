import * as child from "child_process";
import * as vscode from "vscode";

export class LeoIntegration {
  public leoBridgeReady: boolean = false;
  public fileOpenedReady: boolean = false;
  public outlineDataReady: boolean = false;
  public bodyDataReady: boolean = false;

  private leoBridgeReadyPromise: Promise<child.ChildProcess>; // set when leoBridge has a leo controller ready

  constructor(private context: vscode.ExtensionContext) {
    console.log(
      "Running LeoIntegration constructor. context.extensionPath: ",
      this.context.extensionPath
    );
    this.leoBridgeReadyPromise = new Promise<child.ChildProcess>(resolve => {
      this.initLeoProcess(resolve);
    });
  }

  public test(): void {
    const w_message = "Testing... should output g = controller.globals()  ";
    vscode.window.showInformationMessage(w_message);
    this.stdin("test\n");
  }
  public killLeoBridge(): void {
    const w_message = "sending exit to leoBridge";
    vscode.window.showInformationMessage(w_message);
    this.stdin("exit\n"); // exit shoud kill it
  }
  public openLeoFile(): void {
    const w_message = "Open Leo File";
    vscode.window.showInformationMessage(w_message);
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

  private initLeoProcess(
    p_promiseResolve: (value?: any | PromiseLike<any>) => void
  ): void {
    const w_pythonProcess: child.ChildProcess = child.spawn("python3", [
      this.context.extensionPath + "/scripts/leobridge.py"
    ]);

    w_pythonProcess.stdout.on("data", (data: string) => {
      const w_lines = data.toString().split("\n");
      w_lines.forEach(p_line => {
        if (this.leoBridgeReady) {
          console.log(p_line);
        }
        p_line = p_line.trim();
        if (p_line === "leoBridgeReady") {
          console.log("leoBridgeReady PROMISE RESOLVED!");
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
    });
  }
}
