import * as vscode from "vscode";
import * as utils from "./utils";
import { ConfigMembers, ConfigSetting } from "./types";
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
    public invertNodeContrast: boolean = Constants.CONFIG_DEFAULTS.INVERT_NODES;
    public leoPythonCommand: string = Constants.CONFIG_DEFAULTS.LEO_PYTHON_COMMAND;
    public leoServerPath: string = Constants.CONFIG_DEFAULTS.LEO_SERVER_PATH;
    public startServerAutomatically: boolean = Constants.CONFIG_DEFAULTS.AUTO_START_SERVER;
    public connectToServerAutomatically: boolean = Constants.CONFIG_DEFAULTS.AUTO_CONNECT;
    public connectionAddress: string = Constants.CONFIG_DEFAULTS.IP_ADDRESS;
    public connectionPort: number = Constants.CONFIG_DEFAULTS.IP_PORT;

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
            invertNodeContrast: this.invertNodeContrast,
            leoPythonCommand: this.leoPythonCommand,
            leoServerPath: this.leoServerPath,
            startServerAutomatically: this.startServerAutomatically,
            connectToServerAutomatically: this.connectToServerAutomatically,
            connectionAddress: this.connectionAddress,
            connectionPort: this.connectionPort,
        };
    }

    /**
     * * Apply changes to the expansion config settings and save them in ser settings.
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
            this.invertNodeContrast = GET(NAME).get(NAMES.INVERT_NODES, DEFAULTS.INVERT_NODES);
            this.leoServerPath = GET(NAME).get(NAMES.LEO_SERVER_PATH, DEFAULTS.LEO_SERVER_PATH);
            this.leoPythonCommand = GET(NAME).get(NAMES.LEO_PYTHON_COMMAND, DEFAULTS.LEO_PYTHON_COMMAND);
            this.startServerAutomatically = GET(NAME).get(NAMES.AUTO_START_SERVER, DEFAULTS.AUTO_START_SERVER);
            this.connectToServerAutomatically = GET(NAME).get(NAMES.AUTO_CONNECT, DEFAULTS.AUTO_CONNECT);
            this.connectionAddress = GET(NAME).get(NAMES.IP_ADDRESS, DEFAULTS.IP_ADDRESS);
            this.connectionPort = GET(NAME).get(NAMES.IP_PORT, DEFAULTS.IP_PORT);

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
            utils.setContext(FLAGS.AUTO_START_SERVER, this.startServerAutomatically); // server started
            utils.setContext(FLAGS.AUTO_CONNECT, this.connectToServerAutomatically); // server started
        }
    }

}
