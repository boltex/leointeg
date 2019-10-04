import * as child from "child_process";
import * as vscode from "vscode";

import { LeoNode } from "./leoNode";
import { LeoOutlineProvider } from "./leoOutline";
import { LeoBodyProvider } from "./leoBody";
import { LeoBridgePackage, LeoAction, RevealType, ArchivedPosition } from "./leoIntegrationTypes";
import { TIMEOUT } from "dns";

export class LeoIntegration {
  // * Startup flags
  public fileBrowserOpen: boolean = false;
  public fileOpenedReady: boolean = false;
  private leoBridgeReadyPromise: Promise<LeoBridgePackage>; // set when leoBridge has a leo controller ready
  private leoPythonProcess: child.ChildProcess | undefined;

  // * Configuration Settings
  public treeKeepFocus: boolean;
  public treeKeepFocusAside: boolean;
  public treeInExplorer: boolean;
  public bodyEditDelay: number;
  public connectionType: string;
  public connectionPort: number;

  // * Outline Pane
  public leoTreeDataProvider: LeoOutlineProvider;
  public leoTreeView: vscode.TreeView<LeoNode>;
  public leoTreeExplorerView: vscode.TreeView<LeoNode>;
  private hadFirstExplorerView: boolean = false;
  private hadFirstView: boolean = false;
  private lastSelectedLeoNode: LeoNode | undefined; // last selected node we got a hold of; leoTreeView.selection maybe newer and unprocessed

  // * Body Pane
  public leoFileSystem: LeoBodyProvider; // as per https://code.visualstudio.com/api/extension-guides/virtual-documents#file-system-api
  private bodyUri: vscode.Uri = vscode.Uri.parse("leo:/" + "");
  private bodyTextDocument: vscode.TextDocument | undefined;

  // * Status Bar
  public leoStatusBarItem: vscode.StatusBarItem;
  public leoObjectSelected: boolean = false; // represents having focus on outline or body, as opposed to anything else
  public statusbarNormalColor = new vscode.ThemeColor("statusBar.foreground");  //"statusBar.foreground"

  // * Edit Headline Input Box
  private editHeadlineInputOptions: vscode.InputBoxOptions = {
    ignoreFocusOut: false, // clicking outside cancels the headline change
    value: "", // will be replaced live upon showing from the node's text
    valueSelection: undefined,
    prompt: 'Edit Headline'
  };

  // * Timing
  private bodyChangeTimeout: NodeJS.Timeout | undefined;
  private bodyChangeTimeoutSkipped: boolean = false;
  private lastbodyChangedRootRefreshedGnx: string = "";
  private bodyLastChangedDocument: vscode.TextDocument | undefined;

  // * Communications with Python
  public actionBusy: boolean = false;
  private leoBridgeSerialId: number = 0;
  private callStack: LeoAction[] = [];

  public refreshSingleNodeFlag: boolean = false; // read/cleared by leoOutline, so getTreeItem should refresh or return as-is
  public revealSelectedNode: RevealType = RevealType.NoReveal; // to be read/cleared in arrayToLeoNodesArray, to check if any should self-select

