import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";
import { LeoGoto, LeoGotoNavKey, TGotoTypes } from "./types";
import * as utils from "./utils";

/**
 * * Opened Leo documents shown as a list with this TreeDataProvider implementation
 */
export class LeoGotoProvider implements vscode.TreeDataProvider<LeoGotoNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<LeoGotoNode | undefined> = new vscode.EventEmitter<LeoGotoNode | undefined>();

    readonly onDidChangeTreeData: vscode.Event<LeoGotoNode | undefined> = this._onDidChangeTreeData.event;

    private _lastGotoView: vscode.TreeView<LeoGotoNode> | undefined;

    private _nodeList: LeoGotoNode[] = []; // Node list kept here.

    private _selectedNodeIndex: number = 0;

    constructor(private _leoIntegration: LeoIntegration) { }

    public setLastGotoView(p_view: vscode.TreeView<LeoGotoNode>): void {
        this._lastGotoView = p_view;
    }

    public resetSelectedNode(p_node?: LeoGotoNode): void {
        this._selectedNodeIndex = 0;
        if (p_node) {
            const w_found = this._nodeList.indexOf(p_node);
            if (w_found >= 0) {
                this._selectedNodeIndex = w_found;
            }
        }
    }

    public navigateNavEntry(p_nav: LeoGotoNavKey): void {
        if (!this._nodeList.length) {
            return;
        }
        switch (p_nav.valueOf()) {
            case LeoGotoNavKey.first:
                this._selectedNodeIndex = 0;
                break;

            case LeoGotoNavKey.last:
                this._selectedNodeIndex = this._nodeList.length - 1;
                break;

            case LeoGotoNavKey.next:
                if (this._selectedNodeIndex < this._nodeList.length - 1) {
                    this._selectedNodeIndex += 1;
                }
                break;

            case LeoGotoNavKey.prev:
                if (this._selectedNodeIndex > 0) {
                    this._selectedNodeIndex -= 1;
                }
                break;

        }
        this._lastGotoView?.reveal(this._nodeList[this._selectedNodeIndex]);
        this._leoIntegration.gotoNavEntry(this._nodeList[this._selectedNodeIndex]);
    }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        this._nodeList = [];
        this._selectedNodeIndex = 0;
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: LeoGotoNode): Thenable<LeoGotoNode> | LeoGotoNode {
        return element;
    }

    public getChildren(element?: LeoGotoNode): Thenable<LeoGotoNode[]> {

        // if called with element, or not ready, give back empty array as there won't be any children
        if (this._leoIntegration.leoStates.fileOpenedReady && !element) {

            // call action to get get list, and convert to LeoButtonNode(s) array
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_GOTO_PANEL).then(p_package => {
                this._nodeList = [];
                if (p_package && p_package.navList) {

                    const w_navList: LeoGoto[] = p_package.navList;
                    if (w_navList && w_navList.length) {
                        w_navList.forEach((p_goto: LeoGoto) => {
                            const w_newNode = new LeoGotoNode(this._leoIntegration, p_goto, p_package.navOptions!);
                            this._nodeList.push(w_newNode);
                        });
                    }
                    return this._nodeList;
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
/**
 * * Opened Leo documents tree view node item implementation for usage in a TreeDataProvider
 */
export class LeoGotoNode extends vscode.TreeItem {

    // Context string is checked in package.json with 'when' clauses
    public entryType: TGotoTypes;
    private _id: string;
    private _description: string | boolean;
    private _headline: string;
    private _iconIndex: number; // default to tag
    private _leoIntegration: LeoIntegration;
    public key: number; // id from python

    constructor(
        p_leoIntegration: LeoIntegration,
        p_gotoEntry: LeoGoto,
        p_navOptions: { isTag: boolean, showParents: boolean },

    ) {
        let w_spacing = "";
        if (p_navOptions.showParents && !p_navOptions.isTag) {
            w_spacing = "    ";
        }
        let w_label = "";
        if (["tag", "headline"].includes(p_gotoEntry.t)) {
            w_label = w_spacing + p_gotoEntry.h;
        }
        super(w_label);

        // Setup this instance
        this._leoIntegration = p_leoIntegration;
        this._id = utils.getUniqueId();
        this.entryType = p_gotoEntry.t;
        this.key = p_gotoEntry.key;
        this._headline = p_gotoEntry.h.trim();

        this._description = false;
        if (this.entryType === 'body') {
            this._iconIndex = 2;
            if (p_navOptions.showParents) {
                this._description = "    " + this._headline;
            } else {
                this._description = "  " + this._headline;
            }
        } else if (this.entryType === 'parent') {
            this._iconIndex = 0;
            this._description = this._headline.trim();
        } else if (this.entryType === 'generic') {
            this._iconIndex = 4;
            this._description = this._headline;
        } else if (this.entryType === 'headline') {
            this._iconIndex = 1;
        } else {
            this._iconIndex = 3; // tag
        }

        this.command = {
            command: Constants.COMMANDS.GOTO_NAV_ENTRY,
            title: '',
            arguments: [this]
        };

    }

    // @ts-ignore
    public get tooltip(): string {
        if (this.entryType !== "generic") {
            return this.entryType.charAt(0).toUpperCase() + this.entryType.slice(1);
        }
        return this._headline;
    }

    // @ts-ignore
    public get description(): string | boolean {
        return this._description;
    }

    // @ts-ignore
    public get iconPath(): Icon | vscode.ThemeIcon | string {
        if (this._iconIndex < 4) {
            return this._leoIntegration.gotoIcons[this._iconIndex];
        }
        // else return undefined for generic text without icon
        return undefined;
    }

    // @ts-ignore
    public get id(): string {
        // Add prefix and suffix salt to numeric index to prevent accidental duplicates
        // Should be unique when refreshed
        return "g" + this._id + "o";
    }

}


