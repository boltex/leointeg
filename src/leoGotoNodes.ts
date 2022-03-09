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
    public contextValue: string;
    private _id: string;

    constructor(
        public gotoEntry: LeoGoto,
        private _leoIntegration: LeoIntegration
    ) {
        super(gotoEntry.name);
        // Setup this instance
        this._id = utils.getUniqueId();
        // const w_isNamed: boolean = !!this.gotoEntry.name;
        this.label = gotoEntry.label;
        // this.tooltip = w_isNamed ? this.gotoEntry.name : Constants.UNTITLED_FILE_NAME;
        // this.command = {
        //     command: Constants.COMMANDS.SET_OPENED_FILE,
        //     title: '',
        //     arguments: [this.gotoEntry.index]
        // };
        // // If this was created as a selected node, make sure it's selected as we may have opened/closed document
        // if (this.gotoEntry.selected) {
        //     this._leoIntegration.setDocumentSelection(this);
        //     this.contextValue = w_isNamed ? Constants.CONTEXT_FLAGS.GOTO_SELECTED_TITLED : Constants.CONTEXT_FLAGS.GOTO_SELECTED_UNTITLED;
        // } else {
        //     this.contextValue = w_isNamed ? Constants.CONTEXT_FLAGS.GOTO_TITLED : Constants.CONTEXT_FLAGS.GOTO_UNTITLED;
        // }
    }

    // @ts-ignore
    public get iconPath(): Icon {
        return false;  // this._leoIntegration.documentIcons[this.gotoEntry.changed ? 1 : 0];
    }

    // @ts-ignore
    public get id(): string {
        // Add prefix and suffix salt to numeric index to prevent accidental duplicates
        // Should be unique when refreshed
        return "g" + this.id + "o";
    }

}
