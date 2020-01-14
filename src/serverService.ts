import * as vscode from "vscode";
import { Constants } from "./constants";
import * as child from 'child_process';
import * as path from "path"; // TODO: Use this library to have reliable support for window-vs-linux file-paths
import * as os from 'os';

export class ServerService {
    // * See https://github.com/yhirose/vscode-filtertext/blob/master/src/extension.ts#L196

    constructor(private context: vscode.ExtensionContext) {
    }

    public startServer(p_serverProcess: child.ChildProcess | undefined, p_leoPythonCommand: string): Promise<any> {
        // * Get command from settings or best command for the current OS
        let w_pythonPath = "";
        const w_serverScriptPath = this.context.extensionPath + Constants.LEO_BRIDGE_SERVER_PATH;
        const w_platform: string = os.platform();
        if (p_leoPythonCommand && p_leoPythonCommand.length) {
            // start by running command (see executeCommand for multiple useful snippets)
            console.log('Starting server with command: ' + p_leoPythonCommand);
            // set path
            w_pythonPath = p_leoPythonCommand;
        } else {
            w_pythonPath = Constants.LEO_DEFAULT_PYTHON;

            if (w_platform === "win32") {
                w_pythonPath = Constants.LEO_WIN32_PYTHON;
            }
            console.log('Launch with default command : ' +
                w_pythonPath + ((w_platform === "win32" && w_pythonPath === "py") ? " -3 " : "") +
                " " + w_serverScriptPath);
        }

        const w_serverStartPromise = new Promise((resolve, reject) => {
            // * Spawn a python child process for a leoBridge server
            let w_args: string[] = []; //  "\"" + w_serverScriptPath + "\"" // For on windows ??
            if (os.platform() === "win32" && w_pythonPath === "py") {
                w_args.push("-3");
            }
            w_args.push(w_serverScriptPath);
            p_serverProcess = child.spawn(w_pythonPath, w_args);
            // * Capture the python process output
            p_serverProcess.stdout.on("data", (data: string) => {
                data.toString().split("\n").forEach(p_line => {
                    p_line = p_line.trim();
                    if (p_line) { // * std out process line by line: json shouldn't have line breaks
                        if (p_line.startsWith('LeoBridge started')) {
                            resolve(p_line); // * Server confirmed started
                        }
                        console.log("leoBridge: ", p_line); // Output message anyways
                    }
                });
            });
            // * Capture other python process outputs
            p_serverProcess.stderr.on("data", (data: string) => {
                console.log(`stderr: ${data}`);
                vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
                p_serverProcess = undefined;
                reject(`stderr: ${data}`);
            });
            p_serverProcess.on("close", (code: any) => {
                console.log(`leoBridge exited with code ${code}`);
                vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
                p_serverProcess = undefined;
                reject(`leoBridge exited with code ${code}`);
            });
        });
        return w_serverStartPromise;
    }
}