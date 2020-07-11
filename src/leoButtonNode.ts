
// @button node implementation for usage with the leoButtons.ts treeview provider
import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoButton, Icon } from "./types";
import * as utils from "./utils";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Leo @buttons tree view node item implementation for usage in a TreeDataProvider
 */
export class LeoButtonNode extends vscode.TreeItem {

    public contextValue: string; // * Context string is checked in package.json with 'when' clauses

    constructor(
        public button: LeoButton,
        private _leoIntegration: LeoIntegration
    ) {
        super(button.name);
        // * Setup this instance
        this.command = {
            command: Constants.NAME + "." + Constants.COMMANDS.CLICK_BUTTON,
            title: '',
            arguments: [this.button.index]
        };
        this.contextValue = "leoButtonNode";
    }

    public get iconPath(): Icon {
        // return this._leoIntegration.documentIcons[this.documentEntry.changed ? 1 : 0];
        return {
            "light": "",
            "dark": ""
        };
    }

    public get id(): string {
        // Add prefix and suffix salt to index prevent accidental duplicates
        return "p" + this.button.index + "s" + this.button.name;
    }
}