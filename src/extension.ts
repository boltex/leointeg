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

  // register a content provider for the leo-scheme
  const leoSheme = "leo";
  const leoProvider = new (class implements vscode.TextDocumentContentProvider {
    // emitter and its event
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: vscode.Uri): string {
      return "Body pane content";
    }
  })();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(leoSheme, leoProvider)
  );

  let uri = vscode.Uri.parse("leo:body");
  vscode.workspace
    .openTextDocument(uri)
    .then(doc => vscode.window.showTextDocument(doc));

  // register a command that opens a cowsay-document
  // subscriptions.push(vscode.commands.registerCommand('cowsay.say', async () => {
  // 	let what = await vscode.window.showInputBox({ placeHolder: 'cowsay...' });
  // 	if (what) {
  // 		let uri = vscode.Uri.parse('cowsay:' + what);
  // 		let doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
  // 		await vscode.window.showTextDocument(doc, { preview: false });
  // 	}
  // }));
}

export function deactivate() {
  console.log('Extension "leointeg" is deactivated');
}
