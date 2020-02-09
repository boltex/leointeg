import * as vscode from "vscode";
import { Constants } from "./constants";
import { Icon } from "./types";

export class Utils {
    // * String and other structures construction helper-functions

    public padNumber(p_number: number): string {
        return ("0" + p_number).slice(-2);
    }

    public buildIconPaths(p_context: vscode.ExtensionContext): Icon[] {
        return Array(16).fill("").map((p_val, p_index) => {
            return {
                light: p_context.asAbsolutePath(Constants.INTERFACE.ICON_LIGHT_PATH + this.padNumber(p_index) + Constants.INTERFACE.ICON_FILE_EXT),
                dark: p_context.asAbsolutePath(Constants.INTERFACE.ICON_DARK_PATH + this.padNumber(p_index) + Constants.INTERFACE.ICON_FILE_EXT)
            };
        });
    }

    public buildHeadlineJson(p_nodeJson: string, p_headline: string): string {
        return "{\"node\":" + p_nodeJson +
            ", \"headline\": \"" + p_headline +
            "\"}";
    }

}