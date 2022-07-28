import * as vscode from "vscode";
import * as utils from "./utils";
import { UserCommand, LeoBridgePackage, ReqRefresh } from "./types";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Front-facing, user command stack of actions
 * This implements a user-facing command stack, (push on top, remove bottom)
 * Commands can also be added while this stack has started resolving.
 * This 'stack' concept is similar to the 'LeoBridge' class used for interacting with Leo.
 */
export class CommandStack {

    private _stack: UserCommand[] = []; // Actual commands array
    private _busy: boolean = false; // Flag stating commands started resolving

    // Refresh type, for use after the last command has done resolving (From highest so far)
    private _finalRefreshType: ReqRefresh = {}; // new empty ReqRefresh

    // Flag used to set focus on outline instead of body when done resolving (From last pushed)
    private _finalFromOutline: boolean = false;

    // Received selection from the last command that finished as JSON string representation
    // It will be re-sent as 'target node' instead of lastSelectedNode if present
    private _selectedNodeJSON: string = ""; // Empty string is used as 'falsy'

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) { }

    /**
     * * Returns the command stack size
     * @returns number of actions on the command stack
     */
    public size(): number {
        return this._stack.length;
    }

    /**
     * * Signal to the command stack that a new selected node was received.
     * Command stack needs to know when to clear its own '_receivedSelection'
     */
    public newSelection(): void {
        if (!this._busy) {
            this._selectedNodeJSON = "";
        }
    }

    /**
     * * Adds on top and try to execute the bottom command if not already running
     * Targeted command (targeting a specific node) can only be added on an empty stack
     * @param p_command Object that has the action, targeted node (if any), refresh type and 'fromOutline' flag
     * @returns true if added, false if it could not (due to front end stack 'rules')
     */
    public add(p_command: UserCommand): Promise<LeoBridgePackage> | undefined {
        if (p_command.node && this.size()) {
            return undefined; // Can only add a command which targets a node if the stack is empty
        } else {
            const q_promise = new Promise<LeoBridgePackage>((p_resolve, p_reject) => {
                p_command.resolveFn = p_resolve;
                p_command.rejectFn = p_reject;
            });
            this._stack.push(p_command);
            this._finalFromOutline = p_command.fromOutline; // Set final "focus-placement"
            this._tryStart();
            return q_promise;
        }
    }

    /**
     * * Try to launch commands that were added on the stack, if any.
     */
    private _tryStart(): void {
        if (this.size() && !this._busy) {
            // Ok to start, so set the busy flag and start from the bottom
            this._busy = true; // Cleared when the last command has returned (and the stack is empty)
            this._runStackCommand().then((p_package: LeoBridgePackage) => {
                this._resolveResult(p_package);
            });
        }
    }

    /**
     * * Run the command at index 0: The bottom of the stack.
     */
    private _runStackCommand(): Promise<LeoBridgePackage> {
        // Reference from bottom of stack, but don't remove it yet!
        const w_command: UserCommand = this._stack[0];

        let w_nodeJson: string = ""; // ap json used in building w_jsonParam
        let w_jsonParam: string = ""; // Finished parameter that is sent

        // First command uses given node or last selected node.
        // Other subsequent commands on stack will use _receivedSelection regardless.
        // (Commands such as 'collapse all' just ignore node parameter)
        if (w_command.node) {
            // Was node specific, so starting a new stack of commands
            w_nodeJson = JSON.stringify(w_command.node);
        } else {
            // Use received "selected node" unless first use, then use last selected node
            if (this._selectedNodeJSON) {
                w_nodeJson = this._selectedNodeJSON;
            } else {
                w_nodeJson = this._leoIntegration.lastSelectedNode ? JSON.stringify(this._leoIntegration.lastSelectedNode) : "";
            }
            if (!w_nodeJson) {
                console.log('ERROR NO ARCHIVED POSITION JSON');
            }
        }
        w_jsonParam = utils.buildNodeCommandJson(w_nodeJson, w_command); // 'Insert Named Node' or 'Edit Headline'

        // Setup _finalRefreshType, if command requires higher than the one setup so far
        Object.assign(this._finalRefreshType, w_command.refreshType); // add all properties (expecting only 'true' properties)

        // Submit this action to Leo and return a promise of its packaged answer
        return this._leoIntegration.sendAction(w_command.action, w_jsonParam)
            .then((p_package) => {
                if (w_command.resolveFn) {
                    w_command.resolveFn(p_package);
                }
                return p_package;
            },
                (p_reason) => {
                    if (w_command.rejectFn) {
                        w_command.rejectFn(p_reason);
                    }
                    return p_reason;
                }
            );
    }

    /**
     * * Handle the result from the command that has finished: either launch the next one, or refresh accordingly.
     * @param p_package is the json return 'package' that was just received back from Leo
     */
    private _resolveResult(p_package: LeoBridgePackage): void {
        this._stack.shift(); // Finally remove resolved command from stack bottom

        this._selectedNodeJSON = JSON.stringify(p_package.node);

        if (!this.size()) {
            // If last is done then do refresh outline and focus on outline, or body, as required
            this._busy = false;
            if (Object.keys(this._finalRefreshType).length) {
                // At least some type of refresh
                this._leoIntegration._setupRefresh(
                    this._finalFromOutline,
                    this._finalRefreshType,
                    p_package.node
                );
                this._leoIntegration.launchRefresh();
            }
            // Reset refresh type nonetheless
            this._finalRefreshType = {};
            // this._finalFromOutline = false; // ? MAYBE do NOT reset last finalFromOutline ?
        } else {
            // Size > 0, so call _runStackCommand again, keep _busy set to true
            this._runStackCommand().then((p_package: LeoBridgePackage) => {
                this._resolveResult(p_package);
            });
        }
    }

}
