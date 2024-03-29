import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { Constants } from "./constants";
import { Icon } from "./types";

// leo undo provider class
export class LeoUndosProvider implements vscode.TreeDataProvider<LeoUndoNode> {

    private _beadId = 0;

    private _onDidChangeTreeData: vscode.EventEmitter<LeoUndoNode | undefined> = new vscode.EventEmitter<LeoUndoNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoUndoNode | undefined> = this._onDidChangeTreeData.event;

    constructor(
        private _leoIntegration: LeoIntegration
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
                        let w_foundNode: LeoUndoNode | undefined;
                        let i: number = 0;
                        let w_defaultIcon = 1;

                        beads.forEach(p_bead => {
                            let w_description: string = "";
                            let w_undoFlag: boolean = false;
                            let w_icon = w_defaultIcon;

                            if (i === bead) {
                                w_description = "Undo";
                                w_undoFlag = true;
                                w_icon = 0;
                                w_defaultIcon = 2;
                            }
                            if (i === bead + 1) {
                                w_description = "Redo";
                                w_icon = 2;
                                w_defaultIcon = 3;
                                if (!w_foundNode) {
                                    w_undoFlag = true; // Passed all nodes until 'redo', no undo found.
                                }
                            }
                            const w_node = new LeoUndoNode(
                                p_bead || "unknown",
                                w_description,
                                (this._beadId++).toString(),
                                Constants.CONTEXT_FLAGS.UNDO_BEAD,
                                i - bead, // 0 is same (no undo) +/- undo redo.
                                this._leoIntegration.undoIcons[w_icon]
                            );
                            w_children.push(w_node);
                            if (w_undoFlag) {
                                w_foundNode = w_node;
                            }
                            i++;
                        });
                        if (w_foundNode) {
                            this._leoIntegration.setUndoSelection(w_foundNode);
                        }
                    } else {
                        const w_node = new LeoUndoNode(
                            "Unchanged",
                            "",
                            (this._beadId++).toString(),
                            Constants.CONTEXT_FLAGS.NOT_UNDO_BEAD,
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

    }

    public getParent(element: LeoUndoNode): vscode.ProviderResult<LeoUndoNode> {
        // Leo documents are just a list, as such, entries are always child of root, so return null
        return undefined;
    }

    public resolveTreeItem(item: LeoUndoNode, element: LeoUndoNode, token: vscode.CancellationToken): vscode.ProviderResult<LeoUndoNode> {
        // item.tooltip = "TODO Undo Tooltip";
        if (item.contextValue === Constants.CONTEXT_FLAGS.UNDO_BEAD) {
            item.tooltip = "Undo Bead #" + item.beadIndex;
        }
        return item;
    }
}

/**
 * * Opened Leo documents tree view node item implementation for usage in a TreeDataProvider
 */
export class LeoUndoNode extends vscode.TreeItem {

    constructor(
        public label: string,
        public description: string,
        public id: string,
        public contextValue: string,
        public beadIndex: number,
        public iconPath?: Icon

    ) {
        super(label);
    }

}
