import * as vscode from "vscode";
import * as utils from "./utils";
import { UserCommand, RefreshType, LeoBridgePackage } from "./types";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Front-facing, user command stack of actions. Actions can also be added once started resolving.
 */
export class CommandStack {

    private _stack: UserCommand[] = [];
    private _busy: boolean = false;

    private _finalRefreshType: RefreshType = RefreshType.NoRefresh; // Refresh type after last command is done. (Keep only if higher)
    private _finalFromOutline: boolean = false; // Set focus on outline instead of body? (Keep from last one pushed)

    // * Received selection from the last command that finished.
    // * Note: JSON string representation of a node, will be re-sent as node to leo instead of lastSelectedNode
    private _receivedSelection: string = ""; // Selected node that was received from last command from a running stack. Empty string is used as 'false'.

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {
        this._busy = false;
    }

    /**
     * * Get command stack size
     * @returns the number of actions on the command stack
     */
    public size(): number {
        return this._stack.length;
    }

    /**
     * * Signal to the command stack that a new selected node was received in case it needed to know when to clear its own '_receivedSelection'
     */
    public newSelection(): void {
        if (!this._busy) {
            this._receivedSelection = "";
        }
    }

    /**
     * * Adds on top and try to execute the bottom command if not already running
     * @param p_command a userCommand object about the action, the node if any, refresh type and fromOutline flag
     * @returns true if added, false if it could not due to stack 'rules': Targeted command (specified node) can only be added on an empty stack
     */
    public add(p_command: UserCommand): boolean {
        if (this.size() && p_command.node) {
            // If already started we only if if action requires generic selected node as param
            return false;
        } else {
            this._stack.push(p_command);
            // This flag is set on command entered, not when finally executed because a rapid type in editor can override focus
            this._finalFromOutline = p_command.fromOutline; // use the last _finalFromOutline regardless of previous so change now
            this._tryStart();
            return true;
        }
    }

    /**
     * * Try to launch commands that were added on the stack if any
     */
    private _tryStart(): void {
        if (this.size() && !this._busy) {

            // actions have beed added and command stack instance is not busy, so set the busy flag and start from the bottom
            this._busy = true; // Cleared when the last command has returned (and the stack is empty)

            this._runStackCommand().then((p_package: LeoBridgePackage) => {
                this._resolveResult(p_package);
            });
        }
    }

    /**
     * * Run the command at the index 0, the bottom of the stack
     */
    private _runStackCommand(): Promise<LeoBridgePackage> {
        // console.log('Running from a stack of', this._stack.length);

        const w_command = this._stack[0]; // Reference from bottom of stack, don't remove yet

        // Build parameter's json here - use providedHeadline if needed
        let w_nodeJson: string = ""; // ap json used in building w_jsonParam
        let w_jsonParam: string = ""; // Finished parameter that is sent

        // First one uses given node or last selected node, other subsequent on stack will use _receivedSelection
        // (Commands such as 'collapse all' will just ignore passed on node parameter)
        const w_providedHeadline = w_command.providedHeadline; // Can be undefined
        if (w_command.node) {
            // console.log('USING SPECIFIC Node');

            w_nodeJson = w_command.node.apJson; // Was node specific, so we are starting from a new stack of commands
        } else {
            // Use received "selected node" unless first, then use last selected node
            // console.log(`NOT SPECIFIC node, busy is ${this._busy}`);

            if (this._receivedSelection) {
                // console.log('USING LAST _receivedSelection, SHOULD SEE NEXT ABOVE!');

                w_nodeJson = this._receivedSelection;
            } else {
                // console.log('USING LAST lastSelectedNode');

                w_nodeJson = this._leoIntegration.lastSelectedNode!.apJson;
            }
            if (!w_nodeJson) {
                console.log('ERROR NO ARCHIVED POSITION JSON');
            }
        }
        if (w_providedHeadline) {
            w_jsonParam = utils.buildNodeAndTextJson(w_nodeJson, w_providedHeadline); // 'Insert Named Node' or 'Edit Headline'
        } else {
            w_jsonParam = w_nodeJson; // 'Insert Unnamed Node' or regular command
        }

        // Setup _finalRefreshType, if higher than the one setup so far
        this._finalRefreshType = w_command.refreshType > this._finalRefreshType ? w_command.refreshType : this._finalRefreshType;

        // Submit this action to Leo and return a promise of its packaged answer
        return this._leoIntegration.sendAction(w_command.action, w_jsonParam);
    }

    /**
     * * Handle the result from the command that has finished, and either launch the next one refresh accordingly
     * @param p_package is the json return 'package' that was just received back from Leo
     */
    private _resolveResult(p_package: LeoBridgePackage): void {
        this._stack.shift();
        // If last is done then do refresh outline and focus on outline, or body
        // console.log('p_package :', p_package);

        // TODO : p_package members names should be made into constants

        this._receivedSelection = JSON.stringify(p_package.node); // ! Maybe set this._receivedSelection to the last one anyways ?
        if (!this.size()) {
            // Reset 'received' selected node so that lastSelectedNode is used instead
            // this._receivedSelection = ""; // ! Maybe not clear this here at this point!

            this._busy = false; // We're not busy anymore // ! maybe keep using _receivedSelection instead of clearing it?
            // console.log(`busy NOW FALSE :  ${this._busy}`);

            if (this._finalRefreshType) {
                // At least some type of refresh
                this._leoIntegration.launchRefresh(this._finalRefreshType, this._finalFromOutline);
            }
            // Reset refresh type and focus flag nonetheless
            this._finalRefreshType = RefreshType.NoRefresh;
            this._finalFromOutline = false;

        } else {
            // size > 0, so call _runStackCommand again, keep _busy set to true
            // console.log('Next!');
            this._runStackCommand().then((p_package: LeoBridgePackage) => {
                this._resolveResult(p_package);
            });
        }

    }
}