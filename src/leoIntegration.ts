import * as child from "child_process";
import * as vscode from "vscode";
import * as path from "path";
import { LeoNode } from "./leoNode";
import { LeoOutlineProvider } from "./leoOutline";
import { LeoBodyProvider } from "./leoBody";

interface LeoAction { // pushed and resolved as a stack
  parameter: string; // to pass along with action to python's side
  deferedPayload?: any | undefined; // Used when the action already has a return value ready but is also waiting for python's side
  resolveFn: (result: any) => void; // call that with an aswer from python's (or other) side
  rejectFn: (reason: any) => void; // call if problem is encountered
}

interface ArchivedPosition { // * from Leo's leoflexx.py
  hasBody: boolean;     // bool(p.b),
  hasChildren: boolean; // p.hasChildren()
  childIndex: number;   // p._childIndex
  cloned: boolean;      // p.isCloned()
  dirty: boolean;       // p.isDirty()
  expanded: boolean;    // p.isExpanded()
  gnx: string;          // p.v.gnx
  level: number;        // p.level()
  headline: string;     // p.h
  marked: boolean;      // p.isMarked()
  selected: boolean;    // p == commander.p
  stack: {
    gnx: string;        // stack_v.gnx
    childIndex: number; // stack_childIndex
    headline: string;   // stack_v.h
  }[];                  // for (stack_v, stack_childIndex) in p.stack]
}

interface LeoBridgePackage {
  id: number;
  [key: string]: any;
}

export class LeoIntegration {
  public fileBrowserOpen: boolean = false;
  public fileOpenedReady: boolean = false;

  public leoTreeView: vscode.TreeView<LeoNode>;
  public leoFileSystem: LeoBodyProvider;

  private bodyUri: vscode.Uri = vscode.Uri.parse("leo:/" + "");
  private bodyTextDocument: vscode.TextDocument | undefined;
  private bodyTextEditor: vscode.TextEditor | undefined;

  private bodyChangeTimeout: NodeJS.Timeout | undefined;
  // private bodyChangedDocument: vscode.TextDocument | undefined;
  // public lastModifiedNode: { old: LeoNode, new: LeoNode } | undefined; // * tests for integrity

  public leoStatusBarItem: vscode.StatusBarItem;
  public leoObjectSelected: boolean = false; // represents having focus on outline or body, as opposed to anything else
  public statusbarNormalColor = new vscode.ThemeColor("statusBar.foreground");  //"statusBar.foreground"

  private editHeadlineInputOptions: vscode.InputBoxOptions = {
    ignoreFocusOut: false, // TODO : Try this option
    value: "", // will be replaced live upon showing from the node's text
    valueSelection: undefined,
    prompt: 'Edit Headline'
  };

  public actionBusy: boolean = false;
  private leoBridgeSerialId: number = 0;
  private callStack: LeoAction[] = [];

  private onDidChangeTreeDataObject: any;
  private onDidChangeBodyDataObject: any;

  public refreshSingleNodeFlag: boolean = false; // checked AND CLEARED by leoOutline to see if it has to really refresh
  public revealSelectedNode: boolean = false; // to be read by nodes to check if they should self-select. (and CLEAR this flag)

  public leoBridgeReady: boolean = false; // Can be used in conjunction with leoBridgeReadyPromise to stack call even before its ready
  private leoBridgeReadyPromise: Promise<LeoBridgePackage>; // set when leoBridge has a leo controller ready
  private leoPythonProcess: child.ChildProcess | undefined;

  constructor(private context: vscode.ExtensionContext) {

    this.leoBridgeReadyPromise = this.initLeoProcess();
    this.leoBridgeReadyPromise.then((p_package) => {
      this.assertId(p_package.id === 1, "p_package.id === 0"); // test integrity
      this.leoPythonProcess = p_package.package;
      vscode.window.showInformationMessage("leoBridge Ready");
      this.leoBridgeReady = true;
    });

    // * Outline Pane
    this.leoTreeView = vscode.window.createTreeView("leoIntegration", { showCollapseAll: true, treeDataProvider: new LeoOutlineProvider(this) });
    this.leoTreeView.onDidChangeSelection((p_event => this.treeViewChangedSelection(p_event)));
    this.leoTreeView.onDidExpandElement((p_event => this.treeViewExpandedElement(p_event)));
    this.leoTreeView.onDidCollapseElement((p_event => this.treeViewCollapsedElement(p_event)));
    this.leoTreeView.onDidChangeVisibility((p_event => this.treeViewVisibilityChanged(p_event)));
    // * Outline Pane's TreeVies properties:
    // *    readonly selection: T[];   // Currently selected elements of TreeView
    // *    readonly visible: boolean; // true if the TreeView is visible otherwise false

    // * Body Pane
    this.leoFileSystem = new LeoBodyProvider(this);
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider("leo", this.leoFileSystem, { isCaseSensitive: true }));

