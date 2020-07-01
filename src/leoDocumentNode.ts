import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoDocument } from "./types";
import * as utils from "./utils";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Opened Leo documents tree view node item implementation for usage in a TreeDataProvider
 */
export class LeoDocumentNode extends vscode.TreeItem {

    public contextValue: string; // * Context string is checked in package.json with 'when' clauses

    constructor(
        public documentEntry: LeoDocument,
        private _leoIntegration: LeoIntegration
    ) {
        super(documentEntry.name);
        // * Setup this instance
        this.label = this.documentEntry.name ? utils.getFileFromPath(this.documentEntry.name) : Constants.UNTITLED_FILE_NAME;
        this.tooltip = this.documentEntry.name ? this.documentEntry.name : Constants.UNTITLED_FILE_NAME;
        this.description = false;
        this.command = {
            command: Constants.NAME + "." + Constants.COMMANDS.SET_OPENED_FILE, // unexposed command test
            title: '',
            arguments: [this.documentEntry.index]
        };
        // If this was created as a selected node, make sure it's selected as we may have opened/closed document
        if (this.documentEntry.selected) {
            this._leoIntegration.setDocumentSelection(this);
            this.contextValue = Constants.CONTEXT_FLAGS.DOCUMENT_SELECTED;
        } else {
            this.contextValue = Constants.CONTEXT_FLAGS.DOCUMENT;
        }
    }

    public get iconPath(): { light: string; dark: string } {
        return this._leoIntegration.documentIcons[this.documentEntry.changed ? 1 : 0];
    }

    public get id(): string {
        // Add prefix and suffix salt to numeric index prevent accidental duplicates
        return "p" + this.documentEntry.index + "s" + this.documentEntry.name;
    }
}