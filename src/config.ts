import * as vscode from "vscode";
import { ConfigMembers, ConfigSetting } from "./types";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Configuration Settings Service
 */
export class Config implements ConfigMembers {

    // Config settings used in leoserver.py
    public checkForChangeExternalFiles: string = Constants.CONFIG_DEFAULTS.CHECK_FOR_CHANGE_EXTERNAL_FILES;
    public defaultReloadIgnore: string = Constants.CONFIG_DEFAULTS.DEFAULT_RELOAD_IGNORE;
    // Config settings used in leoInteg/vscode's side
    public leoTreeBrowse: boolean = Constants.CONFIG_DEFAULTS.LEO_TREE_BROWSE;
    public treeKeepFocus: boolean = Constants.CONFIG_DEFAULTS.TREE_KEEP_FOCUS;
    public treeKeepFocusWhenAside: boolean = Constants.CONFIG_DEFAULTS.TREE_KEEP_FOCUS_WHEN_ASIDE;
    public askForExitConfirmationIfDirty: boolean = Constants.CONFIG_DEFAULTS.ASK_FOR_EXIT_CONFIRMATION_IF_DIRTY;

    public collapseAllShortcut: boolean = Constants.CONFIG_DEFAULTS.COLLAPSE_ALL_SHORTCUT;
    public activityViewShortcut: boolean = Constants.CONFIG_DEFAULTS.ACTIVITY_VIEW_SHORTCUT;
    public goAnywhereShortcut: boolean = Constants.CONFIG_DEFAULTS.GO_ANYWHERE_SHORTCUT;

    public showUnlOnStatusBar: boolean = Constants.CONFIG_DEFAULTS.SHOW_UNL_ON_STATUSBAR;
    public treeInExplorer: boolean = Constants.CONFIG_DEFAULTS.TREE_IN_EXPLORER;

    public showFileOnOutline: boolean = Constants.CONFIG_DEFAULTS.SHOW_FILE_ON_OUTLINE;
    public showHoistDehoistOnOutline: boolean = Constants.CONFIG_DEFAULTS.SHOW_HOIST_DEHOIST_ON_OUTLINE;
    public showPrevNextOnOutline: boolean = Constants.CONFIG_DEFAULTS.SHOW_PREV_NEXT_ON_OUTLINE;
    public showPromoteDemoteOnOutline: boolean = Constants.CONFIG_DEFAULTS.SHOW_PROMOTE_DEMOTE_ON_OUTLINE;
    public showRecentFilesOnOutline: boolean = Constants.CONFIG_DEFAULTS.SHOW_RECENT_FILES_ON_OUTLINE;
    public showSettingsOnOutline: boolean = Constants.CONFIG_DEFAULTS.SHOW_SETTINGS_ON_OUTLINE;
    public showShowLogOnOutline: boolean = Constants.CONFIG_DEFAULTS.SHOW_SHOW_LOG_ON_OUTLINE;
    public showUndoRedoOnOutline: boolean = Constants.CONFIG_DEFAULTS.SHOW_UNDO_REDO_ON_OUTLINE;

    public showEditOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_EDIT;
    public showAddOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_ADD;
    public showMarkOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_MARK;
    public showCloneOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_CLONE;
    public showCopyOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_COPY;
    public showBranchInOutlineTitle: boolean = Constants.CONFIG_DEFAULTS.SHOW_BRANCH_OUTLINE;

    // public showEditionOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_EDITION_BODY;
    // public showClipboardOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_CLIPBOARD_BODY;
    // public showPromoteOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_PROMOTE_BODY;
    // public showExecuteOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_EXECUTE_BODY;
    // public showExtractOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_EXTRACT_BODY;
    // public showImportOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_IMPORT_BODY;
    // public showRefreshOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_REFRESH_BODY;
    // public showHoistOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_HOIST_BODY;
    // public showMarkOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_MARK_BODY;
    // public showSortOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_SORT_BODY;

    public invertNodeContrast: boolean = Constants.CONFIG_DEFAULTS.INVERT_NODES;
    public leoPythonCommand: string = Constants.CONFIG_DEFAULTS.LEO_PYTHON_COMMAND;
    public leoEditorPath: string = Constants.CONFIG_DEFAULTS.LEO_EDITOR_PATH;
    public startServerAutomatically: boolean = Constants.CONFIG_DEFAULTS.AUTO_START_SERVER;
    public connectToServerAutomatically: boolean = Constants.CONFIG_DEFAULTS.AUTO_CONNECT;
    public connectionAddress: string = Constants.CONFIG_DEFAULTS.IP_ADDRESS;
    public connectionPort: number = Constants.CONFIG_DEFAULTS.IP_PORT;
    public venvPath: string = Constants.CONFIG_DEFAULTS.VENV_PATH;

