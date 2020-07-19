import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoButton, Icon } from "./types";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Leo @buttons tree view node item implementation, for usage in a TreeDataProvider.
 */
export class LeoButtonNode extends vscode.TreeItem {

    // Context string that is checked in package.json with 'when' clauses
    public contextValue: string;

    private _isAdd: boolean;

    constructor(
        public button: LeoButton,
        private _leoIntegration: LeoIntegration
    ) {
        super(button.name);
        // Setup this instance (just differentiate 'script-button' for now)
        this.command = {
            command: Constants.COMMANDS.CLICK_BUTTON,
            title: '',
            arguments: [this]
        };
        this._isAdd = (this.button.index === "nullButtonWidget 1" && this.button.name === "script-button");
        this.contextValue = "leoButtonNode";
    }

    public get iconPath(): Icon {
        return this._leoIntegration.buttonIcons[this._isAdd ? 1 : 0];
    }

    public get id(): string {
        // Add prefix and suffix salt to index prevent accidental duplicates
        return "p" + this.button.index + "s" + this.button.name;
    }

    public get tooltip(): string {
        if (this._isAdd) {
            return Constants.USER_MESSAGES.SCRIPT_BUTTON_TOOLTIP;
        } else {
            return this.button.name;
        }
    }

    public get description(): string | boolean {
        if (this._isAdd) {
            return Constants.USER_MESSAGES.SCRIPT_BUTTON;
        } else {
            return false;
        }
    }
}
