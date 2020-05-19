import * as vscode from "vscode";
import * as utils from "./utils";
import { UserCommand, RefreshType } from "./types";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";


export class CommandStack {

    private _stack: UserCommand[] = [];
    private _busy: boolean = false;

    private _finalRefreshType: RefreshType = RefreshType.NoRefresh; // Refresh type after last command is done. (Keep only if higher)
    private _finalFromOutline: boolean = false; // Set focus on outline instead of body? (Keep from last one pushed)

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {

    }

    public size(): number {
        return this._stack.length;
    }

    public isBusy(): boolean {
        return this._busy;
    }

    public add(p_command: UserCommand): boolean {
        // * Adds on top and try to execute the bottom command if not already running
        // Returns true if added, false if it could not be added due to stack 'rules':
        // Targeted command (node not undefined) can only be added on an empty stack
        if (this._stack.length && p_command.node) {
            return false;
        } else {
            this._stack.push(p_command);
            this.tryStart();
            return true;
        }
    }

    public tryStart(): void {
        // Try to launch from bottom: index 0, if not already running
    }

    private _lastCommandDone(): void {

    }

}