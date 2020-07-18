import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoDocument, Icon } from "./types";
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
        const w_isNamed: boolean = !!this.documentEntry.name;
        this.label = w_isNamed ? utils.getFileFromPath(this.documentEntry.name) : Constants.UNTITLED_FILE_NAME;
        this.tooltip = w_isNamed ? this.documentEntry.name : Constants.UNTITLED_FILE_NAME;
        this.command = {
            command: Constants.COMMANDS.SET_OPENED_FILE,
            title: '',
            arguments: [this.documentEntry.index]
        };
        // If this was created as a selected node, make sure it's selected as we may have opened/closed document
        if (this.documentEntry.selected) {
            this._leoIntegration.setDocumentSelection(this);
            this.contextValue = w_isNamed ? Constants.CONTEXT_FLAGS.DOCUMENT_SELECTED_TITLED : Constants.CONTEXT_FLAGS.DOCUMENT_SELECTED_UNTITLED;
        } else {
            this.contextValue = w_isNamed ? Constants.CONTEXT_FLAGS.DOCUMENT_TITLED : Constants.CONTEXT_FLAGS.DOCUMENT_UNTITLED;
        }
    }

    public get iconPath(): Icon {
        return this._leoIntegration.documentIcons[this.documentEntry.changed ? 1 : 0];
    }

    public get id(): string {
        // Add prefix and suffix salt to numeric index prevent accidental duplicates
        return "p" + this.documentEntry.index + "s" + this.documentEntry.name;
    }
}