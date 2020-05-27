import * as vscode from "vscode";
import { Constants } from "./constants";
import { AskMessageItem, RefreshType, runAskYesNoDialogParameters, runWarnMessageDialogParameters, runInfoMessageDialogParameters } from "./types";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Handles the functions called by Leo through leoBridge such as adding a log pane entry, runAskYesNoDialog for file changes, etc.
 * * Some config settings affect this behavior, such as defaultReloadIgnore and checkForChangeExternalFiles
 */
export class LeoAsync {

    private _askResult: string = "";

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) { }

    /**
     * * Adds message string to leoInteg's log pane, used when leoBridge gets an async 'log' command
     */
    public log(p_message: string): void {
        this._leoIntegration.addLogPaneEntry(p_message);
    }

    /**
     * * Equivalent to runAskYesNoDialog from Leo's qt_gui.py, used when leoBridge gets an async 'ask' command
     * * Opens a modal dialog to return one of 'yes', 'yes-all', 'no' or 'no-all' to be sent back with the leoBridge 'ASK_RESULT' action
     * @param p_askArg an async package object {"ask": title, "message": message, "yes_all": yes_all, "no_all": no_all}
     */
    public showAskModalDialog(p_askArg: runAskYesNoDialogParameters): void {
        this._askResult = "no"; // defaults to not doing anything, matches isCloseAffordance just to be safe
        // Note: "last line" could be eventually used in the message
        // const w_lastLine = p_askArg.message.substr(p_askArg.message.lastIndexOf("\n") + 1);
        const w_items: AskMessageItem[] = [
            {
                title: Constants.USER_MESSAGES.YES,
                value: Constants.ASYNC_ASK_RETURN_CODES.YES,
                isCloseAffordance: false
            },
            {
                title: Constants.USER_MESSAGES.NO,
                value: Constants.ASYNC_ASK_RETURN_CODES.NO,
                isCloseAffordance: true
            }
        ];
        if (p_askArg.yes_all) {
            w_items.push({
                title: Constants.USER_MESSAGES.YES_ALL,
                value: Constants.ASYNC_ASK_RETURN_CODES.YES_ALL,
                isCloseAffordance: false
            });
        }
        if (p_askArg.no_all) {
            w_items.push({
                title: Constants.USER_MESSAGES.NO_ALL,
                value: Constants.ASYNC_ASK_RETURN_CODES.NO_ALL,
                isCloseAffordance: false
            });
        }
        const w_askRefreshInfoMessage: Thenable<AskMessageItem | undefined> = vscode.window.showInformationMessage(
            p_askArg.message,
            { modal: true },
            ...w_items
        );
        w_askRefreshInfoMessage.then((p_result: AskMessageItem | undefined) => {
            if (p_result) {
                this._askResult = p_result.value;
            }
            const w_sendResultPromise = this._leoIntegration.sendAction(Constants.LEOBRIDGE.ASK_RESULT, '"' + this._askResult + '"'); // Quotes in string as a 'JSON parameter'
            if (this._askResult.includes(Constants.ASYNC_ASK_RETURN_CODES.YES)) {
                w_sendResultPromise.then(() => {
                    // Might have answered 'yes/yesAll' and refreshed and changed the body text
                    this._leoIntegration.launchRefresh(RefreshType.RefreshTreeAndBody, false); // TODO : #34 @boltex Deal with focus placement
                });
            }
        });
    }

    /**
     * * Equivalent to runAskOkDialog from Leo's qt_gui.py, used when leoBridge gets an async 'warn' command
     * @param p_waitArg an async package object {"warn": "", "message": ""}
     */
    public showWarnModalMessage(p_waitArg: runWarnMessageDialogParameters): void {
        vscode.window.showInformationMessage(
            p_waitArg.message,
            { modal: true }
        ).then(() => {
            this._leoIntegration.sendAction(Constants.LEOBRIDGE.ASK_RESULT, Constants.ASYNC_ASK_RETURN_CODES.OK); // Quotes in string as a 'JSON parameter'
        });
    }

    /**
     * * Show non-blocking info message about detected file changes, used when leoBridge gets an async 'info' command
     * @param p_infoArg an async package object { "message": string; }
     */
    public showChangesDetectedInfoMessage(p_infoArg: runInfoMessageDialogParameters): void {
        let w_message = Constants.USER_MESSAGES.CHANGES_DETECTED;
        switch (p_infoArg.message) {
            case Constants.ASYNC_INFO_MESSAGE_CODES.ASYNC_REFRESHED:
                w_message += Constants.USER_MESSAGES.REFRESHED;
                this._leoIntegration.launchRefresh(RefreshType.RefreshTreeAndBody, false); // TODO : #34 @boltex Deal with focus placement
                break;
            case Constants.ASYNC_INFO_MESSAGE_CODES.ASYNC_IGNORED:
                w_message += Constants.USER_MESSAGES.IGNORED;
                break;
            default:
                break;
        }
        vscode.window.showInformationMessage(w_message);
    }
}
