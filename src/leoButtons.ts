import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoButtonNode } from "./leoButtonNode";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";
import { LeoButton } from "./types";

/**
 * * '@buttons' shown as a list with this TreeDataProvider implementation
 */
export class LeoButtonsProvider implements vscode.TreeDataProvider<LeoButtonNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<LeoButtonNode | undefined> = new vscode.EventEmitter<LeoButtonNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoButtonNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private _leoIntegration: LeoIntegration) { }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: LeoButtonNode): Thenable<LeoButtonNode> | LeoButtonNode {
        return element;
    }

    public getChildren(element?: LeoButtonNode): Thenable<LeoButtonNode[]> {
        // if called with element, or not ready, give back empty array as there won't be any children
        if (this._leoIntegration.leoStates.fileOpenedReady && !element) {

            // call action to get get list, and convert to LeoButtonNode(s) array
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_BUTTONS).then(p_package => {
                if (p_package && p_package.buttons) {
                    const w_list: LeoButtonNode[] = [];
                    const w_buttons: LeoButton[] = p_package.buttons;
                    if (w_buttons && w_buttons.length) {
                        w_buttons.forEach((i_button: LeoButton) => {
                            w_list.push(new LeoButtonNode(i_button, this._leoIntegration));
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

    public getParent(element: LeoButtonNode): ProviderResult<LeoButtonNode> | null {
        // Buttons are just a list, as such, entries are always child of root so return null
        return null;
    }

}
