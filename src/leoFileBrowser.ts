import * as vscode from "vscode";
import { Constants } from "./constants";
import * as path from "path"; // TODO : Use this library to have reliable support for window-vs-linux file-paths

/**
 * * Handles opening of file browser when choosing which Leo file to open
 */
export class LeoFilesBrowser {

    private _fileBrowserActive: boolean = false;

    constructor(private _context: vscode.ExtensionContext) { }

    /**
     * * Find a folder to propose when opening the browse-for-leo-file chooser
     * @returns An Uri for path to a folder for initial opening
     */
    private _getBestOpenFolderUri(): vscode.Uri {
        let w_openedFileEnvUri: vscode.Uri | boolean = false;
        let w_activeUri: vscode.Uri | undefined = undefined;

        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
            w_activeUri = vscode.workspace.workspaceFolders[0].uri;
        }

        if (w_activeUri) {
            const w_defaultFolder = vscode.workspace.getWorkspaceFolder(w_activeUri);
            if (w_defaultFolder) {
                w_openedFileEnvUri = w_defaultFolder.uri; // Set as current opened document-path's folder
            }
        }
        if (!w_openedFileEnvUri) {
            w_openedFileEnvUri = vscode.Uri.file("~"); // TODO : set as home folder properly, this doesn't work
            // ! EXAMPLE WITH os : const homedir = require('os').homedir();
        }
        return w_openedFileEnvUri;
    }

    /**
     * * Open a file browser and let the user choose a Leo file or cancel the operation
     * @param p_saveAsFlag Optional, a flag that will ask for a 'save' path+filename.
     * @returns a promise resolving to a chosen path string, or rejected with an empty string if cancelled
     */
    public getLeoFileUrl(p_saveAsFlag?: boolean): Promise<string> {
        if (this._fileBrowserActive) {
            return Promise.resolve("");
        }
        this._fileBrowserActive = true;
        return new Promise((resolve, reject) => {
            const w_filters: { [name: string]: string[] } = {};
            w_filters[Constants.FILE_OPEN_FILTER_MESSAGE] = [Constants.FILE_EXTENSION];

            if (p_saveAsFlag) {
                // Choose file
                vscode.window.showSaveDialog({
                    saveLabel: "Save Leo File",
                    defaultUri: this._getBestOpenFolderUri(),
                    filters: { 'Leo File': ['leo'] }
                })
                    .then(p_chosenLeoFile => {
                        this._fileBrowserActive = false;
                        if (p_chosenLeoFile) {
                            // single string
                            resolve(p_chosenLeoFile.fsPath.replace(/\\/g, "/")); // Replace backslashes for windows support
                        } else {
                            reject("");
                        }
                    });
            } else {
                vscode.window
                    .showOpenDialog({
                        canSelectMany: false,
                        defaultUri: this._getBestOpenFolderUri(),
                        filters: w_filters
                    })
                    .then(p_chosenLeoFile => {
                        this._fileBrowserActive = false;
                        if (p_chosenLeoFile) {
                            // array instead of single string
                            resolve(p_chosenLeoFile[0].fsPath.replace(/\\/g, "/")); // Replace backslashes for windows support
                        } else {
                            reject("");
                        }
                    });
            }
        });
    }
}
