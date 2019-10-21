// TODO : move commands from leointegration.ts 'mark/unmark', 'copy node' etc., along with the commands below:

// TODO : Top Priority Commands
// * - Ctrl-D (move-outline-down)
// * - Ctrl-L (move-outline-left)
// * - Ctrl-R (move-outline-right)
// * - Ctrl-U (move-outline-up)
// * - clone-node
// * - Ctrl-I insert-node
// * - Ctrl-{ (promote)
// * - Ctrl-} (demote)
// ! - Ctrl-Z (undo)
// ! - execute-script (Ctrl-B)
// ! - Ctrl-S (save-file)

// * content for package.json
/*
{
    "command": "leointeg.moveOutlineDown",
    "when": "leoTreeOpened==true"
  },
  {
    "command": "leointeg.moveOutlineLeft",
    "when": "leoTreeOpened==true"
  },
  {
    "command": "leointeg.moveOutlineRight",
    "when": "leoTreeOpened==true"
  },
  {
    "command": "leointeg.moveOutlineUp",
    "when": "leoTreeOpened==true"
  },
*/


/*
# Context variables for package.json "when" clauses so far

- treeInExplorer
- showOpenAside
- leoBridgeReady
- leoTreeOpened
- leoObjectSelected ( Leo keyboard mode ? )

# Commands

- Ctrl-N (new)
- Ctrl-O (open-outline)
- Ctrl-S (save-file)
- Ctrl-I or Insert (insert-node)
- Ctrl-H (edit-headline)
- Ctrl-Shift-C (copy-node)
- Ctrl-Shift-X (cut-node)
- Ctrl-Shift-V (paste-node)
- Ctrl-M (mark/Unmark) Marks node if it is unmarked, and unmarks the node if it is already marked.
- Ctrl-{ (promote)
- Ctrl-} (demote)
- copy-marked _Copies all marked nodes as children of a new node._
- diff-marked-nodes
- goto-next-marked
- mark-changed-items
- mark-subheads
- unmark-all
- clone-marked-nodes
- delete-marked-nodes
- move-marked-nodes
- Ctrl-Z (undo)
- Ctrl-Shift-Z (redo)

These commands move clones of all nodes matching the search pattern under a single organizer node, created as the last top-level node. Flattened searches put all nodes as direct children of the organizer node:

- cfa clone-find-all
- cff clone-find-all-flattened

The clone-marked commands move clones of all marked nodes under an organizer node.

- cfam clone-find-marked
- cffm clone-find-flattened-marked

When focus is in the outline:

- Shift-Down-arrow (move-outline-down)
- Shift-Left-arrow (move-outline-left)
- Shift-Right-arrow (move-outline-right)
- Shift-Up-arrow (move-outline-up)

Regardless of focus:

- Alt-Shift-Down-arrow (move-outline-down)
- Alt-Shift-Left-arrow (move-outline-left)
- Alt-Shift-Right-arrow (move-outline-right)
- Alt-Shift-Up-arrow (move-outline-up)
- Ctrl-D (move-outline-down)
- Ctrl-L (move-outline-left)
- Ctrl-R (move-outline-right)
- Ctrl-U (move-outline-up)
- execute-script (Ctrl-B)
- clone-node (Ctrl-\`) (Grave accent, not a single quote) _Creates a clone as the immediate sibling of a selected node._
- clone-node-to-last-node _Creates a clone as the last top-level node of the outline._
- insert-node (Ctrl-I or Insert) _Inserts a new node into the outline. The new node becomes the first child of the present node if the present node is expanded. Otherwise, the new node becomes the next sibling of the present node._
- insert-node-before _Inserts a node before the presently selected node._
- delete-node _Deletes a node and all its descendants._
*/

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