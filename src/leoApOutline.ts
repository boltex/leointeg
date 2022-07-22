import * as vscode from 'vscode';
import { Constants } from "./constants";
import * as utils from './utils';
import { LeoIntegration } from './leoIntegration';
import { ArchivedPosition, Icon, LeoBridgePackage } from './types';

export class LeoApOutlineProvider implements vscode.TreeDataProvider<ArchivedPosition> {

    private _onDidChangeTreeData: vscode.EventEmitter<ArchivedPosition | undefined> = new vscode.EventEmitter<ArchivedPosition | undefined>();

    readonly onDidChangeTreeData: vscode.Event<ArchivedPosition | undefined> = this._onDidChangeTreeData.event;

    public treeId: number = 0; // Starting salt for generated tree node Ids

    private _rootNode: ArchivedPosition | undefined;

    constructor(
        private _icons: Icon[],
        private _leoIntegration: LeoIntegration
    ) {
    }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * * Builds a unique Id from gnx and stack, plus collapsed state,
     * for vscode to distinguish the collapsed state.
     */
    private _buildId(p: ArchivedPosition, p_collapsed: number): string {
        // concatenate gnx, stacks gnx's, and collapsible state number.
        // (vscode uses id for collapsible state)
        return this.treeId + p.gnx + p.childIndex + p.stack.map(s => s.gnx + s.childIndex).join("");
        // NOT NEEDED -> expanded.toString(); // Added Uniqueness: VSCode's collapsible state in id
    }

    /**
     * * Force uniqueness of ids generated for nodes in the  next tree refresh
     */
    public incTreeId(): void {
        this.treeId++;
    }

    public getTreeItem(element: ArchivedPosition): Thenable<LeoApOutlineNode> | LeoApOutlineNode {

        let w_collapse: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
        if (element.hasChildren) {
            w_collapse = element.expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
        }
        let w_contextValue = Constants.CONTEXT_FLAGS.NODE_UNMARKED;
        if (element.marked) {
            w_contextValue = Constants.CONTEXT_FLAGS.NODE_MARKED;
        }
        // then append 'leoNodeAtFile' to existing if needed
        if (element.atFile) {
            w_contextValue += Constants.CONTEXT_FLAGS.NODE_ATFILE;
        }
        // then append 'leoNodeCloned' to existing if needed
        if (element.cloned) {
            w_contextValue += Constants.CONTEXT_FLAGS.NODE_CLONED;
        }
        // and finally, check for 'root' too
        if (element._isRoot) {
            w_contextValue += Constants.CONTEXT_FLAGS.NODE_ROOT;
        } else {
            w_contextValue += Constants.CONTEXT_FLAGS.NODE_NOT_ROOT;
        }
        const w_icon: number =
            (+element.dirty << 3) |
            (+element.cloned << 2) |
            (+element.marked << 1) |
            +element.hasBody;

        // const w_u = (element.v.u && Object.keys(element.v.u).length) ? element.v.u : false;
        // let desc: string = "";
        // // * some smaller grayed-out text accompanying the main label
        // if (w_u) {

        //     const w_uLength = Object.keys(w_u).length;
        //     if (w_uLength) {
        //         desc = "\u{1F4CE} (" + w_uLength + ")";
        //         if (w_u.__node_tags) {
        //             if (w_uLength === 1) {
        //                 // was only tag, so reset it
        //                 desc = "";
        //             } else {
        //                 desc = desc + " "; // add space
        //             }
        //             desc = desc + "\u{1F3F7} (" + Object.keys(w_u.__node_tags).length + ")";
        //         }
        //     }

        // } else {
        //     // desc = "id:" + this.id; // ! debug test
        //     // desc = "gnx:" + this.gnx; // ! debug test
        // }
        let desc: string = "";
        let tagsQty = 0;
        if (element.u || element.nodeTags) {
            tagsQty = element.nodeTags ? element.nodeTags : 0;
            if (element.u) {
                desc = "\u{1F4CE} (" + element.u + ")";
                delete element.u;
            }
            if (tagsQty) {
                if (desc) {
                    desc = desc + " "; // add space
                }
                desc = desc + "\u{1F3F7} (" + tagsQty + ")";
                delete element.nodeTags;
            }
        }



        const w_leoNode = new LeoApOutlineNode(
            element.headline,
            w_collapse,
            element, // ArchivedPosition
            desc,
            this._icons[w_icon],
            this._buildId(element, w_collapse),
            w_contextValue
        );
        // Check if its the selected node and call signal it to the UI
        if (element.selected) {
            this._leoIntegration.gotSelectedNode(element, w_leoNode);
        }
        // Build a LeoNode (a vscode tree node) from the ArchivedPosition
        return w_leoNode;
    }

