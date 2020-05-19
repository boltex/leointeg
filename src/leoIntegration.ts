import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import { LeoBridgePackage, RevealType, ArchivedPosition, Icon, ConfigMembers, UserCommand, RefreshType } from "./types";
import { Config } from "./config";
import { LeoFilesBrowser } from "./leoFileBrowser";
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
        utils.setContext(Constants.CONTEXT_FLAGS.BRIDGE_READY, p_value);
    }

    private _fileOpenedReady: boolean = false; // Used along with executeCommand 'setContext' with Constants.CONTEXT_FLAGS.TREE_OPENED
    get fileOpenedReady(): boolean {
        return this._fileOpenedReady;
    }
    set fileOpenedReady(p_value: boolean) {
        this._fileOpenedReady = p_value;
        utils.setContext(Constants.CONTEXT_FLAGS.TREE_OPENED, p_value);
    }

    private _leoIsConnecting: boolean = false; // Used in connect method to prevent other attempts while already trying to connect
    private _leoBridgeReadyPromise: Promise<LeoBridgePackage> | undefined; // Set when leoBridge has a leo controller ready

    // * User action stack for non-tree-dependant commands fast entry
    private _leoBridgeActionBusy: boolean = false; // TODO : USE A COMMAND STACK TO CHAIN UP USER'S RAPID COMMANDS
    private _commandStack: UserCommand[] = [];          // TODO : USE A COMMAND STACK TO CHAIN UP USER'S RAPID COMMANDS
    // if command is non-tree-dependant, add it to the array's top and try to resolve bottom command.
    // if command is tree dependant: resolve only if stack is empty. Otherwise show info message "Command already running"

    // * Configuration Settings Service
    public config: Config; // Public configuration service singleton, used in leoSettingsWebview, leoBridge, and leoNode for inverted contrast

    // * Icon Paths
    public icons: Icon[] = []; // Singleton static array of all icon paths used in leoNodes for rendering in treeview

    // * File Browser
    private _leoFilesBrowser: LeoFilesBrowser; // Dialog service singleton used in the openLeoFile method

    // * LeoBridge
    private _leoBridge: LeoBridge; // Singleton service to access leobridgeserver

    // * Outline Pane
    private _leoTreeDataProvider: LeoOutlineProvider; // TreeDataProvider single instance
    private _leoTreeStandaloneView: vscode.TreeView<LeoNode>; // Outline tree view added to the Tree View Container with an Activity Bar icon
    private _leoTreeExplorerView: vscode.TreeView<LeoNode>; // Outline tree view added to the Explorer Sidebar
    private _nextNodeId: number = Constants.STARTING_PACKAGE_ID; // Used to generate id's for new treeNodes: The id is used to preserve or set the selection and expansion states

    private _lastSelectedNode: LeoNode | undefined; // Last selected node we got a hold of; leoTreeView.selection maybe newer and unprocessed

    // * Outline Pane redraw/refresh flag. Also set when calling refreshTreeRoot
    // ! temp public test
    // If there's no reveal and its the selected node re-use the old id
    public _revealType: RevealType = RevealType.NoReveal; // to be read/cleared in arrayToLeoNodesArray, to check if any should self-select

    // * Body Pane
    private _leoFileSystem: LeoBodyProvider; // as per https://code.visualstudio.com/api/extension-guides/virtual-documents#file-system-api

    private _bodyUri: vscode.Uri = utils.strToUri("");
    get bodyUri(): vscode.Uri {
        return this._bodyUri;
    }
    set bodyUri(p_uri: vscode.Uri) {
        this._leoFileSystem.setBodyTime(p_uri);
        this._bodyUri = p_uri;
    }

    private _bodyTextDocument: vscode.TextDocument | undefined;

    // TODO : use _needRefreshBody in 'setTreeViewSelection' back from commands instead
    private _needRefreshBody: boolean = false; // Flag for commands that might change current body, this is global for the 'select' after it finishes

    // TODO : May be unused if only one BODY gnx at a time
    private _bodyTextDocumentSameUri: boolean = false; // Flag used when checking if clicking a node requires opening a body pane text editor
    private _bodyMainSelectionColumn: vscode.ViewColumn | undefined;

    // TODO : Use the 'from outline' concept to decide if focus should be on body or outline after editing a headline
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
    private _lastBodyChangedRootRefreshedGnx: string = "";
    private _bodyLastChangedDocument: vscode.TextDocument | undefined;

    constructor(private _context: vscode.ExtensionContext) {
        // * Get configuration settings
        this.config = new Config(_context, this);
        this.config.getLeoIntegSettings();

        // * Build Icon filename paths
        this.icons = utils.buildIconPaths(_context);

        // * File Browser
        this._leoFilesBrowser = new LeoFilesBrowser(_context);

        // * Setup leoBridge
        this._leoBridge = new LeoBridge(_context, this);

        // * Same data provider for both outline trees, Leo view and Explorer view
        this._leoTreeDataProvider = new LeoOutlineProvider(this);

        // * Leo view outline panes
        this._leoTreeStandaloneView = vscode.window.createTreeView(Constants.TREEVIEW_ID, { showCollapseAll: false, treeDataProvider: this._leoTreeDataProvider });
        this._leoTreeStandaloneView.onDidChangeSelection((p_event => this._onTreeViewChangedSelection(p_event)));
        this._leoTreeStandaloneView.onDidExpandElement((p_event => this._onChangeCollapsedState(p_event, true, this._leoTreeStandaloneView)));
        this._leoTreeStandaloneView.onDidCollapseElement((p_event => this._onChangeCollapsedState(p_event, false, this._leoTreeStandaloneView)));
        this._leoTreeStandaloneView.onDidChangeVisibility((p_event => this._onTreeViewVisibilityChanged(p_event, false))); // * Trigger 'show tree in Leo's view'

        // * Explorer view outline pane
        this._leoTreeExplorerView = vscode.window.createTreeView(Constants.TREEVIEW_EXPLORER_ID, { showCollapseAll: false, treeDataProvider: this._leoTreeDataProvider });
        this._leoTreeExplorerView.onDidChangeSelection((p_event => this._onTreeViewChangedSelection(p_event)));
        this._leoTreeExplorerView.onDidExpandElement((p_event => this._onChangeCollapsedState(p_event, true, this._leoTreeExplorerView)));
        this._leoTreeExplorerView.onDidCollapseElement((p_event => this._onChangeCollapsedState(p_event, false, this._leoTreeExplorerView)));
        this._leoTreeExplorerView.onDidChangeVisibility((p_event => this._onTreeViewVisibilityChanged(p_event, true))); // * Trigger 'show tree in explorer view'

        // * Body Pane
        this._leoFileSystem = new LeoBodyProvider(this);
        this._bodyMainSelectionColumn = 1;

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
        vscode.workspace.onDidSaveTextDocument(p_event => this._onDocumentSaved(p_event)); // Not used for now
        vscode.workspace.onDidChangeTextDocument(p_event => this._onDocumentChanged(p_event)); // * Detect when user types in body pane here

        // * React to configuration settings events
        vscode.workspace.onDidChangeConfiguration(p_event => this._onChangeConfiguration(p_event));
    }

    public sendAction(p_action: string, p_jsonParam = "null", p_deferredPayload?: LeoBridgePackage, p_preventCall?: boolean): Promise<LeoBridgePackage> {
        // * Sends an action to Leo, used in LeoAsync, leoOutline and leoBody
        return this._leoBridge.action(p_action, p_jsonParam, p_deferredPayload, p_preventCall);
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
                utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, true); // server started
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
        this._leoBridgeReadyPromise = this._leoBridge.initLeoProcess();
        this._leoBridgeReadyPromise.then(
            (p_package) => {
                this._leoIsConnecting = false;
                if (p_package.id !== 1) {
                    this.cancelConnect(Constants.USER_MESSAGES.CONNECT_ERROR);
                } else {
                    this.leoBridgeReady = true;
                    utils.setContext(Constants.CONTEXT_FLAGS.BRIDGE_READY, true);
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
                this.cancelConnect(Constants.USER_MESSAGES.CONNECT_FAILED + p_reason);
            });
    }

    public cancelConnect(p_message?: string): void {
        // * Also called from leoBridge.ts when its websocket reports disconnection
        if (this.leoBridgeReady) {
            // * Real disconnect error versus a simple 'failed to connect'
            vscode.window.showErrorMessage(p_message ? p_message : Constants.USER_MESSAGES.DISCONNECTED);
            utils.setContext(Constants.CONTEXT_FLAGS.DISCONNECTED, true);
        } else {
            vscode.window.showInformationMessage(p_message ? p_message : Constants.USER_MESSAGES.DISCONNECTED);
        }
        this._setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // Generic title instead of Constants.GUI.TREEVIEW_TITLE_NOT_CONNECTED
        this.fileOpenedReady = false;
        this.leoBridgeReady = false;
        this._leoBridgeReadyPromise = undefined;
        this._leoStatusBar.update(false);
        this._refreshOutline(RevealType.RevealSelect);
    }

    public showLogPane(): void {
        // * Show log panel command (Front-end only - does not go through leoBridge)
        this._leoLogPane.show(true);
    }

    public addLogPaneEntry(p_message: string): void {
        // * Adds message string to leoInteg's log pane, used when leoBridge receives an async 'log' command
        this._leoLogPane.appendLine(p_message);
    }

    public sendConfigToServer(p_config: ConfigMembers): void {
        // * Send configuration through leoBridge to the server script, mostly used when checking if refreshing derived files is optional
        if (this.fileOpenedReady) {
            this.sendAction(Constants.LEOBRIDGE.APPLY_CONFIG, JSON.stringify(p_config)).then(p_package => {
                // console.log("back from applying configuration to leobridgeserver.py");
            });
        }
    }

    private _onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {
        // * vscode.workspace.onDidChangeConfiguration trigger handling
        if (p_event.affectsConfiguration(Constants.CONFIG_SECTION)) {
            // console.log('Detected Change of vscode config in leoIntegration !');
            this.config.getLeoIntegSettings();
        }
    }

    private _onTreeViewChangedSelection(p_event: vscode.TreeViewSelectionChangeEvent<LeoNode>): void {
        // * treeView onDidChangeSelection trigger handling (we act upon the the 'select node' command, so this event may be redundant)
        // console.log("treeViewChangedSelection, selection length:", p_event.selection.length);
    }

    private _onChangeCollapsedState(p_event: vscode.TreeViewExpansionEvent<LeoNode>, p_expand: boolean, p_treeView: vscode.TreeView<LeoNode>): void {
        // * Expanding or collapsing via the treeview interface selects the node to mimic Leo
        this._triggerBodySave(true);
        if (p_treeView.selection[0] && p_treeView.selection[0] === p_event.element) {
            // * This happens if the tree selection is the same as the expanded/collapsed node: Just have Leo do the same
            this.sendAction(p_expand ? Constants.LEOBRIDGE.EXPAND_NODE : Constants.LEOBRIDGE.COLLAPSE_NODE, p_event.element.apJson);
        } else {
            // * This part only happens if the user clicked on the arrow without trying to select the node
            this._revealTreeViewNode(p_event.element, { select: true, focus: false }); // No force focus : it breaks collapse/expand when direct parent
            this.selectTreeNode(p_event.element, true);  // not waiting for a .then(...) so not to add any lag
            this.sendAction(p_expand ? Constants.LEOBRIDGE.EXPAND_NODE : Constants.LEOBRIDGE.COLLAPSE_NODE, p_event.element.apJson);
        }
    }

    private _onTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        // * Tree view has been either switched, shown or hidden - Refresh if it's visible
        if (p_explorerView) {
            // (Facultative) Do something different if explorerView is used, instead of the standalone outline pane
        }
        if (p_event.visible && this._lastSelectedNode) {
            this._lastSelectedNode = undefined; // Its a new node in a new tree so refresh _lastSelectedNode too
            this._refreshOutline(RevealType.RevealSelectFocus); // Set focus on outline
        }
    }

    private _onActiveEditorChanged(p_event: vscode.TextEditor | undefined, p_internalCall?: boolean): void {
        // * Active editor should be reflected in the outline if it's a leo body pane
        if (!p_internalCall) {
            this._triggerBodySave(true);// Save in case edits were pending
        }
        // selecting another editor of the same window by the tab
        // * Status flag check
        if (!p_event && this._leoStatusBar.leoObjectSelected) {
            return;
        }
        // * Status flag check
        if (vscode.window.activeTextEditor) {
            this._leoStatusBar.update(vscode.window.activeTextEditor.document.uri.scheme === Constants.URI_SCHEME);
        }
    }

    private _onChangeEditorSelection(p_event: vscode.TextEditorSelectionChangeEvent): void {
        // * The selection in an editor has changed. - just refresh the statusBar for now
        if (vscode.window.activeTextEditor) {
            // Yes an editor is active, just check if its leo scheme
            this._leoStatusBar.update(
                (p_event.textEditor.document.uri.scheme === Constants.URI_SCHEME) && (vscode.window.activeTextEditor.document.uri.scheme === Constants.URI_SCHEME),
                Constants.STATUSBAR_DEBOUNCE_DELAY // Debounced
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
        if (p_event.contentChanges.length && (p_event.document.uri.scheme === Constants.URI_SCHEME)) {
            console.log('_onDocumentChanged ');

            // * There was an actual change on a Leo Body by the user
            this._bodyLastChangedDocument = p_event.document;

            // * If icon should change then do it now (if there's no document edit pending)
            if (this._lastSelectedNode && utils.uriToStr(p_event.document.uri) === this._lastSelectedNode.gnx) {
                const w_hasBody = !!(p_event.document.getText().length);
                if (utils.isIconChangedByEdit(this._lastSelectedNode, w_hasBody)) {
                    console.log('instant save!');
                    this._bodySaveDocument(p_event.document)
                        .then(() => {
                            this._lastSelectedNode!.dirty = true;
                            this._lastSelectedNode!.hasBody = w_hasBody;
                            this._refreshOutline(RevealType.NoReveal); // NoReveal for keeping the same id and selection
                        });
                    return; // * Don't continue
                }
            }
            console.log('marked to save!');
        }
    }

    private _triggerBodySave(p_forcedVsCodeSave?: boolean): Thenable<boolean> {
        // * Save body to Leo if a change has been made to the body 'document' so far
        if (this._bodyLastChangedDocument) {
            const w_document = this._bodyLastChangedDocument; // backup for bodySaveDocument before reset
            this._bodyLastChangedDocument = undefined; // reset to make falsy
            return this._bodySaveDocument(w_document, p_forcedVsCodeSave);
        } else {
            return Promise.resolve(true);
        }
    }

    private _bodySaveDocument(p_document: vscode.TextDocument, p_forcedVsCodeSave?: boolean): Thenable<boolean> {
        // * Sets new body text on leo's side, and will optionally save vsCode's body editor
        if (p_document) {
            // * Fetch gnx and document's body text first, to be reused more than once in this method
            const w_param = {
                gnx: utils.uriToStr(p_document.uri),
                body: p_document.getText()
            };
            return this.sendAction(Constants.LEOBRIDGE.SET_BODY, JSON.stringify(w_param)).then(p_result => {
                if (p_forcedVsCodeSave) {
                    return p_document.save(); // ! USE INTENTIONALLY: This trims trailing spaces!
                }
                return Promise.resolve(p_document.isDirty);
            });
        } else {
            return Promise.resolve(false);
        }
    }

    public checkWriteFile(): void {
        // TODO : make _triggerBodySave public if really needed
        // TODO : Distinguish between "body save" triggered by vscode regular save, such as ctrl+s.
        // console.log('check write was called!');
        // * For now, just trigger "body save"
        this._triggerBodySave(true);
    }

    public refreshOutlineAndBody(): void {
        this._triggerBodySave(true);
        this._needRefreshBody = true;

        this._refreshOutline(RevealType.RevealSelectFocusShowBody);
        // TODO : Maybe call _switchBody instead?
        // this._leoFileSystem.fireRefreshFiles();
    }

    private _refreshOutline(p_revealType?: RevealType): void {
        if (p_revealType !== undefined) { // To check if selected node should self-select while redrawing whole tree
            // if (p_revealType) { // Only if not 0, to let higher calls finish undisturbed
            // if (p_revealType > this._revealType ) { // Only if higher, to let previous calls finish undisturbed if possible
            this._revealType = p_revealType; // To be read/cleared (in arrayToLeoNodesArray instead of directly by nodes)
        }
        this._leoTreeDataProvider.refreshTreeRoot();
    }

    private _refreshNode(p_node: LeoNode): void {
        this._revealType = RevealType.NoReveal; // Keep id because only called by expand/collapse
        this._leoTreeDataProvider.refreshTreeNode(p_node);
    }

    public apToLeoNode(p_ap: ArchivedPosition, p_revealSelected?: boolean, p_specificNode?: LeoNode): LeoNode {
        // * Converts an archived position object to a LeoNode instance
        // TODO : (CODE CLEANUP) p_revealSelected flag should be inverted, its rarely used by far
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
            (!this._revealType && p_ap.selected && this._lastSelectedNode) ? this._lastSelectedNode.id : (++this._nextNodeId).toString()
        );
        if (p_revealSelected && this._revealType && p_ap.selected) {
            this._apToLeoNodeConvertReveal(p_specificNode ? p_specificNode : w_leoNode);
        }
        return w_leoNode;
    }

    private _apToLeoNodeConvertReveal(p_leoNode: LeoNode): void {
        // * Reveals a node in the outline. Select and focus if needed
        // First setup flags for selecting and focusing based on the current reveal type needed
        const w_selectFlag = this._revealType >= RevealType.RevealSelect; // at least RevealSelect
        let w_focusFlag = this._revealType >= RevealType.RevealSelectFocus;  // at least RevealSelectFocus
        if (this._revealType === RevealType.RevealSelectShowBody) {
            w_focusFlag = false;
        }
        const w_showBodyFlag = this._revealType >= RevealType.RevealSelectFocusShowBody; // at least RevealSelectFocusShowBody
        // Flags are setup so now reveal, select and / or focus as needed
        this._revealType = RevealType.NoReveal; // ok reset
        // If first time, or when treeview switched, _lastSelectedNode will be undefined
        if (!this._lastSelectedNode) {
            this._lastSelectedNode = p_leoNode; // special case only: _lastSelectedNode should be set in selectTreeNode
        }
        setTimeout(() => {
            // don't use the treeKeepFocus config option
            this._revealTreeViewNode(p_leoNode, { select: w_selectFlag, focus: w_focusFlag })
                .then(() => {
                    console.log('did this ask for parent?', p_leoNode.id, p_leoNode.label); // ! debug

                    // Check if OPENING THE BODY WAS REQUIRED? // TODO : DOES THIS BLOCK GO REALLY HERE??!?
                    if (w_showBodyFlag) {
                        // TODO : use a new "Show Body" function such as _setBody (that would mirror _gotSelection but for the body) ?
                        this.selectTreeNode(p_leoNode, true);
                    }
                });
        });
    }

    public arrayToLeoNodesArray(p_array: ArchivedPosition[]): LeoNode[] {
        // * Converts an array of 'ap' to an array of leoNodes
        // * This is used in 'getChildren' of leoOutline.ts
        const w_leoNodesArray: LeoNode[] = [];
        for (let w_apData of p_array) {
            const w_leoNode = this.apToLeoNode(w_apData, true);
            w_leoNodesArray.push(w_leoNode);
        }
        return w_leoNodesArray;
    }

    private _revealTreeViewNode(p_leoNode: LeoNode, p_options?: { select?: boolean, focus?: boolean, expand?: boolean | number }): Thenable<void> {
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

    private _gotSelection(): Thenable<boolean> {
        // * While converting received ap_nodes to LeoNodes, the selected node was reached

        console.log('GOT SELECTED NODE WHILE REFRESHING TREEVIEW');

        // * If refresh of body was required upon refresh - via global
        let w_needsFilesystemRefresh: boolean = false;
        if (this._needRefreshBody) {
            this._needRefreshBody = false;
            w_needsFilesystemRefresh = true;
        }






        return Promise.resolve(true);
    }

    public selectTreeNode(p_node: LeoNode, p_internalCall?: boolean, p_aside?: boolean): Thenable<vscode.TextEditor> {
        // * User has selected a node via mouse click or 'enter' keypress in the outline, otherwise flag p_internalCall if used internally

        console.log('SELECT TREE NODE');

        let w_needsFilesystemRefresh: boolean = false; // TODO : This block in _gotSelection or other "Back from Command" method
        if (p_internalCall && this._needRefreshBody) {
            this._needRefreshBody = false;
            w_needsFilesystemRefresh = true;
        }

        // TODO : If command stack not empty/still running commands exit this method & let end of commands (re)set selected node

        // * check if used via context menu's "open-aside" on an unselected node: check if p_node is currently selected, if not select it
        if (p_aside && p_node !== this._lastSelectedNode) {
            this._revealTreeViewNode(p_node, { select: true, focus: false }); // no need to set focus: tree selection is set to right-click position
        }

        // TODO : Save and restore selection, along with cursor position, from selection state saved in each node (or gnx array)

        this._leoStatusBar.update(true); // Just selected a node directly, or via expand/collapse

        // * Check if having already this exact node position selected : Just show the body and exit!
        if (!w_needsFilesystemRefresh && (p_node === this._lastSelectedNode)) {
            this._locateOpenedBody(p_node.gnx);
            return this.showBody(p_aside); // voluntary exit
        }

        // * Set selected node in Leo via leoBridge
        this.sendAction(Constants.LEOBRIDGE.SET_SELECTED_NODE, p_node.apJson);

        // * don't wait for promise to resolve a selection, save body to leo for the bodyTextDocument, then check if already opened
        this._triggerBodySave();

        // * Set the 'lastSelectedNode' and make the body pane switch and show itself if needed
        this._lastSelectedNode = p_node; // kept mostly in order to do refreshes if it changes, as opposed to a full tree refresh
        utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_MARKED, p_node.marked);

        // * Is the last opened body still opened?
        if (this._bodyTextDocument && !this._bodyTextDocument.isClosed) {

            // * Checks if already opened and visible, also sets bodyTextDocumentSameUri, bodyMainSelectionColumn, bodyTextDocument
            this._locateOpenedBody(p_node.gnx); // Maybe just use it to set

            if (this._bodyTextDocumentSameUri) {
                // * Here we really tested _bodyTextDocumentSameUri set from _locateOpenedBody, (means we found the same already opened) so just show it
                this.bodyUri = utils.strToUri(p_node.gnx);
                if (w_needsFilesystemRefresh) {
                    console.log('We were resolving a command that could change body content 1 ');
                    // TODO: We were resolving a command that could change body content such as undo/redo/execute THIS SHOULD BE ELSEWHERE
                    setTimeout(() => {
                        this._leoFileSystem.fireRefreshFile(p_node.gnx);
                    }, 0);
                }
                return this.showBody(p_aside); // already opened in a column so just tell vscode to show it // TODO : NOT ANYMORE WITH NEW SYSTEM
            } else {
                // * So far, _bodyTextDocument is still opened and different from new selection: so "save & rename" to block undo/redos
                return this._switchBody(p_node.gnx)
                    .then(() => {
                        if (w_needsFilesystemRefresh) { // TODO : Move this part to setTreeViewSelection
                            console.log('We were resolving a command that could change body content 2 '); // maybe not necessary but maybe so if hidden pane not located
                            // We were resolving a command that could change body content such as undo/redo/execute
                            this._leoFileSystem.fireRefreshFile(p_node.gnx);
                        }
                        return this.showBody(p_aside); // Also finish by showing it if not already visible
                    });
            }
        } else {
            // * Is the last opened body is closed so just open the newly selected one
            this.bodyUri = utils.strToUri(p_node.gnx);
            if (w_needsFilesystemRefresh) {
                console.log('We were resolving a command that could change body content 3');
                // We were resolving a command that could change body content such as undo/redo/execute
                this._leoFileSystem.fireRefreshFile(p_node.gnx);
            }
            return this.showBody(p_aside);
        }
    }

    private _switchBody(p_newGnx: string): Thenable<boolean> {
        // * Save and rename from this.bodyUri to p_newGnx: This changes the body content & blocks 'undos' from crossing over
        if (this._bodyTextDocument) {
            return this._bodyTextDocument.save().then((p_result) => {
                const w_edit = new vscode.WorkspaceEdit();
                this._leoFileSystem.setRenameTime(p_newGnx);
                w_edit.renameFile(
                    this.bodyUri, // Old URI from last node
                    utils.strToUri(p_newGnx), // New URI from selected node
                    { overwrite: true, ignoreIfExists: true }
                );
                return vscode.workspace.applyEdit(w_edit).then(p_result => {
                    this.bodyUri = utils.strToUri(p_newGnx); // Old is now set to new to finish
                    return Promise.resolve(p_result); // Also finish by showing it if not already visible
                });
            });
        } else {
            return Promise.resolve(false);
        }
    }

    private _locateOpenedBody(p_gnx: string): boolean {
        // * Sets globals if the current body is found opened in an editor panel for a particular gnx
        this._bodyTextDocumentSameUri = false;
        // * Only gets to visible editors, not every tab per editor
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (utils.uriToStr(p_textEditor.document.uri) === p_gnx) {
                this._bodyTextDocumentSameUri = true; // TODO : May be unused if only one BODY gnx at a time
                this._bodyMainSelectionColumn = p_textEditor.viewColumn;
                this._bodyTextDocument = p_textEditor.document;
            }
        });
        return this._bodyTextDocumentSameUri;
    }

    public showBody(p_aside: boolean | undefined): Thenable<vscode.TextEditor> {
        // * Shows an editor for the currently selected node: this.bodyUri, if already opened just 'shows' it
        return vscode.workspace.openTextDocument(this.bodyUri).then(p_document => {

            this._bodyTextDocument = p_document;

            // NOTE: textEditor.show() is deprecated — Use window.showTextDocument instead.
            vscode.window.visibleTextEditors.forEach(p_textEditor => {
                if (p_textEditor.document.uri.fsPath === p_document.uri.fsPath) {
                    console.log('new selection found last second!: ', p_textEditor.viewColumn);
                    this._bodyMainSelectionColumn = p_textEditor.viewColumn;
                    this._bodyTextDocument = p_textEditor.document;
                }
            });
            const w_keepFocus = this._forceBodyFocus ? false : this.config.treeKeepFocus;
            if (this._forceBodyFocus) {
                this._forceBodyFocus = false; // Reset this single-use flag
            }
            const w_showOptions: vscode.TextDocumentShowOptions = p_aside ?
                {
                    viewColumn: vscode.ViewColumn.Beside,
                    preserveFocus: this.config.treeKeepFocusWhenAside, // an optional flag that when true will stop the editor from taking focus
                    preview: true // should text document be in preview only? set false for fully opened
                    // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top otherwise
                } : {
                    viewColumn: this._bodyMainSelectionColumn ? this._bodyMainSelectionColumn : 1, // view column in which the editor should be shown
                    preserveFocus: w_keepFocus, // an optional flag that when true will stop the editor from taking focus
                    preview: false // should text document be in preview only? set false for fully opened
                    // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top otherwise
                };
            return vscode.window.showTextDocument(this._bodyTextDocument, w_showOptions).then(w_bodyEditor => {
                // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
                // other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
                return Promise.resolve(w_bodyEditor);
            });
        });
    }

    public focusBodyIfVisible(p_gnx: string): Thenable<boolean> {
        let w_found: undefined | vscode.TextEditor;
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (!w_found && (utils.uriToStr(p_textEditor.document.uri) === p_gnx)) {
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

    public nodeAction(p_action: string, p_node?: LeoNode): Promise<LeoBridgePackage> {
        // * For actions that need no tree/body refreshes at all
        // - saveLeoFile, copyNode, copyNodeSelection
        let w_node = p_node;
        if (!w_node && this._lastSelectedNode) {
            w_node = this._lastSelectedNode;
        }
        if (w_node) {
            return this.sendAction(p_action, w_node.apJson);
        } else {
            return Promise.resolve({ id: Constants.ERROR_PACKAGE_ID }); // 0 is error id
        }
    }

    public nodeActionRefresh(p_action: string, p_node?: LeoNode, p_revealType?: RevealType | undefined): Promise<LeoBridgePackage> {
        // * For actions that do not need full bodies gnx list to refresh (moving, renaming nodes)
        // - mark, unmark
        // - move, clone, promote, demote
        // - sortChildren, sortSibling
        this._triggerBodySave(true);
        return this.nodeAction(p_action, p_node)
            .then((p_package: LeoBridgePackage) => {
                if (p_package.id > Constants.ERROR_PACKAGE_ID) { // greater than 0
                    this._refreshOutline(p_revealType); // refresh all outline, needed to get clones to refresh too!
                }
                return Promise.resolve(p_package);
            });
    }

    public nodeActionRefreshBuffered(p_action: string, p_node?: LeoNode): void {
        // * For actions that can change the tree and current selection, but not text content of any node
        // TODO : See why nodeActionRefreshBuffered is not enough for 'Save leo file' to reselect node properly!
        // paste, pasteClone, contractAll
        // cut, delete
        if (this._leoBridgeActionBusy) {
            console.log('Too fast in nodeActionRefreshBuffered! for: ' + p_action); // TODO : USE A COMMAND STACK TO CHAIN UP USER'S RAPID COMMANDS
        } else {
            this._leoBridgeActionBusy = true;
            this.nodeActionRefresh(p_action, p_node, RevealType.RevealSelectShowBody)
                .then(() => {
                    this._leoBridgeActionBusy = false;
                });
        }

    }

    public nodeActionFullRefreshBuffered(p_action: string, p_node?: LeoNode): void {
        // * For actions that can even change the tree and/or selected body text content
        // TODO : See why nodeActionRefreshBuffered is not enough for 'Save leo file' to reselect node properly!
        // - undo, redo, execute, refreshFromDiskNode, Save Leo File
        if (this._leoBridgeActionBusy) {
            console.log('Too fast in nodeActionFullRefreshBuffered! for: ' + p_action); // TODO : USE A COMMAND STACK TO CHAIN UP USER'S RAPID COMMANDS
        } else {
            this._leoBridgeActionBusy = true;
            this._needRefreshBody = true;
            this.nodeActionRefresh(p_action, p_node, RevealType.RevealSelectFocusShowBody)
                .then(() => {
                    this._leoBridgeActionBusy = false;
                });
        }
    }

    public editHeadline(p_node?: LeoNode, p_isSelectedNode?: boolean) {
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! editHeadline'); // TODO : USE A COMMAND STACK TO CHAIN UP USER'S RAPID COMMANDS
        } else {
            this._triggerBodySave(true);
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
                            this.sendAction(Constants.LEOBRIDGE.SET_HEADLINE, utils.buildHeadlineJson(p_node!.apJson, p_newHeadline))
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
                                // TODO : maybe focus was on outline before the call?
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
            console.log('Too fast! changeMark'); // TODO : USE A COMMAND STACK TO CHAIN UP USER'S RAPID COMMANDS
        } else {
            this._triggerBodySave(true);
            this._leoBridgeActionBusy = true;
            this.nodeActionRefresh(p_isMark ? Constants.LEOBRIDGE.MARK_PNODE : Constants.LEOBRIDGE.UNMARK_PNODE, p_node)
                .then(() => {
                    this._leoBridgeActionBusy = false;
                });
            if (!p_node || p_node === this._lastSelectedNode) {
                utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_MARKED, p_isMark);
            }
        }
    }

    public insertNode(p_node?: LeoNode): void {
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! insert');
        } else {
            this._triggerBodySave(true);
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
                        const w_action = p_newHeadline ? Constants.LEOBRIDGE.INSERT_NAMED_PNODE : Constants.LEOBRIDGE.INSERT_PNODE;
                        const w_para = p_newHeadline ? utils.buildHeadlineJson(w_node!.apJson, p_newHeadline) : w_node.apJson;
                        this.sendAction(w_action, w_para)
                            .then(p_package => {
                                this._forceBodyFocus = true;
                                this._refreshOutline(RevealType.RevealSelectShowBody); // refresh all, needed to get clones to refresh too!
                                // this.focusBodyIfVisible(p_package.node.gnx);
                                this._leoBridgeActionBusy = false;
                            });
                    });
            }
        }
    }

    public saveLeoFile(): void {
        // * Invokes the self.commander.save() Leo command
        // TODO : Specify which file when supporting multiple simultaneous opened Leo files
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! executeScript'); // TODO : USE A COMMAND STACK TO CHAIN UP USER'S RAPID COMMANDS
            return;
        }
        if (this._lastSelectedNode) {
            this._leoBridgeActionBusy = true;
            this._triggerBodySave(true)
                .then(() => {
                    console.log('-saveLeoFile-  Back from BODY SAVE');

                    this.nodeAction(Constants.LEOBRIDGE.SAVE_FILE)
                        .then(() => {
                            console.log('-saveLeoFile-  Back from NODE ACTION');

                            this.refreshOutlineAndBody();
                            // this._refreshOutline(RevealType.RevealSelect);

                            this._leoBridgeActionBusy = false;
                        });
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
        // ! Leaves focus in outline !
        // * Shows an 'Open Leo File' dialog window, opens the chosen file via leoBridge along with showing the tree, body and log panes
        // TODO : Support multiple simultaneous opened files
        if (this.fileOpenedReady) {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_ALREADY_OPENED);
            return;
        }
        this._leoFilesBrowser.getLeoFileUrl()
            .then(p_chosenLeoFile => {
                return this.sendAction(Constants.LEOBRIDGE.OPEN_FILE, '"' + p_chosenLeoFile + '"');
            }, p_reason => {
                return Promise.reject(p_reason);
            })
            .then((p_openFileResult: LeoBridgePackage) => {
                const w_selectedLeoNode = this.apToLeoNode(p_openFileResult.node, false); // Just to get gnx for the body's fist appearance
                this.bodyUri = utils.strToUri(w_selectedLeoNode.gnx);
                // * Start body pane system
                this._context.subscriptions.push(
                    vscode.workspace.registerFileSystemProvider(Constants.URI_SCHEME, this._leoFileSystem, { isCaseSensitive: true })
                );
                // * Startup flag
                this.fileOpenedReady = true;
                // * First valid redraw of tree along with the selected node and its body
                this._refreshOutline(RevealType.RevealSelectFocus); // p_revealSelection flag set
                this._setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // ? Maybe unused when used with welcome content
                // * First StatusBar appearance
                this._leoStatusBar.show(); // Just selected a node
                // * Show leo log pane
                this.showLogPane();
                // * Send config to python's side (for settings such as defaultReloadIgnore and checkForChangeExternalFiles)
                this.sendConfigToServer(this.config.getConfig());
                // * First Body appearance
                return this.showBody(false);
            });
    }

    private _setTreeViewTitle(p_title: string): void {
        // * Set/Change outline pane title e.g. "NOT CONNECTED", "CONNECTED", "OUTLINE"
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

    public test(p_fromOutline?: boolean): void {
        // * Debugging utility function
        if (this.fileOpenedReady) {
            if (p_fromOutline) {
                vscode.window.showInformationMessage('Called from Outline');
            } else {
                vscode.window.showInformationMessage("Called from Body");
            }
            console.log('tree selection is: ', this._leoTreeExplorerView.selection);

            // this.refreshOutlineAndBody(); // Test: refresh some stuff
        } else {
            vscode.window.showInformationMessage("File not ready");
        }
    }
}