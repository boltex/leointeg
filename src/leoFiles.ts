import * as vscode from "vscode";
import { Constants } from "./constants";

export class LeoFiles {

    private fileBrowserOpen: boolean = false;

    constructor(private context: vscode.ExtensionContext) { }

    private getBestOpenFolderUri(): vscode.Uri {
        // find a folder to propose when opening the browse-for-leo-file chooser
        let w_openedFileEnvUri: vscode.Uri | boolean = false;
        let w_activeUri: vscode.Uri | undefined = undefined;

        // let w_activeUri: Uri | undefined = vscode.window.activeTextEditor?vscode.window.activeTextEditor.document.uri:undefined;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
            w_activeUri = vscode.workspace.workspaceFolders[0].uri;
        }

        if (w_activeUri) {
            const w_defaultFolder = vscode.workspace.getWorkspaceFolder(w_activeUri);
            if (w_defaultFolder) {
                w_openedFileEnvUri = w_defaultFolder.uri; // set as current opened document-path's folder
            }
        }
        if (!w_openedFileEnvUri) {
            w_openedFileEnvUri = vscode.Uri.file("~"); // TODO : set as home folder properly, this doesn't work
        }
        return w_openedFileEnvUri;
    }

    // TODO : Better Windows support
    public getLeoFileUrl(): Promise<string> {
        if (this.fileBrowserOpen) {
            vscode.window.showInformationMessage("Open Cancelled");
            return Promise.resolve("");
        }
        return new Promise((resolve, reject) => {
            vscode.window
                .showOpenDialog({
                    canSelectMany: false,
                    defaultUri: this.getBestOpenFolderUri(),
                    filters: {
                        "Leo Files": [Constants.LEO_FILE_TYPE_EXTENSION]
                    }
                })
                .then(p_chosenLeoFile => {
                    if (p_chosenLeoFile) {
                        this.fileBrowserOpen = false;
                        resolve(p_chosenLeoFile[0].fsPath.replace(/\\/g, "/")); // replace backslashes for windiws support
                    } else {
                        vscode.window.showInformationMessage("Open Cancelled");
                        this.fileBrowserOpen = false;
                        resolve("");
                    }
                });
        });

    }
}