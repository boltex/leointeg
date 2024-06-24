import * as vscode from "vscode";
import { Constants } from "./constants";
import { Icon, UserCommand, ArchivedPosition, Version } from "./types";

var portfinder = require('portfinder');

/**
 * * Unique numeric Id
 */
var uniqueId: number = 0;

/**
 * * Get new uniqueID
 */
export function getUniqueId(): string {
    const id = uniqueId++;
    return id.toString();
}

/**
 * * Closes all visible text editors that have Leo filesystem scheme (that are not dirty)
 */
export async function closeLeoTextEditors(): Promise<unknown> {

    const w_foundTabs: vscode.Tab[] = [];

    vscode.window.tabGroups.all.forEach((p_tabGroup) => {
        p_tabGroup.tabs.forEach((p_tab) => {
            if (p_tab.input &&
                (p_tab.input as vscode.TabInputText).uri &&
                ((p_tab.input as vscode.TabInputText).uri.scheme).startsWith(Constants.URI_LEO_SCHEME) &&
                !p_tab.isDirty
            ) {
                w_foundTabs.push(p_tab);
            }
        });
    });

    let q_closedTabs;
    if (w_foundTabs.length) {
        q_closedTabs = vscode.window.tabGroups.close(w_foundTabs, true);
        w_foundTabs.forEach((p_tab) => {
            if (p_tab.input) {
                vscode.commands.executeCommand(
                    'vscode.removeFromRecentlyOpened',
                    (p_tab.input as vscode.TabInputText).uri
                );
                // Delete to close all other body tabs.
                // (w_oldUri will be deleted last below)
                const w_edit = new vscode.WorkspaceEdit();
                w_edit.deleteFile((p_tab.input as vscode.TabInputText).uri, { ignoreIfNotExists: true });
                vscode.workspace.applyEdit(w_edit);
            }
        });
    } else {
        q_closedTabs = Promise.resolve(true);
    }
    return q_closedTabs;
}

/**
 * * Compares major, minor and patch members of versions
 * @param p_version given version 
 * @param p_min minimal version
 * @returns true if at least minimal version
 */
export function compareVersions(p_version: Version, p_min: Version): boolean {
    if (
        p_version.major > p_min.major ||
        p_version.major === p_min.major && p_version.minor > p_min.minor ||
        p_version.major === p_min.major && p_version.minor === p_min.minor && p_version.patch >= p_min.patch
    ) {
        return true;
    }
    return false;
}

/**
 * * Build a string for representing a number that's 2 digits wide, padding with a zero if needed
 * @param p_number Between 0 and 99
 * @returns a 2 digit wide string representation of the number, left padded with zeros as needed.
 */
export function padNumber2(p_number: number): string {
    return ("0" + p_number).slice(-2);
}

/**
 * * Make sure that the given Leo ID will not corrupt a .leo file.
 * @Returns the valid id string, or empty "" string for cancellation or invalid string
 */
