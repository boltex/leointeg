import * as vscode from "vscode";
import * as child from 'child_process';
import * as utils from "./utils";
import { Constants } from "./constants";
import { LeoBridgePackage, RevealType, ArchivedPosition, Icon, ConfigMembers, AskMessageItem } from "./types";
import { Config } from "./config";
import { LeoFiles } from "./leoFiles";
import { LeoNode } from "./leoNode";
import { LeoOutlineProvider } from "./leoOutline";
import { LeoBodyProvider } from "./leoBody";
import { LeoBridge } from "./leoBridge";
import { ServerService } from "./serverManager";

export class LeoIntegration {
    // * Status Flags
    public fileOpenedReady: boolean = false;
    public leoBridgeReady: boolean = false;
    public leoIsConnecting: boolean = false;
    private _leoBridgeReadyPromise: Promise<LeoBridgePackage> | undefined; // Set when leoBridge has a leo controller ready
    private _leoBridgeActionBusy: boolean = false;

    // * Control Flags
    // ? Refresh helper - maybe unneeded : Structure may have changed, as opposed to selecting, opening aside, expanding and collapsing
    private _lastOperationChangedTree: boolean = true;

    // * Configuration Settings
    public config: Config;

    // * Icon Paths
    public icons: Icon[] = [];

    // * Leo Bridge Server Process
    private _serverProcess: child.ChildProcess | undefined;

    // * File Browser
    private _leoFilesBrowser: LeoFiles;

    // * LeoBridge
    public leoBridge: LeoBridge;

    // * User action stack for non-tree-dependant commands fast entry
    private _commandStack: string[] = []; // TODO : USE A COMMAND STACK TO CHAIN UP USER'S RAPID COMMANDS
    // if command is non-tree-dependant, add it to the array's top and try to resolve bottom command.
    // if command is tree dependant: add to array and resolve only if empty. Otherwise show info message "Command already running"

    // * Outline Pane
    public leoTreeDataProvider: LeoOutlineProvider;
    public leoTreeView: vscode.TreeView<LeoNode>;
    public leoTreeExplorerView: vscode.TreeView<LeoNode>;

    private _lastSelectedLeoNode: LeoNode | undefined; // last selected node we got a hold of; leoTreeView.selection maybe newer and unprocessed
    public outlineRefreshCount: number = 0; // Used when refreshing leoTextDocumentNodesRef to protect the selected node - which may be a selected clone
    public nextNodeId: number = 1; // Used to generate id's for new treeNodes : NEW IDS MEAN NEW COLLAPSE STATE

    // * Outline Pane redraw/refresh 'helper flags'
    public refreshSingleNodeFlag: boolean = false; // used in leoOutline.ts to check if getTreeItem(element: LeoNode) should fetch from Leo, or return as-is
    public revealSelectedNode: RevealType = RevealType.NoReveal; // to be read/cleared in arrayToLeoNodesArray, to check if any should self-select

    // * Body Pane
    public leoFileSystem: LeoBodyProvider; // as per https://code.visualstudio.com/api/extension-guides/virtual-documents#file-system-api
    private _bodyUri: vscode.Uri = vscode.Uri.parse(Constants.URI_SCHEME_HEADER);
    private _bodyTextDocument: vscode.TextDocument | undefined;

    private _bodyTextDocumentSameUri: boolean = false; // Flag used when checking if clicking a node requires opening a body pane text editor
    private _bodyMainSelectionColumn: vscode.ViewColumn | undefined;
    private _forceBodyFocus: boolean = false; // Flag used to force focus in body when next 'showing' of this body occurs (after edit headline if already selected)

    // * Body pane dictionary of GNX linking to leoNodes, used when showing a body pane to force selection in outline
    // TODO : FIX THIS -> MOVE IT TO LEO_OUTLINE - OR REMOVE IT IF SINGLE GNX BODY AT ALL TIMES
    private _leoTextDocumentNodesRef: { [gnx: string]: { node: LeoNode; refreshCount: number; } } = {}; // Kept updated in the apToLeoNode function

    // * Log Pane
    public leoLogPane: vscode.OutputChannel = vscode.window.createOutputChannel(Constants.GUI.LOG_PANE_TITLE); // Copy-pasted from leo's log pane

    // * Status Bar
    public leoStatusBarItem: vscode.StatusBarItem;
    public leoObjectSelected: boolean = false; // represents having focus on a leo body, as opposed to anything else
    public statusbarNormalColor = new vscode.ThemeColor(Constants.GUI.THEME_STATUSBAR);  // "statusBar.foreground"
    private _updateStatusBarTimeout: NodeJS.Timeout | undefined;

