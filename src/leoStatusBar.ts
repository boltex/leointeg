import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Statusbar indicator controller service
 */
export class LeoStatusBar {

    private _leoStatusBarItem: vscode.StatusBarItem;
    private _statusbarNormalColor = new vscode.ThemeColor(Constants.GUI.THEME_STATUSBAR);  // "statusBar.foreground"
    private _updateStatusBarTimeout: NodeJS.Timeout | undefined;

    // * Represents having focus on a leo tree, body or document panel to enable leo keybindings
    private _statusBarFlag: boolean = false;
    set statusBarFlag(p_value: boolean) {
        this._statusBarFlag = p_value;
    }
    get statusBarFlag(): boolean {
        return this._statusBarFlag;
    }

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {
        this._leoStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        // this._leoStatusBarItem.color = this._leoIntegration.config.statusBarColor;

        // this._leoStatusBarItem.command = Constants.COMMANDS.STATUS_BAR;
        this._leoStatusBarItem.text = Constants.GUI.STATUSBAR_INDICATOR;
        this._leoStatusBarItem.tooltip = Constants.USER_MESSAGES.STATUSBAR_TOOLTIP_ON;
        this._context.subscriptions.push(this._leoStatusBarItem);
        this._leoStatusBarItem.hide();
    }

    /**
     * * Makes the statusbar indicator visible
     */
    public show(): void {
        this._leoStatusBarItem.show();
    }

    /**
     * * Hides the statusbar indicator
     */
    public hide(): void {
        this._leoStatusBarItem.hide();
    }

    /**
     * * Updates the status bar visual indicator visual indicator with optional debouncing delay
     * @param p_state True/False flag for On or Off status
     * @param p_debounceDelay Optional, in milliseconds
     */
    public update(p_state: boolean, p_debounceDelay?: number, p_forced?: boolean): void {
        if (p_forced || (p_state !== this.statusBarFlag)) {
            this.statusBarFlag = p_state;
            if (p_debounceDelay) {
                this._updateLeoObjectIndicatorDebounced(p_debounceDelay);
            } else {
                this._updateLeoObjectIndicator();
            }
        }
    }

    /**
     * * Updates the status bar visual indicator flag in a debounced manner
     * @param p_delay number of milliseconds
     */
    private _updateLeoObjectIndicatorDebounced(p_delay: number): void {
        if (this._updateStatusBarTimeout) {
            clearTimeout(this._updateStatusBarTimeout);
        }
        this._updateStatusBarTimeout = setTimeout(() => {
            this._updateLeoObjectIndicator();
        }, p_delay);
    }

    /**
     * * Updates the status bar visual indicator flag directly
     */
    private _updateLeoObjectIndicator(): void {
        // Can be called directly, so clear timer if any
        if (this._updateStatusBarTimeout) {
            clearTimeout(this._updateStatusBarTimeout);
        }

        this._leoStatusBarItem.text = Constants.GUI.STATUSBAR_INDICATOR +
            (this._leoIntegration.leoStates.leoOpenedFileName ? utils.getFileFromPath(this._leoIntegration.leoStates.leoOpenedFileName) : Constants.UNTITLED_FILE_NAME);

        // Also check in constructor for statusBar properties (the createStatusBarItem call itself)
        if (this.statusBarFlag && this._leoIntegration.leoStates.fileOpenedReady) {
            // this._leoStatusBarItem.color = "#" + this._leoIntegration.config.statusBarColor;
            this._leoStatusBarItem.tooltip = Constants.USER_MESSAGES.STATUSBAR_TOOLTIP_ON;
        } else {
            this._leoStatusBarItem.color = this._statusbarNormalColor;
            this._leoStatusBarItem.tooltip = Constants.USER_MESSAGES.STATUSBAR_TOOLTIP_OFF;
        }
    }

}
