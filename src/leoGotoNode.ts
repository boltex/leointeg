import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoGoto, Icon } from "./types";
import * as utils from "./utils";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Opened Leo documents tree view node item implementation for usage in a TreeDataProvider
 */
export class LeoGotoNode extends vscode.TreeItem {

    // Context string is checked in package.json with 'when' clauses
    private _id: string;

    constructor(
        public gotoEntry: LeoGoto,
        private _leoIntegration: LeoIntegration
    ) {
        super(gotoEntry.h);
        // Setup this instance
        this._id = utils.getUniqueId();

        this.label = gotoEntry.h;

        // this.tooltip = w_isNamed ? this.gotoEntry.name : Constants.UNTITLED_FILE_NAME;

        this.command = {
            command: Constants.COMMANDS.GOTO_NAV_ENTRY,
            title: '',
            arguments: [this]
        };

    }

    // @ts-ignore
    // public get iconPath(): Icon| vscode.ThemeIcon|string {
    //     return false;  // this._leoIntegration.documentIcons[this.gotoEntry.changed ? 1 : 0];
    // }

    // @ts-ignore
    public get id(): string {
        // Add prefix and suffix salt to numeric index to prevent accidental duplicates
        // Should be unique when refreshed
        return "g" + this._id + "o";
    }

}
