import * as vscode from "vscode";
import * as utils from "./utils";
import { UserCommand, LeoBridgePackage, ReqRefresh, ArchivedPosition, Focus } from "./types";
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
    public finalRefreshType: ReqRefresh = {}; // new empty ReqRefresh
    private _allowDetachedExclusion = true;

    // Flag used to set focus on outline instead of body when done resolving (From last pushed)
    private _finalFocus: Focus = Focus.NoChange;

    // Received selection from the last command that finished
    // It will be re-sent as 'target node' instead of lastSelectedNode if present
    public lastReceivedNode: ArchivedPosition | undefined;
    public lastReceivedNodeTS: number = 0;

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
            this.lastReceivedNode = undefined;
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
            this._finalFocus = p_command.finalFocus; // Set final "focus-placement"
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

        let w_node: ArchivedPosition | undefined; // ap json used in building w_jsonParam

        // First command uses given node or last selected node.
        // Other subsequent commands on stack will use _receivedSelection regardless.
        // (Commands such as 'collapse all' just ignore node parameter)
        if (w_command.node) {
            // Was node specific, so starting a new stack of commands
            w_node = w_command.node;
        } else {
            // Use received "selected node" unless first use, then use last selected node
            if (this.lastReceivedNode) {
                w_node = this.lastReceivedNode;
            } else {
                w_node = this._leoIntegration.lastSelectedNode ? this._leoIntegration.lastSelectedNode : undefined;
            }
            if (!w_node) {
                console.log('ERROR NO ARCHIVED POSITION JSON');
                throw new Error("ERROR NO ARCHIVED POSITION JSON");
            }
        }
        const w_jsonParam = utils.buildNodeCommand(w_node!, w_command); // 'Insert Named Node' or 'Edit Headline'

        // Setup _finalRefreshType, if command requires higher than the one setup so far
        Object.assign(this.finalRefreshType, w_command.refreshType); // add all properties (expecting only 'true' properties)

        // TODO : Maybe implement this in a better way: excludeDetached IS A NEGATIVE FLAG 
        // * Check if we added a body refresh that did not exclude detached. If so make it also refresh detached.
        if (w_command.refreshType.body && !w_command.refreshType.excludeDetached) {
            this._allowDetachedExclusion = false;
        }
        if (!this._allowDetachedExclusion && this.finalRefreshType.excludeDetached) {
            delete this.finalRefreshType.excludeDetached;
        }

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

        this.lastReceivedNode = p_package.node;
        this.lastReceivedNodeTS = performance.now();

        if (this._leoIntegration.isExecuteScript) {
            // Reset the flag after small delay.
            setTimeout(() => {
                this._leoIntegration.isExecuteScript = false;
            }, 250);
        }

        if (!this.size()) {
            // If last is done then do refresh outline and focus on outline, or body, as required
            this._busy = false;
            if (Object.keys(this.finalRefreshType).length) {
                // At least some type of refresh
                this._leoIntegration.setupRefresh(
                    this._finalFocus,
                    this.finalRefreshType,
                    p_package.node
                );
                this._leoIntegration.launchRefresh();
            }
            // Reset refresh type nonetheless
            this.finalRefreshType = {};
            this._allowDetachedExclusion = true;
        } else {
            // Size > 0, so call _runStackCommand again, keep _busy set to true
            this._runStackCommand().then((p_package: LeoBridgePackage) => {
                this._resolveResult(p_package);
            });
        }
    }

}
