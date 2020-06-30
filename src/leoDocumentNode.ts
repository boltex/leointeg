import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoDocument, Icon } from "./types";
import { LeoIntegration } from "./leoIntegration";

/**
 * * Opened Leo documents tree view node item implementation for usage in a TreeDataProvider
 */
export class LeoDocumentNode extends vscode.TreeItem {

    constructor(
        public documentEntry: LeoDocument,
        public iconPath: Icon,
    ) {
        super(documentEntry.name);
        // * Setup this instance
        this.label = this.documentEntry.name;
        this.tooltip = "todo : tooltip";
        this.description = false;
        this.command = {
            command: Constants.NAME + "." + Constants.COMMANDS.SET_OPENED_FILE, // unexposed command test
            title: '',
            arguments: [this.documentEntry.index]
        };
    }

    public get id(): string {
        // Add prefix and suffix salt to numeric index prevent accidental duplicates
        return "p" + this.documentEntry.index + "s" + this.documentEntry.name;
    }
}