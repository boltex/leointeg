import * as vscode from "vscode";
import { Constants } from "./constants";
import * as path from "path"; // TODO : Use this to have reliable support for window-vs-linux file-paths

/**
 * * Handles opening of file browser when choosing which Leo file to open
 */
export class LeoFilesBrowser {

    private _fileBrowserActive: boolean = false;

    constructor(private _context: vscode.ExtensionContext) { }

    /**
     * * Finds a folder to propose when opening the browse-for-leo-file chooser
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
     * * Open a file browser to let user choose file(s) to import
     * @param p_fileType can be used to restrict to a particular file type
     * @returns a promise of an array of filepath+name strings
     */
    public getImportFileUrls(p_fileType?: string): Promise<string[]> {
        if (this._fileBrowserActive) {
            return Promise.resolve([]);
        }
        this._fileBrowserActive = true;
        let w_types: { [name: string]: string[]; };
        if (p_fileType && Constants.IMPORT_FILE_TYPES[p_fileType]) {
            w_types = {};
            w_types[p_fileType] = Constants.IMPORT_FILE_TYPES[p_fileType];
        } else {
            w_types = Constants.IMPORT_FILE_TYPES;
        }
        return new Promise((p_resolve, p_reject) => {
            vscode.window
                .showOpenDialog({
                    canSelectMany: true,
                    openLabel: "Import File",
                    canSelectFolders: false,
                    filters: w_types,
                    defaultUri: this._getBestOpenFolderUri()
                })
                .then(p_chosenLeoFiles => {
                    this._fileBrowserActive = false;
                    if (p_chosenLeoFiles) {
                        // array instead of single string
                        const w_result = p_chosenLeoFiles.map(function (e) {
                            return e.fsPath.replace(/\\/g, "/").trim();
                        });
                        p_resolve(w_result); // Replace backslashes for windows support
                    } else {
                        p_resolve([]);
                    }
                });
        });
    }
    /**
     * * Open a file browser and let the user choose a Leo file or cancel the operation
     * @param p_saveAsFlag Optional flag that will ask for a 'save' path+filename
     * @returns A promise resolving to a chosen path string, or rejected with an empty string if cancelled
     */
    public getLeoFileUrl(p_saveAsFlag?: boolean): Promise<string> {
        if (this._fileBrowserActive) {
            return Promise.resolve("");
        }
        this._fileBrowserActive = true;
        return new Promise((p_resolve, p_reject) => {
            const w_filters: { [name: string]: string[] } = {};
            w_filters[Constants.FILE_OPEN_FILTER_MESSAGE] = [
                Constants.FILE_EXTENSION,
                Constants.JS_FILE_EXTENSION
            ];

            if (p_saveAsFlag) {
                // Choose file
                vscode.window.showSaveDialog({
                    saveLabel: "Save Leo File",
                    defaultUri: this._getBestOpenFolderUri(),
                    filters: { 'Leo File': ['leo'] },
                    title: "Save Leo File"
                })
                    .then(p_chosenLeoFile => {
                        this._fileBrowserActive = false;
                        if (p_chosenLeoFile) {
                            // single string
                            p_resolve(p_chosenLeoFile.fsPath.replace(/\\/g, "/")); // Replace backslashes for windows support
                        } else {
                            p_resolve(""); // not rejection - resolve empty string
                        }
                    });
            } else {
                vscode.window
                    .showOpenDialog({
                        canSelectMany: false,
                        defaultUri: this._getBestOpenFolderUri(),
                        canSelectFolders: false,
                        filters: w_filters,
                        title: "Open Leo File"
                    })
                    .then(p_chosenLeoFile => {
                        this._fileBrowserActive = false;
                        if (p_chosenLeoFile) {
                            // array instead of single string
                            p_resolve(p_chosenLeoFile[0].fsPath.replace(/\\/g, "/")); // Replace backslashes for windows support
                        } else {
                            p_resolve("");
                        }
                    });
            }
        });
    }

    /**
     * * Open a file browser and let the user choose a JSON leojs file name to save as.
     * @returns A promise resolving to a chosen path string, or rejected with an empty string if cancelled
     */
    public getLeoJsFileUrl(): Promise<string> {
        if (this._fileBrowserActive) {
            return Promise.resolve("");
        }
        this._fileBrowserActive = true;
        return new Promise((p_resolve, p_reject) => {
            // Choose file
            vscode.window.showSaveDialog({
                saveLabel: "Save as leojs File",
                defaultUri: this._getBestOpenFolderUri(),
                filters: { 'JSON Leo File': ['leojs'] }
            })
                .then(p_chosenLeoFile => {
                    this._fileBrowserActive = false;
                    if (p_chosenLeoFile) {
                        // single string
                        p_resolve(p_chosenLeoFile.fsPath.replace(/\\/g, "/")); // Replace backslashes for windows support
                    } else {
                        p_resolve(""); // not rejection - resolve empty string
                    }
                });

        });
    }

}
