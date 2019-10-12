// TODO : move file management from leointegration.ts (see Leo-Commands-Notes.md)
// import * as child from "child_process";
// import * as vscode from "vscode";
// import { LeoBridgePackage, LeoAction } from "./types";

// export class LeoFiles {

//     private getBestOpenFolderUri(): vscode.Uri {
//         // Find a folder to propose when opening the browse-for-leo-file chooser
//         let w_openedFileEnvUri: vscode.Uri | boolean = false;
//         let w_activeUri: vscode.Uri | undefined = undefined;

//         // let w_activeUri: Uri | undefined = vscode.window.activeTextEditor?vscode.window.activeTextEditor.document.uri:undefined;
//         if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
//             w_activeUri = vscode.workspace.workspaceFolders[0].uri;
//         }

//         if (w_activeUri) {
//             const w_defaultFolder = vscode.workspace.getWorkspaceFolder(w_activeUri);
//             if (w_defaultFolder) {
//                 w_openedFileEnvUri = w_defaultFolder.uri; // set as current opened document-path's folder
//             }
//         }
//         if (!w_openedFileEnvUri) {
//             w_openedFileEnvUri = vscode.Uri.file("~"); // TODO : set as home folder properly, this doesn't work
//         }
//         return w_openedFileEnvUri;
//     }

//     public closeLeoFile(): void {
//         vscode.window.showInformationMessage(`close leo file`); // Temp placeholder
//     }

//     public openLeoFile(): void {
//         let w_returnMessage: string | undefined;
//         if (!this.leoPythonProcess) {
//             w_returnMessage = "leoBridge not ready";
//         }
//         if (this.fileOpenedReady || this.fileBrowserOpen) {
//             w_returnMessage = "leo file already opened!";
//         }
//         if (w_returnMessage) {
//             vscode.window.showInformationMessage(w_returnMessage);
//             return; // prevent opening if already open/opening
//         }
//         this.fileBrowserOpen = true; // flag for multiple click prevention
//         vscode.window
//             .showOpenDialog({
//                 canSelectMany: false,
//                 defaultUri: this.getBestOpenFolderUri(),
//                 filters: {
//                     "Leo Files": [this.leoFileTypeExtension]
//                 }
//             })
//             .then(p_chosenLeoFile => {
//                 if (p_chosenLeoFile) {
//                     this.leoBridge.action("openFile", '"' + p_chosenLeoFile[0].fsPath + '"')
//                         .then((p_result: LeoBridgePackage) => {

//                             this.context.subscriptions.push(vscode.workspace.registerFileSystemProvider(this.leoUriScheme, this.leoFileSystem, { isCaseSensitive: true }));

//                             this.fileOpenedReady = true; // ANSWER to openLeoFile
//                             this.fileBrowserOpen = false;

//                             this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect); // p_revealSelection flag set

//                             // * set body URI for body filesystem
//                             this.bodyUri = vscode.Uri.parse(this.leoUriSchemeHeader + p_result.node.gnx);
//                             this.showSelectedBodyDocument().then(p_result => {
//                                 vscode.commands.executeCommand('setContext', 'leoTreeOpened', true);
//                             });
//                             // * First StatusBar appearance
//                             this.updateStatusBar();
//                             this.leoStatusBarItem.show();
//                         });
//                 } else {
//                     vscode.window.showInformationMessage("Open Cancelled");
//                     this.fileBrowserOpen = false;
//                 }
//             });
//     }

// }