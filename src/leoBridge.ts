import * as child from "child_process";
import * as vscode from "vscode";
import { LeoBridgePackage, LeoAction } from "./types";
// import * as hasbin from '../node_modules/hasbin';

// var isPyAvailable = require('hasbin').sync('python')  import * as hasbin from "hasbin";
// npm install --save @types/hasbin
export class LeoBridge {
    // * Communications with Python
    public actionBusy: boolean = false;
    private leoBridgeSerialId: number = 0;
    private callStack: LeoAction[] = [];
    private process: child.ChildProcess | undefined;
    private readyPromise: Promise<LeoBridgePackage> | undefined;
    private pythonString = "";
    private hasbin = require('hasbin');

    // * Constants
    // TODO : separate constants
    private leoTransactionHeader: string = "leoBridge:";  // string used to prefix transaction, to differenciate from errors

    constructor(private context: vscode.ExtensionContext) {
        this.pythonString = vscode.workspace.getConfiguration('leoIntegration').get('python', "");
    }

    public action(p_action: string, p_jsonParam: string, p_deferedPayload?: LeoBridgePackage, p_preventCall?: boolean): Promise<LeoBridgePackage> {
        // * Places an action to be made by leoBridge.py on top of a stack, to be resolved from the bottom
        return new Promise((resolve, reject) => {
            const w_action: LeoAction = {
                parameter: "{\"id\":" + (++this.leoBridgeSerialId) + ", \"action\": \"" + p_action + "\", \"param\":" + p_jsonParam + "}",
                deferedPayload: p_deferedPayload ? p_deferedPayload : undefined,
                resolveFn: resolve,
                rejectFn: reject
            };

            this.callStack.push(w_action);
            if (!p_preventCall) {
                this.callAction();
            }
        });
    }

    private resolveBridgeReady(p_jsonObject: string) {
        // * Resolves promises with the answers from an action that was done by leoBridge.py
        let w_bottomAction = this.callStack.shift();

        if (w_bottomAction) {
            const w_package = JSON.parse(p_jsonObject);
            if (w_bottomAction.deferedPayload) { // Used when the action already has a return value ready but is also waiting for python's side
                w_bottomAction.resolveFn(w_bottomAction.deferedPayload); // given back 'as is'
            } else {
                w_bottomAction.resolveFn(w_package);
            }
            this.actionBusy = false;
        } else {
            console.log("Error stack empty");
        }
    }

    private callAction(): void {
        // * Sends an action from the bottom of the stack to leoBridge.py's process stdin
        if (this.callStack.length && !this.actionBusy) {
            this.actionBusy = true; // launch / resolve bottom one
            const w_action = this.callStack[0];
            this.stdin(this.leoTransactionHeader + w_action.parameter + "\n");
        }
    }

    private processAnswer(p_data: string): void {
        // * Process data that came out of leoBridge.py's process stdout
        let w_processed: boolean = false;

        if (p_data.startsWith(this.leoTransactionHeader)) {
            this.resolveBridgeReady(p_data.substring(10));
            w_processed = true;
        }

        if (w_processed) {
            this.callAction();
        } else if (!!this.process) { // unprocessed/unknown python output
            console.log("from python", p_data);
        }
    }

    private findBestPythonString(): string {
        let w_paths = ["randomz1s9k20a", "python3", "py", "python"];
        let w_foundPath = "";
        w_paths.forEach(p_path => {
            if (this.hasbin.sync(p_path) && !w_foundPath) {
                w_foundPath = p_path;
            }
        });
        return w_foundPath;
    }

    public initLeoProcess(): Promise<LeoBridgePackage> {
        let w_pythonPath = this.pythonString;
        if (!w_pythonPath) {
            w_pythonPath = this.findBestPythonString(); // Thanks to EDK for finding the first bug!
        }
        // * Spawn a python child process
        this.process = child.spawn(w_pythonPath, [
            this.context.extensionPath + "/scripts/leobridge.py"
        ]);
        // * Capture the python process output
        this.process.stdout.on("data", (data: string) => {
            data.toString().split("\n").forEach(p_line => {
                p_line = p_line.trim();
                if (p_line) { // * std out process line by line: json shouldn't have line breaks
                    this.processAnswer(p_line);
                }
            });
        });
        // * Capture other python process outputs
        this.process.stderr.on("data", (data: string) => {
            console.log(`stderr: ${data}`);
        });
        this.process.on("close", (code: any) => {
            console.log(`child process exited with code ${code}`);
            this.process = undefined;
        });
        // * Start first with 'preventCall' set to true: no need to call anything for the first 'ready'
        this.readyPromise = this.action("", "", { id: 1, package: this.process }, true);
        return this.readyPromise; // This promise will resolve when the started python process starts
    }

    private stdin(p_message: string): any {
        // * Send into the python process input
        if (this.readyPromise) {
            this.readyPromise.then(() => {  //  using '.then' to be buffered in case process isn't ready.
                if (this.process) {
                    this.process.stdin.write(p_message); // * std in interaction sending to python script
                }
            });
        }
    }

    public killLeoBridge(): void {
        console.log("sending kill command");
        this.stdin("exit\n"); // 'exit' should kill the python script
    }
}