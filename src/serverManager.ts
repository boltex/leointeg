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
    private _skippedFirstEmpty = false; // if first ever empty line was skipped. (for esthetics only)
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

        this._skippedFirstEmpty = false;

        if (!p_leoEditorPath || !p_leoEditorPath.trim()) {
            return Promise.reject(Constants.USER_MESSAGES.LEO_PATH_MISSING);
        }
        p_leoEditorPath = p_leoEditorPath.trim();

        let w_pythonPath = ""; // Command of child.spawn call

        return utils.findNextAvailablePort(p_port).then((p_availablePort) => {
            if (!p_availablePort) {
                // vscode.window.showInformationMessage("Port " + p_port+" already in use.");
                return Promise.reject("Port " + p_port + " already in use.");
            }

            this.usingPort = p_availablePort;

            // Leo Editor installation path is mandatory - Start with Leo Editor's folder
            let w_serverScriptPath = p_leoEditorPath + Constants.SERVER_PATH;

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

            if (this._leoIntegration.config.limitUsers > 1 &&
                this._leoIntegration.config.limitUsers < 256) {
                w_args.push("--limit");
                w_args.push(this._leoIntegration.config.limitUsers.toString());
            }

            // Add port
            w_args.push("--port");
            w_args.push(this.usingPort.toString());

            const w_options: child.SpawnOptions = {
                // Child to run independently of its parent process.
                // (Depends on the platform)
                detached: this._leoIntegration.config.setDetached,
                // If possible hide the terminal window that could appear
                windowsHide: true,
            };

            this._leoIntegration.addLogPaneEntry(
                'Launching server with command: ' +
                w_pythonPath + " " + w_args.join(" ")
            );

            // Spawn the process
            this._serverProcess = child.spawn(w_pythonPath, w_args, w_options);

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
                    if (p_data.toLocaleLowerCase().includes('warning:')) {
                        vscode.window.showInformationMessage(
                            "leoserver issued warning: ",
                            p_data
                        );
                        return;
                    }
                    console.log(`stderr: ${p_data}`);

                    if (!this._leoIntegration.activated) {
                        return;
                    }

                    this.killServer();

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
                    console.log(`Leo server process closed with code ${p_code}`);
                    this._isStarted = false;
                    if (!this._leoIntegration.activated) {
                        return;
                    }
                    utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, false);

                    this._leoIntegration.leoStates.leoConnecting = false;
                    this._leoIntegration.leoStates.leoBridgeReady = false;
                    this._leoIntegration.leoStates.fileOpenedReady = false;
                    this._leoIntegration.leoStates.leoStartingServer = false;

                    this._serverProcess = undefined;
                    if (this._rejectPromise) {
                        this._rejectPromise(`Leo server exited with code ${p_code}`);
                    }
                });

                this._serverProcess.on('error', (err: Error & { code?: string; path?: string }) => {
                    console.error('Failed to start subprocess:', err);

                    const errorTable: { [key: string]: string } = {
                        'ENOENT': 'ENOENT: File or command not found.',
                        'EACCES': 'EACCES: Permission denied.',
                        'ENOMEM': 'ENOMEM: Not enough memory to start the process.',
                        'EAGAIN': 'EAGAIN: Resource temporarily unavailable.',
                        'EINVAL': 'EINVAL: Invalid argument.',
                        'EMFILE': 'EMFILE: Too many open files in system.',
                        'ENFILE': 'ENFILE: File table overflow.',
                        'ESRCH': 'ESRCH: No such process.',
                        'EIO': 'EIO: Input/output error.',
                        'EISDIR': 'EISDIR: Illegal operation on a directory.'
                    };

                    let message;
                    if (err.code === 'ENOENT') {
                        message = "System could not resolve path to launch python: " + err.path;
                    } else if (err.code && errorTable[err.code]) {
                        message = "Process exited with error:" + errorTable[err.code];
                    } else {
                        message = "Process exited with error:" + err.message;
                    }

                    this.killServer();

                    if (this._rejectPromise) {
                        this._rejectPromise(message);
                    }
                });

                // Capture the EXIT event
                this._serverProcess.on('exit', (code, signal) => {
                    console.log(`Leo server process exited with code: ${code}, signal: ${signal}`);
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
            if (typeof this._serverProcess.pid === 'number') {
                kill(this._serverProcess.pid);
            } else {
                // console.log('this._serverProcess.pid -->', this._serverProcess.pid);
            }
            this._isStarted = false;
            if (!this._leoIntegration.activated) {
                return;
            }
            utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, false);

            this._leoIntegration.leoStates.leoConnecting = false;
            this._leoIntegration.leoStates.leoBridgeReady = false;
            this._leoIntegration.leoStates.fileOpenedReady = false;
            this._leoIntegration.leoStates.leoStartingServer = false;

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
        if (!this._skippedFirstEmpty) {
            if (w_dataString && (w_dataString.charCodeAt(0) === 10 || w_dataString.charCodeAt(0) === 13)) {
                this._skippedFirstEmpty = true; // Skipping first empty line for esthetics only
                return;
            }
        }
        w_dataString.toString().split("\n").forEach(p_line => {
            if (true || p_line) { // ? std out process line by line: json shouldn't have line breaks
                if (p_line.startsWith(Constants.SERVER_STARTED_TOKEN)) {
                    if (this._resolvePromise && !this._isStarted) {
                        this._isStarted = true;
                        this._resolvePromise(p_line); // * Server confirmed started
                    }
                }
                this._leoIntegration.addLogPaneEntry(p_line); // Output message anyways
            }
        });
    }

}

