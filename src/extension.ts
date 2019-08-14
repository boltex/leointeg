import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "leointeg" is now active!');

  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "extension.openLeoFile",
    () => {
      const w_message = "Open Leo File";
      vscode.window.showInformationMessage(w_message);
    }
  );
  context.subscriptions.push(disposable);

  //   let disposable2 = vscode.commands.registerCommand("extension.leoView", () => {
  //     const w_message = "Switch to Leo mode";
  //     vscode.window.showInformationMessage(w_message);
  //   });
  //   context.subscriptions.push(disposable2);
}

export function deactivate() {
  console.log('Extension "leointeg" is deactivated');
}
