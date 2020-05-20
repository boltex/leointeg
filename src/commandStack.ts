import * as vscode from "vscode";
import * as utils from "./utils";
import { UserCommand, RefreshType, LeoBridgePackage } from "./types";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";


export class CommandStack {

    private _stack: UserCommand[] = [];
    private _busy: boolean = false;

    private _finalRefreshType: RefreshType = RefreshType.NoRefresh; // Refresh type after last command is done. (Keep only if higher)
    private _finalFromOutline: boolean = false; // Set focus on outline instead of body? (Keep from last one pushed)
    private _receivedSelection: string = ""; // Selected node that was received from last command from a running stack

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {

    }

    /**
     * * Get command stack size
     * @returns the number of actions on the command stack
     */
    public size(): number {
        return this._stack.length;
    }

    /**
     * * Flag: Command stack is busy resolving actions through leoBridge
     * @returns true if waiting for command stack to finish, false otherwise
     */
    public isBusy(): boolean {
        return this._busy;
    }

    /**
     * * Adds on top and try to execute the bottom command if not already running
     * @param p_command a userCommand object about the action, the node if any, refresh type and fromOutline flag
     * @returns true if added, false if it could not due to stack 'rules': Targeted command (specified node) can only be added on an empty stack
     */
    public add(p_command: UserCommand): boolean {
        if (this.size() && p_command.node) {
            return false;
        } else {
            this._stack.push(p_command);
            this.tryStart();
            return true;
        }
    }

    /**
     * * Try to launch commands that were added on the stack if any
     */
    public tryStart(): void {
        if (this.size() && !this._busy) {
            // actions have beed added and command stack instance is not busy, so set the busy flag and start from the bottom
            this._busy = true; // Cleared when the last command has returned (and the stack is empty)
            this._receivedSelection = ""; // RESET last received selection so that lastSelectedNode is used instead if no node parameter
            this._runStackCommand().then(this._resolveResult);
        }
    }

    /**
     * * Do run the command at the index 0, (bottom) of the stack
     */
    private _runStackCommand(): Promise<LeoBridgePackage> {
        const w_command = this._stack[0]; // Reference from bottom of stack, don't remove yet

        // Build parameter's json here - use providedHeadline if needed
        let w_nodeJson: string = ""; // ap json used in building w_jsonParam
        let w_jsonParam: string = ""; // Finished parameter that is sent

        // First one uses given node or last selected node, other subsequent on stack will use _receivedSelection
        // (Commands such as 'collapse all' will just ignore passed on node parameter)
        const w_providedHeadline = w_command.providedHeadline; // Can be undefined
        if (w_command.node) {
            w_nodeJson = w_command.node.apJson; // Was node specific, so we are starting from a new stack of commands
        } else {
            // Use received "selected node" unless first, then use last selected node
            w_nodeJson = this._receivedSelection ? this._receivedSelection : this._leoIntegration.lastSelectedNode!.apJson;
        }
        if (w_providedHeadline) {
            w_jsonParam = utils.buildHeadlineJson(w_nodeJson, w_providedHeadline); // 'Insert Named Node' or 'Edit Headline'
        } else {
            w_jsonParam = w_nodeJson; // 'Insert Unnamed Node' or regular command
        }

        // Setup _finalRefreshType, if higher than the one setup so far
        this._finalRefreshType = w_command.refreshType > this._finalRefreshType ? w_command.refreshType : this._finalRefreshType;
        this._finalFromOutline = w_command.fromOutline; // and _finalFromOutline regardless of previous

        // Submit this action to Leo and return a promise of its packaged answer
        return this._leoIntegration.sendAction(w_command.action, w_jsonParam);
    }

    private _resolveResult(p_package: LeoBridgePackage): void {

        this._receivedSelection = p_package.node;


        // Resolve until last

        // IF LAST IS DONE THEN DO REFRESH OUTLINE AND FOCUS ON OUTLINE, OR BODY,

        // BODY MAY NEED TO BE FORCED REFRESHED IF ALREADY VISIBLE WHEN STACK FINISHES LAST ACTION



    }
}