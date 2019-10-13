// TODO : move commands from leointegration.ts (see Leo-Commands-Notes.md)
export class LeoCommands { }
// public editHeadline(p_node: LeoNode) {
//     this.editHeadlineInputOptions.value = p_node.label; // Preset input pop up
//     vscode.window.showInputBox(this.editHeadlineInputOptions)
//         .then(
//             p_newHeadline => {
//                 if (p_newHeadline) {
//                     p_node.label = p_newHeadline; //! When labels change, ids will change and that selection and expansion state cannot be kept stable anymore.
//                     this.leoBridge.action("setNewHeadline", "{\"node\":" + p_node.apJson + ", \"headline\": \"" + p_newHeadline + "\"}"
//                     ).then(
//                         (p_answer: LeoBridgePackage) => {
//                             // ! p_revealSelection flag needed because we voluntarily refreshed the automatic ID
//                             this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelectFocus); // refresh all, needed to get clones to refresh too!
//                         }
//                     );
//                 }
//             }
//         );
// }

// public mark(p_node: LeoNode): void {
//     vscode.window.showInformationMessage(`mark on ${p_node.label}.`); // Temp placeholder
// }

// public unmark(p_node: LeoNode): void {
//     vscode.window.showInformationMessage(`unmark on ${p_node.label}.`); // Temp placeholder
// }

// public copyNode(p_node: LeoNode): void {
//     vscode.window.showInformationMessage(`copyNode on ${p_node.label}.`); // Temp placeholder
// }

// public cutNode(p_node: LeoNode): void {
//     vscode.window.showInformationMessage(`cutNode on ${p_node.label}.`); // Temp placeholder
// }

// public pasteNode(p_node: LeoNode): void {
//     vscode.window.showInformationMessage(`pasteNode on ${p_node.label}.`); // Temp placeholder
// }

// public pasteNodeAsClone(p_node: LeoNode): void {
//     vscode.window.showInformationMessage(`pasteNodeAsClone on ${p_node.label}.`); // Temp placeholder
// }

// public delete(p_node: LeoNode): void {
//     vscode.window.showInformationMessage(`delete on ${p_node.label}.`); // Temp placeholder
// }