    public getChildren(element?: ArchivedPosition): Thenable<ArchivedPosition[]> {
        if (!this._leoIntegration.leoStates.fileOpenedReady) {
            return Promise.resolve([]); // Defaults to an empty list of children
        }
        if (element) {
            return this._leoIntegration.sendAction(
                Constants.LEOBRIDGE.GET_CHILDREN,
                utils.buildNodeCommandJson(JSON.stringify(element))
            ).then((p_package: LeoBridgePackage) => {
                return p_package.children!;
            });
        } else {
            return this._leoIntegration.sendAction(
                Constants.LEOBRIDGE.GET_CHILDREN, "{}"
            ).then((p_package: LeoBridgePackage) => {
                const w_nodes = p_package.children!;
                if (w_nodes && w_nodes.length === 1) {
                    this._rootNode = w_nodes[0];
                    this._rootNode._isRoot = true;
                }
                return w_nodes;
            });
        }
        // if (element) {
        //     return [...element.children()];
        // } else {
        //     if (g.app.windowList[this._leoIntegration.frameIndex]) {
        //         // Currently Selected Document's Commander
        //         const w_c = g.app.windowList[this._leoIntegration.frameIndex].c;
        //         if (w_c.hoistStack.length) {
        //             // HOISTED: Topmost hoisted node starts the outline as single root 'child'
        //             const w_rootPosition = w_c.hoistStack[w_c.hoistStack.length - 1].p;
        //             w_rootPosition._isRoot = true;
        //             return [w_rootPosition];
        //         } else {
        //             // NOT HOISTED: Normal list of root nodes
        //             const w_rootNodes = [...w_c.all_Root_Children()];
        //             if (w_rootNodes.length === 1) {
        //                 // Exactly one: prevent hoisting on SINGLE top node
        //                 w_rootNodes[0]._isRoot = true;
        //             }
        //             return w_rootNodes;
        //         }
        //     } else {
        //         return []; // Attempted to access un-existent frame
        //     }
        // }
    }

    public getParent(element: ArchivedPosition): vscode.ProviderResult<ArchivedPosition> {
        // if (element) {
        //     const p_parent = element.parent();
        //     if (p_parent.v) {
        //         return p_parent;
        //     } else {
        //         return undefined;
        //     }
        // }
        // return undefined;

        if (this._leoIntegration.leoStates.fileOpenedReady) {
            // Check if hoisted and is already up to root node
            if (this._rootNode && element.gnx === this._rootNode.gnx && element.childIndex === this._rootNode.childIndex) {
                if (
                    JSON.stringify(this._rootNode.stack) ===
                    JSON.stringify(element.stack)
                ) {
                    return null; // Default gives no parent
                }
            }

            return this._leoIntegration.sendAction(
                Constants.LEOBRIDGE.GET_PARENT,
                element ? utils.buildNodeCommandJson(JSON.stringify(element)) : "{}"
            ).then((p_package: LeoBridgePackage) => {
                if (p_package.node === null) {
                    return null;
                } else {
                    return p_package.node;
                }
            });
        } else {
            return null; // Default gives no parent
        }
    }

    public resolveTreeItem(item: LeoApOutlineNode, element: ArchivedPosition, token: vscode.CancellationToken): vscode.ProviderResult<LeoApOutlineNode> {

        if (!item.description) {
            // No ua's nor node tags.
            item.tooltip = item.label;
            return item;
        }

        // Has description, so get uA's from server.
        return this._leoIntegration.sendAction(
            Constants.LEOBRIDGE.GET_UA,
            utils.buildNodeCommandJson(JSON.stringify(element))
        ).then((p_package: LeoBridgePackage) => {
            if (p_package.ua && p_package.ua !== null) {

                const tagQty = (Object.keys(p_package.ua).length && p_package.ua.__node_tags) ? p_package.ua.__node_tags.length : 0;

                if (tagQty) {
                    // list tags instead
                    item.tooltip = item.label + "\n\u{1F3F7} " + p_package.ua.__node_tags.join('\n\u{1F3F7} ') + "\n";
                    delete p_package.ua.__node_tags;
                } else {
                    item.tooltip = item.label + "\n";
                }

                // Recalculate
                if (Object.keys(p_package.ua).length) {
                    item.tooltip += JSON.stringify(p_package.ua, undefined, 2);
                }

            } else {
                item.tooltip = item.label;
            }
            return item;

        });
    }

}

export class LeoApOutlineNode extends vscode.TreeItem {

    constructor(
        public label: string, // Node headline
        public collapsibleState: vscode.TreeItemCollapsibleState,
        public position: ArchivedPosition, // Pointer/reference for leo's node ArchivedPosition
        public description: string,
        public iconPath: Icon,
        public id: string,
        public contextValue: string // For contextual menu on each node (not the global 'selected node' flag!)
    ) {
        super(label, collapsibleState);
        this.command = {
            command: Constants.COMMANDS.SELECT_NODE,
            title: '',
            // using 'this' as LeoApOutlineNode instead of position, to match 'openToTheSide' paramter
            arguments: [this]
        };
    }

}

