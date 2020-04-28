import * as vscode from "vscode";
import { Constants } from "./constants";
import { Icon } from "./types";

// * String and other structures construction helper-functions along with common vscode API calls

export function padNumber(p_number: number): string {
    return ("0" + p_number).slice(-2);
}

export function buildIconPaths(p_context: vscode.ExtensionContext): Icon[] {
    return Array(16).fill("").map((p_val, p_index) => {
        return {
            light: p_context.asAbsolutePath(Constants.GUI.ICON_LIGHT_PATH + padNumber(p_index) + Constants.GUI.ICON_FILE_EXT),
            dark: p_context.asAbsolutePath(Constants.GUI.ICON_DARK_PATH + padNumber(p_index) + Constants.GUI.ICON_FILE_EXT)
        };
    });
}

export function buildHeadlineJson(p_nodeJson: string, p_headline: string): string {
    return "{\"node\":" + p_nodeJson +
        ", \"headline\": \"" + p_headline +
        "\"}";
}

export function isHexColor(hex: string): boolean {
    return typeof hex === 'string'
        && hex.length === 6
        && !isNaN(Number('0x' + hex));
}

export function gnxToUri(p_gnx: string): vscode.Uri {
    // * Builds a 'Leo Scheme' vscode.Uri from a gnx
    return vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_gnx);
}

export function uriToGnx(p_uri: vscode.Uri): string {
    // * Gets the gnx from a vscode.Uri object
    // TODO : For now, just remove the '/' before the path string
    // TODO : Use length of a constant or something other than 'fsPath'
    return p_uri.fsPath.substr(1);
}

export function setContext(p_key: string, p_value: any): Thenable<unknown> {
    return vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, p_key, p_value);
}