export function cleanLeoID(id_: string): string {
    const old_id: string = id_.toString();
    if (!id_) {
        return "";
    }
    try {
        id_ = id_.replace(/\./g, "").replace(/\,/g, "").replace(/\"/g, "").replace(/\'/g, "");
        //  Remove *all* whitespace: https://stackoverflow.com/questions/3739909
        id_ = id_.split(' ').join('');
    }
    catch (exception) {
        // g.es_exception(exception);
        id_ = '';
    }
    // Last, check if not alphanum or less than 3 in length
    if (!isAlphaNum(id_) || id_.length < 3) {
        id_ = "";
    }
    return id_;
}

/**
 * * Performs the actual addition into workspaceState context
 * @param p_context Needed to get to vscode workspace storage
 * @param p_file path+file name string
 * @param p_key A constant string such as RECENT_FILES_KEY or LAST_FILES_KEY
 * @returns A promise that resolves when the workspace storage modification is done
 */
export function addFileToWorkspace(p_context: vscode.ExtensionContext, p_file: string, p_key: string): Thenable<void> {
    // Just push that string into the context.workspaceState.<something> array
    // First, if on windows and a drive letter starts the string, make sure its uppercase.
    if (p_file.length > 1 && p_file[1] === ':') {
        // Check if the first character is a letter
        if (p_file[0] >= 'a' && p_file[0] <= 'z') {
            // Convert the first character to uppercase
            p_file = p_file[0].toUpperCase() + p_file.slice(1);
        }
    }
    const w_contextEntry: string[] = p_context.workspaceState.get(p_key) || [];
    if (w_contextEntry) {
        if (!w_contextEntry.includes(p_file)) {
            w_contextEntry.push(p_file);
            if (w_contextEntry.length > 10) {
                w_contextEntry.shift();
            }
        }
        return p_context.workspaceState.update(p_key, w_contextEntry); // Added file
    } else {
        // First so create key entry with an array of single file
        return p_context.workspaceState.update(p_key, [p_file]);
    }
}

/**
 * * Removes file entry from workspaceState context
 * @param p_context Needed to get to vscode workspace storage
 * @param p_file path+file name string
 * @param p_key A constant string such as RECENT_FILES_KEY or LAST_FILES_KEY
 * @returns A promise that resolves when the workspace storage modification is done
  */
export function removeFileFromWorkspace(p_context: vscode.ExtensionContext, p_file: string, p_key: string): Thenable<void> {
    let alternate = ""; // An alternate spelling if startgin with a letter and colon
    let modified = false;
    // First, if on windows and a drive letter starts the string, make sure its uppercase.
    if (p_file.length > 1 && p_file[1] === ':') {
        // Check if the first character is a letter
        if (p_file[0] >= 'a' && p_file[0] <= 'z') {
            // Convert the first character to uppercase
            alternate = p_file[0].toUpperCase() + p_file.slice(1);
        } else if (p_file[0] >= 'A' && p_file[0] <= 'Z') {
            // Convert the first character to lowercase since it was already uppercase
            alternate = p_file[0].toLowerCase() + p_file.slice(1);
        }
    }
    // Check if exist in context.workspaceState.<something> and remove if found
    const w_files: string[] = p_context.workspaceState.get(p_key) || [];
    if (w_files && w_files.includes(p_file)) {
        w_files.splice(w_files.indexOf(p_file), 1); // Splice and update
        modified = true;
    }
    if (alternate && w_files && w_files.includes(alternate)) {
        w_files.splice(w_files.indexOf(alternate), 1); // Splice and update if letter and colon
        modified = true;
    }
    if (modified) {
        return p_context.workspaceState.update(p_key, w_files);
    }
    return Promise.resolve(); // not even in list so just resolve
}

/**
 * Saves the selected Leo file for selecting on the next startup
 * Note: Must be a real file on disk, not untitled document(s)!
 */
export function setGlobalLastActiveFile(p_context: vscode.ExtensionContext, p_file: string): Thenable<void> {
    return p_context.workspaceState.update(Constants.LAST_ACTIVE_FILE_KEY, p_file);
}

/**
 * Gets the last Leo file (or empty string) that was active. (Used to select it at startup.)
 * Note: Must be a real file on disk, not untitled document(s)!
 */
export function getGlobalLastActiveFile(p_context: vscode.ExtensionContext): string {
    return p_context.workspaceState.get(Constants.LAST_ACTIVE_FILE_KEY) || "";
}

/**
 * * unique string from AP's gnx, childIndex, and its stack's gnx and childIndex pairs.
 */
export function buildApId(p: ArchivedPosition): string {
    return p.gnx + p.childIndex + p.stack.map(s => s.gnx + s.childIndex).join("");
}

/**
 * * Build all possible strings for node icons graphic file paths
 * @param p_context Needed to get to absolute paths on the system
 * @returns An array of the 16 vscode node icons used in this vscode expansion
 */
export function buildNodeIconPaths(p_context: vscode.ExtensionContext): Icon[] {
    return Array(16).fill("").map((p_val, p_index) => {
        return {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_PATH + padNumber2(p_index) + Constants.GUI.ICON_FILE_EXT),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_PATH + padNumber2(p_index) + Constants.GUI.ICON_FILE_EXT),
        };
    });
}

