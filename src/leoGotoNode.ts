import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoGoto, TGotoTypes } from "./types";
import * as utils from "./utils";

/**
 * * Opened Leo documents tree view node item implementation for usage in a TreeDataProvider
 */
export class LeoGotoNode extends vscode.TreeItem {

    // Context string is checked in package.json with 'when' clauses
    public entryType: TGotoTypes;
    private _id: string;
    private _description: string | boolean;
    private _headline: string;
    public key: number; // id from python

    constructor(
        gotoEntry: LeoGoto,
        navOptions: { isTag: boolean, showParents: boolean }
    ) {
        let w_spacing = "";
        if (navOptions.showParents && !navOptions.isTag) {
            w_spacing = "    ";
        }
        let w_label = "";
        if (["tag", "headline"].includes(gotoEntry.t)) {
            w_label = w_spacing + gotoEntry.h;
        }
        super(w_label);

        // Setup this instance
        this._id = utils.getUniqueId();
        this.entryType = gotoEntry.t;
        this.key = gotoEntry.key;
        this._headline = gotoEntry.h.trim();

        this._description = false;
        if (this.entryType === 'body') {
            if (navOptions.showParents) {
                this._description = "    " + this._headline;
            } else {
                this._description = "  " + this._headline;
            }
        } else if (this.entryType === 'parent') {
            this._description = this._headline.trim();
        } else if (this.entryType === 'generic') {
            this._description = this._headline;
        }

        this.command = {
            command: Constants.COMMANDS.GOTO_NAV_ENTRY,
            title: '',
            arguments: [this]
        };
        this.iconPath = undefined;
    }

    // @ts-ignore
    public get tooltip(): string {
        if (this.entryType !== "generic") {
            return this.entryType.charAt(0).toUpperCase() + this.entryType.slice(1);
        }
        return this._headline;
    }

    // @ts-ignore
    public get description(): string | boolean {
        return this._description;
    }

    // @ts-ignore
    // public get iconPath(): Icon| vscode.ThemeIcon|string {
    // return this._leoIntegration.gotoIcons[this.documentEntry.changed ? 1 : 0];

    // }

    // @ts-ignore
    public get id(): string {
        // Add prefix and suffix salt to numeric index to prevent accidental duplicates
        // Should be unique when refreshed
        return "g" + this._id + "o";
    }

}