    // * Status bar Keyboard Shortcut "Reminder/Flag" to signify keyboard shortcuts are altered in leo mode
    // EXAMPLE: register some listener that make sure the status bar item always up-to-date
    // context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
    // context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateStatusBarItem));
    this.leoStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    this.leoStatusBarItem.color = "#fb7c47"; // TODO : Centralize or make available in a config setting.
    this.leoStatusBarItem.command = "leointeg.test"; // just call test function for now
    this.leoStatusBarItem.text = `$(keyboard) Literate `;
    this.leoStatusBarItem.tooltip = "Leo Key Bindings are in effect";
    context.subscriptions.push(this.leoStatusBarItem);
    this.leoStatusBarItem.hide();

    // * React to change in active panel/text editor to toggle Leo Mode Shortcuts and behavior
    vscode.window.onDidChangeActiveTextEditor(p_event => this.onActiveEditorChanged(p_event));
    vscode.window.onDidChangeTextEditorSelection(p_event => this.onChangeEditorSelection(p_event));
    vscode.window.onDidChangeTextEditorViewColumn(p_event => this.onChangeEditorViewColumn(p_event));
    vscode.window.onDidChangeVisibleTextEditors(p_event => this.onChangeVisibleEditor(p_event));
    vscode.window.onDidChangeWindowState(p_event => this.onChangeWindowState(p_event));

