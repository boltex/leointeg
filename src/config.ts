import * as vscode from "vscode";
import * as utils from "./utils";
import { ConfigMembers, ConfigSetting, FontSettings } from "./types";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Configuration Settings Service
 */
export class Config implements ConfigMembers {

    // Config settings used in leobridgeserver.py, on Leo's side
    public checkForChangeExternalFiles: string = Constants.CONFIG_DEFAULTS.CHECK_FOR_CHANGE_EXTERNAL_FILES;
    public defaultReloadIgnore: string = Constants.CONFIG_DEFAULTS.DEFAULT_RELOAD_IGNORE;
    // Config settings used in leoInteg/vscode's side
    public leoTreeBrowse: boolean = Constants.CONFIG_DEFAULTS.LEO_TREE_BROWSE;
    public treeKeepFocus: boolean = Constants.CONFIG_DEFAULTS.TREE_KEEP_FOCUS;
    public treeKeepFocusWhenAside: boolean = Constants.CONFIG_DEFAULTS.TREE_KEEP_FOCUS_WHEN_ASIDE;
    public statusBarString: string = Constants.CONFIG_DEFAULTS.STATUSBAR_STRING;
    public statusBarColor: string = Constants.CONFIG_DEFAULTS.STATUSBAR_COLOR;
    public treeInExplorer: boolean = Constants.CONFIG_DEFAULTS.TREE_IN_EXPLORER;
    public showOpenAside: boolean = Constants.CONFIG_DEFAULTS.SHOW_OPEN_ASIDE;
    public showEditOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_EDIT;
    public showArrowsOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_ARROWS;
    public showAddOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_ADD;
    public showMarkOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_MARK;
    public showCloneOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_CLONE;
    public showCopyOnNodes: boolean = Constants.CONFIG_DEFAULTS.SHOW_COPY;

    public showEditionOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_EDITION_BODY;
    public showClipboardOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_CLIPBOARD_BODY;
    public showPromoteOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_PROMOTE_BODY;
    public showExecuteOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_EXECUTE_BODY;
    public showExtractOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_EXTRACT_BODY;
    public showImportOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_IMPORT_BODY;
    public showRefreshOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_REFRESH_BODY;
    public showHoistOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_HOIST_BODY;
    public showMarkOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_MARK_BODY;
    public showSortOnBody: boolean = Constants.CONFIG_DEFAULTS.SHOW_SORT_BODY;

    public invertNodeContrast: boolean = Constants.CONFIG_DEFAULTS.INVERT_NODES;
    public leoPythonCommand: string = Constants.CONFIG_DEFAULTS.LEO_PYTHON_COMMAND;
    public leoEditorPath: string = Constants.CONFIG_DEFAULTS.LEO_EDITOR_PATH;
    public startServerAutomatically: boolean = Constants.CONFIG_DEFAULTS.AUTO_START_SERVER;
    public connectToServerAutomatically: boolean = Constants.CONFIG_DEFAULTS.AUTO_CONNECT;
    public connectionAddress: string = Constants.CONFIG_DEFAULTS.IP_ADDRESS;
    public connectionPort: number = Constants.CONFIG_DEFAULTS.IP_PORT;

    public setDetached: boolean = Constants.CONFIG_DEFAULTS.SET_DETACHED;
    public setPersist: boolean = Constants.CONFIG_DEFAULTS.SET_PERSIST;
    public limitUsers: number = Constants.CONFIG_DEFAULTS.LIMIT_USERS;

    private _isBusySettingConfig: boolean = false;
    private _needsTreeRefresh: boolean = false;

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
            statusBarString: this.statusBarString,
            statusBarColor: this.statusBarColor,
            treeInExplorer: this.treeInExplorer,
            showOpenAside: this.showOpenAside,
            showEditOnNodes: this.showEditOnNodes,
            showArrowsOnNodes: this.showArrowsOnNodes,
            showAddOnNodes: this.showAddOnNodes,
            showMarkOnNodes: this.showMarkOnNodes,
            showCloneOnNodes: this.showCloneOnNodes,
            showCopyOnNodes: this.showCopyOnNodes,

            showEditionOnBody: this.showEditionOnBody,
            showClipboardOnBody: this.showClipboardOnBody,
            showPromoteOnBody: this.showPromoteOnBody,
            showExecuteOnBody: this.showExecuteOnBody,
            showExtractOnBody: this.showExtractOnBody,
            showImportOnBody: this.showImportOnBody,
            showRefreshOnBody: this.showRefreshOnBody,
            showHoistOnBody: this.showHoistOnBody,
            showMarkOnBody: this.showMarkOnBody,
            showSortOnBody: this.showSortOnBody,

