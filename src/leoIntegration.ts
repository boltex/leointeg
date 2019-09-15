import * as child from "child_process";
import * as vscode from "vscode";
import * as path from "path";
import { LeoNode } from "./leoNode";
import { Uri } from "vscode";

interface LeoAction {
  action: string; // action to call on python's side
  parameter: string; // to pass along with action to python's side
  deferedPayload?: any | undefined; // Used when the action already has a return value ready but is also waiting for python's side
  resolveFn: (result: any) => void; // call that with an aswer from python's (or other) side
  rejectFn: (reason: any) => void; // call if problem is encountered
}
// (serializable) Archived Position
interface ArchivedPosition {
  // * as reference, comments below are (almost) from source of Leo's plugin leoflexx.py
  hasBody: boolean; //  bool(p.b),
  hasChildren: boolean; // p.hasChildren()
  childIndex: number; // p._childIndex
  cloned: boolean; // p.isCloned()
  dirty: boolean; // p.isDirty()
  expanded: boolean; // p.isExpanded()
  gnx: string; //p.v.gnx
  level: number; // p.level()
  headline: string; // p.h
  marked: boolean; // p.isMarked()
  selected: boolean; // p.isSelected()
  stack: ApStack; // for (stack_v, stack_childIndex) in p.stack]
}

interface ApStack {
  gnx: string; //  stack_v.gnx
  childIndex: number; // stack_childIndex
  headline: string; // stack_v.h
}

export class LeoIntegration {
  public leoBridgeReady: boolean = false;
  public fileBrowserOpen: boolean = false;
  public fileOpenedReady: boolean = false;
  public actionBusy: boolean = false;

  public outlineDataReady: boolean = false;
  public leoTreeView: vscode.TreeView<LeoNode> | undefined;

  public bodyDataReady: boolean = false;
  public bodyText: string = "";

  public icons: string[] = [];
  public iconsInverted: boolean = false; // used to flip dirty/pristine outline of icon

  public leoStatusBarItem: vscode.StatusBarItem;
  public leoObjectSelected: boolean = false; // represents having focus on outline or body, as opposed to anything else
  private statusbarNormalColor = new vscode.ThemeColor("statusBar.foreground");  //"statusBar.foreground"

  private editHeadlineInputOptions: vscode.InputBoxOptions = {
    ignoreFocusOut: false,
    value: "", // will be replaced live upon showing from the node's text
    valueSelection: undefined,
    prompt: 'Edit headline'
    // placeHolder: 'Enter Headline',
  };

  private callStack: LeoAction[] = [];
  private onDidChangeTreeDataObject: any;
  private onDidChangeBodyDataObject: any;
  public revealSelectedNode: boolean = false; // to be read by nodes to check if they should self-select. (and lower this flag)

  private leoBridgeReadyPromise: Promise<child.ChildProcess>; // set when leoBridge has a leo controller ready

