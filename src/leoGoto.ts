import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { ProviderResult } from "vscode";
import { LeoGotoNode } from "./leoGotoNode";
import { Constants } from "./constants";
import { LeoGoto } from "./types";

/**
 * * Opened Leo documents shown as a list with this TreeDataProvider implementation
 */
export class LeoGotoProvider implements vscode.TreeDataProvider<LeoGotoNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<LeoGotoNode | undefined> = new vscode.EventEmitter<LeoGotoNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoGotoNode | undefined> = this._onDidChangeTreeData.event;


    private _lastGotoView: vscode.TreeView<LeoGotoNode> | undefined;

    private _topNode: LeoGotoNode | undefined;

    constructor(private _leoIntegration: LeoIntegration) { }

    public showGotoPanel(): Thenable<void> {
        if (this._lastGotoView && this._topNode) {
            return this._lastGotoView.reveal(this._topNode, { select: false, focus: false });
        }
        return Promise.resolve();
    }

    public setLastGotoView(p_view: vscode.TreeView<LeoGotoNode>): void {
        this._lastGotoView = p_view;
    }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        console.log('TRIGGER REFRESH ALL GOTO NAV !! ');
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: LeoGotoNode): Thenable<LeoGotoNode> | LeoGotoNode {
        return element;
    }

    public getChildren(element?: LeoGotoNode): Thenable<LeoGotoNode[]> {

        console.log('----------------------- getChildren GOTO NAV !! ');
        // if called with element, or not ready, give back empty array as there won't be any children
        if (this._leoIntegration.leoStates.fileOpenedReady && !element) {


            // call action to get get list, and convert to LeoButtonNode(s) array
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_GOTO_PANEL).then(p_package => {
                if (p_package && p_package.navList) {
                    const w_list: LeoGotoNode[] = [];
                    this._topNode = undefined;
                    const w_navList: LeoGoto[] = p_package.navList;
                    if (w_navList && w_navList.length) {
                        w_navList.forEach((p_goto: LeoGoto) => {
                            const w_newNode = new LeoGotoNode(p_goto, this._leoIntegration);
                            if (!this._topNode) {
                                this._topNode = w_newNode;
                            }
                            w_list.push(w_newNode);
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

    public getParent(element: LeoGotoNode): ProviderResult<LeoGotoNode> | null {
        // Leo documents are just a list, as such, entries are always child of root, so return null
        return null;
    }

}
