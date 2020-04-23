import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { LeoBridgePackage, RevealType, ArchivedPosition, Icon, ConfigMembers } from "./types";
import { Config } from "./config";
import { LeoFiles } from "./leoFiles";
import { LeoNode } from "./leoNode";
import { LeoOutlineProvider } from "./leoOutline";
import { LeoBodyProvider } from "./leoBody";
import { LeoBridge } from "./leoBridge";
import { ServerService } from "./serverManager";
import { LeoStatusBar } from "./leoStatusBar";

export class LeoIntegration {

    // * Status Flags
    private _leoBridgeReady: boolean = false; // Used along with executeCommand 'setContext' with Constants.CONTEXT_FLAGS.BRIDGE_READY
    get leoBridgeReady(): boolean {
        return this._leoBridgeReady;
    }
    set leoBridgeReady(p_value: boolean) {
        this._leoBridgeReady = p_value;
        vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.BRIDGE_READY, p_value);
    }

    private _fileOpenedReady: boolean = false; // Used along with executeCommand 'setContext' with Constants.CONTEXT_FLAGS.TREE_OPENED
    get fileOpenedReady(): boolean {
        return this._fileOpenedReady;
    }
    set fileOpenedReady(p_value: boolean) {
        this._fileOpenedReady = p_value;
        vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.TREE_OPENED, p_value);
    }

    private _leoIsConnecting: boolean = false; // Used in connect method to prevent other attempts while already trying to connect
    private _leoBridgeReadyPromise: Promise<LeoBridgePackage> | undefined; // Set when leoBridge has a leo controller ready

    // * User action stack for non-tree-dependant commands fast entry
    private _commandStack: string[] = [];          // TODO : USE A COMMAND STACK TO CHAIN UP USER'S RAPID COMMANDS
    private _leoBridgeActionBusy: boolean = false; // TODO : USE A COMMAND STACK TO CHAIN UP USER'S RAPID COMMANDS
    // if command is non-tree-dependant, add it to the array's top and try to resolve bottom command.
    // if command is tree dependant: add to array and resolve only if empty. Otherwise show info message "Command already running"

    // * leoInteg Configuration Settings Service
    public config: Config; // Configuration service singleton also used in leoBridge, leoNode and leoSettingsWebview

    // * Icon Paths
    public icons: Icon[] = []; // Singleton static array of all icon paths used in leoNodes

    // * File Browser
    private _leoFilesBrowser: LeoFiles; // Dialog service singleton used in the openLeoFile method

    // * LeoBridge
    public leoBridge: LeoBridge; // Singleton service to access leobridgeserver, also used in LeoAsync, leoOutline and leoBody

    // * Outline Pane
    private _leoTreeDataProvider: LeoOutlineProvider; // TreeDataProvider single instance
    private _leoTreeStandaloneView: vscode.TreeView<LeoNode>; // Outline tree view added to the Tree View Container with an Activity Bar icon
    private _leoTreeExplorerView: vscode.TreeView<LeoNode>; // Outline tree view added to the Explorer Sidebar

    private _lastSelectedNode: LeoNode | undefined; // last selected node we got a hold of; leoTreeView.selection maybe newer and unprocessed
    private _nextNodeId: number = 1; // Used to generate id's for new treeNodes: The id is used to preserve or set the selection and expansion states

    // * Outline Pane redraw/refresh flag. Also set when calling refreshTreeRoot
    private _revealSelectedNode: RevealType = RevealType.NoReveal; // to be read/cleared in arrayToLeoNodesArray, to check if any should self-select

    // * Body Pane
    private _leoFileSystem: LeoBodyProvider; // as per https://code.visualstudio.com/api/extension-guides/virtual-documents#file-system-api
    private _bodyUri: vscode.Uri = vscode.Uri.parse(Constants.URI_SCHEME_HEADER); // properly initialized in openLeoFile(...)
    private _bodyTextDocument: vscode.TextDocument | undefined;

    private _bodyTextDocumentSameUri: boolean = false; // Flag used when checking if clicking a node requires opening a body pane text editor
    private _bodyMainSelectionColumn: vscode.ViewColumn | undefined;
    private _forceBodyFocus: boolean = false; // Flag used to force focus in body when next 'showing' of this body occurs (after edit headline if already selected)

    // * Log Pane
    private _leoLogPane: vscode.OutputChannel = vscode.window.createOutputChannel(Constants.GUI.LOG_PANE_TITLE); // Copy-pasted from leo's log pane

    // * Status Bar
    private _leoStatusBar: LeoStatusBar;

    // * Edit/Insert Headline Input Box options instance, setup so clicking outside cancels the headline change
    private _headlineInputOptions: vscode.InputBoxOptions = { ignoreFocusOut: false, value: "", valueSelection: undefined, prompt: "" };

    // * Automatic leobridgeserver startup management service
    private _serverService: ServerService;

    // * Timing
    private _bodyChangeTimeout: NodeJS.Timeout | undefined;
    private _bodyChangeTimeoutSkipped: boolean = false; // Used for instant tree node refresh trick
    private _lastBodyChangedRootRefreshedGnx: string = "";
    private _bodyLastChangedDocument: vscode.TextDocument | undefined;

    constructor(private _context: vscode.ExtensionContext) {
        // * Get configuration settings
        this.config = new Config(_context, this);
        this.config.getLeoIntegSettings();

        // * Build Icon filename paths
        this.icons = utils.buildIconPaths(_context);

        // * File Browser
        this._leoFilesBrowser = new LeoFiles(_context);

        // * Setup leoBridge
        this.leoBridge = new LeoBridge(_context, this);

        // * Same data provider for both outline trees, Leo view and Explorer view
        this._leoTreeDataProvider = new LeoOutlineProvider(this);

        // * Leo view outline panes
        this._leoTreeStandaloneView = vscode.window.createTreeView(Constants.TREEVIEW_ID, { showCollapseAll: false, treeDataProvider: this._leoTreeDataProvider });
        this._leoTreeStandaloneView.onDidChangeSelection((p_event => this._onTreeViewChangedSelection(p_event)));
        this._leoTreeStandaloneView.onDidExpandElement((p_event => this._onTreeViewExpandedElement(p_event)));
        this._leoTreeStandaloneView.onDidCollapseElement((p_event => this._onTreeViewCollapsedElement(p_event)));
        this._leoTreeStandaloneView.onDidChangeVisibility((p_event => this._onTreeViewVisibilityChanged(p_event, false))); // * Trigger 'show tree in Leo's view'

        // * Explorer view outline pane
        this._leoTreeExplorerView = vscode.window.createTreeView(Constants.TREEVIEW_EXPLORER_ID, { showCollapseAll: false, treeDataProvider: this._leoTreeDataProvider });
        this._leoTreeExplorerView.onDidChangeSelection((p_event => this._onTreeViewChangedSelection(p_event)));
        this._leoTreeExplorerView.onDidExpandElement((p_event => this._onTreeViewExpandedElement(p_event)));
        this._leoTreeExplorerView.onDidCollapseElement((p_event => this._onTreeViewCollapsedElement(p_event)));
        this._leoTreeExplorerView.onDidChangeVisibility((p_event => this._onTreeViewVisibilityChanged(p_event, true))); // * Trigger 'show tree in explorer view'

        // * Body Pane
        this._leoFileSystem = new LeoBodyProvider(this);
        this._bodyMainSelectionColumn = 1;
        // TODO : set workbench.editor.closeOnFileDelete to true

        // * Status bar: Show keyboard-Shortcut-Flag to signify Leo keyboard shortcuts are active
        this._leoStatusBar = new LeoStatusBar(_context, this);

        // * Automatic server start service
        this._serverService = new ServerService(_context);

        // * React to change in active panel/text editor (window.activeTextEditor) - also fires when the active editor becomes undefined
        vscode.window.onDidChangeActiveTextEditor(p_event => this._onActiveEditorChanged(p_event)); // TODO : handle deleted bodies
        // * other events
        vscode.window.onDidChangeTextEditorSelection(p_event => this._onChangeEditorSelection(p_event));
        vscode.window.onDidChangeTextEditorViewColumn(p_event => this._onChangeEditorViewColumn(p_event)); // TODO : handle deleted bodies
        vscode.window.onDidChangeVisibleTextEditors(p_event => this._onChangeVisibleEditors(p_event)); // TODO : handle deleted bodies
        vscode.window.onDidChangeWindowState(p_event => this._onChangeWindowState(p_event));

        // * React when typing and changing body pane
        vscode.workspace.onDidSaveTextDocument(p_event => this._onDocumentSaved(p_event)); // not used for now
        vscode.workspace.onDidChangeTextDocument(p_event => this._onDocumentChanged(p_event)); // * Detect when user types in body pane here

        // * React to configuration settings events
        vscode.workspace.onDidChangeConfiguration(p_event => this._onChangeConfiguration(p_event));
    }

    public startNetworkServices(): void {
        // * leoIntegration starting entry point: Start a leoBridge server and connect to it based on configuration flags
        // this.setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE_NOT_CONNECTED);
        this._setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // Vanilla title for use with welcome content
        // * (via settings) Start a server (and also connect automatically to a server upon extension activation)
        if (this.config.startServerAutomatically) {
            this.startServer();
        } else {
            // * (via settings) Connect to Leo Bridge server automatically without starting one first
            if (this.config.connectToServerAutomatically) {
                this.connect();
            }
        }
    }

    public startServer(): void {
        // * Starts an instance of a leoBridge server and connect to it if needed based on configuration flags
        this._serverService.startServer(this.config.leoPythonCommand)
            .then((p_message) => {
                vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.SERVER_STARTED, true); // server started
                if (this.config.connectToServerAutomatically) {
                    this.connect();
                }
            }, (p_reason) => {
                vscode.window.showErrorMessage(Constants.USER_MESSAGES.START_SERVER_ERROR + p_reason);
            });
    }

    public connect(): void {
        // * Initiate a connection to the leoBridge server, then show appropriate view title, the log pane, and set 'bridge ready' flags
        if (this.leoBridgeReady || this._leoIsConnecting) {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.ALREADY_CONNECTED);
            return;
        }
        this._leoIsConnecting = true;
        this._leoBridgeReadyPromise = this.leoBridge.initLeoProcess();
        this._leoBridgeReadyPromise.then(
            (p_package) => {
                this._leoIsConnecting = false;
                if (p_package.id !== 1) {
                    this.cancelConnect(Constants.USER_MESSAGES.CONNECT_ERROR);
                } else {
                    this.leoBridgeReady = true;
                    vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.BRIDGE_READY, true);
                    // this.setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE_CONNECTED);
                    this._setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // Vanilla title for use with welcome content
                    this.showLogPane();
                    if (!this.config.connectToServerAutomatically) {
                        vscode.window.showInformationMessage(Constants.USER_MESSAGES.CONNECTED);
                    }
                }
            },
            (p_reason) => {
                this._leoIsConnecting = false;
                this.cancelConnect(Constants.USER_MESSAGES.CONNECT_FAILED);
            });
    }

    public cancelConnect(p_message?: string): void {
        // * Also called from leoBridge.ts when its websocket reports disconnection
        if (this.leoBridgeReady) {
            // * Real disconnect error versus a simple 'failed to connect'
            vscode.window.showErrorMessage(p_message ? p_message : Constants.USER_MESSAGES.DISCONNECTED);
            vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.DISCONNECTED, true);
        } else {
            vscode.window.showInformationMessage(p_message ? p_message : Constants.USER_MESSAGES.DISCONNECTED);
        }
        // this.setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE_NOT_CONNECTED);
        this._setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // Vanilla title for use with welcome content
        this.fileOpenedReady = false;
        this.leoBridgeReady = false;
        this._leoBridgeReadyPromise = undefined;
        this._leoStatusBar.update(false);
        this._refreshOutline(RevealType.RevealSelect);
    }

    public sendConfigToServer(p_config: ConfigMembers): void {
        // * Send configuration through leoBridge to the server script, mostly used when checking if refreshing derived files is optional
        if (this.fileOpenedReady) {
            this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.APPLY_CONFIG, JSON.stringify(p_config)).then(p_package => {
                // console.log("back from applying configuration to leobridgeserver.py");
            });
        }
    }

    private _onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {
        // * vscode.workspace.onDidChangeConfiguration trigger handling
        if (p_event.affectsConfiguration(Constants.CONFIGURATION_SECTION)) {
            // console.log('Detected Change of vscode config in leoIntegration !');
            this.config.getLeoIntegSettings();
        }
    }

    private _onTreeViewChangedSelection(p_event: vscode.TreeViewSelectionChangeEvent<LeoNode>): void {
        // * treeView onDidChangeSelection trigger handling
        // ! We capture and act upon the the 'select node' command, so this event may be redundant for now
        // console.log("treeViewChangedSelection, selection length:", p_event.selection.length);
    }
    private _onTreeViewExpandedElement(p_event: vscode.TreeViewExpansionEvent<LeoNode>): void {
        // * May reveal nodes, but this event occurs *after* the getChildren event from the tree provider, so not useful to interfere in it.
        this.selectTreeNode(p_event.element, true); // * select node when expanding to mimic Leo
        this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.EXPAND_NODE, p_event.element.apJson);
        // don't wait
        // this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
        this._refreshNode(p_event.element);
    }
    private _onTreeViewCollapsedElement(p_event: vscode.TreeViewExpansionEvent<LeoNode>): void {
        this.selectTreeNode(p_event.element, true); // * select node when expanding to mimic Leo
        this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.COLLAPSE_NODE, p_event.element.apJson);
        // don't wait
        // this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
        this._refreshNode(p_event.element);
    }

    private _onTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        // *
        if (p_explorerView) {
            // (Facultative) Do something different if explorerView vs standalone outline pane
            // pass
        }
        if (p_event.visible && this._lastSelectedNode) {

            // ! NO REVEAL NOT GOOD IF USING DIFFERENT IDS - WILL NOT KEEP SELECTION/COLLAPSE STATE
            // this.leoTreeDataProvider.refreshTreeRoot(RevealType.NoReveal);
            this._refreshOutline(RevealType.RevealSelect);

            /*  setTimeout(() => {
                    this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);

                    // this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.GET_SELECTED_NODE).then(
                    //     (p_answer: LeoBridgePackage) => {
                    //         const w_node = this.apToLeoNode(p_answer.node);
                    //         this.reveal(w_node, { select: false, focus: false }).then(() => {
                    //             this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
                    //         });
                    //     }
                    // );

                }, 0); */
        }
    }

    private _onActiveEditorChanged(p_event: vscode.TextEditor | undefined, p_internalCall?: boolean): void {
        // * Active editor should be reflected in the outline if it's a leo body pane
        if (!p_internalCall) {
            this._triggerBodySave(); // Save in case edits were pending
        }
        // selecting another editor of the same window by the tab
        // * Status flag check
        if (!p_event && this._leoStatusBar.leoObjectSelected) {
            return;
        }

        // TODO : MIMIC LEO
        // TODO : FIX UNUSED CYCLING

        // * Close and return if deleted
        if (p_event && p_event.document.uri.scheme === Constants.URI_SCHEME) {
            const w_editorGnx: string = p_event.document.uri.fsPath.substr(1);
            // If already deleted and not closed: just close it and return!
            if (!this._leoFileSystem.isGnxValid(w_editorGnx)) {
                vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.CLOSE_ACTIVE_EDITOR)
                    .then(() => {
                        console.log('got back from "closeActiveEditor" EDITOR HAD CHANGED TO A DELETED GNX!');
                    });
                return;
            }
            // * Reveal in outline tree if needed
            // const w_node: LeoNode | undefined = this._leoTextDocumentNodesRef[w_editorGnx] ? this._leoTextDocumentNodesRef[w_editorGnx].node : undefined;

            // if (w_node && this._lastSelectedLeoNode && (this._lastSelectedLeoNode.gnx !== w_node.gnx)) {
            //     // * setSelectedNode will also try to find by gnx if node doesn't exit and returns what it could select

            //     this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.SET_SELECTED_NODE, w_node.apJson).then((p_answer: LeoBridgePackage) => {
            //         const p_selectedNode = this.apToLeoNode(p_answer.node);

            //         this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
            //         // this.reveal(p_selectedNode, { select: false, focus: false }).then(() => {
            //         //     this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
            //         // });

            //         this._lastSelectedLeoNode = p_selectedNode;

            //     });
            // }
        } else {
            // Delayed
            setTimeout(() => {
                this._closeExpiredActiveEditors();
            }, 0);
        }
        // * Status flag check
        if (vscode.window.activeTextEditor) {
            this._leoStatusBar.update(vscode.window.activeTextEditor.document.uri.scheme === Constants.URI_SCHEME);
        }
    }

    private _onChangeEditorSelection(p_event: vscode.TextEditorSelectionChangeEvent): void {
        // * The selection in an editor has changed. - just refresh the statusBar for now

        // TODO : MIMIC LEO
        // TODO : FIX UNUSED CYCLING

        // * Status flag check
        if (vscode.window.activeTextEditor) {
            // Yes an editor is active, just check if its leo scheme
            this._leoStatusBar.update(
                (p_event.textEditor.document.uri.scheme === Constants.URI_SCHEME) && (vscode.window.activeTextEditor.document.uri.scheme === Constants.URI_SCHEME),
                200
            );
        }
    }

    // * The view column of an editor has changed (when shifting editors through closing/inserting editors or closing columns)
    // * No effect when dragging editor tabs: it just closes and reopens in other column, see '_onChangeVisibleEditors'
    private _onChangeEditorViewColumn(p_event: vscode.TextEditorViewColumnChangeEvent): void { }

    // * Triggers when a different text editor in any column, either tab or body, is focused
    // * This is also what triggers after drag and drop, see '_onChangeEditorViewColumn'
    private _onChangeVisibleEditors(p_event: vscode.TextEditor[]): void { }

    // * Triggers when a vscode window have gained or lost focus
    private _onChangeWindowState(p_event: vscode.WindowState): void { }

    // * Edited and saved the document, does it on any document in editor
    private _onDocumentSaved(p_event: vscode.TextDocument): void { }

    private _onDocumentChanged(p_event: vscode.TextDocumentChangeEvent): void {
        // * Edited the document: ".length" check necessary, see https://github.com/microsoft/vscode/issues/50344
        if ((p_event.document.uri.scheme === Constants.URI_SCHEME) && p_event.contentChanges.length) {
            // * First, check if there's a document already pending changes, and if it's a different one: 'force save' it!
            if (this._bodyLastChangedDocument && (p_event.document.uri.fsPath !== this._bodyLastChangedDocument.uri.fsPath)) {
                // console.log('Switched Node while waiting edit debounce!');
                this._triggerBodySave(true); //Set p_forcedRefresh flag, this will also have cleared timeout
            }
            // * Second, the 'Instant tree node refresh trick' : If icon should change then do it now (if there's no document edit pending)
            if (!this._bodyChangeTimeout && !this._bodyChangeTimeoutSkipped) {
                if (this._lastSelectedNode && p_event.document.uri.fsPath.substr(1) === this._lastSelectedNode.gnx) {
                    if (!this._lastSelectedNode.dirty || (this._lastSelectedNode.hasBody === !p_event.document.getText().length)) {
                        // console.log('NO WAIT');
                        this._bodyChangeTimeoutSkipped = true;
                        this.bodySaveDocument(p_event.document, true);
                        return; // * Don't continue
                    }
                }
            }
            // * Third, finally, if still not exited this function, setup a 500ms debounced _triggerBodySave / bodySaveDocument
            // TODO : FIX SAVE ON WINDOWS WHEN CHANGING/SETTING SELECTED NODE
            this._bodyChangeTimeoutSkipped = false;
            let w_delay = this.config.bodyEditDelay; // debounce by restarting the timeout
            if (this._bodyChangeTimeout) {
                clearTimeout(this._bodyChangeTimeout);
            }
            this._bodyLastChangedDocument = p_event.document; // setup trigger
            this._bodyChangeTimeout = setTimeout(() => {
                this._triggerBodySave(); // no .then for clearing timer, done in trigger instead
            }, w_delay);
        }
    }

    private _triggerBodySave(p_forcedRefresh?: boolean): Thenable<boolean> {
        // * Clear possible timeout if triggered by event from other than 'onDocumentChanged'
        if (this._bodyChangeTimeout) {
            clearTimeout(this._bodyChangeTimeout);
        }
        this._bodyChangeTimeout = undefined; // make falsy
        // * Send body to Leo
        if (this._bodyLastChangedDocument) {
            const w_document = this._bodyLastChangedDocument; // backup for bodySaveDocument before reset
            this._bodyLastChangedDocument = undefined; // reset to make falsy
            if (this._lastBodyChangedRootRefreshedGnx !== w_document.uri.fsPath.substr(1)) {
                p_forcedRefresh = true;
            }
            return this.bodySaveDocument(w_document, p_forcedRefresh);
        } else {
            return Promise.resolve(true);
        }
    }

    public bodySaveDocument(p_document: vscode.TextDocument, p_forceRefreshTree?: boolean): Thenable<boolean> {
        // * Sets new body text of currently selected node on leo's side (test: ALSO SAVE leo scheme file)
        if (p_document && (p_document.isDirty || p_forceRefreshTree)) {
            // * Fetch gnx and document's body text first, to be reused more than once in this method
            const w_param = {
                gnx: p_document.uri.fsPath.substr(1), // uri.fsPath.substr(1),
                body: p_document.getText()
            };
            // * Setup refresh if dirtied or filled/emptied
            let w_needsRefresh = false;
            if (this._lastSelectedNode && (w_param.gnx === this._lastSelectedNode.gnx)) {
                if (!this._lastSelectedNode.dirty || (this._lastSelectedNode.hasBody === !w_param.body.length)) {
                    w_needsRefresh = true;
                    this._lastSelectedNode.dirty = true;
                    this._lastSelectedNode.hasBody = !!w_param.body.length;
                }
            }
            // * Maybe it was an 'aside' body pane, if so, force a full refresh
            // ! no longer true if single body opened at a time
            // if (this._lastSelectedLeoNode && (w_param.gnx !== this._lastSelectedLeoNode.gnx)) {
            //     w_needsRefresh = true;
            // }

            // * Perform refresh if needed
            // TODO : CHECK IF REFRESH IS APPROPRIATE
            if (p_forceRefreshTree || (w_needsRefresh && this._lastSelectedNode)) {
                // console.log(p_forceRefreshTree ? 'force refresh' : 'needed refresh');
                // * Refresh root because of need to dirty parent if in derived file or a clone

                // ! NO REVEAL NOT GOOD IF USING DIFFERENT IDS - WILL NOT KEEP SELECTION/COLLAPSE STATE
                // this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect); // No focus this.leoTreeDataProvider.refreshTreeRoot
                this._refreshOutline(RevealType.NoReveal); // Test for id preservation

                this._lastBodyChangedRootRefreshedGnx = w_param.gnx;
            }
            this._bodyChangeTimeoutSkipped = false;
            return this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.SET_BODY, JSON.stringify(w_param)).then(p_result => {
                // console.log('Back from setBody to leo');
                // return p_document.save(); // ! This trims trailing spaces!
                return Promise.resolve(p_document.isDirty);
            });
        } else {
            return Promise.resolve(false);
        }
    }

    // private _setLeoTextDocumentNodesRef(p_gnx: string, p_leoNode: LeoNode, p_isSelected: boolean): void {

    //     // TODO : MIMIC LEO
    //     // TODO : MAY BE UNUSED IF ONLY ONE GNX AT A TIME

    //     if (this._leoTextDocumentNodesRef[p_gnx]) {
    //         if (p_isSelected) {
    //             // console.log('got selected');
    //             this._leoTextDocumentNodesRef[p_gnx].node = p_leoNode;
    //             this._leoTextDocumentNodesRef[p_gnx].refreshCount = this.outlineRefreshCount;
    //         } else if (this._lastOperationChangedTree && this._leoTextDocumentNodesRef[p_gnx].refreshCount < this.outlineRefreshCount) {
    //             // * keep original outlineRefreshCount
    //             this._leoTextDocumentNodesRef[p_gnx].node = p_leoNode;
    //         } else {
    //             // console.log('prevented');
    //         }
    //     }
    // }

    private _refreshOutline(p_revealType?: RevealType): void {
        if (p_revealType) { // To check if selected node should self-select while redrawing whole tree
            this._revealSelectedNode = p_revealType; // To be read/cleared (in arrayToLeoNodesArray instead of directly by nodes)
        }
        this._leoTreeDataProvider.refreshTreeRoot();
    }
    private _refreshNode(p_node: LeoNode): void {
        this._leoTreeDataProvider.refreshTreeNode(p_node);
    }

    public apToLeoNode(p_ap: ArchivedPosition): LeoNode {
        // * Converts an archived position object to a LeoNode instance
        let w_collapse: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
        if (p_ap.hasChildren) {
            w_collapse = p_ap.expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
        }
        const w_leoNode = new LeoNode(
            p_ap.headline,          // label-headline
            p_ap.gnx,               // gnx
            w_collapse,             // collapsibleState
            JSON.stringify(p_ap),   // string key for leo/python side of things
            p_ap.childIndex,        // childIndex
            !!p_ap.cloned,          // cloned
            !!p_ap.dirty,           // dirty
            !!p_ap.marked,          // marked
            !!p_ap.atFile,          // atFile
            !!p_ap.hasBody,         // hasBody
            this,                   //  _leoIntegration pointer
            // If there's no reveal and its the selected node re-use the old id
            (!this._revealSelectedNode && p_ap.selected && this._lastSelectedNode) ? this._lastSelectedNode.id : (++this._nextNodeId).toString()
        );
        return w_leoNode;
    }

    private _revealConvertedNode(p_leoNode: LeoNode): void {
        // * Reveals a node in the outline. Select and focus if needed.

        // First setup flags for selecting and focusing based on the current reveal type needed
        const w_selectFlag = this._revealSelectedNode >= RevealType.RevealSelect; // at least RevealSelect
        let w_focusFlag = this._revealSelectedNode >= RevealType.RevealSelectFocus;  // at least RevealSelectFocus
        if (this._revealSelectedNode === RevealType.RevealSelectShowBody) {
            w_focusFlag = false;
        }
        const w_showBodyFlag = this._revealSelectedNode >= RevealType.RevealSelectFocusShowBody; // at least RevealSelectFocusShowBody

        // Flags are setup so now reveal, select and / or focus as needed
        this._revealSelectedNode = RevealType.NoReveal; // ok reset
        if (!this._lastSelectedNode && this._revealSelectedNode < RevealType.RevealSelectFocusShowBody) { // very first time
            this._lastSelectedNode = p_leoNode;
        }
        setTimeout(() => {
            // don't use this.treeKeepFocus
            this.reveal(p_leoNode, { select: w_selectFlag, focus: w_focusFlag })
                .then(() => {
                    console.log('did this ask for parent?', p_leoNode.id, p_leoNode.label); // ! debug

                    if (w_showBodyFlag) {
                        this.selectTreeNode(p_leoNode, true);
                    }
                });
        }, 0);
    }

    public arrayToLeoNodesArray(p_array: ArchivedPosition[]): LeoNode[] {
        // * Converts an array of 'ap' to an array of leoNodes
        // * This is used in 'getChildren' of leoOutline.ts
        const w_leoNodesArray: LeoNode[] = [];
        for (let w_apData of p_array) {
            const w_leoNode = this.apToLeoNode(w_apData);
            if (this._revealSelectedNode && w_apData.selected) {
                this._revealConvertedNode(w_leoNode);
            }
            // this._revealConvertedNode(w_leoNode, w_apData.selected);
            w_leoNodesArray.push(w_leoNode);
        }
        return w_leoNodesArray;
    }

    private _locateOpenedBody(p_gnx: string): boolean {

        // TODO : MIMIC LEO
        // TODO : MAY BE UNUSED IF ONLY ONE GNX AT A TIME

        this._bodyTextDocumentSameUri = false;
        // * Only gets to visible editors, not every tab per editor
        // TODO : fix with newer vscode API or eamodio's hack
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (p_textEditor.document.uri.fsPath.substr(1) === p_gnx) {
                this._bodyTextDocumentSameUri = true;
                this._bodyMainSelectionColumn = p_textEditor.viewColumn;
                this._bodyTextDocument = p_textEditor.document;
            }
        });
        return this._bodyTextDocumentSameUri;
    }

    public reveal(p_leoNode: LeoNode, p_options?: { select?: boolean, focus?: boolean, expand?: boolean | number }): Thenable<void> {
        //* 'TreeView.reveal' for any opened leo outline
        if (this._leoTreeStandaloneView.visible) {
            return this._leoTreeStandaloneView.reveal(p_leoNode, p_options);
        }
        if (this._leoTreeExplorerView.visible && this.config.treeInExplorer) {
            return this._leoTreeExplorerView.reveal(p_leoNode, p_options);
        }
        // * Defaults to resolving even if both are hidden
        return Promise.resolve();
    }

    public selectTreeNode(p_node: LeoNode, p_internalCall?: boolean, p_aside?: boolean): Thenable<boolean> {
        // * User has selected a node via mouse click or 'enter' keypress in the outline, otherwise flag p_internalCall if used internally
        if (!p_internalCall) {
            this._leoStatusBar.update(true); // Just selected a node
        }

        // TODO : Save and restore selection, along with cursor position, from selection object saved in each node (or gnx array)

        // * First check if having already this exact node selected
        if (p_node === this._lastSelectedNode) {
            // same so just find and reopen
            this._locateOpenedBody(p_node.gnx);
            return this.showBody(p_aside);
        }

        // * Set selected node in Leo via leoBridge
        this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.SET_SELECTED_NODE, p_node.apJson);

        // * don't wait for promise to resolve a selection because there's no tree structure change
        this._triggerBodySave(); // trigger event to save previous document if timer to save if already started for another document

        this._lastSelectedNode = p_node; // kept mostly in order to do refreshes if it changes, as opposed to a full tree refresh
        vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.SELECTED_MARKED, this._lastSelectedNode.marked);

        if (this._bodyTextDocument && !this._bodyTextDocument.isClosed) {

            // locateOpenedBody checks if already opened and visible,
            // locateOpenedBody also sets bodyTextDocumentSameUri, bodyMainSelectionColumn, bodyTextDocument
            this._locateOpenedBody(p_node.gnx);

            // * Save body to leo for the bodyTextDocument, then check if already opened, if not save and rename to clear undo buffer
            return this.bodySaveDocument(this._bodyTextDocument).then(p_result => {
                if (this._bodyTextDocument) { // have to re-test inside .then, oh well

                    if (this._bodyTextDocumentSameUri) {
                        this._bodyUri = vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_node.gnx);
                        return this.showBody(p_aside); // already opened in a column so just tell vscode to show it
                    } else {
                        return this._bodyTextDocument.save().then((p_result) => {
                            const w_edit = new vscode.WorkspaceEdit();
                            w_edit.renameFile(
                                this._bodyUri,
                                vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_node.gnx),
                                { overwrite: true, ignoreIfExists: true }
                            );
                            // * Rename file operation to clear undo buffer
                            return vscode.workspace.applyEdit(w_edit).then(p_result => {
                                this._bodyUri = vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_node.gnx);
                                return this.showBody(p_aside);
                            });
                        });
                    }

                } else {
                    return Promise.resolve(true);
                }

            });

        } else {
            this._bodyUri = vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_node.gnx);
            return this.showBody(p_aside);
        }
    }

    public showBody(p_aside: boolean | undefined): Thenable<boolean> {
        // * Make sure not to open unnecessary TextEditors
        return vscode.workspace.openTextDocument(this._bodyUri).then(p_document => {

            // TODO : MIMIC LEO
            // TODO : FIX IF ONLY ONE GNX AT A TIME

            // if (this._lastSelectedLeoNode) {
            //     // set entry of leoNodes Ref : leoTextDocumentNodesRef
            //     // (used when showing a body text, to force selection of node when editor tabs are switched)
            //     if (this._leoTextDocumentNodesRef[p_document.uri.fsPath.substr(1)]) {
            //         if (this._leoTextDocumentNodesRef[p_document.uri.fsPath.substr(1)].refreshCount < this.outlineRefreshCount) {
            //             this._leoTextDocumentNodesRef[p_document.uri.fsPath.substr(1)].node = this._lastSelectedLeoNode;
            //         }
            //     } else {
            //         this._leoTextDocumentNodesRef[p_document.uri.fsPath.substr(1)] = {
            //             node: this._lastSelectedLeoNode,
            //             refreshCount: this.outlineRefreshCount
            //         };
            //     }
            // }
            this._bodyTextDocument = p_document;

            vscode.window.visibleTextEditors.forEach(p_textEditor => {
                if (p_textEditor.document.uri.fsPath === p_document.uri.fsPath) {
                    // console.log('new selection found last second!: ', p_textEditor.viewColumn);
                    this._bodyMainSelectionColumn = p_textEditor.viewColumn;
                    this._bodyTextDocument = p_textEditor.document;
                }
            });
            const w_keepFocus = this._forceBodyFocus ? false : this.config.treeKeepFocus;
            if (this._forceBodyFocus) {
                this._forceBodyFocus = false; // Reset this single-use flag
            }
            if (p_aside) {
                return vscode.window.showTextDocument(this._bodyTextDocument, {
                    viewColumn: vscode.ViewColumn.Beside,
                    preserveFocus: this.config.treeKeepFocusWhenAside, // an optional flag that when true will stop the editor from taking focus
                    preview: true // should text document be in preview only? set false for fully opened
                    // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
                }).then(w_bodyEditor => {
                    // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
                    // other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
                    return Promise.resolve(true);
                });
            } else {
                return vscode.window.showTextDocument(this._bodyTextDocument, {
                    viewColumn: this._bodyMainSelectionColumn ? this._bodyMainSelectionColumn : 1,
                    preserveFocus: w_keepFocus, // an optional flag that when true will stop the editor from taking focus
                    preview: false // should text document be in preview only? set false for fully opened
                    // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
                }).then(w_bodyEditor => {
                    // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
                    // other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
                    return Promise.resolve(true);
                });
            }
        });
    }

    /*     public showBodyDocumentAside(p_node: LeoNode, p_internalCall?: boolean | undefined): Thenable<boolean> {
            // ! Unused - replaced by new parameter p_aside in selectTreeNode
            // * User has right-clicked a node and chosen 'open aside' in the context menu
            // otherwise flag p_internalCall if used internally
            if (!p_internalCall) {
                this._lastOperationChangedTree = false;
                // TODO
                // ! FIX THIS
                // this.selectTreeNode(p_node, true); // * select node when expanding to mimic Leo
                // this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
            }

            // Trigger event to save previous document just in in case (if timer to save is already started for another document)
            this._triggerBodySave();
            this._leoTextDocumentNodesRef[p_node.gnx] = {
                node: p_node,
                refreshCount: this.outlineRefreshCount
            };

            return vscode.workspace.openTextDocument(vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_node.gnx)).then(p_document => {
                if (!this.config.treeKeepFocusWhenAside) {
                    this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.SET_SELECTED_NODE, p_node.apJson).then((p_answer: LeoBridgePackage) => {
                        const p_selectedNode = this.apToLeoNode(p_answer.node);

                        if (this._leoTextDocumentNodesRef[p_node.gnx]) {
                            this._leoTextDocumentNodesRef[p_node.gnx].node = p_selectedNode;
                        } else {
                            this._leoTextDocumentNodesRef[p_node.gnx] = {
                                node: p_selectedNode,
                                refreshCount: this.outlineRefreshCount
                            };
                        }
                        this.reveal(p_selectedNode, { select: true, focus: false });
                    });
                }
                return vscode.window.showTextDocument(p_document, {
                    viewColumn: vscode.ViewColumn.Beside,
                    preserveFocus: this.config.treeKeepFocusWhenAside, // an optional flag that when true will stop the editor from taking focus
                    preview: true // should text document be in preview only? set false for fully opened
                    // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
                }).then(w_bodyEditor => {
                    // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
                    // other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
                    return Promise.resolve(true);
                });
            });
        } */

    public focusBodyIfVisible(p_gnx: string): Thenable<boolean> {
        let w_found: undefined | vscode.TextEditor;
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (!w_found && (p_textEditor.document.uri.fsPath.substr(1) === p_gnx)) {
                w_found = p_textEditor;
            }
        });
        if (w_found) {
            return vscode.window.showTextDocument(w_found.document, {
                viewColumn: w_found.viewColumn,
                preserveFocus: false, // an optional flag that when true will stop the editor from taking focus
                preview: false // should text document be in preview only? set false for fully opened
                // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
            }).then(w_bodyEditor => {
                // console.log('focusBodyIfVisible in column: ', w_bodyEditor.viewColumn);
                // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
                // other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
                return Promise.resolve(true);
            });
        } else {
            return Promise.resolve(false);
        }
    }

    private _closeExpiredActiveEditors(): Thenable<boolean> {
        // * Cycle visible editors to close any that are expired

        // TODO : MIMIC LEO
        // TODO : MAY BE UNUSED IF ONLY ONE GNX AT A TIME

        let w_hasClosed: boolean = false;
        if (vscode.window.visibleTextEditors.length) {
            vscode.window.visibleTextEditors.forEach(p_visibleEditor => {
                if (p_visibleEditor.document.uri.scheme === Constants.URI_SCHEME) {
                    const w_editorGnx: string = p_visibleEditor.document.uri.fsPath.substr(1);
                    if (!this._leoFileSystem.isGnxValid(w_editorGnx)) {
                        w_hasClosed = true;
                        p_visibleEditor.hide(); // ! Might be deprecated on next vscode's major revision
                        // vscode.commands.executeCommand('workbench.action.closeActiveEditor')
                        //     .then(() => {
                        //         console.log('got back from "closeActiveEditor" EDITOR HAD CHANGED TO A DELETED GNX!');
                        //     });
                    }
                }
            });
        }
        return Promise.resolve(w_hasClosed);
    }

    public refreshOutlineAndBody(): void {
        // TODO : Fix this process ! Same as test ?
        this._refreshOutline(RevealType.RevealSelectFocusShowBody);
        this._leoFileSystem.fireRefreshFiles();
    }

    // * Standalone Commands:
    // - editHeadline, insertNode

    public nodeAction(p_action: string, p_node?: LeoNode): Promise<LeoBridgePackage> {
        // * For actions that need no tree/body refreshes at all
        // - saveLeoFile, copyNode, copyNodeSelection
        if (!p_node && this._lastSelectedNode) {
            p_node = this._lastSelectedNode;
        }
        if (p_node) {
            return this.leoBridge.action(p_action, p_node.apJson).then(p_package => {
                return Promise.resolve(p_package);
            });
        } else {
            return Promise.resolve({ id: 0 });
        }
    }

    public nodeActionRefresh(p_action: string, p_node?: LeoNode, p_revealType?: RevealType | undefined): Promise<LeoBridgePackage> {
        // * For actions that do not need full bodies gnx list to refresh (moving, renaming nodes)
        // - mark, unmark, refreshFromDiskNode, contractAll
        // - move, clone, promote, demote
        // - sortChildren, sortSibling
        return this.nodeAction(p_action, p_node)
            .then((p_package: LeoBridgePackage) => {
                if (p_package.id > 0) {
                    this._refreshOutline(p_revealType); // refresh all outline, needed to get clones to refresh too!
                }
                return Promise.resolve(p_package);
            });
    }

    public leoBridgeActionAndFullRefresh(p_action: string, p_node?: LeoNode, p_refreshBodyContent?: boolean): void {
        // * For actions that may delete or add nodes so that bodies gnx list need refreshing
        // * Perform action on node and close bodies of removed nodes, if any
        // - cut, paste, pasteClone, delete
        // - undo, redo, execute
        // TODO : REDO COMPLETELY : NO MORE DELETE NODES / JUST SAVE & RENAME LIKE A SELECT IF NEW SELECTION
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! leoBridgeActionAndFullRefresh: ' + p_action);
        } else {
            if (!p_node && this._lastSelectedNode) {
                p_node = this._lastSelectedNode;
            }
            if (p_node) {
                this._leoBridgeActionBusy = true;
                // start by finishing any pending edits by triggering body save
                this._triggerBodySave()
                    .then(p_saveResult => {
                        return this.leoBridge.action(p_action, p_node!.apJson); // p_node was just checked
                    })
                    .then(p_package => {
                        // this.bodyUri = vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_package.node.gnx); // ! don't showSelectedBodyDocument yet
                        return this._leoFileSystem.getExpiredGnxList();
                    })
                    .then(p_expiredList => {
                        p_expiredList.forEach(p_expiredGnx => {
                            // console.log('expired list item gnx: ', p_expiredGnx);
                            vscode.workspace.fs.delete(vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_expiredGnx));
                        });
                        // console.log('done calling delete on all expired gnx still opened');
                        // return this._documentManager.closeExpired(p_expiredList);
                        return this._closeExpiredActiveEditors();
                    })
                    .then(p_docResult => {
                        // console.log('Back from doc manager', p_docResult);
                        // With any remaining opened text editors watched:
                        return this._leoFileSystem.getRemainingWatchedGnxList();
                    })
                    .then((p_remainingGnxList) => {
                        // console.log('Back from get remaining Gnx List', p_remainingGnxList);
                        if (p_refreshBodyContent) {
                            this._leoFileSystem.fireRefreshFiles(); // watched files may have changed their content
                        }
                        let w_located: boolean | string = false;
                        p_remainingGnxList.forEach(p_remainingGnx => {
                            if (!w_located && this._locateOpenedBody(p_remainingGnx)) {
                                w_located = p_remainingGnx;
                            }
                        });
                        return Promise.resolve(w_located);
                    })
                    .then(p_locatedResult => {
                        console.log('Back from locate (false if not found):', p_locatedResult);
                        // * If this.lastSelectedLeoNode is undefined it will be set by arrayToLeoNodesArray when refreshing tree root
                        this._refreshOutline(RevealType.RevealSelectFocusShowBody); // ! finish by refreshing the tree and selecting the node
                        this._leoBridgeActionBusy = false;
                    });
            }
        }
    }

    public editHeadline(p_node?: LeoNode, p_isSelectedNode?: boolean) {
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! editHeadline');
        } else {
            if (!p_node && this._lastSelectedNode) {
                p_node = this._lastSelectedNode;
            }
            if (p_node) {
                if (!p_isSelectedNode && p_node === this._lastSelectedNode) {
                    p_isSelectedNode = true;
                }
                this._leoBridgeActionBusy = true;
                this._headlineInputOptions.prompt = Constants.USER_MESSAGES.PROMPT_EDIT_HEADLINE;
                this._headlineInputOptions.value = p_node.label; // preset input pop up
                vscode.window.showInputBox(this._headlineInputOptions)
                    .then(p_newHeadline => {
                        if (p_newHeadline) {
                            p_node!.label = p_newHeadline; // ! When labels change, ids will change and that selection and expansion state cannot be kept stable anymore.
                            this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.SET_HEADLINE, utils.buildHeadlineJson(p_node!.apJson, p_newHeadline))
                                .then((p_answer: LeoBridgePackage) => {
                                    if (p_isSelectedNode) {
                                        this._forceBodyFocus = true;
                                    }
                                    // ! p_revealSelection flag needed because we voluntarily refreshed the automatic ID
                                    this._refreshOutline(p_isSelectedNode ? RevealType.RevealSelect : RevealType.RevealSelectFocus); // refresh all, needed to get clones to refresh too!
                                    // focus on body pane
                                    // if (p_isSelectedNode) {
                                    //     this.focusBodyIfVisible(p_node.gnx);
                                    // }
                                    this._leoBridgeActionBusy = false;
                                });
                        } else {
                            if (p_isSelectedNode) {
                                this.focusBodyIfVisible(p_node!.gnx);
                            }
                            this._leoBridgeActionBusy = false;
                        }
                    });
            }
        }
    }

    public changeMark(p_isMark: boolean, p_node?: LeoNode): void {
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! changeMark');
        } else {
            this._leoBridgeActionBusy = true;
            this.nodeActionRefresh(p_isMark ? Constants.LEOBRIDGE_ACTIONS.MARK_PNODE : Constants.LEOBRIDGE_ACTIONS.UNMARK_PNODE, p_node)
                .then(() => {
                    this._leoBridgeActionBusy = false;
                });
            vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.SELECTED_MARKED, p_isMark);
        }
    }

    public insertNode(p_node?: LeoNode): void {
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! insert');
        } else {
            if (!p_node && this._lastSelectedNode) {
                p_node = this._lastSelectedNode;
            }
            if (p_node) {
                const w_node = p_node; // ref for .then
                // * New way of doing inserts: Show the input headline box, then either create the new node with the input, or with "New Headline" if canceled
                this._leoBridgeActionBusy = true;
                this._headlineInputOptions.prompt = Constants.USER_MESSAGES.PROMPT_INSERT_NODE;
                this._headlineInputOptions.value = Constants.USER_MESSAGES.DEFAULT_HEADLINE;
                vscode.window.showInputBox(this._headlineInputOptions)
                    .then(p_newHeadline => {
                        const w_action = p_newHeadline ? Constants.LEOBRIDGE_ACTIONS.INSERT_NAMED_PNODE : Constants.LEOBRIDGE_ACTIONS.INSERT_PNODE;
                        const w_para = p_newHeadline ? utils.buildHeadlineJson(w_node!.apJson, p_newHeadline) : w_node.apJson;
                        this.leoBridge.action(w_action, w_para)
                            .then(p_package => {
                                this._leoFileSystem.addGnx(p_package.node.gnx);
                                this._forceBodyFocus = true;
                                this._refreshOutline(RevealType.RevealSelectShowBody); // refresh all, needed to get clones to refresh too!
                                // this.focusBodyIfVisible(p_package.node.gnx);
                                this._leoBridgeActionBusy = false;
                            });
                    });
            }
        }
    }

    public showLogPane(): void {
        this._leoLogPane.show(true);
    }

    public refreshFromDiskNode(p_node?: LeoNode): void {
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! refreshFromDiskNode ');
        } else {
            this._leoBridgeActionBusy = true;
            this.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.REFRESH_FROM_DISK_PNODE, p_node, RevealType.RevealSelectFocusShowBody).then(() => {
                this._leoFileSystem.fireRefreshFiles();
                this._leoBridgeActionBusy = false;
            });
        }
    }

    public contractAll(): void {
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! contractAll');
        } else {
            this._leoBridgeActionBusy = true;
            this.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.CONTRACT_ALL, undefined, RevealType.RevealSelect)
                .then(() => {
                    this._leoBridgeActionBusy = false;
                });
        }
    }

    // TODO : More commands to implement
    public hoistNode(): void { vscode.window.showInformationMessage("TODO: hoistNode command"); }
    public hoistSelection(): void { vscode.window.showInformationMessage("TODO: hoistSelection command"); }
    public deHoist(): void { vscode.window.showInformationMessage("TODO: deHoist command"); }
    public cloneFindAll(): void { vscode.window.showInformationMessage("TODO: cloneFindAll command"); }
    public cloneFindAllFlattened(): void { vscode.window.showInformationMessage("TODO: cloneFindAllFlattened command"); }
    public cloneFindMarked(): void { vscode.window.showInformationMessage("TODO: cloneFindMarked command"); }
    public cloneFindFlattenedMarked(): void { vscode.window.showInformationMessage("TODO: cloneFindFlattenedMarked command"); }
    public extract(): void { vscode.window.showInformationMessage("TODO: extract command"); }
    public extractNames(): void { vscode.window.showInformationMessage("TODO: extractNames command"); }
    public copyMarked(): void { vscode.window.showInformationMessage("TODO: copyMarked command"); }
    public diffMarkedNodes(): void { vscode.window.showInformationMessage("TODO: diffMarkedNodes command"); }
    public gotoNextMarked(): void { vscode.window.showInformationMessage("TODO: gotoNextMarked command"); }
    public markChangedItems(): void { vscode.window.showInformationMessage("TODO: markChangedItems command"); }
    public markSubheads(): void { vscode.window.showInformationMessage("TODO: markSubheads command"); }
    public unmarkAll(): void { vscode.window.showInformationMessage("TODO: unmarkAll command"); }
    public cloneMarkedNodes(): void { vscode.window.showInformationMessage("TODO: cloneMarkedNodes command"); }
    public deleteMarkedNodes(): void { vscode.window.showInformationMessage("TODO: deleteMarkedNodes command"); }
    public moveMarkedNode(): void { vscode.window.showInformationMessage("TODO: moveMarkedNode command"); }

    public addLogPaneEntry(p_message: string): void {
        // * Adds message string to leoInteg's log pane, used when leoBridge gets an async 'log' command
        this._leoLogPane.appendLine(p_message);
    }

    public saveLeoFile(): void {
        // * Invokes the self.commander.save() Leo command
        // TODO : Specify which file when supporting multiple simultaneous opened Leo files
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! executeScript');
            return;
        }
        if (this._lastSelectedNode) {
            this._leoBridgeActionBusy = true;
            this.nodeAction(Constants.LEOBRIDGE_ACTIONS.SAVE_FILE)
                .then(() => {
                    this._leoBridgeActionBusy = false;
                });
        }
    }

    public closeLeoFile(): void {
        // * Close an opened Leo file
        // TODO : Implement & support multiple simultaneous files
        if (this.fileOpenedReady) {
            vscode.window.showInformationMessage("TODO: close leo file"); // temp placeholder
            // this.setTreeViewTitle("CONNECTED");
        } else {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.CLOSE_ERROR);
        }
    }

    public openLeoFile(): void {
        // * Shows an 'Open Leo File' dialog window, opens the chosen file via leoBridge along with showing the tree, body and log panes
        // TODO : Support multiple simultaneous opened files
        if (this.fileOpenedReady) {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_ALREADY_OPENED);
            return;
        }
        this._leoFilesBrowser.getLeoFileUrl()
            .then(p_chosenLeoFile => {
                return this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.OPEN_FILE, '"' + p_chosenLeoFile + '"');
            }, p_reason => {
                return Promise.reject(p_reason);
            })
            .then((p_openFileResult: LeoBridgePackage) => {
                const p_selectedLeoNode = this.apToLeoNode(p_openFileResult.node);
                // * Start body pane system
                this._context.subscriptions.push(
                    vscode.workspace.registerFileSystemProvider(Constants.URI_SCHEME, this._leoFileSystem, { isCaseSensitive: true })
                );
                // * Startup flag
                this.fileOpenedReady = true;
                // * First valid redraw of tree
                this._refreshOutline(RevealType.RevealSelect); // p_revealSelection flag set
                // * set body URI for body filesystem
                this._bodyUri = vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_selectedLeoNode.gnx);
                // * First StatusBar appearance
                this._leoStatusBar.show(); // Just selected a node
                // * Show leo log pane
                this.showLogPane();
                // * First Body appearance
                return this._leoFileSystem.refreshPossibleGnxList(); // ? Maybe unused if single gnx only
            })
            .then(p_list => {
                this._setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // Maybe unused when used with welcome content
                this.sendConfigToServer(this.config.getConfig());
                return this.showBody(false);
            });
    }

    private _setTreeViewTitle(p_title: string): void {
        // * Set/Change outline pane title e.g. "NOT CONNECTED", "CONNECTED", "OUTLINE"
        // TODO : Use the new 'welcome Content' API, see https://code.visualstudio.com/api/extension-guides/tree-view#welcome-content
        if (this._leoTreeStandaloneView) {
            this._leoTreeStandaloneView.title = p_title;
        }
        if (this._leoTreeExplorerView) {
            this._leoTreeExplorerView.title = Constants.GUI.EXPLORER_TREEVIEW_PREFIX + p_title; // "NOT CONNECTED", "CONNECTED", "LEO: OUTLINE"
        }
    }

    public showLeoCommands(): void {
        // * Offer all leo commands in the command palette (This opens the palette with string '>leo:' already typed)
        vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.QUICK_OPEN, Constants.GUI.QUICK_OPEN_LEO_COMMANDS);
    }

    public test(): void {
        // * Debugging utility function
        if (this.fileOpenedReady) {

            this._refreshOutline(RevealType.RevealSelect);
            // this._showLeoCommands();

        } else {
            vscode.window.showInformationMessage("Click the folder icon on the Leo Outline sidebar to open a Leo file");
        }
    }
}