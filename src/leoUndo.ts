import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { LeoUndoNode } from "./leoUndoNode";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";
import { LeoUndo } from "./types";

// leo undo provider class
export class LeoUndosProvider implements vscode.TreeDataProvider<LeoUndoNode> {

    private _beadId = 0;

    private _onDidChangeTreeData: vscode.EventEmitter<LeoUndoNode | undefined> = new vscode.EventEmitter<LeoUndoNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoUndoNode | undefined> = this._onDidChangeTreeData.event;

    constructor(
        private _leoIntegration: LeoIntegration
        // private _leoStates: LeoStates,
        // private _leoUI: LeoUI,
    ) { }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: LeoUndoNode): Thenable<LeoUndoNode> | LeoUndoNode {
        return element;
    }

    public getChildren(element?: LeoUndoNode): Thenable<LeoUndoNode[]> {
        const w_children: LeoUndoNode[] = [];

        if (this._leoIntegration.leoStates.fileOpenedReady && !element) {

            // call action to get get list, and convert to LeoButtonNode(s) array
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_UNDOS).then(p_package => {
                if (p_package && p_package.undos) {

                    // response = {"bead": undoer.bead, "undos": undos}
                    const beads = p_package.undos;
                    const bead = p_package.bead || 0;

                    if (beads.length) {
                        let i: number = 0;
                        beads.forEach(p_bead => {
                            let w_description: string = "";
                            let w_undoFlag: boolean = false;
                            if (i === bead) {
                                w_description = "Undo";
                                w_undoFlag = true;
                            }
                            if (i === bead + 1) {
                                w_description = "Redo";
                            }
                            const w_node = new LeoUndoNode(
                                p_bead || "unknown",
                                w_description,
                                (this._beadId++).toString(),
                                i - bead // 0 is same (no undo) +/- undo redo.

                            );
                            w_children.push(w_node);
                            if (w_undoFlag) {
                                this._leoIntegration.setUndoSelection(w_node);
                            }
                            i++;
                        });
                    } else {
                        const w_node = new LeoUndoNode(
                            "Unchanged",
                            "",
                            (this._beadId++).toString(),
                            0
                        );
                        w_children.push(w_node);
                    }

                    return w_children;
                } else {
                    return [];
                }
            });
        } else {
            return Promise.resolve([]); // Defaults to an empty list of children
        }

        // if called with element, or not ready, give back empty array as there won't be any children
        // if (this._leoStates.fileOpenedReady && !element && g.app.windowList.length) {
        //     const c = g.app.windowList[this._leoUI.frameIndex].c;
        //     const undoer = c.undoer;
        //     if (undoer.beads.length) {
        //         let i: number = 0;
        //         undoer.beads.forEach(p_bead => {
        //             let w_description: string = "";
        //             let w_undoFlag: boolean = false;
        //             if (i === undoer.bead) {
        //                 w_description = "Undo";
        //                 w_undoFlag = true;
        //             }
        //             if (i === undoer.bead + 1) {
        //                 w_description = "Redo";
        //             }
        //             const w_node = new LeoUndoNode(
        //                 p_bead.undoType || "unknown",
        //                 w_description,
        //                 (this._beadId++).toString()
        //             );
        //             w_children.push(w_node);
        //             if (w_undoFlag) {
        //                 this._leoUI.setUndoSelection(w_node);
        //             }
        //             i++;
        //         });
        //     } else {
        //         const w_node = new LeoUndoNode(
        //             "Unchanged",
        //             "",
        //             (this._beadId++).toString()
        //         );
        //         w_children.push(w_node);
        //     }
        // }

    }

    public getParent(element: LeoUndoNode): vscode.ProviderResult<LeoUndoNode> {
        // Leo documents are just a list, as such, entries are always child of root, so return null
        return undefined;
    }

    public resolveTreeItem(item: LeoUndoNode, element: LeoUndoNode, token: vscode.CancellationToken): vscode.ProviderResult<LeoUndoNode> {
        // item.tooltip = "TODO Undo Tooltip";
        return item;
    }
}
