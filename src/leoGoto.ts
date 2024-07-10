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

    public nodeList: LeoGotoNode[] = []; // Node list kept here.
    private _viewSwitch: boolean = false;

    public selectedNodeIndex: number = 0;
    public isSelected = false;

    constructor(private _leoIntegration: LeoIntegration) {
        this.onDidChangeTreeData(() => {
            this.getChildren(); // THIS KEEPS THE DATA UP TO DATE
            this._leoIntegration.setGotoContent();
        }, this);
    }

    public setLastGotoView(): void {
        // this._lastGotoView = p_view;
        if (this.nodeList && this.nodeList.length) {
            this._viewSwitch = true;
            this._onDidChangeTreeData.fire(undefined);
        }
    }

    public getLastGotoView(): vscode.TreeView<LeoGotoNode> | undefined {
        return this._lastGotoView;
    }

    public resetSelectedNode(p_node?: LeoGotoNode): void {
        this.selectedNodeIndex = 0;
        this.isSelected = false;
        if (p_node) {
            const w_found = this.nodeList.indexOf(p_node);
            if (w_found >= 0) {
                this.selectedNodeIndex = w_found;
                this.isSelected = true;
                return;
            }
        }
    }

    public async navigateNavEntry(p_nav: LeoGotoNavKey): Promise<void> {
        if (!this.nodeList.length) {
            this.selectedNodeIndex = 0;
            this.isSelected = false;
            return;
        }
        switch (p_nav.valueOf()) {
            case LeoGotoNavKey.first:
                this.selectedNodeIndex = 0;
                this.isSelected = true;
                break;

            case LeoGotoNavKey.last:
                this.selectedNodeIndex = this.nodeList.length - 1;
                this.isSelected = true;
                break;

            case LeoGotoNavKey.next:
                if (this.selectedNodeIndex < this.nodeList.length - 1) {
                    this.selectedNodeIndex += 1;
                    this.isSelected = true;
                }
                break;

            case LeoGotoNavKey.prev:
                if (this.selectedNodeIndex > 0) {
                    this.selectedNodeIndex -= 1;
                    this.isSelected = true;
                }
                break;
        }
        // Check if array long enough!
        if (!this.nodeList[this.selectedNodeIndex]) {
            this.selectedNodeIndex = 0;
            this.isSelected = true;
            return; // Cancel
        }
        const node = this.nodeList[this.selectedNodeIndex];
        await this._leoIntegration.gotoNavEntry(node);
        this._leoIntegration.revealGotoNavEntry(this.selectedNodeIndex);
        // await this._lastGotoView?.reveal(node, {
        //     select: true,
        //     focus: true
        // });
    }

    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        this.nodeList = [];
        this.selectedNodeIndex = 0;
        this.isSelected = false;
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: LeoGotoNode): LeoGotoNode {
        return element;
    }

    public getChildren(element?: LeoGotoNode): Thenable<LeoGotoNode[]> | LeoGotoNode[] {

        // if called with element, or not ready, give back empty array as there won't be any children
        if (this._leoIntegration.leoStates.fileOpenedReady && !element) {

            // WAS JUST A VIEW SWITCH:
            if (this._viewSwitch) {
                this._viewSwitch = false;
                console.log('WAS JUST A VIEW SWITCH ! !');
                setTimeout(() => {
                    if (this.nodeList.length && (this.selectedNodeIndex + 1) <= this.nodeList.length) {

                        this._leoIntegration.revealGotoNavEntry(this.selectedNodeIndex, true);

                        // void this._lastGotoView?.reveal(this.nodeList[this._selectedNodeIndex], {
                        //     select: true,
                        //     focus: false
                        // }).then(() => { }, () => {
                        //     console.log('Reveal failed for goto panel switching detected.');
                        // });
                    }
                }, 0);
                return this.nodeList; // Make sure the nodes are valid (give back)
            }

            // call action to get get list, and convert to LeoButtonNode(s) array
            return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_GOTO_PANEL).then(p_package => {
                this.nodeList = [];
                if (p_package && p_package.navList) {

                    const w_navList: LeoGoto[] = p_package.navList;
                    if (w_navList && w_navList.length) {
                        w_navList.forEach((p_goto: LeoGoto) => {
                            const w_newNode = new LeoGotoNode(this._leoIntegration, p_goto, p_package.navOptions!);
                            this.nodeList.push(w_newNode);
                        });
                    }
                    return this.nodeList;
                } else {
                    return [];
                }
            });


        } else {
            return []; // Defaults to an empty list of children
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
    public leoPaneLabel: string;

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
        this.leoPaneLabel = "";
        if (["tag", "headline"].includes(p_gotoEntry.t)) {
            this.leoPaneLabel = p_gotoEntry.h;
        }
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
            this.leoPaneLabel = this._headline;
        } else if (this.entryType === 'parent') {
            this._iconIndex = 0;
            this._description = this._headline.trim();
            this.leoPaneLabel = this._description;
        } else if (this.entryType === 'generic') {
            this._iconIndex = 4;
            this._description = this._headline;
            this.leoPaneLabel = this._description;
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


