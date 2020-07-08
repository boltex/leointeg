import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoDocumentNode } from "./leoDocumentNode";
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
                if (p_package && p_package) {
                    const w_list: LeoDocumentNode[] = [];
                    const w_files: LeoDocument[] = p_package.openedFiles!.files;

                    let w_index: number = 0;

                    if (w_files && w_files.length) {
                        w_files.forEach((p_fileEntry: LeoDocument) => {
                            w_list.push(new LeoDocumentNode(p_fileEntry, this._leoIntegration));
                            w_index++;
                        });
                    }

                    return Promise.resolve(w_list);
                } else {
                    return Promise.resolve([]);
                }
            });
        } else {
            return Promise.resolve([]); // Defaults to an empty list of children
        }
    }

    public getParent(element: LeoDocumentNode): ProviderResult<LeoDocumentNode> | null {
        return null; // A list, as such, entries are always child of root, so return null
    }
}