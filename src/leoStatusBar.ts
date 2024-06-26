import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Statusbar indicator controller service
 */
export class LeoStatusBar {

    private _leoStatusBarItem: vscode.StatusBarItem;
    private _updateStatusBarTimeout: NodeJS.Timeout | undefined;
    public unlString: string = ""; // Use this string with indicator, using this will replace the default from config

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {
        this._leoStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        // this._leoStatusBarItem.color = this._leoIntegration.config.statusBarColor;
        const w_mdToolTip = new vscode.MarkdownString();
        w_mdToolTip.isTrusted = true;
        w_mdToolTip.supportThemeIcons = true;
        w_mdToolTip.value = `\

        #### [Click to copy UNL to clipboard](command:${Constants.COMMANDS.STATUS_BAR})

        ---

        _Or choose a specific UNL type:_

        **[short gnx](command:${Constants.COMMANDS.SHORT_GNX_UNL_TO_CLIPBOARD})** —
        **[full gnx](command:${Constants.COMMANDS.FULL_GNX_UNL_TO_CLIPBOARD})**

        **[short legacy](command:${Constants.COMMANDS.SHORT_LEGACY_UNL_TO_CLIPBOARD})** —
        **[full legacy](command:${Constants.COMMANDS.FULL_LEGACY_UNL_TO_CLIPBOARD})**

        `.replace(/\n {8}/g, '\n');


        this._leoStatusBarItem.command = Constants.COMMANDS.STATUS_BAR;
        this._leoStatusBarItem.text = Constants.GUI.STATUSBAR_INDICATOR;
        this._leoStatusBarItem.tooltip = w_mdToolTip;
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
     * * Sets string to replace default from config & refresh it
     * @p_string string to be displayed on Leo's status bar space.
     * @param p_debounceDelay Optional, in milliseconds
     * 
     */
    public setString(p_string: string, p_debounceDelay?: number): void {
        if (this.unlString === p_string) {
            return; // cancel
        }
        this.unlString = p_string;
        if (p_debounceDelay) {
            this._updateLeoObjectIndicatorDebounced(p_debounceDelay);
        } else {
            this._updateLeoObjectIndicator();
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
        this._leoStatusBarItem.text = Constants.GUI.STATUSBAR_INDICATOR + this.unlString;
    }

}