/**
 * * Build all possible strings for undo icons graphic file paths
 * @param p_context Needed to get to absolute paths on the system
 * @returns An array containing icons for the undo tree view
 */
export function buildUndoIconPaths(p_context: vscode.ExtensionContext): Icon[] {
    return [
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_UNDO_ACTIVE),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_UNDO_ACTIVE)
        },
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_UNDO),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_UNDO)
        },
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_REDO_ACTIVE),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_REDO_ACTIVE)
        },
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_REDO),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_REDO)
        }
    ];
}

/**
 * * Build all possible strings for documents icons graphic file paths
 * @param p_context Needed to get to absolute paths on the system
 * @returns An array containing icons for the documents tree view
 */
export function buildDocumentIconPaths(p_context: vscode.ExtensionContext): Icon[] {
    return [
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_DOCUMENT),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_DOCUMENT)
        },
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_DOCUMENT_DIRTY),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_DOCUMENT_DIRTY)
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
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_BUTTON),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_BUTTON)
        },
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_BUTTON_RCLICK),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_BUTTON_RCLICK)
        },
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_BUTTON_ADD),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_BUTTON_ADD)
        }
    ];
}

/**
 * * Build all possible strings for the goto panel
 * @param p_context Needed to get to absolute paths on the system
 * @returns An array containing icons for the goto anywhere tree view
 */
export function buildGotoIconPaths(p_context: vscode.ExtensionContext): Icon[] {
    return [
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_PARENT),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_PARENT)
        },
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_NODE),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_NODE)
        },
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_BODY),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_BODY)
        },
        {
            light: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_LIGHT_TAG),
            dark: vscode.Uri.joinPath(p_context.extensionUri, Constants.GUI.ICON_DARK_TAG)
        }
    ];
}

/**
 * * Builds and returns object with 'node' and 'name' members
 * @param p_node Targeted tree node
 * @param p_command from which to extract possible name and 'keep selection' flag
 * @returns object suitable for being a parameter of a leoBridge action
 */
export function buildNodeCommand(p_node: ArchivedPosition, p_command?: UserCommand): { [key: string]: any } {
    const w_result: any = {
        ap: {
            childIndex: p_node.childIndex,
            gnx: p_node.gnx,
            stack: p_node.stack,
        }
    };
    if (p_command && p_command.name) {
        w_result.name = p_command.name;
    }
    if (p_command && p_command.keepSelection) {
        w_result.keep = true;
    }
    return w_result;
}

/**
 * * Shows dialog for choosing the Leo Editor installation folder path
 * @returns A promise that resolves to the selected resources or undefined
 */
export function chooseLeoFolderDialog(): Thenable<vscode.Uri[] | undefined> {
    return vscode.window.showOpenDialog(
        {
            title: "Locate Leo-Editor Installation Folder",
            canSelectMany: false,
            openLabel: "Choose Folder",
            canSelectFiles: false,
            canSelectFolders: true
        }
    );
}

/**
 * * Returns the milliseconds between a given starting process.hrtime tuple and the current call to process.hrtime
 * @param p_start starting process.hrtime to subtract from current immediate time
 * @returns number of milliseconds passed since the given start hrtime
 */
export function getDurationMs(p_start: [number, number]): number {
    const [w_secs, w_nanosecs] = process.hrtime(p_start);
    return w_secs * 1000 + Math.floor(w_nanosecs / 1000000);
}

/**
 * * Extracts the file name from a full path, such as "foo.bar" from "/abc/def/foo.bar"
 * @param p_path Full path such as "/var/drop/foo/boo/moo.js" or "C:\Documents and Settings\img\recycled log.jpg"
 * @returns file name string such as "moo.js" or "recycled log.jpg""
 */
export function getFileFromPath(p_path: string): string {
    return p_path.replace(/^.*[\\\/]/, '');
}