    public setDetached: boolean = Constants.CONFIG_DEFAULTS.SET_DETACHED;
    public limitUsers: number = Constants.CONFIG_DEFAULTS.LIMIT_USERS;

    public setLeoIntegSettingsPromise: Promise<unknown> = Promise.resolve();

    // public uAsNumber: boolean = true;

    private _isBusySettingConfig: boolean = false;
    // private _needsTreeRefresh: boolean = false;

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) { }

    /**
     * * Get actual 'live' Leointeg configuration
     * @returns An object with config settings members such as treeKeepFocus, defaultReloadIgnore, etc.
     */
    public getConfig(): ConfigMembers {
        return {
            checkForChangeExternalFiles: this.checkForChangeExternalFiles,  // Used in leoBridge script
            defaultReloadIgnore: this.defaultReloadIgnore,  // Used in leoBridge script
            leoTreeBrowse: this.leoTreeBrowse,
            treeKeepFocus: this.treeKeepFocus,
            treeKeepFocusWhenAside: this.treeKeepFocusWhenAside,
            askForExitConfirmationIfDirty: this.askForExitConfirmationIfDirty,

            collapseAllShortcut: this.collapseAllShortcut,
            activityViewShortcut: this.activityViewShortcut,
            goAnywhereShortcut: this.goAnywhereShortcut,

            showUnlOnStatusBar: this.showUnlOnStatusBar,
            treeInExplorer: this.treeInExplorer,

            showFileOnOutline: this.showFileOnOutline,
            showHoistDehoistOnOutline: this.showHoistDehoistOnOutline,
            showPrevNextOnOutline: this.showPrevNextOnOutline,
            showPromoteDemoteOnOutline: this.showPromoteDemoteOnOutline,
            showRecentFilesOnOutline: this.showRecentFilesOnOutline,
            showSettingsOnOutline: this.showSettingsOnOutline,
            showShowLogOnOutline: this.showShowLogOnOutline,
            showUndoRedoOnOutline: this.showUndoRedoOnOutline,

            showEditOnNodes: this.showEditOnNodes,
            showAddOnNodes: this.showAddOnNodes,
            showMarkOnNodes: this.showMarkOnNodes,
            showCloneOnNodes: this.showCloneOnNodes,
            showCopyOnNodes: this.showCopyOnNodes,
            showBranchInOutlineTitle: this.showBranchInOutlineTitle,

            // showEditionOnBody: this.showEditionOnBody,
            // showClipboardOnBody: this.showClipboardOnBody,
            // showPromoteOnBody: this.showPromoteOnBody,
            // showExecuteOnBody: this.showExecuteOnBody,
            // showExtractOnBody: this.showExtractOnBody,
            // showImportOnBody: this.showImportOnBody,
            // showRefreshOnBody: this.showRefreshOnBody,
            // showHoistOnBody: this.showHoistOnBody,
            // showMarkOnBody: this.showMarkOnBody,
            // showSortOnBody: this.showSortOnBody,

            invertNodeContrast: this.invertNodeContrast,
            leoPythonCommand: this.leoPythonCommand,
            leoEditorPath: this.leoEditorPath,
            startServerAutomatically: this.startServerAutomatically,
            connectToServerAutomatically: this.connectToServerAutomatically,
            connectionAddress: this.connectionAddress,
            connectionPort: this.connectionPort,
            venvPath: this.venvPath,

            setDetached: this.setDetached,
            limitUsers: this.limitUsers,

            // uAsNumber: true
        };
    }

    /**
     * * Apply changes to the expansion config settings and save them in user settings.
     * @param p_changes is an array of codes and values to be changed
     * @returns a promise that resolves upon completion
     */
    public setLeoIntegSettings(p_changes: ConfigSetting[]): Promise<void> {
        this._isBusySettingConfig = true;
        const w_promises: Thenable<void>[] = [];
        const w_vscodeConfig = vscode.workspace.getConfiguration(Constants.CONFIG_NAME);
        p_changes.forEach(i_change => {
            if (w_vscodeConfig.inspect(i_change.code)!.defaultValue === i_change.value) {
                // Set as undefined - same as default
                w_promises.push(w_vscodeConfig.update(i_change.code, undefined, true));
            } else {
                // Set as value which is not default
                w_promises.push(w_vscodeConfig.update(i_change.code, i_change.value, true));
            }
        });
        this.setLeoIntegSettingsPromise = Promise.all(w_promises);
        return this.setLeoIntegSettingsPromise.then(() => {
            this._isBusySettingConfig = false;
            this.buildFromSavedSettings();
            return Promise.resolve();
        });
    }

    /**
     * * Set the workbench.editor.enablePreview vscode setting
     */
    public setEnablePreview(): Thenable<void> {
        return vscode.workspace.getConfiguration("workbench.editor")
            .update("enablePreview", true, true);
    }

    /**
     * * Clears the workbench.editor.closeEmptyGroups vscode setting
     */
    public clearCloseEmptyGroups(): Thenable<void> {
        return vscode.workspace.getConfiguration("workbench.editor")
            .update("closeEmptyGroups", false, true);
    }

    /**
     * * Sets all 'bodywrap' vscode settings
     */
    public setBodyWrap(): Thenable<void> {
        let w_totalConfigName = "";
        for (const w_lang of Constants.LANGUAGES) {
            let langWrap = '[' + Constants.LEO_LANGUAGE_PREFIX + w_lang + Constants.LEO_WRAP_SUFFIX + ']';
            w_totalConfigName += langWrap;
        }
        return vscode.workspace.getConfiguration().update(w_totalConfigName, { 'editor.wordWrap': 'on' }, vscode.ConfigurationTarget.Global);
    }

    /**
     * Remove body wrap setting from older LeoInteg versions
     * that suported less languages
     */
    public removeOldBodyWrap(): void {
        // Last version did not have XML
        let w_totalOldVersionConfigName = "";

        // Looping from the first element up to the second-to-last element
        for (let i = 0; i < Constants.LANGUAGES.length - 1; i++) {
            const w_lang = Constants.LANGUAGES[i];
            const langWrap = '[' + Constants.LEO_LANGUAGE_PREFIX + w_lang + Constants.LEO_WRAP_SUFFIX + ']';
            w_totalOldVersionConfigName += langWrap;
        }

        if (vscode.workspace.getConfiguration().has(w_totalOldVersionConfigName)) {
            void vscode.workspace.getConfiguration().update(w_totalOldVersionConfigName, undefined, vscode.ConfigurationTarget.Global);
        }

    }

    /**
     * * Check if the workbench.editor.enablePreview flag is set
     * @param p_forced Forces the setting instead of just suggesting with a message
     */
    public checkEnablePreview(p_forced?: boolean): void {
        let w_result: any = true;
        const w_setting = vscode.workspace.getConfiguration("workbench.editor");
        if (w_setting.inspect("enablePreview")!.globalValue === undefined) {
            w_result = w_setting.inspect("enablePreview")!.defaultValue;
        } else {
            w_result = w_setting.inspect("enablePreview")!.globalValue;
        }
        if (w_result === false) {
            if (p_forced) {
                this.setEnablePreview();
                vscode.window.showInformationMessage(Constants.USER_MESSAGES.ENABLE_PREVIEW_SET);
            } else {
                if (!this._leoIntegration.leoStates.leoStartupFinished) {
                    return;
                }
                vscode.window.showWarningMessage(Constants.USER_MESSAGES.ENABLE_PREVIEW_RECOMMEND, Constants.USER_MESSAGES.FIX_IT)
                    .then(p_chosenButton => {
                        if (p_chosenButton === Constants.USER_MESSAGES.FIX_IT) {
                            vscode.commands.executeCommand(Constants.COMMANDS.SET_ENABLE_PREVIEW);
                            vscode.window.showInformationMessage(Constants.USER_MESSAGES.ENABLE_PREVIEW_SET);
                        }
                    });
            }
        }
    }

    /**
     * * Check if the 'workbench.editor.closeEmptyGroups' setting is false
     * @param p_forced Forces the setting instead of just suggesting with a message
     */
    public checkCloseEmptyGroups(p_forced?: boolean): void {
        let w_result: any = false;
        const w_setting = vscode.workspace.getConfiguration("workbench.editor");
        if (w_setting.inspect("closeEmptyGroups")!.globalValue === undefined) {
            w_result = w_setting.inspect("closeEmptyGroups")!.defaultValue;
        } else {
            w_result = w_setting.inspect("closeEmptyGroups")!.globalValue;
        }
        if (w_result === true) {
            if (p_forced) {
                this.clearCloseEmptyGroups();
                vscode.window.showInformationMessage(Constants.USER_MESSAGES.CLOSE_EMPTY_CLEARED);
            } else {
                if (!this._leoIntegration.leoStates.leoStartupFinished) {
                    return;
                }
                vscode.window.showWarningMessage(Constants.USER_MESSAGES.CLOSE_EMPTY_RECOMMEND, Constants.USER_MESSAGES.FIX_IT)
                    .then(p_chosenButton => {
                        if (p_chosenButton === Constants.USER_MESSAGES.FIX_IT) {
                            vscode.commands.executeCommand(Constants.COMMANDS.CLEAR_CLOSE_EMPTY_GROUPS);
                            vscode.window.showInformationMessage(Constants.USER_MESSAGES.CLOSE_EMPTY_CLEARED);
                        }
                    });
            }
        }
    }

    public checkBodyWrap(p_forced?: boolean): void {
        let w_missing = false;

        let w_languageSettings: Record<string, string> | undefined;
        let w_totalConfigName = "";

        for (const w_lang of Constants.LANGUAGES) {
            let langWrap = '[' + Constants.LEO_LANGUAGE_PREFIX + w_lang + Constants.LEO_WRAP_SUFFIX + ']';
            w_totalConfigName += langWrap;
            // w_languageSettings = vscode.workspace.getConfiguration(langWrap);
        }
        w_languageSettings = vscode.workspace.getConfiguration(w_totalConfigName, null);

        if (!w_languageSettings || !w_languageSettings['editor.wordWrap'] || w_languageSettings['editor.wordWrap'] !== 'on') {
            w_missing = true;
        }

        if (w_missing && p_forced) {
            void this.setBodyWrap();
            // ! NOT warning the user for this forced setting at startup because its internal to LeoInteg only !
        } else if (w_missing && !p_forced) {
            void vscode.window.showWarningMessage(
                Constants.USER_MESSAGES.BODY_WRAP_RECOMMEND,
                Constants.USER_MESSAGES.FIX_IT
            ).then(p_chosenButton => {
                if (p_chosenButton === Constants.USER_MESSAGES.FIX_IT) {
                    void vscode.commands.executeCommand(Constants.COMMANDS.SET_BODY_WRAP_SETTINGS);
                    void vscode.window.showInformationMessage(Constants.USER_MESSAGES.BODY_WRAP_SET);
                }
            });
        }
    }

    public setConfirmBeforeClose(p_state: boolean): Thenable<void> {
        return vscode.workspace.getConfiguration("window")
            .update("confirmBeforeClose", p_state ? "always" : 'never', true);
    }

    /**
     * * Build config from settings from vscode's saved config settings
     */
    public buildFromSavedSettings(): boolean {
        // Shorthand pointers for readability
        const GET = vscode.workspace.getConfiguration;
        const NAME = Constants.CONFIG_NAME;
        const NAMES = Constants.CONFIG_NAMES;
        const DEFAULTS = Constants.CONFIG_DEFAULTS;

        if (this._isBusySettingConfig) {
            // * Currently setting config, wait until its done all, and this will be called automatically
            return false;
        } else {
            this.checkForChangeExternalFiles = GET(NAME).get(NAMES.CHECK_FOR_CHANGE_EXTERNAL_FILES, DEFAULTS.CHECK_FOR_CHANGE_EXTERNAL_FILES);
            this.defaultReloadIgnore = GET(NAME).get(NAMES.DEFAULT_RELOAD_IGNORE, DEFAULTS.DEFAULT_RELOAD_IGNORE);
            this.leoTreeBrowse = GET(NAME).get(NAMES.LEO_TREE_BROWSE, DEFAULTS.LEO_TREE_BROWSE);
            this.treeKeepFocus = GET(NAME).get(NAMES.TREE_KEEP_FOCUS, DEFAULTS.TREE_KEEP_FOCUS);
            this.treeKeepFocusWhenAside = GET(NAME).get(NAMES.TREE_KEEP_FOCUS_WHEN_ASIDE, DEFAULTS.TREE_KEEP_FOCUS_WHEN_ASIDE);
            this.askForExitConfirmationIfDirty = GET(NAME).get(NAMES.ASK_FOR_EXIT_CONFIRMATION_IF_DIRTY, DEFAULTS.ASK_FOR_EXIT_CONFIRMATION_IF_DIRTY);

            this.collapseAllShortcut = GET(NAME).get(NAMES.COLLAPSE_ALL_SHORTCUT, DEFAULTS.COLLAPSE_ALL_SHORTCUT);
            this.activityViewShortcut = GET(NAME).get(NAMES.ACTIVITY_VIEW_SHORTCUT, DEFAULTS.ACTIVITY_VIEW_SHORTCUT);
            this.goAnywhereShortcut = GET(NAME).get(NAMES.GO_ANYWHERE_SHORTCUT, DEFAULTS.GO_ANYWHERE_SHORTCUT);

            this.showUnlOnStatusBar = GET(NAME).get(NAMES.SHOW_UNL_ON_STATUSBAR, DEFAULTS.SHOW_UNL_ON_STATUSBAR);
            // this.statusBarString = GET(NAME).get(NAMES.STATUSBAR_STRING, DEFAULTS.STATUSBAR_STRING);
            // if (this.statusBarString.length > 8) {
            //     this.statusBarString = DEFAULTS.STATUSBAR_STRING;
            // }
            // this.statusBarColor = GET(NAME).get(NAMES.STATUSBAR_COLOR, DEFAULTS.STATUSBAR_COLOR);
            // if (!utils.isHexColor(this.statusBarColor)) {
            //     this.statusBarColor = DEFAULTS.STATUSBAR_COLOR;
            // }
            this.treeInExplorer = GET(NAME).get(NAMES.TREE_IN_EXPLORER, DEFAULTS.TREE_IN_EXPLORER);

            this.showFileOnOutline = GET(NAME).get(NAMES.SHOW_FILE_ON_OUTLINE, DEFAULTS.SHOW_FILE_ON_OUTLINE);
            this.showHoistDehoistOnOutline = GET(NAME).get(NAMES.SHOW_HOIST_DEHOIST_ON_OUTLINE, DEFAULTS.SHOW_HOIST_DEHOIST_ON_OUTLINE);
            this.showPrevNextOnOutline = GET(NAME).get(NAMES.SHOW_PREV_NEXT_ON_OUTLINE, DEFAULTS.SHOW_PREV_NEXT_ON_OUTLINE);
            this.showPromoteDemoteOnOutline = GET(NAME).get(NAMES.SHOW_PROMOTE_DEMOTE_ON_OUTLINE, DEFAULTS.SHOW_PROMOTE_DEMOTE_ON_OUTLINE);
            this.showRecentFilesOnOutline = GET(NAME).get(NAMES.SHOW_RECENT_FILES_ON_OUTLINE, DEFAULTS.SHOW_RECENT_FILES_ON_OUTLINE);
            this.showSettingsOnOutline = GET(NAME).get(NAMES.SHOW_SETTINGS_ON_OUTLINE, DEFAULTS.SHOW_SETTINGS_ON_OUTLINE);
            this.showShowLogOnOutline = GET(NAME).get(NAMES.SHOW_SHOW_LOG_ON_OUTLINE, DEFAULTS.SHOW_SHOW_LOG_ON_OUTLINE);
            this.showUndoRedoOnOutline = GET(NAME).get(NAMES.SHOW_UNDO_REDO_ON_OUTLINE, DEFAULTS.SHOW_UNDO_REDO_ON_OUTLINE);

            this.showEditOnNodes = GET(NAME).get(NAMES.SHOW_EDIT, DEFAULTS.SHOW_EDIT);
            this.showAddOnNodes = GET(NAME).get(NAMES.SHOW_ADD, DEFAULTS.SHOW_ADD);
            this.showMarkOnNodes = GET(NAME).get(NAMES.SHOW_MARK, DEFAULTS.SHOW_MARK);
            this.showCloneOnNodes = GET(NAME).get(NAMES.SHOW_CLONE, DEFAULTS.SHOW_CLONE);
            this.showCopyOnNodes = GET(NAME).get(NAMES.SHOW_COPY, DEFAULTS.SHOW_COPY);
            this.showBranchInOutlineTitle = GET(NAME).get(NAMES.SHOW_BRANCH_OUTLINE, DEFAULTS.SHOW_BRANCH_OUTLINE);

            // this.showEditionOnBody = GET(NAME).get(NAMES.SHOW_EDITION_BODY, DEFAULTS.SHOW_EDITION_BODY);
            // this.showClipboardOnBody = GET(NAME).get(NAMES.SHOW_CLIPBOARD_BODY, DEFAULTS.SHOW_CLIPBOARD_BODY);
            // this.showPromoteOnBody = GET(NAME).get(NAMES.SHOW_PROMOTE_BODY, DEFAULTS.SHOW_PROMOTE_BODY);
            // this.showExecuteOnBody = GET(NAME).get(NAMES.SHOW_EXECUTE_BODY, DEFAULTS.SHOW_EXECUTE_BODY);
            // this.showExtractOnBody = GET(NAME).get(NAMES.SHOW_EXTRACT_BODY, DEFAULTS.SHOW_EXTRACT_BODY);
            // this.showImportOnBody = GET(NAME).get(NAMES.SHOW_IMPORT_BODY, DEFAULTS.SHOW_IMPORT_BODY);
            // this.showRefreshOnBody = GET(NAME).get(NAMES.SHOW_REFRESH_BODY, DEFAULTS.SHOW_REFRESH_BODY);
            // this.showHoistOnBody = GET(NAME).get(NAMES.SHOW_HOIST_BODY, DEFAULTS.SHOW_HOIST_BODY);
            // this.showMarkOnBody = GET(NAME).get(NAMES.SHOW_MARK_BODY, DEFAULTS.SHOW_MARK_BODY);
            // this.showSortOnBody = GET(NAME).get(NAMES.SHOW_SORT_BODY, DEFAULTS.SHOW_SORT_BODY);

            this.invertNodeContrast = GET(NAME).get(NAMES.INVERT_NODES, DEFAULTS.INVERT_NODES);
            this.leoEditorPath = GET(NAME).get(NAMES.LEO_EDITOR_PATH, DEFAULTS.LEO_EDITOR_PATH);
            this.leoPythonCommand = GET(NAME).get(NAMES.LEO_PYTHON_COMMAND, DEFAULTS.LEO_PYTHON_COMMAND);
            this.startServerAutomatically = GET(NAME).get(NAMES.AUTO_START_SERVER, DEFAULTS.AUTO_START_SERVER);
            this.connectToServerAutomatically = GET(NAME).get(NAMES.AUTO_CONNECT, DEFAULTS.AUTO_CONNECT);
            this.connectionAddress = GET(NAME).get(NAMES.IP_ADDRESS, DEFAULTS.IP_ADDRESS);
            this.connectionPort = GET(NAME).get(NAMES.IP_PORT, DEFAULTS.IP_PORT);
            this.venvPath = GET(NAME).get(NAMES.VENV_PATH, DEFAULTS.VENV_PATH);

            this.setDetached = GET(NAME).get(NAMES.SET_DETACHED, DEFAULTS.SET_DETACHED);
            this.limitUsers = GET(NAME).get(NAMES.LIMIT_USERS, DEFAULTS.LIMIT_USERS);

            // * Set context for tree items visibility that are based on config options
            if (this._leoIntegration.leoStates.leoBridgeReady) {
                this._leoIntegration.sendConfigToServer(this.getConfig());
            }

            // utils.setContext(FLAGS.SHOW_EDITION_BODY, this.showEditionOnBody);
            // utils.setContext(FLAGS.SHOW_CLIPBOARD_BODY, this.showClipboardOnBody);
            // utils.setContext(FLAGS.SHOW_PROMOTE_BODY, this.showPromoteOnBody);
            // utils.setContext(FLAGS.SHOW_EXECUTE_BODY, this.showExecuteOnBody);
            // utils.setContext(FLAGS.SHOW_EXTRACT_BODY, this.showExtractOnBody);
            // utils.setContext(FLAGS.SHOW_IMPORT_BODY, this.showImportOnBody);
            // utils.setContext(FLAGS.SHOW_REFRESH_BODY, this.showRefreshOnBody);
            // utils.setContext(FLAGS.SHOW_HOIST_BODY, this.showHoistOnBody);
            // utils.setContext(FLAGS.SHOW_MARK_BODY, this.showMarkOnBody);
            // utils.setContext(FLAGS.SHOW_SORT_BODY, this.showSortOnBody);

            return true;
        }
    }

}
