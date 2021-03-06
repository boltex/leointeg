import * as os from 'os';
import * as child from 'child_process';
import * as path from "path"; // TODO : Use this to have reliable support for window-vs-linux file-paths
import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { LeoIntegration } from './leoIntegration';

/**
 * * Leo bridge server service
 * Provides simple automatic leo bridge server startup functionality
 */
export class ServerService {
    // TODO : See #10 @boltex Problem starting the leo-bridge server automatically with anaconda/miniconda on windows
    // See https://github.com/yhirose/vscode-filtertext/blob/master/src/extension.ts#L196

    private _platform: string;
    private _isWin32: boolean;

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
     * * Splits the received data into lines and parses output to detect server start event
     * * Otherwise just outputs lines to the terminal Output
     * @param p_data Data object (not pure string)
     */
    private _gotTerminalData(p_data: string): void {
        p_data.toString().split("\n").forEach(p_line => {
            p_line = p_line.trim();
            if (p_line) { // * std out process line by line: json shouldn't have line breaks
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

    /**
     * * Get command from settings or best command for the current OS
     * @param p_leoPythonCommand String command to start python on this computer
     * @returns A promise that resolves when the server is started, or that is rejected in case of problem while starting
     */
    public startServer(p_leoPythonCommand: string, p_leoServerPath: string): Promise<any> {

        let w_pythonPath = ""; // Command of child.spawn call

        /*
            * For child_process.spawn(command[, args][, options])

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
        this._leoIntegration.showTerminalPane(); // Show problems when running the server, if any.

        // If a leo server path is set then use it - otherwise use old script for now
        const w_serverScriptPath = p_leoServerPath ? p_leoServerPath : this._context.extensionPath + Constants.SERVER_PATH;

        if (p_leoPythonCommand && p_leoPythonCommand.length) {
            // Start by running command (see executeCommand for multiple useful snippets)
            w_pythonPath = p_leoPythonCommand; // Set path
            this._leoIntegration.addTerminalPaneEntry('Starting server with command: ' + p_leoPythonCommand);
        } else {
            w_pythonPath = Constants.DEFAULT_PYTHON;
            if (this._isWin32) {
                w_pythonPath = Constants.WIN32_PYTHON;
            }
            this._leoIntegration.addTerminalPaneEntry('Starting server with command : ' +
                w_pythonPath + ((this._isWin32 && w_pythonPath === "py") ? " -3 " : "") +
                " " + w_serverScriptPath);
        }

        const w_serverStartPromise = new Promise((p_resolve, p_reject) => {
            // * Spawn a python child process for a leoBridge server
            this._resolvePromise = p_resolve;
            this._rejectPromise = p_reject;
        });

        let w_args: string[] = []; //  "\"" + w_serverScriptPath + "\"" // For on windows ??

        if (this._isWin32 && w_pythonPath === "py") {
            w_args.push("-3");
        }
        w_args.push(w_serverScriptPath);
        this._serverProcess = child.spawn(w_pythonPath, w_args);

        if (this._serverProcess && this._serverProcess.stdout) {
            // * Capture the python process output
            this._serverProcess.stdout.on("data", (p_data: string) => {
                this._gotTerminalData(p_data);
            });
        } else {
            console.error("No stdout");
        }
        if (this._serverProcess && this._serverProcess.stderr) {
            // * Capture other python process outputs
            this._serverProcess.stderr.on("data", (p_data: string) => {
                console.log(`stderr: ${p_data}`);
                this._isStarted = false;
                utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
                this._serverProcess = undefined;
                if (this._rejectPromise) {
                    this._rejectPromise(`stderr: ${p_data}`);
                }
            });
        } else {
            console.error("No stderr");
        }
        if (this._serverProcess) {
            this._serverProcess!.on("close", (p_code: any) => {
                console.log(`leoBridge exited with code ${p_code}`);
                this._isStarted = false;
                utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
                this._serverProcess = undefined;
                if (this._rejectPromise) {
                    this._rejectPromise(`leoBridge exited with code ${p_code}`);
                }
            });
        }

        return w_serverStartPromise;
    }

}
