import * as vscode from "vscode";
import { Constants } from "./constants";
import {
    AskMessageItem,
    runAskYesNoDialogParameters,
    runWarnMessageDialogParameters,
    runInfoMessageDialogParameters,
    showSaveAsDialogParameters
} from "./types";
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
    public log(p_message: string, p_color?: string): void {
        if (p_color && p_color === Constants.LOG_ALERT_COLOR) {
            // Red Detected: Force showing the log pane for 'errors' in the log pane.
            this._leoIntegration.showLogPane();
        }
        this._leoIntegration.addLogPaneEntry(p_message);
    }

    /**
     * * Server announced the multi-user content changed: Debounce a refresh cycle.
     * The 'action' string can be checked to determine what kind, if any, is required.
     * Note: 'Getters' and the 'do_nothing' actions are NOT shared by the server.
     * @param p_serverPackage the package sent along by the server
     */
    public refresh(p_serverPackage: any): Promise<unknown> {
        // setup refresh 'all' by default for now.
        this._leoIntegration.setupRefresh(
            this._leoIntegration.fromOutline,
            {
                tree: true,
                body: true,
                states: true,
                buttons: true,
                documents: true
            }
        );
        if (p_serverPackage.opened && this._leoIntegration.leoStates.fileOpenedReady) {
            // * PASS (refresh all already setup)
            // this._leoIntegration.refreshAll();
        } else if (p_serverPackage.opened && !this._leoIntegration.leoStates.fileOpenedReady) {
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.DO_NOTHING)
                .then((p_doNothingPackage) => {
                    p_doNothingPackage.filename = p_doNothingPackage.commander!.fileName;
                    this._leoIntegration.serverHasOpenedFile = true;
                    this._leoIntegration.serverOpenedFileName = p_doNothingPackage.filename!;
                    this._leoIntegration.serverOpenedNode = p_doNothingPackage.node!;
                    return this._leoIntegration.launchRefresh();
                });
        } else {
            this._leoIntegration.serverHasOpenedFile = false;
            this._leoIntegration.serverOpenedFileName = "";
            this._leoIntegration.serverOpenedNode = undefined;
        }
        this._leoIntegration.launchRefresh();
        return Promise.resolve();
    }

    /**
     * * Equivalent to runSaveFileDialog from Leo's qt_gui.py, used when leoBridge gets an async 'ask' command
     * @param p_saveAsArg
     */
    public showSaveAsDialog(p_saveAsArg: showSaveAsDialogParameters): void {
        console.log('TODO: SHOW SAVE AS DIALOG!');
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
            const w_sendResultPromise = this._leoIntegration.sendAction(
                Constants.LEOBRIDGE.ASK_RESULT,
                JSON.stringify({ "result": this._askResult })
            );
            if (this._askResult.includes(Constants.ASYNC_ASK_RETURN_CODES.YES)) {
                w_sendResultPromise.then(() => {
                    //  this._leoIntegration.launchRefresh({ tree: true, body: true, buttons: true, states: true, documents: true }, false);
                    return this._leoIntegration.sendAction(Constants.LEOBRIDGE.DO_NOTHING);
                }).then((p_package) => {
                    // refresh and reveal selection
                    this._leoIntegration.setupRefresh(
                        false,
                        {
                            tree: true,
                            body: true,
                            states: true,
                            buttons: true,
                            documents: true
                        },
                        p_package.node
                    );
                    this._leoIntegration.launchRefresh();
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
            this._leoIntegration.sendAction(
                Constants.LEOBRIDGE.ASK_RESULT,
                JSON.stringify({ "result": Constants.ASYNC_ASK_RETURN_CODES.OK })
            );
        });
    }

    /**
     * * Show non-blocking info message about detected file changes, used when leoBridge gets an async 'info' command
     * @param p_infoArg an async package object { "message": string; }
     */
    public showChangesDetectedInfoMessage(p_infoArg: runInfoMessageDialogParameters): void {
        let w_message = "";
        switch (p_infoArg.message) {
            case Constants.ASYNC_INFO_MESSAGE_CODES.ASYNC_REFRESHED:
                w_message = Constants.USER_MESSAGES.CHANGES_DETECTED + Constants.USER_MESSAGES.REFRESHED;

                this._leoIntegration.sendAction(Constants.LEOBRIDGE.DO_NOTHING)
                    .then((p_package) => {
                        // refresh and reveal selection
                        this._leoIntegration.setupRefresh(
                            false,
                            { tree: true, body: true, states: true, buttons: true, documents: true },
                            p_package.node
                        );
                        this._leoIntegration.launchRefresh();
                    });

                break;
            case Constants.ASYNC_INFO_MESSAGE_CODES.ASYNC_IGNORED:
                w_message = Constants.USER_MESSAGES.CHANGES_DETECTED + Constants.USER_MESSAGES.IGNORED;
                break;
            default:
                w_message = p_infoArg.message;
                break;
        }
        vscode.window.showInformationMessage(w_message);
    }


}

/*
    TODO : Should Reproduce those interactive controls that may be asked by Leo, and redo a true UI bridge

def runAboutLeoDialog(self, c, version, theCopyright, url, email):
    return self.simulateDialog("aboutLeoDialog", None)

def runAskLeoIDDialog(self):
    return self.simulateDialog("leoIDDialog", None)

def runAskOkDialog(self, c, title, message=None, text="Ok"):
    return self.simulateDialog("okDialog", "Ok")

def runAskOkCancelNumberDialog(self, c, title, message,
    cancelButtonText=None,
    okButtonText=None,
):
    return self.simulateDialog("numberDialog", -1)

def runAskOkCancelStringDialog(self, c, title, message,
    cancelButtonText=None,
    okButtonText=None,
    default="",
    wide=False,
):
    return self.simulateDialog("stringDialog", '')

def runCompareDialog(self, c):
    return self.simulateDialog("compareDialog", '')

def runOpenFileDialog(self, c, title, filetypes, defaultextension,
    multiple=False,
    startpath=None,
):
    return self.simulateDialog("openFileDialog", None)

def runSaveFileDialog(self, c, initialfile, title, filetypes, defaultextension):
    return self.simulateDialog("saveFileDialog", None)

def runAskYesNoDialog(self, c, title,
    message=None,
    yes_all=False,
    no_all=False,
):
    return self.simulateDialog("yesNoDialog", "no")

def runAskYesNoCancelDialog(self, c, title,
    message=None,
    yesMessage="Yes",
    noMessage="No",
    yesToAllMessage=None,
    defaultButton="Yes",
    cancelMessage=None,
):
    return self.simulateDialog("yesNoCancelDialog", "cancel")

def simulateDialog(self, key, defaultVal):
    return defaultVal

*/
