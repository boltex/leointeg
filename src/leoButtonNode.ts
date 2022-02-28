import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoButton, Icon, RClick } from "./types";
import * as utils from "./utils";
import { LeoIntegration } from "./leoIntegration";

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
        // Cleanup button name of any directives starting with '@'
        // super(
        //     button.name.split(" ")
        //         .filter(item => item[0] !== "@")
        //         .join(" ")
        //         .trim()
        // );

        this._id = utils.getUniqueId();
        // Setup this instance (just differentiate 'script-button' for now)
        this.command = {
            command: Constants.COMMANDS.CLICK_BUTTON,
            title: '',
            arguments: [this]
        };
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