export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * * Checks if an archived position is equivalent to another
 * @param p_a
 * @param p_b
 * @returns True if equivalent, false otherwise
 */
export function isApEqual(p_a: ArchivedPosition, p_b: ArchivedPosition): boolean {

    if (p_a === p_b) {
        return true; // well duh...
    }

    if (p_a.gnx !== p_b.gnx) {
        return false; // Same v node?
    }
    if (p_a.childIndex !== p_b.childIndex) {
        return false; // At same child-rank to it's parent?
    }
    if (JSON.stringify(p_a.stack) !== JSON.stringify(p_b.stack)) {
        return false; // and same parent positions chain up to the root?
    }
    // Well up to here it should be the same position!
    return true;
}

/**
 * * Checks if a node would become dirty if it were to now have body content at all
 * @param p_node LeoNode from vscode's outline
 * @param p_newHasBody Flag to signify presence of body content, to be compared with its current state
 * @returns True if it would change the icon with actual body content, false otherwise
 */
export function isIconChangedByEdit(p_node: ArchivedPosition, p_newHasBody: boolean): boolean {
    // hasBody can be undefined so force boolean.
    if (!p_node.dirty || (!!p_node.hasBody === !p_newHasBody)) {
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

export function isAlphaNum(str: string): boolean {
    let code;
    let i;
    let len;

    for (i = 0, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
            return false;
        }
    }
    return true;
}

export function fixSlashesDriveLetter(p_path: string): string {
    if (!p_path) {
        return '';
    }
    p_path = p_path.split('\\').join('/');
    return p_path.replace(/^([a-z]):/, (match, driveLetter) => driveLetter.toUpperCase() + ':');

}

/**
 * * Builds a 'Leo Scheme' vscode.Uri from a gnx (or strings like 'LEO BODY' or empty strings to decorate breadcrumbs)
 * with a scheme header like "leointeg:/" or 'more:/'
 * @param p_str leo node gnx strings are used to build Uri
 * @returns A vscode 'Uri' object
 */
export function strToLeoUri(p_str: string): vscode.Uri {
    return vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_str);
}

/**
* Builds a 'Leo Detached Scheme' vscode.Uri from a gnx 
* @param p_str leo node gnx strings are used to build Uri
* @returns A vscode 'Uri' object
*/
export function strToLeoDetachedUri(p_str: string): vscode.Uri {
    return vscode.Uri.parse(Constants.URI_SCHEME_DETACHED_HEADER + p_str);
}

/**
 * * Gets the gnx, (or another string like 'LEO BODY' or other), from a vscode.Uri object
 * @param p_uri Source uri to extract from
 * @returns The string source that was used to build this Uri
 */
export function leoUriToStr(p_uri: vscode.Uri): string {
    // For now, just remove the '/' before the path string
    return p_uri.path.substring(1);
}

/**
 * * Sets a vscode context variable with 'vscode.commands.executeCommand' & 'setContext'
 * @param p_key Key string name such as constants 'bridgeReady' or 'treeOpened', etc.
 * @param p_value Value to be assigned to the p_key 'key'
 * @returns A Thenable that is returned by the executeCommand call
 */
export function setContext(p_key: string, p_value: any): Thenable<unknown> {
    return vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, p_key, p_value);
}

/**
 * * Find next available port starting with p_startingPort inclusively,
 * * check next (max 5) additional ports and return port number, or 0 if none.
 * @param p_startingPort the port number at which to start looking for a free port
 * @returns a promise of an opened port number
 */
export function findNextAvailablePort(p_startingPort: number): Promise<number> {
    return portfinder.getPortPromise({
        port: p_startingPort,
        startPort: p_startingPort,
        stopPort: p_startingPort + 5
    });
}

/**
 * * Check for unique port #
 * @param p_port the port number at which to look for
 * @returns a promise of an opened port number - or rejection if busy port
 */
export function findSingleAvailablePort(p_port: number): Promise<number> {
    return portfinder.getPortPromise({
        port: p_port,
        startPort: p_port,
        stopPort: p_port
    });
}