    // * Edit Headline Input Box
    private _editHeadlineInputOptions: vscode.InputBoxOptions = {
        ignoreFocusOut: false, // clicking outside cancels the headline change
        value: "", // will be replaced live upon showing from the node's text
        valueSelection: undefined,
        prompt: Constants.USER_MESSAGES.PROMPT_EDIT_HEADLINE
    };

    // * Insert Node Headline Input Box
    private _newHeadlineInputOptions: vscode.InputBoxOptions = {
        ignoreFocusOut: false, // clicking outside cancels the headline change
        value: Constants.USER_MESSAGES.DEFAULT_HEADLINE, // will be replaced live upon showing from the node's text
        valueSelection: undefined,
        prompt: Constants.USER_MESSAGES.PROMPT_INSERT_NODE
    };

    // * Used in showAskModalDialog: Holds result when leobridge asks what to do when derived file has changed
    private _askResult: string = "";

    // * Automatic server start service
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
        this.leoTreeDataProvider = new LeoOutlineProvider(this);

        // * Leo view outline panes
        this.leoTreeView = vscode.window.createTreeView(Constants.TREEVIEW_ID, { showCollapseAll: false, treeDataProvider: this.leoTreeDataProvider });
        this.leoTreeView.onDidChangeSelection((p_event => this._onTreeViewChangedSelection(p_event)));
        this.leoTreeView.onDidExpandElement((p_event => this._onTreeViewExpandedElement(p_event)));
        this.leoTreeView.onDidCollapseElement((p_event => this._onTreeViewCollapsedElement(p_event)));
        this.leoTreeView.onDidChangeVisibility((p_event => this._onTreeViewVisibilityChanged(p_event, false))); // * Trigger 'show tree in Leo's view'

        // * Explorer view outline pane
        this.leoTreeExplorerView = vscode.window.createTreeView(Constants.TREEVIEW_EXPLORER_ID, { showCollapseAll: false, treeDataProvider: this.leoTreeDataProvider });
        this.leoTreeExplorerView.onDidChangeSelection((p_event => this._onTreeViewChangedSelection(p_event)));
        this.leoTreeExplorerView.onDidExpandElement((p_event => this._onTreeViewExpandedElement(p_event)));
        this.leoTreeExplorerView.onDidCollapseElement((p_event => this._onTreeViewCollapsedElement(p_event)));
        this.leoTreeExplorerView.onDidChangeVisibility((p_event => this._onTreeViewVisibilityChanged(p_event, true))); // * Trigger 'show tree in explorer view'

        // * Body Pane
        this.leoFileSystem = new LeoBodyProvider(this);
        this._bodyMainSelectionColumn = 1;
        // TODO : set workbench.editor.closeOnFileDelete to true