  constructor(private context: vscode.ExtensionContext, public bodyUri: vscode.Uri) {
    this.leoBridgeReadyPromise = new Promise<child.ChildProcess>((resolve, reject) => {
      this.initLeoProcess(resolve, reject);
      this.initIconPaths();
    });
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

  private onActiveEditorChanged(p_event: vscode.TextEditor | undefined): void {
    // selecting another editor of the same window by the tab
    if (p_event) {
      // console.log("onActiveEditorChanged", p_event);
    } else if (this.leoObjectSelected) {
      //console.log("onActiveEditorChanged, no editor");
      this.leoObjectSelected = false;
      this.updateStatusBarItem();
      return;
    }
    if (vscode.window.activeTextEditor) {
      if (vscode.window.activeTextEditor.document.uri.scheme === 'leo') {
        // Selecting Leo body, either by placing cursor in the editor pane or clicking its tab
        if (!this.leoObjectSelected) {
          //console.log('selected a leo sheme text editor');
          this.leoObjectSelected = true;
          this.updateStatusBarItem();
          return;
        }
      } else {
        //console.log('selected Out of leo');
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
    // edited the document // TODO : DEBOUNCE/CHECK IF IT WAS LEO BODY !
    // console.log("onDocumentChanged", p_event);
  }
  private onDocumentSaved(p_event: vscode.TextDocument): void {
    // edited the document // TODO : DEBOUNCE/CHECK IF IT WAS LEO BODY !
    console.log("onDocumentSaved", p_event.fileName);
  }

  private onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {
    console.log("onChangeConfiguration", p_event.affectsConfiguration.toString());
  }

  private updateStatusBarItem(): void {
    // let n = getNumberOfSelectedLines(vscode.window.activeTextEditor);
    if (this.leoObjectSelected) {
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

  private initIconPaths(): void {
    // build icons so that 8=dirty, 4=cloned, 2=marked, 1=content
    for (let index = 0; index < 16; index++) {
      this.icons.push(path.join(__filename, "..", "..", "resources", "box" + ("0" + index).slice(-2) + ".svg"));
    }
    // * example for future light/dark themes support
    // iconPath = {
    //   light: path.join(__filename, "..", "..", "resources", "dependency.svg"),
    //   dark: path.join(__filename, "..", "..", "resources", "dependency.svg")
    // };
  }

  public setupRefreshFn(p_refreshObj: any): void {
    this.onDidChangeTreeDataObject = p_refreshObj;
  }

  public setupRefreshBodyFn(p_refreshObj: any) {
    this.onDidChangeBodyDataObject = p_refreshObj;
  }

  public setTreeView(p_treeView: vscode.TreeView<LeoNode>) {
    this.leoTreeView = p_treeView;
  }

  private jsonArrayToSingleLeoNode(p_jsonArray: string): LeoNode | null {
    let w_apDataArray: ArchivedPosition[] = JSON.parse(p_jsonArray);
    if (!w_apDataArray.length) {
      return null;
    }
    const w_apData = w_apDataArray[0];
    const w_apJson: string = JSON.stringify(w_apData); //  just this part back to JSON
    let w_collaps: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
    if (w_apData.hasChildren) {
      if (w_apData.expanded) {
        w_collaps = vscode.TreeItemCollapsibleState.Expanded;
      } else {
        w_collaps = vscode.TreeItemCollapsibleState.Collapsed;
      }
    }
    const w_leoNode = new LeoNode(
      this,
      w_apData.headline,
      w_collaps,
      w_apJson,
      !!w_apData.cloned,
      !!w_apData.dirty,
      !!w_apData.marked,
      !!w_apData.hasBody
    );
    return w_leoNode;
  }

  private jsonArrayToLeoNodesArray(p_jsonArray: string): LeoNode[] {
    let w_apDataArray: ArchivedPosition[] = JSON.parse(p_jsonArray);

    const w_leoNodesArray: LeoNode[] = [];
    for (let w_apData of w_apDataArray) {
      const w_apJson: string = JSON.stringify(w_apData); //  just this part back to JSON

      let w_collaps: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
      if (w_apData.hasChildren) {
        if (w_apData.expanded) {
          w_collaps = vscode.TreeItemCollapsibleState.Expanded;
        } else {
          w_collaps = vscode.TreeItemCollapsibleState.Collapsed;
        }
      }

      const w_leoNode = new LeoNode(
        this,
        w_apData.headline,
        w_collaps,
        w_apJson,
        !!w_apData.cloned,
        !!w_apData.dirty,
        !!w_apData.marked,
        !!w_apData.hasBody
      );

      if (w_apData.selected && this.revealSelectedNode) {
        console.log('got selection! *********');

        this.revealSelectedNode = false;
        setTimeout(() => {
          if (this.leoTreeView) {
            this.leoTreeView.reveal(w_leoNode, { select: true, focus: true });
          }
        }, 0);
      }

      w_leoNodesArray.push(w_leoNode);
    }
    return w_leoNodesArray;
  }

  private getBestOpenFolderUri(): Uri {
    // Find a folder to propose when opening the browse-for-leo-file chooser
    let w_openedFileEnvUri: Uri | boolean = false;
    let w_activeUri: Uri | undefined = undefined;

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
      w_openedFileEnvUri = Uri.file("~"); // TODO : set as home folder properly this doesn't work
    }
    return w_openedFileEnvUri;
  }

  private resolveBridgeReady() {
    vscode.window.showInformationMessage("leoBridge Ready");
    this.leoBridgeReady = true;
    let w_bottomAction = this.callStack.shift();
    if (w_bottomAction) {
      w_bottomAction.resolveFn(w_bottomAction.deferedPayload);
    }
  }

  private resolveFileOpenedReady() {
    let w_bottomAction = this.callStack.shift();
    if (w_bottomAction) {
      w_bottomAction.resolveFn(null);
      this.actionBusy = false;
    } else {
      console.log("ERROR STACK EMPTY");
    }
  }

  private resolveGetBody(p_jsonObject: string) {
    let w_bottomAction = this.callStack.shift();
    if (w_bottomAction) {
      w_bottomAction.resolveFn(JSON.parse(p_jsonObject).body);
      this.actionBusy = false;
    } else {
      console.log("ERROR STACK EMPTY");
    }
  }

  private resolveGetNode(p_jsonArray: string) {
    console.log('got a node from python!');
    let w_bottomAction = this.callStack.shift();
    if (w_bottomAction) {
      w_bottomAction.resolveFn(this.jsonArrayToSingleLeoNode(p_jsonArray));
      this.actionBusy = false;
    } else {
      console.log("ERROR STACK EMPTY");
    }
  }

  private resolveGetChildren(p_jsonArray: string) {
    let w_bottomAction = this.callStack.shift();
    if (w_bottomAction) {
      w_bottomAction.resolveFn(this.jsonArrayToLeoNodesArray(p_jsonArray));
      this.actionBusy = false;
    } else {
      console.log("ERROR STACK EMPTY");
    }
  }

  public getBody(p_apJson?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const w_action: LeoAction = {
        action: "getBody:", // ! INCLUDES THE COLON ':'
        parameter: p_apJson || "",
        resolveFn: resolve,
        rejectFn: reject
      };
      this.callStack.push(w_action);
      this.callAction();
    });
  }

  public getParent(p_apJson?: string): Promise<LeoNode> {
    return new Promise((resolve, reject) => {
      const w_action: LeoAction = {
        action: "getParent:", // ! INCLUDES THE COLON ':'
        parameter: p_apJson || "", // nothing should get root nodes of the leo file
        resolveFn: resolve,
        rejectFn: reject
      };
      this.callStack.push(w_action);
      this.callAction();
    });
  }

  public getChildren(p_apJson?: string): Promise<LeoNode[]> {
    return new Promise((resolve, reject) => {
      const w_action: LeoAction = {
        action: "getChildren:", // ! INCLUDES THE COLON ':'
        parameter: p_apJson || "", // nothing should get root nodes of the leo file
        resolveFn: resolve,
        rejectFn: reject
      };
      this.callStack.push(w_action);
      this.callAction();
    });
  }

  public getSelectedNode(): Promise<LeoNode> {
    return new Promise((resolve, reject) => {
      const w_action: LeoAction = {
        action: "getSelectedNode:", // ! INCLUDES THE COLON ':'
        parameter: "",
        resolveFn: resolve,
        rejectFn: reject
      };
      this.callStack.push(w_action);
      this.callAction();
    });
  }

  private callAction(): void {
    if (!this.callStack.length || this.actionBusy) {
      return;
    }
    // launch / resolve bottom one
    this.actionBusy = true;
    const w_action = this.callStack[0];

    // * example "getChildren:{blablabla some JSON blablabla}"
    this.stdin(w_action.action + w_action.parameter + "\n");
  }

  public selectNode(p_node: LeoNode): void {
    console.log("selectNode:", p_node.label);

    this.getBody(p_node.apJson).then(p_body => {
      this.bodyText = p_body;
      // this.onDidChangeBodyDataObject.fire(this.bodyUri); // * For virtualdocument leoBody.ts tests
      vscode.window.showTextDocument(this.bodyUri, {
        viewColumn: 1,
        preserveFocus: false,
        preview: false
        // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
      });
      this.onDidChangeBodyDataObject.fire([{ type: vscode.FileChangeType.Changed, uri: this.bodyUri }]); // * for file system implementation
    });
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
          const w_openFile = new Promise((resolve, reject) => {
            const w_action: LeoAction = {
              action: "openFile:", // ! INCLUDES THE COLON ':'
              parameter: p_chosenLeoFile[0].fsPath + "\n", // nothing should get root nodes of the leo file
              resolveFn: resolve,
              rejectFn: reject
            };
            this.callStack.push(w_action);
            this.callAction();
          });
          // * Resolution of the 'open file' promise
          w_openFile.then(() => {
            // TODO : Get selected node position and set it aftert getting first refresh
            this.revealSelectedNode = true;

            // TODO : Revise order of this startup stuff
            this.fileOpenedReady = true; // ANSWER to openLeoFile
            this.fileBrowserOpen = false;
            if (this.onDidChangeTreeDataObject) {
              this.onDidChangeTreeDataObject.fire();
            } else {
              console.log("ERROR onDidChangeTreeDataObject NOT READY");
            }
            // update status bar for first time
            this.updateStatusBarItem();
            // * Make body pane appear
            const w_leoBody = vscode.window.showTextDocument(this.bodyUri, {
              viewColumn: 1,
              preserveFocus: false,
              preview: false
              // selection: new Range( new Position(0,0), new Position(0,0) ) // First time open, no need to set scroll
            });

            // console.log(vscode.window.visibleTextEditors);
            // for (let entry of vscode.window.visibleTextEditors) {
            //   console.log(entry.); // 1, "string", false
            // }

            w_leoBody.then(w_bodyEditor => {
              // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
              // TODO : try to make leftmost tab so it touches the outline pane
              // console.log('created body:', w_bodyEditor);

            });

          });

        } else {
          vscode.window.showInformationMessage("Open Cancelled");
          this.fileBrowserOpen = false;
        }
      });
  }

  private processAnswer(p_data: string): void {
    let w_processed: boolean = false;
    if (p_data.startsWith("nodeReady")) {
      this.resolveGetNode(p_data.substring(9)); // ANSWER to getChildren
      w_processed = true;
    } else if (p_data.startsWith("outlineDataReady")) {
      this.resolveGetChildren(p_data.substring(16)); // ANSWER to getChildren
      w_processed = true;
    } else if (p_data.startsWith("bodyDataReady")) {
      this.resolveGetBody(p_data.substring(13)); // ANSWER to getChildren
      w_processed = true;
    } else if (p_data === "fileOpenedReady") {
      this.resolveFileOpenedReady();
      w_processed = true;
    } else if (p_data === "leoBridgeReady") {
      this.resolveBridgeReady();
      w_processed = true;
    }
    if (w_processed) {
      this.callAction();
      return;
    }
    // * past this point only if p_data did not match any known commands!
    if (this.leoBridgeReady) {
      console.log("from python", p_data); // unprocessed/unknown python output
    }
  }

  private stdin(p_message: string): any {
    // not using 'this.leoBridgeReady' : using '.then' to be buffered in case process isn't ready.
    this.leoBridgeReadyPromise.then(p_leoProcess => {
      p_leoProcess.stdin.write(p_message); // * std in interaction sending to python script
    });
  }

  public test(): void {
    console.log("sending test");
    //this.stdin("test\n"); // 'test' should trigger a test output from python script
    // getSelectedNode
    this.getSelectedNode().then(p_leoNode => {
      console.log('ok, now got back from test: ', p_leoNode.label);
      if (this.leoTreeView) {
        this.leoTreeView.reveal(p_leoNode, { select: true, focus: true });
      }
    });
  }

  public killLeoBridge(): void {
    console.log("sending kill command");
    this.stdin("exit\n"); // 'exit' should kill the python script
  }

  public editHeadline(p_node: LeoNode) {
    // vscode.window.showInformationMessage(`editHeadline on ${p_node.label}.`);
    // Popup input for rename
    this.editHeadlineInputOptions.value = p_node.label;
    vscode.window.showInputBox(this.editHeadlineInputOptions).then(
      p_newHeadline => {
        console.log('Change for: ', p_newHeadline);

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


  private initLeoProcess(
    p_promiseResolve: (value?: any | PromiseLike<any>) => void,
    p_promiseReject: (value?: any | PromiseLike<any>) => void
  ): void {
    // * prevent re-init
    if (this.leoBridgeReady) {
      console.log("ERROR : leoBridge already Started");
      return;
    }
    // * start leo via leoBridge python script.
    const w_pythonProcess: child.ChildProcess = child.spawn("python3", [
      this.context.extensionPath + "/scripts/leobridge.py"
    ]);
    const w_action: LeoAction = {
      action: "", // just waiting for ready, no need to call an action for this first one
      parameter: "",
      deferedPayload: w_pythonProcess,
      resolveFn: p_promiseResolve,
      rejectFn: p_promiseReject
    };
    this.callStack.push(w_action); // push the first action on callstack for answering leoBridgeReady
    // * interact via std in out
    w_pythonProcess.stdout.on("data", (data: string) => {
      const w_data = data.toString();
      const w_lines = w_data.split("\n");
      w_lines.forEach(p_line => {
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
  }
}
