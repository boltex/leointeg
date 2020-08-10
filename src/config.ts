import * as vscode from "vscode";
import * as utils from "./utils";
import { ConfigMembers } from "./types";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Configuration Settings Service
 */
export class Config implements ConfigMembers {

    // Some config settings are used in leobridgeserver.py such as defaultReloadIgnore and checkForChangeExternalFiles
    public checkForChangeExternalFiles: string = Constants.CONFIG_DEFAULTS.CHECK_FOR_CHANGE_EXTERNAL_FILES;
    public defaultReloadIgnore: string = Constants.CONFIG_DEFAULTS.DEFAULT_RELOAD_IGNORE;
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
    public startServerAutomatically: boolean = Constants.CONFIG_DEFAULTS.AUTO_START_SERVER;
    public connectToServerAutomatically: boolean = Constants.CONFIG_DEFAULTS.AUTO_CONNECT;
    public connectionAddress: string = Constants.CONFIG_DEFAULTS.IP_ADDRESS;
    public connectionPort: number = Constants.CONFIG_DEFAULTS.IP_PORT;

    private _isSettingConfig: boolean = false;
    private _needsTreeRefresh: boolean = false;

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) { }

    /**
     * * Get Leointeg Configuration
     * @returns An object with live config settings members such as treeKeepFocus, defaultReloadIgnore, etc.
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
            startServerAutomatically: this.startServerAutomatically,
            connectToServerAutomatically: this.connectToServerAutomatically,
            connectionAddress: this.connectionAddress,
            connectionPort: this.connectionPort,
        };
    }

    /**
     * * Apply changes to the expansion config settings, those configuration values are persisted
     * @param p_changes is an array of key/values to change in the expansion settings
     * @returns a promise, in case additional procedures need to be run upon completion
     */
    public setLeoIntegSettings(p_changes: { code: string, value: any }[]): Promise<void> {
        this._isSettingConfig = true;
        const w_promises: Thenable<void>[] = [];
        const w_vscodeConfig = vscode.workspace.getConfiguration(Constants.CONFIG_NAME);
        p_changes.forEach(i_change => {
            if (i_change && i_change.code.includes(Constants.CONFIG_REFRESH_MATCH)) {
                // Check if tree refresh is required for hover-icons to be displayed or hidden accordingly
                this._needsTreeRefresh = true;
            }
            if (w_vscodeConfig.inspect(i_change.code)!.defaultValue === i_change.value) {
                // set as undefined - same as default
                w_promises.push(w_vscodeConfig.update(i_change.code, undefined, true));
                // console.log("clearing ", change.code, "to undefined");
            } else {
                // set as value which is not default
                w_promises.push(w_vscodeConfig.update(i_change.code, i_change.value, true));
                // console.log("setting ", change.code, "to ", change.value);
            }
        });
        return Promise.all(w_promises).then(() => {
            if (this._needsTreeRefresh) {
                this._needsTreeRefresh = false;
                setTimeout(() => {
                    this._leoIntegration.configTreeRefresh();
                }, 200);
            }
            this._isSettingConfig = false;
            this.buildFromSavedSettings();
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

        if (this._isSettingConfig) {
            // * Currently setting config, wait until its done all, and this will be called automatically
            return;
        } else {
            this.checkForChangeExternalFiles = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.CHECK_FOR_CHANGE_EXTERNAL_FILES, Constants.CONFIG_DEFAULTS.CHECK_FOR_CHANGE_EXTERNAL_FILES);
            this.defaultReloadIgnore = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.DEFAULT_RELOAD_IGNORE, Constants.CONFIG_DEFAULTS.DEFAULT_RELOAD_IGNORE);
            this.leoTreeBrowse = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.LEO_TREE_BROWSE, Constants.CONFIG_DEFAULTS.LEO_TREE_BROWSE);
            this.treeKeepFocus = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.TREE_KEEP_FOCUS, Constants.CONFIG_DEFAULTS.TREE_KEEP_FOCUS);
            this.treeKeepFocusWhenAside = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.TREE_KEEP_FOCUS_WHEN_ASIDE, Constants.CONFIG_DEFAULTS.TREE_KEEP_FOCUS_WHEN_ASIDE);
            this.statusBarString = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.STATUSBAR_STRING, Constants.CONFIG_DEFAULTS.STATUSBAR_STRING);
            if (this.statusBarString.length > 8) {
                this.statusBarString = Constants.CONFIG_DEFAULTS.STATUSBAR_STRING;
            }
            this.statusBarColor = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.STATUSBAR_COLOR, Constants.CONFIG_DEFAULTS.STATUSBAR_COLOR);
            if (!utils.isHexColor(this.statusBarColor)) {
                this.statusBarColor = Constants.CONFIG_DEFAULTS.STATUSBAR_COLOR;
            }
            this.treeInExplorer = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.TREE_IN_EXPLORER, Constants.CONFIG_DEFAULTS.TREE_IN_EXPLORER);
            this.showOpenAside = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.SHOW_OPEN_ASIDE, Constants.CONFIG_DEFAULTS.SHOW_OPEN_ASIDE);
            this.showEditOnNodes = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.SHOW_EDIT, Constants.CONFIG_DEFAULTS.SHOW_EDIT);
            this.showArrowsOnNodes = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.SHOW_ARROWS, Constants.CONFIG_DEFAULTS.SHOW_ARROWS);
            this.showAddOnNodes = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.SHOW_ADD, Constants.CONFIG_DEFAULTS.SHOW_ADD);
            this.showMarkOnNodes = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.SHOW_MARK, Constants.CONFIG_DEFAULTS.SHOW_MARK);
            this.showCloneOnNodes = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.SHOW_CLONE, Constants.CONFIG_DEFAULTS.SHOW_CLONE);
            this.showCopyOnNodes = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.SHOW_COPY, Constants.CONFIG_DEFAULTS.SHOW_COPY);
            this.invertNodeContrast = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.INVERT_NODES, Constants.CONFIG_DEFAULTS.INVERT_NODES);
            this.leoPythonCommand = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.LEO_PYTHON_COMMAND, Constants.CONFIG_DEFAULTS.LEO_PYTHON_COMMAND);
            this.startServerAutomatically = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.AUTO_START_SERVER, Constants.CONFIG_DEFAULTS.AUTO_START_SERVER);
            this.connectToServerAutomatically = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.AUTO_CONNECT, Constants.CONFIG_DEFAULTS.AUTO_CONNECT);
            this.connectionAddress = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.IP_ADDRESS, Constants.CONFIG_DEFAULTS.IP_ADDRESS);
            this.connectionPort = vscode.workspace.getConfiguration(Constants.CONFIG_NAME).get(Constants.CONFIG_NAMES.IP_PORT, Constants.CONFIG_DEFAULTS.IP_PORT);

            // * Set context for tree items visibility that are based on config options
            this._leoIntegration.sendConfigToServer(this.getConfig());
            utils.setContext(Constants.CONTEXT_FLAGS.LEO_TREE_BROWSE, this.leoTreeBrowse);
            utils.setContext(Constants.CONTEXT_FLAGS.TREE_IN_EXPLORER, this.treeInExplorer);
            utils.setContext(Constants.CONTEXT_FLAGS.SHOW_OPEN_ASIDE, this.showOpenAside);
            utils.setContext(Constants.CONTEXT_FLAGS.SHOW_EDIT, this.showEditOnNodes);
            utils.setContext(Constants.CONTEXT_FLAGS.SHOW_ARROWS, this.showArrowsOnNodes);
            utils.setContext(Constants.CONTEXT_FLAGS.SHOW_ADD, this.showAddOnNodes);
            utils.setContext(Constants.CONTEXT_FLAGS.SHOW_MARK, this.showMarkOnNodes);
            utils.setContext(Constants.CONTEXT_FLAGS.SHOW_CLONE, this.showCloneOnNodes);
            utils.setContext(Constants.CONTEXT_FLAGS.SHOW_COPY, this.showCopyOnNodes);
            utils.setContext(Constants.CONTEXT_FLAGS.AUTO_START_SERVER, this.startServerAutomatically); // server started
            utils.setContext(Constants.CONTEXT_FLAGS.AUTO_CONNECT, this.connectToServerAutomatically); // server started
        }
    }

}
