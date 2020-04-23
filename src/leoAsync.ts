import * as vscode from "vscode";
import { Constants } from "./constants";
import { AskMessageItem } from "./types";
import { LeoIntegration } from "./leoIntegration";
import { LeoBridge } from "./leoBridge";

export class LeoAsync {
    // * Functions called by Leo through leoBridge such as adding a log pane entry, runAskYesNoDialog for file changes, etc.

    private _askResult: string = "";

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration,
        private _leoBridge: LeoBridge
    ) { }

    public log(p_message: string): void {
        // * Adds message string to leoInteg's log pane, used when leoBridge gets an async 'log' command
        this._leoIntegration.addLogPaneEntry(p_message);
    }

    public showAskModalDialog(p_askArg: { "ask": string; "message": string; "yes_all": boolean; "no_all": boolean; }): void {
        // * Equivalent to runAskYesNoDialog from Leo's qt_gui.py, used when leoBridge gets an async 'ask' command
        // async package {"ask": title, "message": message, "yes_all": yes_all, "no_all": no_all}

        // Setup modal dialog to return one of 'yes', 'yes-all', 'no' or 'no-all', to be sent back with the leoBridge 'ASK_RESULT' action
        this._askResult = "no"; // defaults to not doing anything, matches isCloseAffordance just to be safe

        // const lastLine = p_askArg.message.substr(p_askArg.message.lastIndexOf("\n") + 1); // last line could be used in the message
        const w_items: AskMessageItem[] = [
            { title: Constants.USER_MESSAGES.YES, value: "yes", isCloseAffordance: false },
            { title: Constants.USER_MESSAGES.NO, value: "no", isCloseAffordance: true }
        ];
        if (p_askArg.yes_all) {
            w_items.push({ title: Constants.USER_MESSAGES.YES_ALL, value: "yes-all", isCloseAffordance: false });
        }
        if (p_askArg.no_all) {
            w_items.push({ title: Constants.USER_MESSAGES.NO_ALL, value: "no-all", isCloseAffordance: false });
        }
        const askRefreshInfoMessage: Thenable<AskMessageItem | undefined> = vscode.window.showInformationMessage(
            p_askArg.message,
            { modal: true },
            ...w_items
        );
        askRefreshInfoMessage.then((p_result: AskMessageItem | undefined) => {
            if (p_result) {
                this._askResult = p_result.value;
            }
            const w_sendResultPromise = this._leoBridge.action(Constants.LEOBRIDGE_ACTIONS.ASK_RESULT, '"' + this._askResult + '"');
            if (this._askResult.includes("yes")) {
                w_sendResultPromise.then(() => {
                    // Might have answered 'yes/yesAll' and refreshed and changed the body text
                    this._leoIntegration.refreshOutlineAndBody();
                });
            }
        });
    }

    public showWarnModalMessage(p_waitArg: any): void {
        // * Equivalent to runAskOkDialog from Leo's qt_gui.py, used when leoBridge gets an async 'warn' command
        // async package {"warn": "", "message": ""}
        vscode.window.showInformationMessage(
            p_waitArg.message,
            { modal: true }
        ).then(() => {
            this._leoBridge.action(Constants.LEOBRIDGE_ACTIONS.ASK_RESULT, '"ok"');
        });
    }

    public showChangesDetectedInfoMessage(p_infoArg: { "message": string; }): void {
        // * Show non-blocking info message about detected file changes, used when leoBridge gets an async 'info' command
        // TODO : Message pre-built elsewhere, and flags for refresh in independent event/call
        let w_message = "Changes to external files were detected.";
        switch (p_infoArg.message) {
            case Constants.ASYNC_INFO_MESSAGE_CODES.ASYNC_REFRESHED:
                w_message = w_message + Constants.USER_MESSAGES.REFRESHED;
                // * refresh
                this._leoIntegration.refreshOutlineAndBody();
                break;
            case Constants.ASYNC_INFO_MESSAGE_CODES.ASYNC_IGNORED:
                w_message = w_message + Constants.USER_MESSAGES.IGNORED;
                break;
            default:
                break;
        }
        vscode.window.showInformationMessage(w_message);
    }
}