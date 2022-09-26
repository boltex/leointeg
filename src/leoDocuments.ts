import * as vscode from "vscode";
import * as utils from './utils';
import { LeoIntegration } from "./leoIntegration";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";
import { LeoDocument } from "./types";

/**
 * * Opened Leo documents shown as a list with this TreeDataProvider implementation
 */
export class LeoDocumentsProvider implements vscode.TreeDataProvider<LeoDocumentNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<LeoDocumentNode | undefined> = new vscode.EventEmitter<LeoDocumentNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoDocumentNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private _leoIntegration: LeoIntegration) { }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: LeoDocumentNode): Thenable<LeoDocumentNode> | LeoDocumentNode {
        return element;
    }

    public getChildren(element?: LeoDocumentNode): Thenable<LeoDocumentNode[]> {

        // if called with element, or not ready, give back empty array as there won't be any children
        if (this._leoIntegration.leoStates.fileOpenedReady && !element) {

            // call action to get get list, and convert to LeoDocumentNode(s) array
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_OPENED_FILES).then(p_package => {
                if (p_package && p_package.files) {
                    const w_list: LeoDocumentNode[] = [];
                    const w_files: LeoDocument[] = p_package.files;

                    let w_index: number = 0;

                    if (w_files && w_files.length) {
                        w_files.forEach((i_file: LeoDocument) => {
                            i_file.index = w_index;
                            w_list.push(new LeoDocumentNode(i_file, this._leoIntegration));
                            w_index++;
                        });
                    }
                    return w_list;
                } else {
                    return [];
                }
            });
        } else {
            return Promise.resolve([]); // Defaults to an empty list of children
        }
    }

    public getParent(element: LeoDocumentNode): ProviderResult<LeoDocumentNode> | null {
        // Leo documents are just a list, as such, entries are always child of root, so return null
        return null;
    }

}

/**
 * * Opened Leo documents tree view node item implementation for usage in a TreeDataProvider
 */
export class LeoDocumentNode extends vscode.TreeItem {

    // Context string is checked in package.json with 'when' clauses
    public contextValue: string;
    private _id: string;

    constructor(
        public documentEntry: LeoDocument,
        private _leoIntegration: LeoIntegration
    ) {
        super(documentEntry.name);
        // Setup this instance
        this._id = utils.getUniqueId();
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

    // @ts-ignore
    public get iconPath(): Icon {
        return this._leoIntegration.documentIcons[this.documentEntry.changed ? 1 : 0];
    }

    // @ts-ignore
    public get id(): string {
        // Add prefix and suffix salt to numeric index to prevent accidental duplicates
        // Should be unique when refreshed
        // return this._id;
        return "c" + (this.documentEntry.changed ? "y" : "n") +
            "p" + this.documentEntry.index +
            "s" + this.documentEntry.name;
    }

}
