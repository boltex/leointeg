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
        // TODO : Add HARD CODED strings to constants.ts
        this._isAdd = (this.button.index.startsWith("nullButtonWidget") && this.button.name === "script-button");
        this.contextValue = this._isAdd ? "leoButtonAdd" : "leoButtonNode";
    }

    // @ts-ignore
    public get iconPath(): Icon {
        return this._leoIntegration.buttonIcons[this._isAdd ? 1 : 0];
    }

    // @ts-ignore
    public get id(): string {
        // Add prefix and suffix salt to index to prevent accidental duplicates
        return "p" + this.button.index + "s" + this.button.name;
    }

    // @ts-ignore
    public get tooltip(): string {
        if (this._isAdd) {
            return Constants.USER_MESSAGES.SCRIPT_BUTTON_TOOLTIP;
        } else {
            return this.button.name;
        }
    }

    // @ts-ignore
    public get description(): string | boolean {
        if (this._isAdd) {
            return Constants.USER_MESSAGES.SCRIPT_BUTTON;
        } else {
            return false;
        }
    }

}
