import * as vscode from "vscode";
import { Constants } from "./constants";
// import * as path from "path"; // TODO: Use this library to have reliable support for window-vs-linux file-paths

export class LeoFiles {
    // * Handles opening of file browser when choosing which Leo file to open

    private _fileBrowserOpen: boolean = false;

    constructor(private _context: vscode.ExtensionContext) { }

    private _getBestOpenFolderUri(): vscode.Uri {
        // * Find a folder to propose when opening the browse-for-leo-file chooser
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

    public getLeoFileUrl(): Promise<string> {
        if (this._fileBrowserOpen) {
            return Promise.resolve("");
        }
        return new Promise((resolve, reject) => {
            const w_filters: { [name: string]: string[] } = {};
            w_filters[Constants.FILE_OPEN_FILTER_MESSAGE] = [Constants.FILE_TYPE_EXTENSION];
            vscode.window
                .showOpenDialog({
                    canSelectMany: false,
                    defaultUri: this._getBestOpenFolderUri(),
                    filters: w_filters
                })
                .then(p_chosenLeoFile => {
                    this._fileBrowserOpen = false;
                    if (p_chosenLeoFile) {
                        resolve(p_chosenLeoFile[0].fsPath.replace(/\\/g, "/")); // Replace backslashes for windows support
                    } else {
                        reject("");
                    }
                });
        });
    }
}