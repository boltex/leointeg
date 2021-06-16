import * as vscode from "vscode";
import * as murmur from "murmurhash-js";
import * as net from "net";
import { Constants } from "./constants";
import { Icon, UserCommand, ArchivedPosition } from "./types";
import { LeoNode } from "./leoNode";
var portfinder = require('portfinder');

/**
 * * Build a string for representing a number that's 2 digits wide, padding with a zero if needed
 * @param p_number Between 0 and 99
 * @returns a 2 digit wide string representation of the number, left padded with zeros as needed.
 */
export function padNumber2(p_number: number): string {
    return ("0" + p_number).slice(-2);
}

/**
 * * Builds a string hash out of of an archived position, default without taking collapsed state into account
 * @param p_ap Archived position
 * @param p_salt To be added to the hashing process (Change when tree changes)
 */
export function hashNode(p_ap: ArchivedPosition, p_salt: string, p_withCollapse?: boolean): string {
    const w_string1: string = p_ap.headline + p_ap.gnx + p_ap.childIndex.toString(36);
    const w_string2: string = w_string1 + p_ap.childIndex.toString(36) + JSON.stringify(p_ap.stack);
    const w_first: string = murmur.murmur3(w_string2).toString(36);
    if (p_withCollapse) {
        p_salt += p_ap.expanded ? "1" : "0";
    }
    return p_salt + w_string1 + w_first + murmur.murmur3(w_first + w_string2).toString(36);
}

/**
 * * Performs the actual addition into globalState context
 * @param p_context Needed to get to vscode global storage
 * @param p_file path+file name string
 * @param p_key A constant string such as RECENT_FILES_KEY or LAST_FILES_KEY
 * @returns A promise that resolves when the global storage modification is done
 */
export function addFileToGlobal(p_context: vscode.ExtensionContext, p_file: string, p_key: string): Thenable<void> {
    // Just push that string into the context.globalState.<something> array
    const w_contextEntry: string[] = p_context.globalState.get(p_key) || [];
    if (w_contextEntry) {
        if (!w_contextEntry.includes(p_file)) {
            w_contextEntry.push(p_file);
            if (w_contextEntry.length > 10) {
                w_contextEntry.shift();
            }
        }
        return p_context.globalState.update(p_key, w_contextEntry); // Added file
    } else {
        // First so create key entry with an array of single file
        return p_context.globalState.update(p_key, [p_file]);
    }
}

/**
 * * Removes file entry from globalState context
 * @param p_context Needed to get to vscode global storage
 * @param p_file path+file name string
 * @param p_key A constant string such as RECENT_FILES_KEY or LAST_FILES_KEY
 * @returns A promise that resolves when the global storage modification is done
  */
export function removeFileFromGlobal(p_context: vscode.ExtensionContext, p_file: string, p_key: string): Thenable<void> {
    // Check if exist in context.globalState.<something> and remove if found
    const w_files: string[] = p_context.globalState.get(p_key) || [];
    if (w_files && w_files.includes(p_file)) {
        w_files.splice(w_files.indexOf(p_file), 1); // Splice and update
        return p_context.globalState.update(p_key, w_files);
    }
    return Promise.resolve(); // not even in list so just resolve
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
 * * Builds and returns a JSON string with 'node' and 'name' members
 * @param p_nodeJson Targeted tree node in the proper JSON format
 * @param p_command from which to extract possible name and 'keep selection' flag
 * @returns JSON string suitable for being a parameter of a leoBridge action
 */
export function buildNodeAndTextJson(p_nodeJson: string, p_command: UserCommand): string {
    let w_json = "{\"ap\":" + p_nodeJson; // already json
    if (p_command.name) {
        w_json += ", \"name\": " + JSON.stringify(p_command.name);
    }
    if (p_command.keepSelection) {
        w_json += ", \"keep\": true";
    }
    // TODO : Generalize this function to send any other members of p_command / other members
    w_json += "}";
    return w_json;
}

/**
 * * Return dialog for choosing the Leo Editor installation folder path
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
 * with a scheme header like "leo:/" or 'more:/'
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
 */
export function findNextAvailablePort(p_startingPort: number): Promise<number> {
    const q_portFinder = portfinder.getPortPromise({
        port: p_startingPort,
        startPort: p_startingPort,
        stopPort: p_startingPort + 5
    });
    return q_portFinder;
}

/**
 * * Return a promise to a boolean that will tell if port already in use
 */
export function portInUse(p_port: number): Promise<boolean> {
    const q_checkPort: Promise<boolean> = new Promise((p_resolve, p_reject) => {
        var w_server = net.createServer(function (socket) {
            socket.write('Echo server\r\n');
            socket.pipe(socket);
        });
        w_server.on('error', function (e) {
            p_resolve(true);
        });
        w_server.on('listening', function (e: Event) {
            w_server.close();
            p_resolve(false);
        });
        w_server.listen(
            p_port
        );
    });
    return q_checkPort;
}

