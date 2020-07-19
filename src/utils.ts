import * as vscode from "vscode";
import { Constants } from "./constants";
import { Icon } from "./types";
import { LeoNode } from "./leoNode";

// String and other types/structures helper functions, along with common vscode API calls

/**
 * * Build a string for representing a number that's 2 digits wide, padding with a zero if needed
 * @param p_number Between 0 and 99
 * @returns a 2 digit wide string representation of the number, left padded with zeros as needed.
 */
export function padNumber2(p_number: number): string {
    return ("0" + p_number).slice(-2);
}

/**
 * * Build all possible strings for node icons graphic file paths
 * @param p_context Needed to get to absolute paths on the system
 * @returns An array of the 16 vscode node icons used in this vscode expansion
 */
export function buildNodeIconPaths(p_context: vscode.ExtensionContext): Icon[] {
    return Array(16).fill("").map((p_val, p_index) => {
        return {
            light: p_context.asAbsolutePath(Constants.GUI.ICON_LIGHT_PATH + padNumber2(p_index) + Constants.GUI.ICON_FILE_EXT),
            dark: p_context.asAbsolutePath(Constants.GUI.ICON_DARK_PATH + padNumber2(p_index) + Constants.GUI.ICON_FILE_EXT)
        };
    });
}

/**
 * * Build all possible strings for documents icons graphic file paths
 * @param p_context Needed to get to absolute paths on the system
 * @returns An array containing icons for the documents tree view
 */
export function buildDocumentIconPaths(p_context: vscode.ExtensionContext): Icon[] {
    return [
        {
            light: p_context.asAbsolutePath(Constants.GUI.ICON_LIGHT_DOCUMENT),
            dark: p_context.asAbsolutePath(Constants.GUI.ICON_DARK_DOCUMENT)
        },
        {
            light: p_context.asAbsolutePath(Constants.GUI.ICON_LIGHT_DOCUMENT_DIRTY),
            dark: p_context.asAbsolutePath(Constants.GUI.ICON_DARK_DOCUMENT_DIRTY)
        }
    ];
}

/**
 * * Build all possible strings for buttons icons graphic file paths
 * @param p_context Needed to get to absolute paths on the system
 * @returns An array containing icons for the documents tree view
 */
export function buildButtonsIconPaths(p_context: vscode.ExtensionContext): Icon[] {
    return [
        {
            light: p_context.asAbsolutePath(Constants.GUI.ICON_LIGHT_BUTTON),
            dark: p_context.asAbsolutePath(Constants.GUI.ICON_DARK_BUTTON)
        },
        {
            light: p_context.asAbsolutePath(Constants.GUI.ICON_LIGHT_BUTTON_ADD),
            dark: p_context.asAbsolutePath(Constants.GUI.ICON_DARK_BUTTON_ADD)
        }
    ];
}

/**
 * * Builds and returns a JSON string with 'node' and 'text' members
 * @param p_nodeJson Targeted tree node in the proper JSON format
 * @param p_text Desired text sent along with node in the parameters of the action to be 'called'
 * @returns JSON string suitable for being a parameter of a leoBridge action
 */
export function buildNodeAndTextJson(p_nodeJson: string, p_text: string): string {
    return "{\"node\":" + p_nodeJson +
        ", \"text\": " + JSON.stringify(p_text) +
        "}";
}

/**
 * * Extracts the file name from a full path, such as "foo.bar" from "/abc/def/foo.bar"
 * @param p_path Full path such as "/var/drop/foo/boo/moo.js" or "C:\Documents and Settings\img\recycled log.jpg"
 * @returns file name string such as "moo.js" or "recycled log.jpg""
 */
export function getFileFromPath(p_path: string): string {
    return p_path.replace(/^.*[\\\/]/, '');
}

/**
 * * Checks if a node would become dirty if it were to now have body content at all
 * @param p_node LeoNode from vscode's outline
 * @param p_newHasBody Flag to signify presence of body content, to be compared with its current state
 * @returns True if it would change the icon with actual body content, false otherwise
 */
export function isIconChangedByEdit(p_node: LeoNode, p_newHasBody: boolean): boolean {
    if (!p_node.dirty || (p_node.hasBody === !p_newHasBody)) {
        return true;
    }
    return false;
}

/**
 * * Checks if a string is formatted as a valid rrggbb color code.
 * @param p_hexString hexadecimal 6 digits string, without leading '0x'
 * @returns True if the string is a valid representation of an hexadecimal 6 digit number
 */
export function isHexColor(p_hexString: string): boolean {
    return typeof p_hexString === 'string'
        && p_hexString.length === 6
        && !isNaN(Number('0x' + p_hexString));
}

/**
 * * Builds a 'Leo Scheme' vscode.Uri from a gnx (or strings like 'LEO BODY' or empty strings to decorate breadcrumbs)
 * @param p_str leo node gnx strings are used to build Uri
 * @returns A vscode 'Uri' object
 */
export function strToLeoUri(p_str: string): vscode.Uri {
    return vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_str);
}

/**
 * * Gets the gnx, (or another string like 'LEO BODY' or other), from a vscode.Uri object
 * @param p_uri Source uri to extract from
 * @returns The string source that was used to build this Uri
 */
export function leoUriToStr(p_uri: vscode.Uri): string {
    // TODO : Use length of a constant or something other than 'fsPath'
    // For now, just remove the '/' (or backslash on Windows) before the path string
    return p_uri.fsPath.substr(1);
}

/**
 * * Sets a vscode context variable with the 'vscode.commands.executeCommand' and 'setContext' method
 * @param p_key Key string name such as constants 'bridgeReady' or 'treeOpened', etc.
 * @param p_value Value to be assigned to the p_key 'key'
 * @returns A Thenable that was returned by the executeCommand call to set the context
 */
export function setContext(p_key: string, p_value: any): Thenable<unknown> {
    return vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, p_key, p_value);
}