        // * Status bar: Show keyboard-Shortcut-Flag to signify Leo keyboard shortcuts are active
        this.leoStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        this.leoStatusBarItem.color = this.config.statusBarColor;
        this.leoStatusBarItem.command = "leointeg.test"; // just call test function for now to help debugging
        this.leoStatusBarItem.text = Constants.GUI.STATUSBAR_INDICATOR + this.config.statusBarString;
        this.leoStatusBarItem.tooltip = Constants.USER_MESSAGES.STATUSBAR_TOOLTIP_ON;
        _context.subscriptions.push(this.leoStatusBarItem);
        this.leoStatusBarItem.hide();

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
        this.setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // Vanilla title for use with welcome content
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
        this._serverService.startServer(this._serverProcess, this.config.leoPythonCommand)
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
        if (this.leoBridgeReady || this.leoIsConnecting) {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.ALREADY_CONNECTED);
            return;
        }
        this.leoIsConnecting = true;
        this._leoBridgeReadyPromise = this.leoBridge.initLeoProcess();
        this._leoBridgeReadyPromise.then(
            (p_package) => {
                this.leoIsConnecting = false;
                if (p_package.id !== 1) {
                    this.cancelConnect(Constants.USER_MESSAGES.CONNECT_ERROR);
                } else {
                    this.leoBridgeReady = true;
                    vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.BRIDGE_READY, true);
                    // this.setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE_CONNECTED);
                    this.setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // Vanilla title for use with welcome content
                    this.showLogPane();
                    if (!this.config.connectToServerAutomatically) {
                        vscode.window.showInformationMessage(Constants.USER_MESSAGES.CONNECTED);
                    }
                }
            },
            (p_reason) => {
                this.leoIsConnecting = false;
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
        this.setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // Vanilla title for use with welcome content
        vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.TREE_OPENED, false);
        this.fileOpenedReady = false;
        vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.BRIDGE_READY, false);
        this.leoBridgeReady = false;
        this._leoBridgeReadyPromise = undefined;
        this.leoObjectSelected = false;
        this._updateLeoObjectIndicator();
        this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
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
        this.leoTreeDataProvider.refreshTreeNode(p_event.element);
    }
    private _onTreeViewCollapsedElement(p_event: vscode.TreeViewExpansionEvent<LeoNode>): void {
        this.selectTreeNode(p_event.element, true); // * select node when expanding to mimic Leo
        this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.COLLAPSE_NODE, p_event.element.apJson);
        // don't wait
        // this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
        this.leoTreeDataProvider.refreshTreeNode(p_event.element);
    }

    private _onTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        // *
        if (p_explorerView) {
            // (Facultative) Do something different if explorerView vs standalone outline pane
            // pass
        }
        if (p_event.visible && this._lastSelectedLeoNode) {
            this._lastOperationChangedTree = false;

            // ! NO REVEAL NOT GOOD IF USING DIFFERENT IDS - WILL NOT KEEP SELECTION/COLLAPSE STATE
            // this.leoTreeDataProvider.refreshTreeRoot(RevealType.NoReveal);
            this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);

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
        if (!p_event && this.leoObjectSelected) {
            return;
        }

        // TODO : MIMIC LEO
        // TODO : FIX UNUSED CYCLING

        // * Close and return if deleted
        if (p_event && p_event.document.uri.scheme === Constants.URI_SCHEME) {
            const w_editorGnx: string = p_event.document.uri.fsPath.substr(1);
            // If already deleted and not closed: just close it and return!
            if (!this.leoFileSystem.isGnxValid(w_editorGnx)) {
                vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.CLOSE_ACTIVE_EDITOR)
                    .then(() => {
                        console.log('got back from "closeActiveEditor" EDITOR HAD CHANGED TO A DELETED GNX!');
                    });
                return;
            }
            // * Reveal in outline tree if needed
            const w_node: LeoNode | undefined = this._leoTextDocumentNodesRef[w_editorGnx] ? this._leoTextDocumentNodesRef[w_editorGnx].node : undefined;

            if (w_node && this._lastSelectedLeoNode && (this._lastSelectedLeoNode.gnx !== w_node.gnx)) {
                // * setSelectedNode will also try to find by gnx if node doesn't exit and returns what it could select

                this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.SET_SELECTED_NODE, w_node.apJson).then((p_answer: LeoBridgePackage) => {
                    const p_selectedNode = this.apToLeoNode(p_answer.node);

                    this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
                    // this.reveal(p_selectedNode, { select: false, focus: false }).then(() => {
                    //     this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
                    // });

                    this._lastSelectedLeoNode = p_selectedNode;

                });
            }
        } else {
            // Delayed
            setTimeout(() => {
                this._closeExpiredActiveEditors();
            }, 0);
        }
        // * Status flag check
        if (vscode.window.activeTextEditor) {
            if (vscode.window.activeTextEditor.document.uri.scheme === Constants.URI_SCHEME) {
                if (!this.leoObjectSelected) {
                    // console.log("editor changed to : leo! SET STATUS!");
                    this.leoObjectSelected = true;
                    this._updateLeoObjectIndicator();
                    return;
                }
            } else {
                // console.log("editor changed to : other, no status!");
                if (this.leoObjectSelected) {
                    this.leoObjectSelected = false;
                    this._updateLeoObjectIndicator();
                    return;
                }
            }
        }
    }

    private _onChangeEditorSelection(p_event: vscode.TextEditorSelectionChangeEvent): void {
        // * The selection in an editor has changed. - just refresh the statusBar for now

        // TODO : MIMIC LEO
        // TODO : FIX UNUSED CYCLING

        // * Status flag check
        if (vscode.window.activeTextEditor) {
            // Yes an editor is active, just check if its leo scheme
            if (p_event.textEditor.document.uri.scheme === Constants.URI_SCHEME && vscode.window.activeTextEditor.document.uri.scheme === Constants.URI_SCHEME) {
                if (!this.leoObjectSelected) {
                    this.leoObjectSelected = true;
                    this._updateLeoObjectIndicatorDebounced();
                    return;
                }
            } else {
                if (this.leoObjectSelected) {
                    this.leoObjectSelected = false;
                    this._updateLeoObjectIndicatorDebounced();
                    return;
                }
            }
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
                if (this._lastSelectedLeoNode && p_event.document.uri.fsPath.substr(1) === this._lastSelectedLeoNode.gnx) {
                    if (!this._lastSelectedLeoNode.dirty || (this._lastSelectedLeoNode.hasBody === !p_event.document.getText().length)) {
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
            if (this._lastSelectedLeoNode && (w_param.gnx === this._lastSelectedLeoNode.gnx)) {
                if (!this._lastSelectedLeoNode.dirty || (this._lastSelectedLeoNode.hasBody === !w_param.body.length)) {
                    w_needsRefresh = true;
                    this._lastSelectedLeoNode.dirty = true;
                    this._lastSelectedLeoNode.hasBody = !!w_param.body.length;
                }
            }
            // * Maybe it was an 'aside' body pane, if so, force a full refresh
            // ! no longer true if single body opened at a time
            // if (this._lastSelectedLeoNode && (w_param.gnx !== this._lastSelectedLeoNode.gnx)) {
            //     w_needsRefresh = true;
            // }

            // * Perform refresh if needed
            // TODO : CHECK IF REFRESH IS APPROPRIATE
            if (p_forceRefreshTree || (w_needsRefresh && this._lastSelectedLeoNode)) {
                // console.log(p_forceRefreshTree ? 'force refresh' : 'needed refresh');
                // * Refresh root because of need to dirty parent if in derived file or a clone

                // ! NO REVEAL NOT GOOD IF USING DIFFERENT IDS - WILL NOT KEEP SELECTION/COLLAPSE STATE
                // this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect); // No focus this.leoTreeDataProvider.refreshTreeRoot
                this.leoTreeDataProvider.refreshTreeRoot(RevealType.NoReveal); // Test for id preservation

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

    private _setLeoTextDocumentNodesRef(p_gnx: string, p_leoNode: LeoNode, p_isSelected: boolean): void {

        // TODO : MIMIC LEO
        // TODO : MAY BE UNUSED IF ONLY ONE GNX AT A TIME

        if (this._leoTextDocumentNodesRef[p_gnx]) {
            if (p_isSelected) {
                // console.log('got selected');
                this._leoTextDocumentNodesRef[p_gnx].node = p_leoNode;
                this._leoTextDocumentNodesRef[p_gnx].refreshCount = this.outlineRefreshCount;
            } else if (this._lastOperationChangedTree && this._leoTextDocumentNodesRef[p_gnx].refreshCount < this.outlineRefreshCount) {
                // * keep original outlineRefreshCount
                this._leoTextDocumentNodesRef[p_gnx].node = p_leoNode;
            } else {
                // console.log('prevented');
            }
        }
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
            this,                   // _leoIntegration pointer
            (!this.revealSelectedNode && p_ap.selected && this._lastSelectedLeoNode) ? this._lastSelectedLeoNode.id : undefined // forced id
        );
        // * keep leoTextDocumentNodesRef up to date while converting any node
        this._setLeoTextDocumentNodesRef(w_leoNode.gnx, w_leoNode, p_ap.selected); // TODO : May be unneeded if single body opened at a time
        return w_leoNode;
    }

    private _revealConvertedNode(p_leoNode: LeoNode): void {
        // * Reveals a node in the outline. Select and focus if needed.

        // First setup flags for selecting and focusing based on the current reveal type needed
        const w_selectFlag = this.revealSelectedNode >= RevealType.RevealSelect; // at least RevealSelect
        let w_focusFlag = this.revealSelectedNode >= RevealType.RevealSelectFocus;  // at least RevealSelectFocus
        if (this.revealSelectedNode === RevealType.RevealSelectShowBody) {
            w_focusFlag = false;
        }
        const w_showBodyFlag = this.revealSelectedNode >= RevealType.RevealSelectFocusShowBody; // at least RevealSelectFocusShowBody

        // Flags are setup so now reveal, select and / or focus as needed
        this.revealSelectedNode = RevealType.NoReveal; // ok reset
        if (!this._lastSelectedLeoNode && this.revealSelectedNode < RevealType.RevealSelectFocusShowBody) { // very first time
            this._lastSelectedLeoNode = p_leoNode;
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
            if (this.revealSelectedNode && w_apData.selected) {
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
        if (this.leoTreeView.visible) {
            return this.leoTreeView.reveal(p_leoNode, p_options);
        }
        if (this.leoTreeExplorerView.visible && this.config.treeInExplorer) {
            return this.leoTreeExplorerView.reveal(p_leoNode, p_options);
        }
        // * Defaults to resolving even if both are hidden
        return Promise.resolve();
    }

    /*
    _.d8888b.  8888888888 888      8888888888 .d8888b. 88888888888       .d8888b.            .d8888b.  888    888  .d88888b.  888       888
    d88P  Y88b 888        888      888       d88P  Y88b    888          d88P  "88b          d88P  Y88b 888    888 d88P" "Y88b 888   o   888
    Y88b.      888        888      888       888    888    888          Y88b. d88P          Y88b.      888    888 888     888 888  d8b  888
    '"Y888b.   8888888    888      8888888   888           888           "Y8888P"            "Y888b.   8888888888 888     888 888 d888b 888
        "Y88b. 888        888      888       888           888          .d88P88K.d88P           "Y88b. 888    888 888     888 888d88888b888
        ''"888 888        888      888       888    888    888          888"  Y888P"              "888 888    888 888     888 88888P Y88888
    Y88b  d88P 888        888      888       Y88b  d88P    888          Y88b .d8888b        Y88b  d88P 888    888 Y88b. .d88P 8888P   Y8888
    '"Y8888P"  8888888888 88888888 8888888888 "Y8888P"     888           "Y8888P" Y88b       "Y8888P"  888    888  "Y88888P"  888P     Y888
    */

    public selectTreeNode(p_node: LeoNode, p_internalCall?: boolean, p_aside?: boolean): Thenable<boolean> {
        // * User has selected a node via mouse click or 'enter' keypress in the outline, otherwise flag p_internalCall if used internally
        if (!p_internalCall) {
            this._lastOperationChangedTree = false;
            this._leoTextDocumentNodesRef[p_node.gnx] = { // TODO : CENTRALIZE in leoOutline.ts
                node: p_node,
                refreshCount: this.outlineRefreshCount
            };
            this.leoObjectSelected = true; // Just Selected a node
            this._updateLeoObjectIndicator();
        }

        // TODO : Save and restore selection, along with cursor position, from selection object saved in each node (or gnx array)

        // * First check if having already this exact node selected
        if (p_node === this._lastSelectedLeoNode) {
            // same so just find and reopen
            this._locateOpenedBody(p_node.gnx);
            return this.showBody(p_aside);
        }

        // * Set selected node in Leo via leoBridge
        this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.SET_SELECTED_NODE, p_node.apJson);

        // * don't wait for promise to resolve a selection because there's no tree structure change
        this._triggerBodySave(); // trigger event to save previous document if timer to save if already started for another document

        this._lastSelectedLeoNode = p_node; // kept mostly in order to do refreshes if it changes, as opposed to a full tree refresh
        vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.SELECTED_MARKED, this._lastSelectedLeoNode.marked);

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

            if (this._lastSelectedLeoNode) {
                // set entry of leoNodes Ref : leoTextDocumentNodesRef
                // (used when showing a body text, to force selection of node when editor tabs are switched)
                if (this._leoTextDocumentNodesRef[p_document.uri.fsPath.substr(1)]) {
                    if (this._leoTextDocumentNodesRef[p_document.uri.fsPath.substr(1)].refreshCount < this.outlineRefreshCount) {
                        this._leoTextDocumentNodesRef[p_document.uri.fsPath.substr(1)].node = this._lastSelectedLeoNode;
                    }
                } else {
                    this._leoTextDocumentNodesRef[p_document.uri.fsPath.substr(1)] = {
                        node: this._lastSelectedLeoNode,
                        refreshCount: this.outlineRefreshCount
                    };
                }
            }
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
                    if (!this.leoFileSystem.isGnxValid(w_editorGnx)) {
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

    /*
    ..d8888b.   .d88888b.  888b     d888 888b     d888        d8888 888b    888 8888888b.   .d8888b.
    d88P  Y88b d88P" "Y88b 8888b   d8888 8888b   d8888       d88888 8888b   888 888  "Y88b d88P  Y88b
    888    888 888     888 88888b.d88888 88888b.d88888      d88P888 88888b  888 888    888 Y88b.
    888        888     888 888Y88888P888 888Y88888P888     d88P 888 888Y88b 888 888    888  "Y888b.
    888        888     888 888 Y888P 888 888 Y888P 888    d88P  888 888 Y88b888 888    888     "Y88b.
    888    888 888     888 888  Y8P  888 888  Y8P  888   d88P   888 888  Y88888 888    888       "888
    Y88b  d88P Y88b. .d88P 888   "   888 888   "   888  d8888888888 888   Y8888 888  .d88P Y88b  d88P
    '"Y8888P"   "Y88888P"  888       888 888       888 d88P     888 888    Y888 8888888P"   "Y8888P"
    */

    // * Standalone:
    // - editHeadline, insertNode

    public nodeAction(p_action: string, p_node?: LeoNode): Promise<LeoBridgePackage> {
        // * For actions that need no tree/body refreshes at all
        // - saveLeoFile, copyNode, copyNodeSelection
        if (!p_node && this._lastSelectedLeoNode) {
            p_node = this._lastSelectedLeoNode;
        }
        if (p_node) {
            return this.leoBridge.action(p_action, p_node.apJson).then(p_package => {
                this._lastOperationChangedTree = false;
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
                    this._lastOperationChangedTree = true;
                    this.leoTreeDataProvider.refreshTreeRoot(p_revealType); // refresh all, needed to get clones to refresh too!
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
            if (!p_node && this._lastSelectedLeoNode) {
                p_node = this._lastSelectedLeoNode;
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
                        return this.leoFileSystem.getExpiredGnxList();
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
                        return this.leoFileSystem.getRemainingWatchedGnxList();
                    })
                    .then((p_remainingGnxList) => {
                        // console.log('Back from get remaining Gnx List', p_remainingGnxList);
                        if (p_refreshBodyContent) {
                            this.leoFileSystem.fireRefreshFiles(); // watched files may have changed their content
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
                        this._lastOperationChangedTree = true;
                        this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelectFocusShowBody); // ! finish by refreshing the tree and selecting the node
                        this._leoBridgeActionBusy = false;
                    });
            }
        }
    }

    public editHeadline(p_node?: LeoNode, p_isSelectedNode?: boolean) {
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! editHeadline');
        } else {
            if (!p_node && this._lastSelectedLeoNode) {
                p_node = this._lastSelectedLeoNode;
            }
            if (p_node) {
                if (!p_isSelectedNode && p_node === this._lastSelectedLeoNode) {
                    p_isSelectedNode = true;
                }
                this._leoBridgeActionBusy = true;
                this._editHeadlineInputOptions.value = p_node.label; // preset input pop up
                vscode.window.showInputBox(this._editHeadlineInputOptions)
                    .then(p_newHeadline => {
                        if (p_newHeadline) {
                            p_node!.label = p_newHeadline; // ! When labels change, ids will change and that selection and expansion state cannot be kept stable anymore.
                            this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.SET_HEADLINE, utils.buildHeadlineJson(p_node!.apJson, p_newHeadline))
                                .then((p_answer: LeoBridgePackage) => {
                                    if (p_isSelectedNode) {
                                        this._forceBodyFocus = true;
                                    }
                                    this._lastOperationChangedTree = true;
                                    // ! p_revealSelection flag needed because we voluntarily refreshed the automatic ID
                                    this.leoTreeDataProvider.refreshTreeRoot(p_isSelectedNode ? RevealType.RevealSelect : RevealType.RevealSelectFocus); // refresh all, needed to get clones to refresh too!
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
            if (!p_node && this._lastSelectedLeoNode) {
                p_node = this._lastSelectedLeoNode;
            }
            if (p_node) {
                const w_node = p_node; // ref for .then
                // * New way of doing inserts: Show the input headline box, then either create the new node with the input, or with "New Headline" if canceled
                this._leoBridgeActionBusy = true;
                vscode.window.showInputBox(this._newHeadlineInputOptions)
                    .then(p_newHeadline => {
                        const w_action = p_newHeadline ? Constants.LEOBRIDGE_ACTIONS.INSERT_NAMED_PNODE : Constants.LEOBRIDGE_ACTIONS.INSERT_PNODE;
                        const w_para = p_newHeadline ? utils.buildHeadlineJson(w_node!.apJson, p_newHeadline) : w_node.apJson;
                        this.leoBridge.action(w_action, w_para)
                            .then(p_package => {
                                this.leoFileSystem.addGnx(p_package.node.gnx);
                                this._lastOperationChangedTree = true;
                                this._forceBodyFocus = true;
                                this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelectShowBody); // refresh all, needed to get clones to refresh too!
                                // this.focusBodyIfVisible(p_package.node.gnx);
                                this._leoBridgeActionBusy = false;
                            });
                    });
            }
        }
    }

    public showLogPane(): void {
        this.leoLogPane.show(true);
    }

    public refreshFromDiskNode(p_node?: LeoNode): void {
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! refreshFromDiskNode ');
        } else {
            this._leoBridgeActionBusy = true;
            this.nodeActionRefresh(Constants.LEOBRIDGE_ACTIONS.REFRESH_FROM_DISK_PNODE, p_node, RevealType.RevealSelectFocusShowBody).then(() => {
                this.leoFileSystem.fireRefreshFiles();
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

    /*
    ..d88888b. 88888888888 888    888 8888888888 8888888b.
    d88P" "Y88b    888     888    888 888        888   Y88b
    888     888    888     888    888 888        888    888
    888     888    888     8888888888 8888888    888   d88P
    888     888    888     888    888 888        8888888P"
    888     888    888     888    888 888        888 T88b
    Y88b. .d88P    888     888    888 888        888  T88b
    '"Y88888P"     888     888    888 8888888888 888   T88b
    */

    public log(p_message: string): void {
        // * Adds message string to leoInteg's log pane, used when leoBridge gets an async 'log' command
        this.leoLogPane.appendLine(p_message);
    }

    public showAskModalDialog(p_askArg: { "ask": string; "message": string; "yes_all": boolean; "no_all": boolean; }): void {
        // * Equivalent to runAskYesNoDialog from Leo's qt_gui.py, used when leoBridge gets an async 'ask' command
        // async package {"ask": title, "message": message, "yes_all": yes_all, "no_all": no_all}

        // Setup modal dialog to return one of 'yes', 'yes-all', 'no' or 'no-all', to be sent back with the leoBridge 'ASK_RESULT' action
        this._askResult = "no"; // defaults to not doing anything, matches isCloseAffordance just to be safe

        // const lastLine = p_askArg.message.substr(p_askArg.message.lastIndexOf("\n") + 1); // last line could be used in the message
        const w_items: AskMessageItem[] = [
            { title: Constants.USER_MESSAGES.YES, value: "yes", isCloseAffordance: false },
            { title: Constants.USER_MESSAGES.NO, value: "no", isCloseAffordance: true }
        ];
        if (p_askArg.yes_all) {
            w_items.push({ title: Constants.USER_MESSAGES.YES_ALL, value: "yes-all", isCloseAffordance: false });
        }
        if (p_askArg.no_all) {
            w_items.push({ title: Constants.USER_MESSAGES.NO_ALL, value: "no-all", isCloseAffordance: false });
        }
        const askRefreshInfoMessage: Thenable<AskMessageItem | undefined> = vscode.window.showInformationMessage(
            p_askArg.message,
            { modal: true },
            ...w_items
        );
        askRefreshInfoMessage.then((p_result: AskMessageItem | undefined) => {
            if (p_result) {
                this._askResult = p_result.value;
            }
            const w_sendResultPromise = this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.ASK_RESULT, '"' + this._askResult + '"');
            if (this._askResult.includes("yes")) {
                w_sendResultPromise.then(() => {
                    // Might have answered 'yes/yesAll' and refreshed and changed the body text
                    this._lastOperationChangedTree = true;
                    this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelectFocusShowBody);
                    this.leoFileSystem.fireRefreshFiles();
                });
            }
        });
    }

    public showWarnModalMessage(p_waitArg: any): void {
        // * Equivalent to runAskOkDialog from Leo's qt_gui.py, used when leoBridge gets an async 'warn' command
        // async package {"warn": "", "message": ""}
        vscode.window.showInformationMessage(
            p_waitArg.message,
            { modal: true }
        ).then(() => {
            this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.ASK_RESULT, '"ok"');
        });
    }

    public showChangesDetectedInfoMessage(p_infoArg: { "message": string; }): void {
        // * Show non-blocking info message about detected file changes, used when leoBridge gets an async 'info' command
        // TODO : Message pre-built elsewhere, and flags for refresh in independent event/call
        let w_message = "Changes to external files were detected.";
        switch (p_infoArg.message) {
            case Constants.ASYNC_INFO_MESSAGE_CODES.ASYNC_REFRESHED:
                w_message = w_message + Constants.USER_MESSAGES.REFRESHED;
                // * refresh
                this._lastOperationChangedTree = true;
                this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelectFocusShowBody);
                this.leoFileSystem.fireRefreshFiles();
                break;
            case Constants.ASYNC_INFO_MESSAGE_CODES.ASYNC_IGNORED:
                w_message = w_message + Constants.USER_MESSAGES.IGNORED;
                break;
            default:
                break;
        }
        vscode.window.showInformationMessage(w_message);
    }

    public saveLeoFile(): void {
        // * Invokes the self.commander.save() Leo command
        // TODO : Specify which file when supporting multiple simultaneous opened Leo files
        if (this._leoBridgeActionBusy) {
            console.log('Too fast! executeScript');
            return;
        }
        if (this._lastSelectedLeoNode) {
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
                    vscode.workspace.registerFileSystemProvider(Constants.URI_SCHEME, this.leoFileSystem, { isCaseSensitive: true })
                );
                // * Startup flag
                this.fileOpenedReady = true;
                // * First valid redraw of tree
                this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect); // p_revealSelection flag set
                // * set body URI for body filesystem
                this._bodyUri = vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_selectedLeoNode.gnx);
                // * set up first gnx<->leoNode reference
                this._leoTextDocumentNodesRef[p_selectedLeoNode.gnx] = {
                    node: p_selectedLeoNode,
                    refreshCount: this.outlineRefreshCount
                };
                // * First StatusBar appearance
                this._updateLeoObjectIndicator();
                this.leoStatusBarItem.show();
                // * Show leo log pane
                this.showLogPane();
                // * First Body appearance
                return this.leoFileSystem.refreshPossibleGnxList();
            })
            .then(p_list => {
                this.setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // Maybe unused when used with welcome content
                return vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.TREE_OPENED, true);
            })
            .then(p_setContextResult => {
                this.sendConfigToServer(this.config.getConfig());
                return this.showBody(false);
            });
    }

    private _updateLeoObjectIndicatorDebounced(): void {
        // * Update the status bar visual indicator flag in a debounced manner
        if (this._updateStatusBarTimeout) {
            clearTimeout(this._updateStatusBarTimeout);
        }
        this._updateStatusBarTimeout = setTimeout(() => {
            this._updateLeoObjectIndicator();
        }, 200);
    }

    private _updateLeoObjectIndicator(): void {
        // * Update the status bar visual indicator flag directly
        if (this._updateStatusBarTimeout) { // Can be called directly, so clear timer if any
            clearTimeout(this._updateStatusBarTimeout);
        }
        vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.SET_CONTEXT, Constants.CONTEXT_FLAGS.LEO_SELECTED, !!this.leoObjectSelected);
        this.leoStatusBarItem.text = Constants.GUI.STATUSBAR_INDICATOR + this.config.statusBarString;
        if (this.leoObjectSelected && this.fileOpenedReady) { // * Also check in constructor for statusBar properties (the createStatusBarItem call itself)
            this.leoStatusBarItem.color = "#" + this.config.statusBarColor;
            this.leoStatusBarItem.tooltip = Constants.USER_MESSAGES.STATUSBAR_TOOLTIP_ON;
        } else {
            this.leoStatusBarItem.color = this.statusbarNormalColor;
            this.leoStatusBarItem.tooltip = Constants.USER_MESSAGES.STATUSBAR_TOOLTIP_OFF;
        }
    }

    public showLeoCommands(): void {
        // * Offer all leo commands in the command palette (This opens the palette with string '>leo:' already typed)
        vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.QUICK_OPEN, Constants.GUI.QUICK_OPEN_LEO_COMMANDS);
    }

    public setTreeViewTitle(p_title: string): void {
        // * Set/Change outline pane title e.g. "NOT CONNECTED", "CONNECTED", "OUTLINE"
        // TODO : Use the new 'welcome Content' API, see https://code.visualstudio.com/api/extension-guides/tree-view#welcome-content
        if (this.leoTreeView) {
            this.leoTreeView.title = p_title;
        }
        if (this.leoTreeExplorerView) {
            this.leoTreeExplorerView.title = Constants.GUI.EXPLORER_TREEVIEW_PREFIX + p_title; // "NOT CONNECTED", "CONNECTED", "LEO: OUTLINE"
        }
    }

    public test(): void {
        // * Debugging utility function
        if (this.fileOpenedReady) {

            this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
            // this._showLeoCommands(); // lol

            // this.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.GET_SELECTED_NODE)
            //     .then((p_answer: LeoBridgePackage) => {
            //         console.log("Test got Back from getSelectedNode, now revealing :", p_answer.node.headline, p_answer.node.childIndex);
            //         // this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
            //         // this._lastOperationChangedTree = true;
            //         // this.outlineRefreshCount = this.outlineRefreshCount + 1;
            //         // return Promise.resolve(this.reveal(this.apToLeoNode(p_answer.node), { select: true, focus: true }));

            //         // this.reveal(this.apToLeoNode(p_answer.node), { select: false, focus: false }).then(() => {
            //         //     this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
            //         //     this._showLeoCommands(); // lol
            //         // });
            //     });
        } else {
            vscode.window.showInformationMessage("Click the folder icon on the Leo Outline sidebar to open a Leo file");
        }
    }
}