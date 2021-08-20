import * as os from 'os';
import * as fs from 'fs';
import * as child from 'child_process';
import * as path from "path"; // TODO : Use this to have reliable support for window-vs-linux file-paths
import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { LeoIntegration } from './leoIntegration';
var kill = require('tree-kill');

/**
 * * Leo bridge server service
 * Provides simple automatic leo bridge server startup functionality
 */
export class ServerService {
    // TODO : See #10 @boltex Problem starting the leo-bridge server automatically with anaconda/miniconda on windows
    // See https://github.com/yhirose/vscode-filtertext/blob/master/src/extension.ts#L196

    private _platform: string;
    private _isWin32: boolean;
    public usingPort: number = 0; // set to other than zero if server is started by leointeg itself

    /**
     * * Leo Bridge Server Process
     */
    private _serverProcess: child.ChildProcess | undefined;

    private _resolvePromise: ((value?: unknown) => void) | undefined;
    private _rejectPromise: ((reason?: any) => void) | undefined;

    private _isStarted: boolean = false;

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {
        this._platform = os.platform();
        this._isWin32 = this._platform === "win32";
    }

    /**
     * * Get command from settings or best command for the current OS
     * @param p_leoPythonCommand String command to start python on this computer
     * @returns A promise that resolves when the server is started, or that is rejected in case of problem while starting
     */
    public startServer(p_leoPythonCommand: string, p_leoEditorPath: string, p_port: number): Promise<any> {

        /*
            * -----------------------------------------------------------------
            * Documentation for child_process.spawn(command[, args][, options])
            * -----------------------------------------------------------------

            The child_process.spawn() method spawns a new process
            using the given command, with command-line arguments in args.
            If omitted, args defaults to an empty array.

            If the shell option is enabled, do not pass unsanitized
            user input to this function. Any input containing shell
            metacharacters may be used to trigger arbitrary command execution.

            A third argument may be used to specify additional options, with these defaults:

            const defaults = {
                cwd: undefined,
                env: process.env
            };
        */

        if (!p_leoEditorPath) {
            return Promise.reject(Constants.USER_MESSAGES.LEO_PATH_MISSING);
        }

        let w_pythonPath = ""; // Command of child.spawn call

        this._leoIntegration.showTerminalPane(); // Show problems when running the server, if any.

        return utils.findNextAvailablePort(p_port).then((p_availablePort) => {
            if (!p_availablePort) {
                // vscode.window.showInformationMessage("Port " + p_port+" already in use.");
                return Promise.reject("Port " + p_port + " already in use.");
            }

            this.usingPort = p_availablePort;

            // Leo Editor installation path is mandatory - Start with Leo Editor's folder
            let w_serverScriptPath = p_leoEditorPath + "/leo/core";

            try {
                if (fs.existsSync(w_serverScriptPath + Constants.SERVER_NAME)) {
                    w_serverScriptPath += Constants.SERVER_NAME;
                } else {
                    return Promise.reject(Constants.USER_MESSAGES.CANNOT_FIND_SERVER_SCRIPT);
                }
            } catch (p_err) {
                console.error(p_err);
                return Promise.reject(Constants.USER_MESSAGES.CANNOT_FIND_SERVER_SCRIPT);
            }

            if (p_leoPythonCommand && p_leoPythonCommand.length) {
                // Start by running command (see executeCommand for multiple useful snippets)
                w_pythonPath = p_leoPythonCommand; // Set path
            } else {
                w_pythonPath = Constants.DEFAULT_PYTHON;
                if (this._isWin32) {
                    w_pythonPath = Constants.WIN32_PYTHON;
                }
            }

            const w_serverStartPromise = new Promise((p_resolve, p_reject) => {
                // Spawn a python child process for a leoBridge server
                this._resolvePromise = p_resolve;
                this._rejectPromise = p_reject;
            });

            // Setup arguments: Order is important!
            let w_args: string[] = []; //  "\"" + w_serverScriptPath + "\"" // For on windows ??

            // on windows, if the default py is used, make sure it's got a '-3'
            if (this._isWin32 && w_pythonPath === "py") {
                w_args.push("-3");
            }

            // The server script itself
            w_args.push(w_serverScriptPath);

            // Add port
            w_args.push("-p " + this.usingPort);

            if (this._leoIntegration.config.setPersist) {
                w_args.push("--persist");
            }

            if (this._leoIntegration.config.limitUsers > 1 &&
                this._leoIntegration.config.limitUsers < 256) {
                w_args.push("--limit " + this._leoIntegration.config.limitUsers);
            }

            const w_options: child.SpawnOptions = {
                // Child to run independently of its parent process. Depends on the platform.
                detached: this._leoIntegration.config.setDetached || this._leoIntegration.config.setPersist,
                windowsHide: true,
                // Runs command in a shell. '/bin/sh' on Unix, process.env.ComSpec on Windows.
                shell: this._leoIntegration.config.setShell
            };

            if (this._leoIntegration.config.setCwd) {
                if (vscode.workspace.workspaceFolders !== undefined &&
                    vscode.workspace.workspaceFolders.length) {
                    let w_folder = vscode.workspace.workspaceFolders[0].uri.path;
                    let w_file = vscode.workspace.workspaceFolders[0].uri.fsPath;
                    // If windows and start with a slash - remove it
                    // to get "c:/" instead of "/c:/"
                    if (this._isWin32) {
                        if (w_folder.substring(0, 1) === "/") {
                            w_folder = w_folder.substring(1);
                        }
                        w_folder = w_folder.replace(/\//g, '\\'); // convert to backslashes
                    }
                    const w_message = `Server CWD set to: ${w_folder}`;
                    w_options.cwd = w_folder;
                    this._leoIntegration.addTerminalPaneEntry(w_message);
                }
                else {
                    const message = "Working folder not found, 'CWD' not set";
                    vscode.window.showErrorMessage(message);
                }
            }

            if (this._leoIntegration.config.setShell) {
                w_pythonPath = w_pythonPath + " >1"; // ! TEST ! -----------------------
                // TODO : Other modifications to support shell flag
                w_options.stdio = ['inherit', 'inherit', 'inherit'];
                // w_options.stdio = ['pipe', 'pipe', 'pipe'];
                // w_options.stdio ['pipe', process.stdout, process.stderr];
            }

            this._leoIntegration.addTerminalPaneEntry(
                'Starting server with command: ' +
                w_pythonPath + " " + w_args.join(" ")
            );

            // * See https://nodejs.org/api/child_process.html for options
            this._serverProcess = child.spawn(w_pythonPath, w_args, w_options); // SPAWN method

            // To prevent the parent from waiting for a given subprocess to exit
            this._serverProcess.unref();

            // Capture the OUTPUT and send it to the "leo server" OutputChannel
            if (this._serverProcess && this._serverProcess.stdout) {
                this._serverProcess.stdout.on("data", (p_data: string) => {
                    this._processServerOutput(p_data);
                });
            } else {
                console.error("No stdout");
            }
            // Capture the ERROR channel and set flags on server errors
            if (this._serverProcess && this._serverProcess.stderr) {
                this._serverProcess.stderr.on("data", (p_data: string) => {
                    console.log(`stderr: ${p_data}`);
                    this._isStarted = false;
                    if (!this._leoIntegration.activated) {
                        return;
                    }
                    utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
                    this._serverProcess = undefined;
                    if (this._rejectPromise) {
                        this._rejectPromise(`stderr: ${p_data}`);
                    }
                });
            } else {
                console.error("No stderr");
            }
            // Capture the CLOSE event and set flags on server actually closing
            if (this._serverProcess) {
                this._serverProcess.on("close", (p_code: any) => {
                    console.log(`Leo server exited with code ${p_code}`);
                    this._isStarted = false;
                    if (!this._leoIntegration.activated) {
                        return;
                    }
                    utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
                    this._serverProcess = undefined;
                    if (this._rejectPromise) {
                        this._rejectPromise(`Leo server exited with code ${p_code}`);
                    }
                });
            }
            // Give out the promise that will resolve when the server is started
            return w_serverStartPromise;
        });

    }

    /**
     * * Kills the server if it was started by this instance of leoInteg
     */
    public killServer(): void {
        if (this._serverProcess) {
            // this._serverProcess.kill(); // Replaced by the tree-kill lib
            kill(this._serverProcess.pid);
            this._isStarted = false;
            if (!this._leoIntegration.activated) {
                return;
            }
            utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
            this._serverProcess = undefined;
        } else {
            console.error("No Server");
        }
    }

    /**
     * * Splits the received data into lines and parses output to detect server start event
     * * Otherwise just outputs lines to the terminal Output
     * @param p_data Data object (not pure string)
     */
    private _processServerOutput(p_data: string): void {
        let w_dataString = p_data.toString().replace(/\n$/, ""); // remove last
        w_dataString.toString().split("\n").forEach(p_line => {
            if (true || p_line) { // ? std out process line by line: json shouldn't have line breaks
                if (p_line.startsWith(Constants.SERVER_STARTED_TOKEN)) {
                    if (this._resolvePromise && !this._isStarted) {
                        this._isStarted = true;
                        this._resolvePromise(p_line); // * Server confirmed started
                    }
                }
                this._leoIntegration.addTerminalPaneEntry(p_line); // Output message anyways
            }
        });
    }

}
