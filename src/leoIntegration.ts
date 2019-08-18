//* How to call a Python function from Node.js
//const spawn = require("child_process").spawn;
//const pythonProcess = spawn('python',["path/to/script.py", arg1, arg2, ...]);
//* Then all you have to do is make sure that you import sys in your python script,
//* and then you can access arg1 using sys.argv[1], arg2 using sys.argv[2], and so on.
//* To send data back to node just do the following in the python script:
//print(dataToSendBack)
//sys.stdout.flush()
//* And then node can listen for data using:
//pythonProcess.stdout.on("data", data => {
//  /* Do something with the data */
// });
//* Since this allows multiple arguments to be passed to a script using spawn,
//* you can restructure a python script so that one of the arguments decides
//* which function to call, and the other argument gets passed to that function, etc.
import * as child from "child_process";
import * as vscode from "vscode";

export class LeoIntegration {
  private leoProcess: child.ChildProcess;

  constructor(private context: vscode.ExtensionContext) {
    console.log(
      "Running LeoIntegration constructor. context.extensionPath: ",
      this.context.extensionPath
    );
    this.leoProcess = this.initLeoProcess();
  }

  public stdin(p_message: string): any {
    this.leoProcess.stdin.write(p_message);
  }

  private initLeoProcess(): child.ChildProcess {
    const pythonProcess: child.ChildProcess = child.spawn("python3", [
      this.context.extensionPath + "/scripts/leobridge.py"
    ]);

    pythonProcess.stdout.on("data", (data: string) => {
      console.log(`stdout: ${data}`);
      console.log("done stdout");
    });

    pythonProcess.stderr.on("data", (data: string) => {
      console.log(`stderr: ${data}`);
      console.log("done stderr");
    });

    pythonProcess.on("close", (code: any) => {
      console.log(`child process exited with code ${code}`);
      console.log("done exited");
    });

    return pythonProcess;
  }
}