            invertNodeContrast: this.invertNodeContrast,
            leoPythonCommand: this.leoPythonCommand,
            leoEditorPath: this.leoEditorPath,
            startServerAutomatically: this.startServerAutomatically,
            connectToServerAutomatically: this.connectToServerAutomatically,
            connectionAddress: this.connectionAddress,
            connectionPort: this.connectionPort,

            setDetached: this.setDetached,
            setPersist: this.setPersist,
            limitUsers: this.limitUsers,
        };
    }

    /**
     * * Get config from vscode for the UI font sizes
     */
    public getFontConfig(): FontSettings {
        let w_zoomLevel = vscode.workspace.getConfiguration(
            "window"
        ).get("zoomLevel");
        let w_fontSize = vscode.workspace.getConfiguration(
            "editor"
        ).get("fontSize");

        const w_config: FontSettings = {
            zoomLevel: Number(w_zoomLevel),
            fontSize: Number(w_fontSize)
        };
        return w_config;
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
            if (i_change && i_change.code.includes(Constants.CONFIG_REFRESH_MATCH)) {
                // Check if tree refresh is required for hover-icons to be displayed or hidden accordingly
                this._needsTreeRefresh = true;
            }
            if (w_vscodeConfig.inspect(i_change.code)!.defaultValue === i_change.value) {
                // Set as undefined - same as default
                w_promises.push(w_vscodeConfig.update(i_change.code, undefined, true));
            } else {
                // Set as value which is not default
                w_promises.push(w_vscodeConfig.update(i_change.code, i_change.value, true));
            }
        });
        return Promise.all(w_promises).then(() => {
            if (this._needsTreeRefresh) {
                this._needsTreeRefresh = false;
                setTimeout(() => {
                    this._leoIntegration.configTreeRefresh();
                }, 200);
            }
            this._isBusySettingConfig = false;
            this.buildFromSavedSettings();
            return Promise.resolve();
        });
    }

    /**
     * * Apply changes in font size settings and save them in user settings.
     */
    public setFontConfig(p_settings: FontSettings): void {
        if (p_settings.zoomLevel || p_settings.zoomLevel === 0) {
            if (!isNaN(p_settings.zoomLevel) && p_settings.zoomLevel <= 12 && p_settings.zoomLevel >= -12) {
                vscode.workspace.getConfiguration("window")
                    .update("zoomLevel", p_settings.zoomLevel, true);
            } else {
                vscode.window.showInformationMessage(
                    "Value for zoom level should be between -12 and 12"
                );
            }
        }
        if (p_settings.fontSize) {
            if (!isNaN(p_settings.fontSize) && p_settings.fontSize <= 30 && p_settings.fontSize >= 6) {
                vscode.workspace.getConfiguration("editor")
                    .update("fontSize", p_settings.fontSize, true);
            } else {
                vscode.window.showInformationMessage(
                    "Value for font size should be between 6 and 30"
                );
            }
        }
    }

    /**
    * * Set the "workbench.editor.enablePreview" vscode setting
    */
    public setEnablePreview(): Thenable<void> {
        // workbench.editor.enablePreview
        return vscode.workspace.getConfiguration("workbench.editor")
            .update("enablePreview", true, true);
    }

    /**
    * * Set the "workbench.editor.enablePreview" vscode setting
    */
    public clearCloseEmptyGroups(): Thenable<void> {
        // workbench.editor.enablePreview
        return vscode.workspace.getConfiguration("workbench.editor")
            .update("closeEmptyGroups", false, true);
    }

    /**
     * * Check if the preview mode flag is set
     */
    public checkEnablePreview(): void {
        // workbench.editor.enablePreview
        let w_result: any = true;
        const w_setting = vscode.workspace.getConfiguration("workbench.editor");
        if (w_setting.inspect("enablePreview")!.globalValue === undefined) {
            w_result = w_setting.inspect("enablePreview")!.defaultValue;
        } else {
            w_result = w_setting.inspect("enablePreview")!.globalValue;
        }
        if (w_result === false) {
            vscode.window.showWarningMessage("'Enable Preview' setting is recommended (currently disabled)", "Fix it")
                .then(p_chosenButton => {
                    if (p_chosenButton === "Fix it") {
                        vscode.commands.executeCommand(Constants.COMMANDS.SET_ENABLE_PREVIEW);
                    }
                });
        }
    }
    /**
     * * Check if the 'close Empty Groups' setting is false
     */
    public checkCloseEmptyGroups(): void {
        // workbench.editor.closeEmptyGroups
        let w_result: any = false;
        const w_setting = vscode.workspace.getConfiguration("workbench.editor");
        if (w_setting.inspect("closeEmptyGroups")!.globalValue === undefined) {
            w_result = w_setting.inspect("closeEmptyGroups")!.defaultValue;
        } else {
            w_result = w_setting.inspect("closeEmptyGroups")!.globalValue;
        }
        if (w_result === true) {
            vscode.window.showWarningMessage("'Close Empty Groups' setting is NOT recommended!", "Fix it")
                .then(p_chosenButton => {
                    if (p_chosenButton === "Fix it") {
                        vscode.commands.executeCommand(Constants.COMMANDS.CLEAR_CLOSE_EMPTY_GROUPS);
                    }
                });
        }
    }
    /**
     * * Build config from settings from vscode's saved config settings
     */
    public buildFromSavedSettings(): void {
        // Shorthand pointers for readability
        const GET = vscode.workspace.getConfiguration;
        const NAME = Constants.CONFIG_NAME;
        const NAMES = Constants.CONFIG_NAMES;
        const DEFAULTS = Constants.CONFIG_DEFAULTS;
        const FLAGS = Constants.CONTEXT_FLAGS;

        if (this._isBusySettingConfig) {
            // * Currently setting config, wait until its done all, and this will be called automatically
            return;
        } else {
            this.checkForChangeExternalFiles = GET(NAME).get(NAMES.CHECK_FOR_CHANGE_EXTERNAL_FILES, DEFAULTS.CHECK_FOR_CHANGE_EXTERNAL_FILES);
            this.defaultReloadIgnore = GET(NAME).get(NAMES.DEFAULT_RELOAD_IGNORE, DEFAULTS.DEFAULT_RELOAD_IGNORE);
            this.leoTreeBrowse = GET(NAME).get(NAMES.LEO_TREE_BROWSE, DEFAULTS.LEO_TREE_BROWSE);
            this.treeKeepFocus = GET(NAME).get(NAMES.TREE_KEEP_FOCUS, DEFAULTS.TREE_KEEP_FOCUS);
            this.treeKeepFocusWhenAside = GET(NAME).get(NAMES.TREE_KEEP_FOCUS_WHEN_ASIDE, DEFAULTS.TREE_KEEP_FOCUS_WHEN_ASIDE);
            this.statusBarString = GET(NAME).get(NAMES.STATUSBAR_STRING, DEFAULTS.STATUSBAR_STRING);
            if (this.statusBarString.length > 8) {
                this.statusBarString = DEFAULTS.STATUSBAR_STRING;
            }
            this.statusBarColor = GET(NAME).get(NAMES.STATUSBAR_COLOR, DEFAULTS.STATUSBAR_COLOR);
            if (!utils.isHexColor(this.statusBarColor)) {
                this.statusBarColor = DEFAULTS.STATUSBAR_COLOR;
            }
            this.treeInExplorer = GET(NAME).get(NAMES.TREE_IN_EXPLORER, DEFAULTS.TREE_IN_EXPLORER);
            this.showOpenAside = GET(NAME).get(NAMES.SHOW_OPEN_ASIDE, DEFAULTS.SHOW_OPEN_ASIDE);
            this.showEditOnNodes = GET(NAME).get(NAMES.SHOW_EDIT, DEFAULTS.SHOW_EDIT);
            this.showArrowsOnNodes = GET(NAME).get(NAMES.SHOW_ARROWS, DEFAULTS.SHOW_ARROWS);
            this.showAddOnNodes = GET(NAME).get(NAMES.SHOW_ADD, DEFAULTS.SHOW_ADD);
            this.showMarkOnNodes = GET(NAME).get(NAMES.SHOW_MARK, DEFAULTS.SHOW_MARK);
            this.showCloneOnNodes = GET(NAME).get(NAMES.SHOW_CLONE, DEFAULTS.SHOW_CLONE);
            this.showCopyOnNodes = GET(NAME).get(NAMES.SHOW_COPY, DEFAULTS.SHOW_COPY);

            this.showEditionOnBody = GET(NAME).get(NAMES.SHOW_EDITION_BODY, DEFAULTS.SHOW_EDITION_BODY);
            this.showClipboardOnBody = GET(NAME).get(NAMES.SHOW_CLIPBOARD_BODY, DEFAULTS.SHOW_CLIPBOARD_BODY);
            this.showPromoteOnBody = GET(NAME).get(NAMES.SHOW_PROMOTE_BODY, DEFAULTS.SHOW_PROMOTE_BODY);
            this.showExecuteOnBody = GET(NAME).get(NAMES.SHOW_EXECUTE_BODY, DEFAULTS.SHOW_EXECUTE_BODY);
            this.showExtractOnBody = GET(NAME).get(NAMES.SHOW_EXTRACT_BODY, DEFAULTS.SHOW_EXTRACT_BODY);
            this.showImportOnBody = GET(NAME).get(NAMES.SHOW_IMPORT_BODY, DEFAULTS.SHOW_IMPORT_BODY);
            this.showRefreshOnBody = GET(NAME).get(NAMES.SHOW_REFRESH_BODY, DEFAULTS.SHOW_REFRESH_BODY);
            this.showHoistOnBody = GET(NAME).get(NAMES.SHOW_HOIST_BODY, DEFAULTS.SHOW_HOIST_BODY);
            this.showMarkOnBody = GET(NAME).get(NAMES.SHOW_MARK_BODY, DEFAULTS.SHOW_MARK_BODY);
            this.showSortOnBody = GET(NAME).get(NAMES.SHOW_SORT_BODY, DEFAULTS.SHOW_SORT_BODY);

            this.invertNodeContrast = GET(NAME).get(NAMES.INVERT_NODES, DEFAULTS.INVERT_NODES);
            this.leoEditorPath = GET(NAME).get(NAMES.LEO_EDITOR_PATH, DEFAULTS.LEO_EDITOR_PATH);
            this.leoPythonCommand = GET(NAME).get(NAMES.LEO_PYTHON_COMMAND, DEFAULTS.LEO_PYTHON_COMMAND);
            this.startServerAutomatically = GET(NAME).get(NAMES.AUTO_START_SERVER, DEFAULTS.AUTO_START_SERVER);
            this.connectToServerAutomatically = GET(NAME).get(NAMES.AUTO_CONNECT, DEFAULTS.AUTO_CONNECT);
            this.connectionAddress = GET(NAME).get(NAMES.IP_ADDRESS, DEFAULTS.IP_ADDRESS);
            this.connectionPort = GET(NAME).get(NAMES.IP_PORT, DEFAULTS.IP_PORT);

            this.setDetached = GET(NAME).get(NAMES.SET_DETACHED, DEFAULTS.SET_DETACHED);
            this.setPersist = GET(NAME).get(NAMES.SET_PERSIST, DEFAULTS.SET_PERSIST);
            this.limitUsers = GET(NAME).get(NAMES.LIMIT_USERS, DEFAULTS.LIMIT_USERS);

            // * Set context for tree items visibility that are based on config options
            if (this._leoIntegration.leoStates.leoBridgeReady) {
                this._leoIntegration.sendConfigToServer(this.getConfig());
            }
            utils.setContext(FLAGS.LEO_TREE_BROWSE, this.leoTreeBrowse);
            utils.setContext(FLAGS.TREE_IN_EXPLORER, this.treeInExplorer);
            utils.setContext(FLAGS.SHOW_OPEN_ASIDE, this.showOpenAside);
            utils.setContext(FLAGS.SHOW_EDIT, this.showEditOnNodes);
            utils.setContext(FLAGS.SHOW_ARROWS, this.showArrowsOnNodes);
            utils.setContext(FLAGS.SHOW_ADD, this.showAddOnNodes);
            utils.setContext(FLAGS.SHOW_MARK, this.showMarkOnNodes);
            utils.setContext(FLAGS.SHOW_CLONE, this.showCloneOnNodes);
            utils.setContext(FLAGS.SHOW_COPY, this.showCopyOnNodes);

            utils.setContext(FLAGS.SHOW_EDITION_BODY, this.showEditionOnBody);
            utils.setContext(FLAGS.SHOW_CLIPBOARD_BODY, this.showClipboardOnBody);
            utils.setContext(FLAGS.SHOW_PROMOTE_BODY, this.showPromoteOnBody);
            utils.setContext(FLAGS.SHOW_EXECUTE_BODY, this.showExecuteOnBody);
            utils.setContext(FLAGS.SHOW_EXTRACT_BODY, this.showExtractOnBody);
            utils.setContext(FLAGS.SHOW_IMPORT_BODY, this.showImportOnBody);
            utils.setContext(FLAGS.SHOW_REFRESH_BODY, this.showRefreshOnBody);
            utils.setContext(FLAGS.SHOW_HOIST_BODY, this.showHoistOnBody);
            utils.setContext(FLAGS.SHOW_MARK_BODY, this.showMarkOnBody);
            utils.setContext(FLAGS.SHOW_SORT_BODY, this.showSortOnBody);

            if (!this._leoIntegration.finishedStartup && this.leoEditorPath) {
                // Only relevant 'viewWelcome' content at startup.
                utils.setContext(FLAGS.AUTO_START_SERVER, this.startServerAutomatically); // server started
                utils.setContext(FLAGS.AUTO_CONNECT, this.connectToServerAutomatically); // server started
            } else {
                utils.setContext(FLAGS.AUTO_START_SERVER, false); // server started
                utils.setContext(FLAGS.AUTO_CONNECT, false); // server started
            }
        }
    }

}
