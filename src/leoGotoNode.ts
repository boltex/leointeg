import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoGoto } from "./types";
import * as utils from "./utils";

/**
 * * Opened Leo documents tree view node item implementation for usage in a TreeDataProvider
 */
export class LeoGotoNode extends vscode.TreeItem {

    // Context string is checked in package.json with 'when' clauses
    private _id: string;
    private _description: string | boolean;
    private _type: string;
    private _headline: string;

    constructor(
        gotoEntry: LeoGoto,
        navOptions: { isTag: boolean, showParents: boolean }
    ) {
        let w_spacing = "";
        if (navOptions.showParents && !navOptions.isTag) {
            w_spacing = "  ";
        }
        super(gotoEntry.t === "headline" ? (w_spacing + gotoEntry.h) : "");

        // Setup this instance
        this._id = utils.getUniqueId();
        this._type = gotoEntry.t;
        this._headline = gotoEntry.h.trim();

        this._description = false;
        if (this._type === 'body') {
            if (navOptions.showParents) {
                this._description = "    " + this._headline;
            } else {
                this._description = "  " + this._headline;
            }
        } else if (this._type === 'parent') {
            this._description = this._headline.trim();
        } else if (this._type === 'generic') {
            this._description = "< " + this._headline + " >";
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
        if (this._type !== "generic") {
            return this._type.charAt(0).toUpperCase() + this._type.slice(1);
        }
        return this._headline;
    }

    // @ts-ignore
    public get description(): string | boolean {
        return this._description;
    }

    // @ts-ignore
    // public get iconPath(): Icon| vscode.ThemeIcon|string {
    //     return false;
    // }

    // @ts-ignore
    public get id(): string {
        // Add prefix and suffix salt to numeric index to prevent accidental duplicates
        // Should be unique when refreshed
        return "g" + this._id + "o";
    }

}
