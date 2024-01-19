import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";
import { ProviderResult } from "vscode";
import { Constants } from "./constants";
import * as utils from "./utils";
import { LeoButton, RClick } from "./types";

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
                        w_buttons.forEach((p_button: LeoButton) => {
                            w_list.push(new LeoButtonNode(p_button, this._leoIntegration));
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

/**
 * * Leo @buttons tree view node item implementation, for usage in a TreeDataProvider.
 */
export class LeoButtonNode extends vscode.TreeItem {

    // Context string that is checked in package.json with 'when' clauses
    public contextValue: string;
    public rclicks: RClick[];

    private _id: string;

    // is the special 'add' button used to create button from a given node's script
    private _isAdd: boolean;

    constructor(
        public button: LeoButton,
        private _leoIntegration: LeoIntegration
    ) {
        super(button.name);

        this._id = utils.getUniqueId();

        this._isAdd = (this.button.index.startsWith(Constants.BUTTON_STRINGS.NULL_WIDGET) &&
            this.button.name === Constants.BUTTON_STRINGS.SCRIPT_BUTTON);
        this.rclicks = button.rclicks ? button.rclicks : [];
        this.contextValue = this._isAdd ? Constants.BUTTON_STRINGS.ADD_BUTTON : Constants.BUTTON_STRINGS.NORMAL_BUTTON;
    }

    // @ts-ignore
    public get iconPath(): Icon {
        return this._leoIntegration.buttonIcons[this._isAdd ? 2 : this.rclicks.length ? 1 : 0];
    }

    // @ts-ignore
    public get id(): string {
        // Add prefix and suffix salt to index to prevent accidental duplicates
        return this._id;
        // return "p" + this.button.index + "s" + this.button.name;
    }

    // @ts-ignore
    public get tooltip(): string {
        if (this._isAdd) {
            return Constants.USER_MESSAGES.SCRIPT_BUTTON_TOOLTIP;
        } else {
            return this.button.name;
        }
    }

    // @ts-ignore
    public get description(): string | boolean {
        if (this._isAdd) {
            return Constants.USER_MESSAGES.SCRIPT_BUTTON;
        } else {
            return false;
        }
    }

}