    vscode.workspace.onDidChangeTextDocument(p_event => this.onDocumentChanged(p_event));
    vscode.workspace.onDidSaveTextDocument(p_event => this.onDocumentSaved(p_event));
    vscode.workspace.onDidChangeConfiguration(p_event => this.onChangeConfiguration(p_event));
  }

  private assertId(p_val: boolean, p_from: string): void {
    if (!p_val) {
      console.error("ASSERT FAILED in ", p_from); // TODO : Improve id error checking
    }
  }

  private treeViewChangedSelection(p_event: vscode.TreeViewSelectionChangeEvent<LeoNode>): void {
    // * We capture and act upon the the 'select node' command, so this event is redundant for now
    //console.log("treeViewChangedSelection, selection length:", p_event.selection.length);
  }
  private treeViewExpandedElement(p_event: vscode.TreeViewExpansionEvent<LeoNode>): void {
    this.leoBridgeAction("expandNode", p_event.element.apJson).then(() => {
      //console.log('back from expand');
    });
  }
  private treeViewCollapsedElement(p_event: vscode.TreeViewExpansionEvent<LeoNode>): void {
    this.leoBridgeAction("collapseNode", p_event.element.apJson).then(() => {
      //console.log('back from collapse');
    });
  }
  private treeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent): void {
    // * May be useful for toggling 'literate mode'
    // console.log("treeViewChangedElement, visible: ", p_event.visible);
  }

  private onActiveEditorChanged(p_event: vscode.TextEditor | undefined): void {
    // selecting another editor of the same window by the tab
    if (p_event) {
    } else if (this.leoObjectSelected) {
      this.leoObjectSelected = false; // no editor!
      this.updateStatusBarItem();
      return;
    }
    if (vscode.window.activeTextEditor) { //  placing cursor in the editor pane or clicking its tab
      if (vscode.window.activeTextEditor.document.uri.scheme === 'leo') {
        if (!this.leoObjectSelected) {
          this.leoObjectSelected = true;
          this.updateStatusBarItem();
          return;
        }
      } else {
        this.leoObjectSelected = false;
        this.updateStatusBarItem();
        return;
      }
    }
  }
  private onChangeEditorSelection(p_event: vscode.TextEditorSelectionChangeEvent): void {
    // console.log("onChangeEditorSelection", p_event.textEditor.document.fileName);
  }
  private onChangeEditorViewColumn(p_event: vscode.TextEditorViewColumnChangeEvent): void {
    console.log("onChangeEditorViewColumn", p_event.textEditor.document.fileName, p_event.viewColumn);
  }
  private onChangeVisibleEditor(p_event: vscode.TextEditor[]): void {
    // Bring in focus an editor tab that was not on front
    // console.log("onChangeVisibleEditor", p_event);
  }
  private onChangeWindowState(p_event: vscode.WindowState): void {
    // console.log("onChangeWindowState", p_event);
    // selecting another vscode window by the os title bar
  }
  private onDocumentChanged(p_event: vscode.TextDocumentChangeEvent): void {
    // * edited the document: debounce/check if it was leo body
    if (p_event.document.uri.scheme === "leo" && p_event.document.isDirty) {
      if (this.bodyChangeTimeout) {
        clearTimeout(this.bodyChangeTimeout);
      }
      this.bodyChangeTimeout = setTimeout(() => {
        // * Debounce
        this.triggerBodySave(p_event.document).then(() => {
          if (this.bodyChangeTimeout) {
            clearTimeout(this.bodyChangeTimeout);
          }
          this.bodyChangeTimeout = undefined; // Make falsy
        });
      }, 200);
    }
  }

  public triggerBodySave(p_document: vscode.TextDocument): Thenable<boolean> {
    // * sets new body text of currently selected node on leo's side
    if (p_document) {
      const w_param = {
        gnx: p_document.uri.fsPath.substr(1), //uri.fsPath.substr(1),
        body: p_document.getText()
      };
      return this.leoBridgeAction("setBody", JSON.stringify(w_param)).then(p_result => {
        console.log('Back from triggerBodySave body to leo');
        return Promise.resolve(true);
      });
    } else {
      return Promise.resolve(false);
    }
  }

  private onDocumentSaved(p_event: vscode.TextDocument): void {
    // edited and saved the document, does it on any document in editor // TODO : DEBOUNCE/CHECK IF IT WAS LEO BODY !
    console.log("onDocumentSaved", p_event.fileName);
  }

  private onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {
    console.log("onChangeConfiguration", p_event.affectsConfiguration.toString());
  }

  private updateStatusBarItem(): void {
    if (this.leoObjectSelected) { // * Also check in constructor for statusBar properties
      // this.leoStatusBarItem.color = "#fb7c47";
      // this.leoStatusBarItem.text = `$(keyboard) Literate `;
      // this.leoStatusBarItem.tooltip = "Leo Key Bindings are in effect";
      this.leoStatusBarItem.show();
    } else {
      // this.leoStatusBarItem.color = this.statusbarNormalColor;
      // this.leoStatusBarItem.tooltip = "Leo Key Bindings are in effect";
      this.leoStatusBarItem.hide();
    }
  }

  public setupRefreshFn(p_refreshObj: any): void {
    this.onDidChangeTreeDataObject = p_refreshObj;
  }

  public setupRefreshBodyFn(p_refreshObj: any) {
    this.onDidChangeBodyDataObject = p_refreshObj;
  }

  public apToLeoNode(p_apData: ArchivedPosition): LeoNode {
    const w_apJson: string = JSON.stringify(p_apData); //  just this part back to JSON

    let w_collaps: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
    if (p_apData.hasChildren) {
      if (p_apData.expanded) {
        w_collaps = vscode.TreeItemCollapsibleState.Expanded;
      } else {
        w_collaps = vscode.TreeItemCollapsibleState.Collapsed;
      }
    }
    const w_leoNode = new LeoNode(
      p_apData.headline,
      p_apData.gnx,
      w_collaps,
      w_apJson,
      !!p_apData.cloned,
      !!p_apData.dirty,
      !!p_apData.marked,
      !!p_apData.hasBody
    );
    return w_leoNode;
  }


  public arrayToSingleLeoNode(p_array: ArchivedPosition[]): LeoNode | null {
    if (!p_array.length) {
      return null;
    }
    return this.apToLeoNode(p_array[0]);
  }

  public revealTreeNode(p_node: LeoNode): void {
    this.leoTreeView.reveal(p_node, { select: true, focus: true });



    // this.getBody(w_leoNode.apJson).then(p_body => {
    //   this.bodyText = p_body;
    //   vscode.window.showTextDocument(this.bodyUri, {
    //     viewColumn: 1,
    //     preserveFocus: false,
    //     preview: false
    //     // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
    //   });
    //   this.onDidChangeBodyDataObject.fire([{ type: vscode.FileChangeType.Changed, uri: this.bodyUri }]); // * for file system implementation
    // });
  }

  public arrayToLeoNodesArray(p_array: ArchivedPosition[]): LeoNode[] {
    // let w_apDataArray: ArchivedPosition[] = JSON.parse(p_array);
    const w_leoNodesArray: LeoNode[] = [];
    for (let w_apData of p_array) {
      const w_leoNode = this.apToLeoNode(w_apData);
      if (w_apData.selected && this.revealSelectedNode) {
        this.revealSelectedNode = false;
        setTimeout(() => {
          this.revealTreeNode(w_leoNode);
        }, 0);
      }
      w_leoNodesArray.push(w_leoNode);
    }
    return w_leoNodesArray;
  }

  private getBestOpenFolderUri(): vscode.Uri {
    // Find a folder to propose when opening the browse-for-leo-file chooser
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
      w_openedFileEnvUri = vscode.Uri.file("~"); // TODO : set as home folder properly this doesn't work
    }
    return w_openedFileEnvUri;
  }

  public leoBridgeAction(p_action: string, p_jsonParam: string, p_deferedPayload?: LeoBridgePackage, p_preventCall?: boolean): Promise<LeoBridgePackage> {
    return new Promise((resolve, reject) => {
      const w_action: LeoAction = {
        parameter: "{\"id\":" + (++this.leoBridgeSerialId) + ", \"action\": \"" + p_action + "\", \"param\":" + p_jsonParam + "}",
        deferedPayload: p_deferedPayload ? p_deferedPayload : undefined,
        resolveFn: resolve,
        rejectFn: reject
      };
      // console.log('Created Action Id:', this.leoBridgeSerialId);
      this.callStack.push(w_action);
      if (!p_preventCall) {
        this.callAction();
      }
    });
  }

  private resolveBridgeReady(p_jsonObject: string) {
    let w_bottomAction = this.callStack.shift();
    if (w_bottomAction) {
      const w_package = JSON.parse(p_jsonObject);
      // console.log('Received Action Id:', w_package.id);
      if (w_bottomAction.deferedPayload) { // Used when the action already has a return value ready but is also waiting for python's side
        w_bottomAction.resolveFn(w_bottomAction.deferedPayload); // given back 'as is'
      } else {
        w_bottomAction.resolveFn(w_package);
      }
      this.actionBusy = false;
    } else {
      console.log("Error stack empty");
    }
  }

  private callAction(): void {
    if (this.callStack.length && !this.actionBusy) {
      this.actionBusy = true; // launch / resolve bottom one
      const w_action = this.callStack[0];
      this.stdin("leoBridge:" + w_action.parameter + "\n");
    }
  }

  public selectTreeNode(p_node: LeoNode): void {
    // User has selected a node in the outline with the mouse

    /* // TEST : Force refresh of the node upon selection
    // if (p_node) {
    //   this.refreshSingleNodeFlag = true;
    //   this.onDidChangeTreeDataObject.fire(p_node);
    // }
    */
    this.leoBridgeAction("setSelectedNode", p_node.apJson)
      .then(() => {
        console.log('Back from selecting a node');
      });

    if (this.bodyTextDocument && !this.bodyTextDocument.isClosed) {
      this.bodyTextDocument.save().then((p_result) => {
        const w_edit = new vscode.WorkspaceEdit();
        w_edit.renameFile(
          this.bodyUri,
          vscode.Uri.parse("leo:/" + p_node.gnx),
          { overwrite: true, ignoreIfExists: true }
        );
        const applyRename = vscode.workspace.applyEdit(w_edit);
        applyRename.then(p_result => {
          this.bodyUri = vscode.Uri.parse("leo:/" + p_node.gnx);
          this.showBodyDocument();
        });

      });
    } else {
      this.bodyUri = vscode.Uri.parse("leo:/" + p_node.gnx);
      this.showBodyDocument();
    }



    // this.leoBridgeAction("getBody", '"' + p_node.gnx + '"')
    //   .then((p_result) => {
    //     this.bodyText = p_result.bodyData;
    //     this.showBodyDocument();
    //     this.onDidChangeBodyDataObject.fire([{ type: vscode.FileChangeType.Changed, uri: this.bodyUri }]); // * for file system implementation
    //   });

    /*
    let w_savedBody: Thenable<boolean>;
    if (this.bodyChangeTimeout) {
      // there was one, maybe trigger it.
      w_savedBody = this.triggerBodySave();
    } else {
      w_savedBody = Promise.resolve(true);
    }

    w_savedBody.then(
      () => {
        console.log('finished saving body to leo');
        if (this.bodyChangeTimeout) {
          clearTimeout(this.bodyChangeTimeout);
        }
        this.bodyChangeTimeout = undefined; // Make falsy
        this.setSelectedNode(p_node.apJson).then(p_val => {
          // * Node now selected in leo
        });
        // Dont even wait for trying to get the body, the stack makes sure order is preserved
        this.getBody(p_node.apJson).then(p_body => {
          this.bodyText = p_body;
          // this.onDidChangeBodyDataObject.fire(this.bodyUri); // * For virtualdocument leoBody.ts tests
          this.showBodyDocument();
          this.onDidChangeBodyDataObject.fire([{ type: vscode.FileChangeType.Changed, uri: this.bodyUri }]); // * for file system implementation
        });
      }
    );
    */
  }

  public showBodyDocument(): void {
    vscode.workspace.openTextDocument(this.bodyUri).then(p_document => {
      this.bodyTextDocument = p_document;
      vscode.window.showTextDocument(this.bodyTextDocument, {
        viewColumn: 1, // TODO : try to make leftmost tab so it touches the outline pane
        preserveFocus: false, // set focus on this new body pane
        preview: true
        // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
      }).then(w_bodyEditor => {
        console.log('body shown resolved!');
        this.bodyTextEditor = w_bodyEditor;
        // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
      });
    });
  }

  public editHeadline(p_node: LeoNode) {
    this.editHeadlineInputOptions.value = p_node.label; // Preset input pop up
    vscode.window.showInputBox(this.editHeadlineInputOptions)
      .then(
        p_newHeadline => {
          if (p_newHeadline) {
            p_node.label = p_newHeadline; //! When labels change, ids will change and that selection and expansion state cannot be kept stable anymore.
            this.leoBridgeAction("setNewHeadline", "{\"node\":" + p_node.apJson + ", \"headline\": \"" + p_newHeadline + "\"}"
            ).then(
              (p_answer: LeoBridgePackage) => {
                this.revealSelectedNode = true; // ! needed because we voluntarily refreshed the automatic ID
                this.onDidChangeTreeDataObject.fire(); // refresh all, needed to get clones to refresh too!
              }
            );
          }
        }
      );
  }
  public mark(p_node: LeoNode): void {
    vscode.window.showInformationMessage(`mark on ${p_node.label}.`); // Temp placeholder
  }
  public copyNode(p_node: LeoNode): void {
    vscode.window.showInformationMessage(`copyNode on ${p_node.label}.`); // Temp placeholder
  }
  public cutNode(p_node: LeoNode): void {
    vscode.window.showInformationMessage(`cutNode on ${p_node.label}.`); // Temp placeholder
  }
  public pasteNode(p_node: LeoNode): void {
    vscode.window.showInformationMessage(`pasteNode on ${p_node.label}.`); // Temp placeholder
  }
  public pasteNodeAsClone(p_node: LeoNode): void {
    vscode.window.showInformationMessage(`pasteNodeAsClone on ${p_node.label}.`); // Temp placeholder
  }
  public delete(p_node: LeoNode): void {
    vscode.window.showInformationMessage(`delete on ${p_node.label}.`); // Temp placeholder
  }

  public openLeoFile(): void {
    let w_returnMessage: string | undefined;
    if (!this.leoBridgeReady) {
      w_returnMessage = "leoBridge not ready";
    }
    if (this.fileOpenedReady || this.fileBrowserOpen) {
      w_returnMessage = "leo file already opened!";
    }
    if (w_returnMessage) {
      vscode.window.showInformationMessage(w_returnMessage);
      return; // prevent opening if already open/opening
    }
    this.fileBrowserOpen = true; // flag for multiple click prevention
    vscode.window
      .showOpenDialog({
        canSelectMany: false,
        defaultUri: this.getBestOpenFolderUri(),
        filters: {
          "Leo Files": ["leo"]
        }
      })
      .then(p_chosenLeoFile => {
        if (p_chosenLeoFile) {

          this.leoBridgeAction("openFile", '"' + p_chosenLeoFile[0].fsPath + '"')
            .then((p_result: LeoBridgePackage) => {

              this.fileOpenedReady = true; // ANSWER to openLeoFile
              this.fileBrowserOpen = false;

              if (this.onDidChangeTreeDataObject) {
                this.revealSelectedNode = true;
                this.onDidChangeTreeDataObject.fire();
              } else {
                console.log("ERROR onDidChangeTreeDataObject NOT READY");
              }

              // * set body URI for body filesystem
              this.bodyUri = vscode.Uri.parse("leo:/" + p_result.node.gnx);
              this.showBodyDocument();

              this.updateStatusBarItem();

              // console.log(vscode.window.visibleTextEditors);
              // for (let entry of vscode.window.visibleTextEditors) {
              //   console.log(entry.); // 1, "string", false
              // }
            });

        } else {
          vscode.window.showInformationMessage("Open Cancelled");
          this.fileBrowserOpen = false;
        }
      });
  }

  private processAnswer(p_data: string): void {
    let w_processed: boolean = false;
    if (p_data.startsWith("leoBridge:")) {
      this.resolveBridgeReady(p_data.substring(10));
      w_processed = true;
    }
    if (w_processed) {
      this.callAction();
    } else if (this.leoBridgeReady) { // unprocessed/unknown python output
      console.log("from python", p_data);
    }
  }

  private initLeoProcess(): Promise<LeoBridgePackage> {
    const w_pythonProcess: child.ChildProcess = child.spawn("python3", [
      this.context.extensionPath + "/scripts/leobridge.py"
    ]);
    w_pythonProcess.stdout.on("data", (data: string) => {
      data.toString().split("\n").forEach(p_line => {
        p_line = p_line.trim();
        if (p_line) { // * std out process line by line: json shouldn't have line breaks
          this.processAnswer(p_line);
        }
      });
    });
    w_pythonProcess.stderr.on("data", (data: string) => {
      console.log(`stderr: ${data}`);
    });
    w_pythonProcess.on("close", (code: any) => {
      console.log(`child process exited with code ${code}`);
      this.leoBridgeReady = false;
    });
    // * Start first with preventCall set to true: no need to call anything for the first 'ready'
    return this.leoBridgeAction("", "", { id: 1, package: w_pythonProcess }, true);
  }

  private stdin(p_message: string): any {
    this.leoBridgeReadyPromise.then(() => {  //  using '.then' to be buffered in case process isn't ready.
      if (this.leoPythonProcess) {
        this.leoPythonProcess.stdin.write(p_message); // * std in interaction sending to python script
      }
    });
  }

  public killLeoBridge(): void {
    console.log("sending kill command");
    this.stdin("exit\n"); // 'exit' should kill the python script
  }

  public test(): void {
    console.log("sending test");
    // * TEST : GET SELECTED NODE FROM LEO AND REVEAL 'SELECTED' NODE IN TREEVIEW
    this.leoBridgeAction("getSelectedNode", "{\"testparam\":\"hello\"}").then(
      (p_answer: LeoBridgePackage) => {
        console.log('Test got Back from getSelectedNode, now revealing :', p_answer.node.headline);
        this.leoTreeView.reveal(this.apToLeoNode(p_answer.node), { select: true, focus: true });
      }
    );
    // * TEST : REFRESH ALL TREE NODES
    // this.onDidChangeTreeDataObject.fire(); // refresh all
  }
}
