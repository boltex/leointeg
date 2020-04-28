import * as os from 'os';
import * as child from 'child_process';
import * as path from "path"; // TODO: Use this library to have reliable support for window-vs-linux file-paths
import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";

export class ServerService {
    // * Provides automatic leo bridge server startup service
    // TODO : Issue https://github.com/boltex/leointeg/issues/10
    // See https://github.com/yhirose/vscode-filtertext/blob/master/src/extension.ts#L196

    private _platform: string;
    private _isWin32: boolean;

    // * Leo Bridge Server Process
    private _serverProcess: child.ChildProcess | undefined;

    constructor(private _context: vscode.ExtensionContext) {
        this._platform = os.platform();
        this._isWin32 = this._platform === "win32";
    }

    public startServer(p_leoPythonCommand: string): Promise<any> {
        // * Get command from settings or best command for the current OS
        let w_pythonPath = "";
        const w_serverScriptPath = this._context.extensionPath + Constants.SERVER_PATH;
        if (p_leoPythonCommand && p_leoPythonCommand.length) {
            // Start by running command (see executeCommand for multiple useful snippets)
            w_pythonPath = p_leoPythonCommand; // Set path
            console.log('Starting server with command: ' + p_leoPythonCommand);
        } else {
            w_pythonPath = Constants.DEFAULT_PYTHON;
            if (this._isWin32) {
                w_pythonPath = Constants.WIN32_PYTHON;
            }
            console.log('Starting server with command : ' +
                w_pythonPath + ((this._isWin32 && w_pythonPath === "py") ? " -3 " : "") +
                " " + w_serverScriptPath);
        }

        const w_serverStartPromise = new Promise((resolve, reject) => {
            // * Spawn a python child process for a leoBridge server
            let w_args: string[] = []; //  "\"" + w_serverScriptPath + "\"" // For on windows ??
            if (this._isWin32 && w_pythonPath === "py") {
                w_args.push("-3");
            }
            w_args.push(w_serverScriptPath);
            this._serverProcess = child.spawn(w_pythonPath, w_args);
            // * Capture the python process output
            this._serverProcess.stdout.on("data", (data: string) => {
                data.toString().split("\n").forEach(p_line => {
                    p_line = p_line.trim();
                    if (p_line) { // * std out process line by line: json shouldn't have line breaks
                        if (p_line.startsWith(Constants.SERVER_STARTED_TOKEN)) {
                            resolve(p_line); // * Server confirmed started
                        }
                        console.log("leoBridge: ", p_line); // Output message anyways
                    }
                });
            });
            // * Capture other python process outputs
            this._serverProcess.stderr.on("data", (data: string) => {
                console.log(`stderr: ${data}`);
                utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
                this._serverProcess = undefined;
                reject(`stderr: ${data}`);
            });
            this._serverProcess.on("close", (code: any) => {
                console.log(`leoBridge exited with code ${code}`);
                utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
                this._serverProcess = undefined;
                reject(`leoBridge exited with code ${code}`);
            });
        });
        return w_serverStartPromise;
    }
}