  constructor(private context: vscode.ExtensionContext) {

    // * Get Configuration
    this.treeKeepFocus = vscode.workspace.getConfiguration('leoIntegration').get('treeKeepFocus', false);
    this.treeKeepFocusAside = vscode.workspace.getConfiguration('leoIntegration').get('treeKeepFocusAside', false);
    this.treeInExplorer = vscode.workspace.getConfiguration('leoIntegration').get('treeInExplorer', false);
    vscode.commands.executeCommand('setContext', 'treeInExplorer', this.treeInExplorer);
    this.bodyEditDelay = vscode.workspace.getConfiguration('leoIntegration').get('bodyEditDelay', 500);
    this.connectionType = vscode.workspace.getConfiguration('leoIntegration').get('connectionType', "standard I/O");
    this.connectionPort = vscode.workspace.getConfiguration('leoIntegration').get('connectionPort', 80);

    // * Setup leoBridge as a python process
    this.leoBridgeReadyPromise = this.initLeoProcess();
    this.leoBridgeReadyPromise.then((p_package) => {
      this.assertId(p_package.id === 1, "p_package.id === 0"); // test integrity
      this.leoPythonProcess = p_package.package;
      vscode.commands.executeCommand('setContext', 'leoBridgeReady', true);
    });

    // * Outline Pane
    this.leoTreeDataProvider = new LeoOutlineProvider(this);
    this.leoTreeView = vscode.window.createTreeView("leoIntegration", { showCollapseAll: true, treeDataProvider: this.leoTreeDataProvider });
    this.leoTreeView.onDidChangeSelection((p_event => this.treeViewChangedSelection(p_event)));
    this.leoTreeView.onDidExpandElement((p_event => this.treeViewExpandedElement(p_event)));
    this.leoTreeView.onDidCollapseElement((p_event => this.treeViewCollapsedElement(p_event)));
    this.leoTreeView.onDidChangeVisibility((p_event => this.treeViewVisibilityChanged(p_event, false)));

    // * Explorer's Outline Pane
    this.leoTreeExplorerView = vscode.window.createTreeView("leoIntegrationExplorer", { showCollapseAll: true, treeDataProvider: this.leoTreeDataProvider });
    this.leoTreeExplorerView.onDidChangeSelection((p_event => this.treeViewChangedSelection(p_event)));
    this.leoTreeExplorerView.onDidExpandElement((p_event => this.treeViewExpandedElement(p_event)));
    this.leoTreeExplorerView.onDidCollapseElement((p_event => this.treeViewCollapsedElement(p_event)));
    this.leoTreeExplorerView.onDidChangeVisibility((p_event => this.treeViewVisibilityChanged(p_event, true)));

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

  public reveal(p_leoNode: LeoNode, p_options?: { select?: boolean, focus?: boolean, expand?: boolean | number }): void {
    if (this.leoTreeView.visible) {
      this.leoTreeView.reveal(p_leoNode, p_options);
    }
    if (this.leoTreeExplorerView.visible && this.treeInExplorer) {
      this.leoTreeExplorerView.reveal(p_leoNode, p_options);
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

  private treeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
    if (!this.lastSelectedLeoNode) {
      return;
    }
    // * May be useful for toggling 'literate mode'
    // console.log("treeViewChangedElement, visible: ", p_event.visible);
    if (p_explorerView && !this.hadFirstExplorerView) {
      setTimeout(() => {
        this.leoBridgeAction("getSelectedNode", "{}").then(
          (p_answer: LeoBridgePackage) => {
            this.reveal(this.apToLeoNode(p_answer.node), { select: true, focus: false }); // dont use this.treeKeepFocus
          }
        );
        this.hadFirstExplorerView = true;
      }, 0);
    } else if (!p_explorerView && !this.hadFirstView) {
      setTimeout(() => {
        this.leoBridgeAction("getSelectedNode", "{}").then(
          (p_answer: LeoBridgePackage) => {
            this.reveal(this.apToLeoNode(p_answer.node), { select: true, focus: false }); // dont use this.treeKeepFocus
          }
        );
        this.hadFirstView = true;
      }, 0);
    }
    if (p_event.visible && this.lastSelectedLeoNode) {
      this.reveal(this.lastSelectedLeoNode, { select: true, focus: false }); // dont use this.treeKeepFocus
    }
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
    // console.log("onChangeEditorViewColumn", p_event.textEditor.document.fileName, p_event.viewColumn);
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
    // * edited the document: debounce/check if it was leo body and actual changes
    // * .length check https://github.com/microsoft/vscode/issues/50344
    if (p_event.document.uri.scheme === "leo" && p_event.contentChanges.length) {

      if (this.bodyLastChangedDocument && (p_event.document.uri.fsPath !== this.bodyLastChangedDocument.uri.fsPath)) {
        // console.log('Switched Node while waiting edit debounce!');
        this.triggerBodySave(true); //Set p_forcedRefresh flag, this will also have cleared timeout
      }

      if (!this.bodyChangeTimeout && !this.bodyChangeTimeoutSkipped) { // * If icon should change then do it now, but only if there was no document edits pending
        if (this.lastSelectedLeoNode && p_event.document.uri.fsPath.substr(1) === this.lastSelectedLeoNode.gnx) {
          if (!this.lastSelectedLeoNode.dirty || (this.lastSelectedLeoNode.hasBody === !p_event.document.getText().length)) {
            // console.log('NO WAIT');
            this.bodyChangeTimeoutSkipped = true;
            this.bodySaveDocument(p_event.document, true);
            return;
          }
        }
      }

      this.bodyChangeTimeoutSkipped = false;
      // * debounce by restarting the timeout
      let w_delay = this.bodyEditDelay;
      if (this.bodyChangeTimeout) {
        clearTimeout(this.bodyChangeTimeout);
      }
      this.bodyLastChangedDocument = p_event.document; // setup trigger
      this.bodyChangeTimeout = setTimeout(() => {
        // * Debounce
        this.triggerBodySave(); // no .then for clearing timer, done in trigger instead
      }, w_delay);
    }
  }

  private triggerBodySave(p_forcedRefresh?: boolean): Thenable<boolean> {
    // * Clear possible timeout if triggered by event from other than 'onDocumentChanged'
    // console.log('triggerBodySave');
    if (this.bodyChangeTimeout) {
      clearTimeout(this.bodyChangeTimeout);
    }
    this.bodyChangeTimeout = undefined; // Make falsy
    // * ok send to Leo
    if (this.bodyLastChangedDocument) {
      const w_document = this.bodyLastChangedDocument; // backup
      this.bodyLastChangedDocument = undefined; // Make falsy
      if (this.lastbodyChangedRootRefreshedGnx !== w_document.uri.fsPath.substr(1)) {
        p_forcedRefresh = true;
      }
      return this.bodySaveDocument(w_document, p_forcedRefresh);
    } else {
      return Promise.resolve(true);
    }
  }

  public bodySaveDocument(p_document: vscode.TextDocument, p_forceRefreshTree?: boolean): Thenable<boolean> {
    // * sets new body text of currently selected node on leo's side
    if (p_document && (p_document.isDirty || p_forceRefreshTree)) {

      const w_param = {
        gnx: p_document.uri.fsPath.substr(1), //uri.fsPath.substr(1),
        body: p_document.getText()
      };

      // * setup refresh if dirtied or filled/emptied
      let w_needsRefresh = false;
      if (this.lastSelectedLeoNode && (w_param.gnx === this.lastSelectedLeoNode.gnx)) {
        if (!this.lastSelectedLeoNode.dirty || (this.lastSelectedLeoNode.hasBody === !w_param.body.length)) {
          w_needsRefresh = true;
          this.lastSelectedLeoNode.dirty = true;
          this.lastSelectedLeoNode.hasBody = !!w_param.body.length;
        }
      }
      if (p_forceRefreshTree || (w_needsRefresh && this.lastSelectedLeoNode)) {
        // console.log(p_forceRefreshTree ? 'force refresh' : 'needed refresh');
        // this.leoTreeDataProvider.refreshTreeNode(this.lastSelectedLeoNode);
        //* refresh root because of need to dirty parent if in derived file
        this.leoTreeDataProvider.refreshTreeRoot(RevealType.NoReveal);  // No focus this.leoTreeDataProvider.refreshTreeRoot
        this.lastbodyChangedRootRefreshedGnx = w_param.gnx;
      }
      this.bodyChangeTimeoutSkipped = false;
      return this.leoBridgeAction("setBody", JSON.stringify(w_param)).then(p_result => {
        //console.log('Back from setBody body to leo');
        return Promise.resolve(true);
      });
    } else {
      return Promise.resolve(false);
    }
  }

  private onDocumentSaved(p_event: vscode.TextDocument): void {
    // edited and saved the document, does it on any document in editor // TODO : DEBOUNCE/CHECK IF IT WAS LEO BODY !
    // console.log("onDocumentSaved", p_event.fileName);
  }

  private onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {
    if (p_event.affectsConfiguration('leoIntegration')) {
      this.treeKeepFocus = vscode.workspace.getConfiguration('leoIntegration').get('treeKeepFocus', false);
      this.treeKeepFocusAside = vscode.workspace.getConfiguration('leoIntegration').get('treeKeepFocusAside', false);
      this.treeInExplorer = vscode.workspace.getConfiguration('leoIntegration').get('treeInExplorer', false);
      vscode.commands.executeCommand('setContext', 'treeInExplorer', this.treeInExplorer);
      this.bodyEditDelay = vscode.workspace.getConfiguration('leoIntegration').get('bodyEditDelay', 500);
      this.connectionType = vscode.workspace.getConfiguration('leoIntegration').get('connectionType', "standard I/O");
      this.connectionPort = vscode.workspace.getConfiguration('leoIntegration').get('connectionPort', 80);
    }
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

  public arrayToLeoNodesArray(p_array: ArchivedPosition[]): LeoNode[] {
    const w_leoNodesArray: LeoNode[] = [];
    for (let w_apData of p_array) {
      const w_leoNode = this.apToLeoNode(w_apData);
      if (this.revealSelectedNode && w_apData.selected) { // * revealSelectedNode flag: Reveal, select and focus!
        const w_selectFlag = this.revealSelectedNode >= RevealType.RevealSelect; // at least RevealSelect
        const w_focusFlag = this.revealSelectedNode === RevealType.RevealSelectFocus;
        this.revealSelectedNode = RevealType.NoReveal; // ok reset
        if (!this.lastSelectedLeoNode) { // very first time
          this.lastSelectedLeoNode = w_leoNode;
        }
        setTimeout(() => {
          this.reveal(w_leoNode, { select: w_selectFlag, focus: w_focusFlag }); // dont use this.treeKeepFocus
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
      w_openedFileEnvUri = vscode.Uri.file("~"); // TODO : set as home folder properly, this doesn't work
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
    // ! console.log("Starting selectTreeNode");

    // TODO : Save and restore selection, and cursor position, from selection object saved in each node (or gnx array)

    const w_isAlreadySelected: boolean = (p_node === (this.lastSelectedLeoNode ? this.lastSelectedLeoNode : ""));
    if (w_isAlreadySelected) {
      // Just reopen
      this.showSelectedBodyDocument();
      return;
    }
    this.leoBridgeAction("setSelectedNode", p_node.apJson).then(() => {
      // ! console.log('Back from setSelectedNode in leo');
    });

    this.triggerBodySave(); // Trigger event to save previous document if timer to save if already started for another document

    // * don't wait for setSelectedNode promise to resolve
    this.lastSelectedLeoNode = p_node; // kept mostly in order to do refreshes if it changes, as opposed to a full tree refresh

    if (this.bodyTextDocument && !this.bodyTextDocument.isClosed) {

      this.bodySaveDocument(this.bodyTextDocument).then(p_result => {
        if (this.bodyTextDocument) { // Have to re-test inside .then, oh well
          this.bodyTextDocument.save().then((p_result) => {
            const w_edit = new vscode.WorkspaceEdit();
            w_edit.renameFile(
              this.bodyUri,
              vscode.Uri.parse("leo:/" + p_node.gnx),
              { overwrite: true, ignoreIfExists: true }
            );
            vscode.workspace.applyEdit(w_edit).then(p_result => {
              this.bodyUri = vscode.Uri.parse("leo:/" + p_node.gnx);
              this.showSelectedBodyDocument();
            });
          });
        }

      });

    } else {
      this.bodyUri = vscode.Uri.parse("leo:/" + p_node.gnx);
      this.showSelectedBodyDocument();
    }
  }

  public showSelectedBodyDocument(): Thenable<boolean> {
    let w_sameUri = false;
    vscode.window.visibleTextEditors.forEach(p_textEditor => {
      if (p_textEditor.document.uri.fsPath === this.bodyUri.fsPath) {
        w_sameUri = true;
        // * vscode.window.showTextDocument(p_textEditor.document); // DO NOT show?
        this.bodyTextDocument = p_textEditor.document; // TODO : Find a way to focus (only if wanted in options)
      }
    });
    if (w_sameUri) {
      return Promise.resolve(false);
    }
    return vscode.workspace.openTextDocument(this.bodyUri).then(p_document => {
      this.bodyTextDocument = p_document;
      return vscode.window.showTextDocument(this.bodyTextDocument, {
        viewColumn: 1, // TODO : try to make leftmost tab so it touches the outline pane
        preserveFocus: this.treeKeepFocus, // An optional flag that when true will stop the editor from taking focus
        preview: false // Should text document be in preview only? set false for fully opened
        // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
      }).then(w_bodyEditor => {
        // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
        // Other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
        return (true);
      });
    });
  }

  public showBodyDocumentAside(p_node: LeoNode): Thenable<boolean> {
    this.triggerBodySave(); // Trigger event to save previous document if timer to save if already started for another document
    const w_uri = vscode.Uri.parse("leo:/" + p_node.gnx);
    return vscode.workspace.openTextDocument(w_uri).then(p_document => {
      return vscode.window.showTextDocument(p_document, {
        viewColumn: vscode.ViewColumn.Beside, // TODO : try to make leftmost tab so it touches the outline pane
        preserveFocus: this.treeKeepFocusAside, // An optional flag that when true will stop the editor from taking focus
        preview: true // Should text document be in preview only? set false for fully opened
        // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
      }).then(w_bodyEditor => {
        // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
        // Other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
        return (true);
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
                // ! p_revealSelection flag needed because we voluntarily refreshed the automatic ID
                this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelectFocus); // refresh all, needed to get clones to refresh too!
              }
            );
          }
        }
      );
  }
  public mark(p_node: LeoNode): void {
    vscode.window.showInformationMessage(`mark on ${p_node.label}.`); // Temp placeholder
  }
  public unmark(p_node: LeoNode): void {
    vscode.window.showInformationMessage(`unmark on ${p_node.label}.`); // Temp placeholder
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

  public closeLeoFile(): void {
    vscode.window.showInformationMessage(`close leo file`); // Temp placeholder
  }

  public openLeoFile(): void {
    let w_returnMessage: string | undefined;
    if (!this.leoPythonProcess) {
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

              this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect); // p_revealSelection flag set

              // * set body URI for body filesystem
              this.bodyUri = vscode.Uri.parse("leo:/" + p_result.node.gnx);
              this.showSelectedBodyDocument().then(p_result => {
                vscode.commands.executeCommand('setContext', 'leoTreeOpened', true);
              });

              this.updateStatusBarItem();
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
    } else if (!!this.leoPythonProcess) { // unprocessed/unknown python output
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
      this.leoPythonProcess = undefined;
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
        this.reveal(this.apToLeoNode(p_answer.node), { select: true, focus: true });
      }
    );
    // * TEST : REFRESH ALL TREE NODES
    //  this.leoTreeDataProvider.refreshTreeRoot(true); // p_revealSelection flag set
  }
}
