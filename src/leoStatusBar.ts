import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";

export class LeoStatusBar {
    // * Statusbar indicator behavior service

    private _leoStatusBarItem: vscode.StatusBarItem;
    private _statusbarNormalColor = new vscode.ThemeColor(Constants.GUI.THEME_STATUSBAR);  // "statusBar.foreground"
    private _updateStatusBarTimeout: NodeJS.Timeout | undefined;

    private _leoObjectSelected: boolean = false; // Represents having focus on a leo body
    set leoObjectSelected(p_value: boolean) {
        this._leoObjectSelected = p_value;
    }
    get leoObjectSelected(): boolean {
        return this._leoObjectSelected;
    }

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {
        this._leoStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        this._leoStatusBarItem.color = this._leoIntegration.config.statusBarColor;
        this._leoStatusBarItem.command = "leointeg.test"; // just call test function for now to help debugging
        this._leoStatusBarItem.text = Constants.GUI.STATUSBAR_INDICATOR + this._leoIntegration.config.statusBarString;
        this._leoStatusBarItem.tooltip = Constants.USER_MESSAGES.STATUSBAR_TOOLTIP_ON;
        _context.subscriptions.push(this._leoStatusBarItem);
        this._leoStatusBarItem.hide();
    }

    public show(): void {
        this._leoStatusBarItem.show();
    }

    public hide(): void {
        this._leoStatusBarItem.hide();
    }

    public update(p_state: boolean, p_debounceDelay?: number): void {
        if (p_state !== this.leoObjectSelected) {
            this.leoObjectSelected = p_state;
            if (p_debounceDelay) {
                this._updateLeoObjectIndicatorDebounced(p_debounceDelay);
            } else {
                this._updateLeoObjectIndicator();
            }
        }
    }

    private _updateLeoObjectIndicatorDebounced(p_delay: number): void {
        // * Update the status bar visual indicator flag in a debounced manner
        if (this._updateStatusBarTimeout) {
            clearTimeout(this._updateStatusBarTimeout);
        }
        this._updateStatusBarTimeout = setTimeout(() => {
            this._updateLeoObjectIndicator();
        }, p_delay);
    }

    private _updateLeoObjectIndicator(): void {
        // * Update the status bar visual indicator flag directly
        if (this._updateStatusBarTimeout) { // Can be called directly, so clear timer if any
            clearTimeout(this._updateStatusBarTimeout);
        }
        utils.setContext(Constants.CONTEXT_FLAGS.LEO_SELECTED, !!this.leoObjectSelected);
        this._leoStatusBarItem.text = Constants.GUI.STATUSBAR_INDICATOR + this._leoIntegration.config.statusBarString;
        if (this.leoObjectSelected && this._leoIntegration.fileOpenedReady) { // * Also check in constructor for statusBar properties (the createStatusBarItem call itself)
            this._leoStatusBarItem.color = "#" + this._leoIntegration.config.statusBarColor;
            this._leoStatusBarItem.tooltip = Constants.USER_MESSAGES.STATUSBAR_TOOLTIP_ON;
        } else {
            this._leoStatusBarItem.color = this._statusbarNormalColor;
            this._leoStatusBarItem.tooltip = Constants.USER_MESSAGES.STATUSBAR_TOOLTIP_OFF;
        }
    }
}