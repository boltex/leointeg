
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
        // this.description = false;
        // this.command = {
        //     command: Constants.NAME + "." + Constants.COMMANDS.,
        //     title: '',
        //     arguments: [this.documentEntry.index]
        // };
        // If this was created as a selected node, make sure it's selected as we may have opened/closed document
        // if (this.documentEntry.selected) {
        //     this._leoIntegration.setDocumentSelection(this);
        //     this.contextValue = w_isNamed ? Constants.CONTEXT_FLAGS.DOCUMENT_SELECTED_TITLED : Constants.CONTEXT_FLAGS.DOCUMENT_SELECTED_UNTITLED;
        // } else {
        //     this.contextValue = w_isNamed ? Constants.CONTEXT_FLAGS.DOCUMENT_TITLED : Constants.CONTEXT_FLAGS.DOCUMENT_UNTITLED;
        // }
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
        // Add prefix and suffix salt to numeric index prevent accidental duplicates
        return "p" + this.button.index + "s" + this.button.name;
    }
}