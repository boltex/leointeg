import * as child from "child_process";
import * as vscode from "vscode";

export class LeoIntegration {
  public leoBridgeReady: boolean = false;
  public fileOpenedReady: boolean = false;
  public outlineDataReady: boolean = false;
  public bodyDataReady: boolean = false;

  // private leoBridgePromise: Promise;

  private leoProcess: child.ChildProcess;

  constructor(private context: vscode.ExtensionContext) {
    console.log(
      "Running LeoIntegration constructor. context.extensionPath: ",
      this.context.extensionPath
    );
    this.leoProcess = this.initLeoProcess();
  }

  public test(): void {
    const w_message = "Testing... ";
    vscode.window.showInformationMessage(w_message);
    this.stdin("allo\n");
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
    console.log("p_data:", p_data);

    const w_lines = p_data.split("\n");
    w_lines.forEach(p_line => {
      console.log("p_line:", p_line);
      if (p_line.trim() === "leoBridgeReady") {
        console.log("leoBridge is ready");
        this.leoBridgeReady = true;
      }
      if (p_line.trim() === "fileOpenedReady") {
        this.fileOpenedReady = true;
      }
      if (p_line.trim() === "outlineDataReady") {
        this.outlineDataReady = true;
      }
      if (p_line.trim() === "bodyDataReady") {
        this.bodyDataReady = true;
      }
    });
  }

  private stdin(p_message: string): any {
    this.leoProcess.stdin.write(p_message);
  }

  private initLeoProcess(): child.ChildProcess {
    const pythonProcess: child.ChildProcess = child.spawn("python3", [
      this.context.extensionPath + "/scripts/leobridge.py"
    ]);

    pythonProcess.stdout.on("data", (data: string) => {
      console.log(`stdout: ${data}`);
      this.processAnswer(data.toString());
    });

    pythonProcess.stderr.on("data", (data: string) => {
      console.log(`stderr: ${data}`);
    });

    pythonProcess.on("close", (code: any) => {
      console.log(`child process exited with code ${code}`);
    });

    return pythonProcess;
  }
}
