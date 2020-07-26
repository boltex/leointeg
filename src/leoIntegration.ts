import * as vscode from "vscode";
import { debounce } from "debounce";
import * as utils from "./utils";
import { Constants } from "./constants";
import { LeoBridgePackage, RevealType, ArchivedPosition, Icon, ConfigMembers, RefreshType, ChooseDocumentItem, LeoDocument, LeoBridgePackageOpenedInfo, MinibufferCommand } from "./types";
import { Config } from "./config";
import { LeoFilesBrowser } from "./leoFileBrowser";
import { LeoNode } from "./leoNode";
import { LeoOutlineProvider } from "./leoOutline";
import { LeoBodyProvider } from "./leoBody";
import { LeoBridge } from "./leoBridge";
import { ServerService } from "./serverManager";
import { LeoStatusBar } from "./leoStatusBar";
import { CommandStack } from "./commandStack";
import { LeoDocumentsProvider } from "./leoDocuments";
import { LeoDocumentNode } from "./leoDocumentNode";
import { LeoStates } from "./leoStates";
import { LeoButtonsProvider } from "./leoButtons";
import { LeoButtonNode } from "./leoButtonNode";

/**
 * * Orchestrates Leo integration into vscode with treeview and file system providers
 */
export class LeoIntegration {

    // * Status Flags
    private _leoIsConnecting: boolean = false; // Used in connect method to prevent other attempts while trying
    private _leoBridgeReadyPromise: Promise<LeoBridgePackage> | undefined; // Set when leoBridge has a leo controller ready
    private _currentOutlineTitle: string = Constants.GUI.TREEVIEW_TITLE_INTEGRATION; // Title has to be kept because it might need to be set (again) when either tree is first shown when switching visibility
    private _hasShownContextOpenMessage: boolean = false; // Used to show this information only once if a Leo file is opened via the explorer

    // * State flags
    public leoStates: LeoStates;

    // * Frontend command stack
    private _commandStack: CommandStack;

    // * Configuration Settings Service
    public config: Config; // Public configuration service singleton, used in leoSettingsWebview, leoBridge, and leoNode for inverted contrast

    // * Icon Paths
    public nodeIcons: Icon[] = []; // Singleton static array of all icon paths used in leoNodes for rendering in treeview
    public documentIcons: Icon[] = [];
    public buttonIcons: Icon[] = [];

    // * File Browser
    private _leoFilesBrowser: LeoFilesBrowser; // Browsing dialog service singleton used in the openLeoFile and save-as methods

    // * LeoBridge
    private _leoBridge: LeoBridge; // Singleton service to access leobridgeserver

    // * Outline Pane
    private _leoTreeDataProvider: LeoOutlineProvider; // TreeDataProvider single instance
    private _leoTreeStandaloneView: vscode.TreeView<LeoNode>; // Outline tree view added to the Tree View Container with an Activity Bar icon
    private _leoTreeExplorerView: vscode.TreeView<LeoNode>; // Outline tree view added to the Explorer Sidebar
    private _lastVisibleTreeView: vscode.TreeView<LeoNode>; // Outline tree view added to the Explorer Sidebar
    private _nextNodeId: number = Constants.STARTING_PACKAGE_ID; // Used to generate id's for new treeNodes: The id is used to preserve or set the selection and expansion states

    private _lastSelectedNode: LeoNode | undefined; // Last selected node we got a hold of; leoTreeView.selection maybe newer and unprocessed
    get lastSelectedNode(): LeoNode | undefined { // TODO : REMOVE NEED FOR UNDEFINED SUB TYPE WITH _needLastSelectedRefresh
        return this._lastSelectedNode;
    }
    set lastSelectedNode(p_leoNode: LeoNode | undefined) {  // TODO : REMOVE NEED FOR UNDEFINED SUB TYPE WITH _needLastSelectedRefresh
        // console.log(`Setting Last Selected Node:${p_leoNode!.label}, with id: ${p_leoNode!.id}`);
        this._lastSelectedNode = p_leoNode;
        if (p_leoNode) {
            utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_MARKED, p_leoNode.marked); // Global context to 'flag' the selected node's marked state
        }
    }

    // * Outline Pane redraw/refresh flags. Also set when calling refreshTreeRoot
    // If there's no reveal and its the selected node, the old id will be re-used for the node. (see _id property in LeoNode)
    private _revealType: RevealType = RevealType.NoReveal; // to be read/cleared in arrayToLeoNodesArray, to check if any should self-select
    private _preventShowBody = false; // Used when refreshing treeview from config: It requires not to open the body pane when refreshing.

    // * Documents Pane
    private _leoDocumentsProvider: LeoDocumentsProvider;
    private _leoDocuments: vscode.TreeView<LeoDocumentNode>;
    private _leoDocumentsExplorer: vscode.TreeView<LeoDocumentNode>;
    private _currentDocumentChanged: boolean = false; // if clean and an edit is done: refresh opened documents view

    // * Commands stack finishing resolving "refresh flags", for type of refresh after finishing stack
    private _needRefreshBody: boolean = false; // Flag for commands that might change current body
    private _fromOutline: boolean = false; // Last command issued had focus on outline, as opposed to the body
    private _focusInterrupt: boolean = false; // Flag for preventing setting focus when interrupting (canceling) an 'insert node' text input dialog with another one

    // * Body Pane
    private _bodyFileSystemStarted: boolean = false;
    private _leoFileSystem: LeoBodyProvider; // as per https://code.visualstudio.com/api/extension-guides/virtual-documents#file-system-api
    private _bodyTextDocument: vscode.TextDocument | undefined; // Set when selected in tree by user, or opening a Leo file in showBody. and by _locateOpenedBody.
    private _bodyMainSelectionColumn: vscode.ViewColumn | undefined; // Column of last body 'textEditor' found, set to 1

    private _bodyUri: vscode.Uri = utils.strToLeoUri("");
    get bodyUri(): vscode.Uri {
        return this._bodyUri;
    }
    set bodyUri(p_uri: vscode.Uri) {
        this._leoFileSystem.setBodyTime(p_uri);
        this._bodyUri = p_uri;
    }

    // * '@button' pane
    private _leoButtonsProvider: LeoButtonsProvider;
    private _leoButtons: vscode.TreeView<LeoButtonNode>;
    private _leoButtonsExplorer: vscode.TreeView<LeoButtonNode>;

    // * Log Pane
    private _leoLogPane: vscode.OutputChannel = vscode.window.createOutputChannel(Constants.GUI.LOG_PANE_TITLE);

    // * Terminal Pane
    private _leoTerminalPane: vscode.OutputChannel | undefined;

    // * Status Bar
    private _leoStatusBar: LeoStatusBar;

    // * Edit/Insert Headline Input Box options instance, setup so clicking outside cancels the headline change
    private _headlineInputOptions: vscode.InputBoxOptions = { ignoreFocusOut: false, value: "", valueSelection: undefined, prompt: "" };

    // * Automatic leobridgeserver startup management service
    private _serverService: ServerService;

    // * Timing
    private _needLastSelectedRefresh = false;
    private _bodyLastChangedDocument: vscode.TextDocument | undefined; // Only set in _onDocumentChanged

    // * Debounced method used to get states for UI display flags (commands such as undo, redo, save, ...)
    public getStates: (() => void) & {
        clear(): void;
    } & {
        flush(): void;
    };

    constructor(private _context: vscode.ExtensionContext) {
        // * Setup States
        this.leoStates = new LeoStates(_context, this);

        // * Get configuration settings
        this.config = new Config(_context, this);
        this.config.buildFromSavedSettings();

        // * Build Icon filename paths
        this.nodeIcons = utils.buildNodeIconPaths(_context);
        this.documentIcons = utils.buildDocumentIconPaths(_context);
        this.buttonIcons = utils.buildButtonsIconPaths(_context);

        // * File Browser
        this._leoFilesBrowser = new LeoFilesBrowser(_context);

        // * Setup leoBridge
        this._leoBridge = new LeoBridge(_context, this);

        // * Setup frontend command stack
        this._commandStack = new CommandStack(_context, this);

        // * Same data provider for both outline trees, Leo view and Explorer view
        this._leoTreeDataProvider = new LeoOutlineProvider(this);

        // * Leo view and Explorer view outline panes - Uses 'select node' command, so 'onDidChangeSelection' is not used
        this._leoTreeStandaloneView = vscode.window.createTreeView(Constants.TREEVIEW_ID, { showCollapseAll: false, treeDataProvider: this._leoTreeDataProvider });
        this._leoTreeStandaloneView.onDidExpandElement((p_event => this._onChangeCollapsedState(p_event, true, this._leoTreeStandaloneView)));
        this._leoTreeStandaloneView.onDidCollapseElement((p_event => this._onChangeCollapsedState(p_event, false, this._leoTreeStandaloneView)));
        this._leoTreeStandaloneView.onDidChangeVisibility((p_event => this._onTreeViewVisibilityChanged(p_event, false))); // * Trigger 'show tree in Leo's view'
        this._leoTreeExplorerView = vscode.window.createTreeView(Constants.TREEVIEW_EXPLORER_ID, { showCollapseAll: false, treeDataProvider: this._leoTreeDataProvider });
        this._leoTreeExplorerView.onDidExpandElement((p_event => this._onChangeCollapsedState(p_event, true, this._leoTreeExplorerView)));
        this._leoTreeExplorerView.onDidCollapseElement((p_event => this._onChangeCollapsedState(p_event, false, this._leoTreeExplorerView)));
        this._leoTreeExplorerView.onDidChangeVisibility((p_event => this._onTreeViewVisibilityChanged(p_event, true))); // * Trigger 'show tree in explorer view'
        this._lastVisibleTreeView = this.config.treeInExplorer ? this._leoTreeExplorerView : this._leoTreeStandaloneView;

        // * Leo Opened Documents Treeview Providers and tree views
        this._leoDocumentsProvider = new LeoDocumentsProvider(this);
        this._leoDocuments = vscode.window.createTreeView(Constants.DOCUMENTS_ID, { showCollapseAll: false, treeDataProvider: this._leoDocumentsProvider });
        this._leoDocuments.onDidChangeVisibility((p_event => this._onDocTreeViewVisibilityChanged(p_event, false)));
        this._leoDocumentsExplorer = vscode.window.createTreeView(Constants.DOCUMENTS_EXPLORER_ID, { showCollapseAll: false, treeDataProvider: this._leoDocumentsProvider });
        this._leoDocumentsExplorer.onDidChangeVisibility((p_event => this._onDocTreeViewVisibilityChanged(p_event, true)));

        // * '@buttons' Treeview Providers and tree views
        this._leoButtonsProvider = new LeoButtonsProvider(this);
        this._leoButtons = vscode.window.createTreeView(Constants.BUTTONS_ID, { showCollapseAll: false, treeDataProvider: this._leoButtonsProvider });
        this._leoButtons.onDidChangeVisibility((p_event => this._onButtonsTreeViewVisibilityChanged(p_event, false)));
        this._leoButtonsExplorer = vscode.window.createTreeView(Constants.BUTTONS_EXPLORER_ID, { showCollapseAll: false, treeDataProvider: this._leoButtonsProvider });
        this._leoButtonsExplorer.onDidChangeVisibility((p_event => this._onButtonsTreeViewVisibilityChanged(p_event, true)));

        // * Body Pane
        this._leoFileSystem = new LeoBodyProvider(this);
        this._bodyMainSelectionColumn = 1;

        // * Status bar: Show keyboard-Shortcut-Flag to signify Leo keyboard shortcuts are active
        this._leoStatusBar = new LeoStatusBar(_context, this);

        // * Automatic server start service
        this._serverService = new ServerService(_context, this);

        // * React to change in active panel/text editor (window.activeTextEditor) - also fires when the active editor becomes undefined
        vscode.window.onDidChangeActiveTextEditor(p_event => this._onActiveEditorChanged(p_event));

        // * The selection in an output panel or any other editor has changed
        // vscode.window.onDidChangeTextEditorSelection(p_event => this._onChangeEditorSelection(p_event)); // ! Not used for now

        // * The view column of an editor has changed (when shifting editors through closing/inserting editors or closing columns)
        // No effect when dragging editor tabs: it just closes and reopens in other column, see '_onChangeVisibleEditors'
        vscode.window.onDidChangeTextEditorViewColumn(() => this.triggerBodySave());

        // * Triggers when a different text editor in any column, either tab or body, is focused
        // This is also what triggers after drag and drop, see '_onChangeEditorViewColumn'
        vscode.window.onDidChangeVisibleTextEditors(() => this.triggerBodySave());

        // * Triggers when a vscode window have gained or lost focus
        vscode.window.onDidChangeWindowState(() => this.triggerBodySave());

        // * Edited and saved the document, does it on any document in editor
        // vscode.workspace.onDidSaveTextDocument(p_event => this._onDocumentSaved(p_event)); // ! Not used for now

        // * React when typing and changing body pane
        vscode.workspace.onDidChangeTextDocument(p_event => this._onDocumentChanged(p_event)); // * Detect when user types in body pane here

        // * React to configuration settings events
        vscode.workspace.onDidChangeConfiguration(p_event => this._onChangeConfiguration(p_event));

        vscode.workspace.onDidOpenTextDocument(p_document => this._onDidOpenTextDocument(p_document));

        // * Debounced refresh flags and UI parts, other than the tree and body, when operation(s) are done executing
        this.getStates = debounce(this._triggerGetStates, Constants.STATES_DEBOUNCE_DELAY);
    }

    /**
     * *  Sends an action for leobridgeserver.py to run with Leo. This is used mostly by LeoAsync, leoOutline and leoBody.
     * @param p_action is the action string constant, from Constants.LEOBRIDGE
     * @param p_jsonParam (optional, defaults to "null", which translates to None in python) a JSON string to be given to the python side, often built with JSON.stringify(object)
     * @param p_deferredPayload (optional) a pre-made package that will be given back as the response, instead of package coming back from python
     * @param p_preventCall (optional) Flag for special case, only used at startup
     * @returns a Promise that will contain the JSON package answered back by leobridgeserver.py
     */
    public sendAction(p_action: string, p_jsonParam = "null", p_deferredPayload?: LeoBridgePackage, p_preventCall?: boolean): Promise<LeoBridgePackage> {
        return this._leoBridge.action(p_action, p_jsonParam, p_deferredPayload, p_preventCall);
    }

    /**
     * * leoInteg starting entry point: Start a leoBridge server, and/or establish a connection to a server, based on config settings.
     */
    public startNetworkServices(): void {
        // * Check settings and start a server accordingly
        if (this.config.startServerAutomatically) {
            this.startServer();
        } else {
            // * (via settings) Connect to Leo Bridge server automatically without starting one first
            if (this.config.connectToServerAutomatically) {
                this.connect();
            }
        }
    }

    /**
     * * Starts an instance of a leoBridge server, and may connect to it afterwards, based on configuration flags.
     */
    public startServer(): void {
        if (!this._leoTerminalPane) {
            this._leoTerminalPane = vscode.window.createOutputChannel(Constants.GUI.TERMINAL_PANE_TITLE);
        }
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

    /**
     * * Initiate a connection to the leoBridge server, then show view title, log pane, and set 'bridge ready' flags.
     */
    public connect(): void {
        if (this.leoStates.leoBridgeReady || this._leoIsConnecting) {
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
                    this.leoStates.leoBridgeReady = true;
                    utils.setContext(Constants.CONTEXT_FLAGS.BRIDGE_READY, true);
                    this.showLogPane();
                    setTimeout(() => {
                        this._openLastFiles(); // Try to open last opened files, if any
                    }, 0);
                    if (!this.config.connectToServerAutomatically) {
                        vscode.window.showInformationMessage(Constants.USER_MESSAGES.CONNECTED);
                    }
                }

                // TODO : Finish Closing and possibly SAME FOR OPENING AND CONNECTING
                // TODO : #14 @boltex COULD BE SOME FILES ALREADY OPENED OR NONE!

            },
            (p_reason) => {
                this._leoIsConnecting = false;
                this.cancelConnect(Constants.USER_MESSAGES.CONNECT_FAILED + p_reason);
            });
    }

    /**
     * * Cancels websocket connection and reverts context flags. Called from leoBridge.ts when its websocket reports disconnection.
     * @param p_message
     */
    public cancelConnect(p_message?: string): void {
        // 'disconnect error' versus 'failed to connect'
        if (this.leoStates.leoBridgeReady) {
            vscode.window.showErrorMessage(p_message ? p_message : Constants.USER_MESSAGES.DISCONNECTED);
        } else {
            vscode.window.showInformationMessage(p_message ? p_message : Constants.USER_MESSAGES.DISCONNECTED);
        }
        this.leoStates.fileOpenedReady = false;
        this.leoStates.leoBridgeReady = false;
        this._leoBridgeReadyPromise = undefined;
        this._leoStatusBar.update(false);
        this._refreshOutline(RevealType.RevealSelect);
    }

    /**
     * * Send configuration through leoBridge to the server script, mostly used when checking if refreshing derived files is optional.
     * @param p_config A config object containing all the configuration settings
     */
    public sendConfigToServer(p_config: ConfigMembers): void {
        if (this.leoStates.fileOpenedReady) {
            this.sendAction(Constants.LEOBRIDGE.APPLY_CONFIG, JSON.stringify(p_config)).then(p_package => {
                // Back from applying configuration to leobridgeserver.py
            });
        }
    }

    /**
     * * Open Leo files found in context.globalState.leoFiles
     */
    private _openLastFiles(): void {
        // Loop through context.globalState.<something> and check if they exist: open them
        const w_lastFiles: string[] = this._context.globalState.get(Constants.LAST_FILES_KEY) || [];
        if (w_lastFiles.length) {
            this._leoBridge.action(Constants.LEOBRIDGE.OPEN_FILES, JSON.stringify({ "files": w_lastFiles }))
                .then((p_openFileResult: LeoBridgePackage) => {
                    return this._setupOpenedLeoDocument(p_openFileResult.opened!);
                }, p_errorOpen => {
                    console.log('in .then not opened or already opened');
                    return Promise.reject(p_errorOpen);
                });
        }
    }

    /**
     * * Adds to the context.globalState.<xxx>files if not already in there (no duplicates)
     * @param p_file path+file name string
     */
    private _addRecentAndLastFile(p_file: string): void {
        if (!p_file.length) {
            return;
        }
        // just push that string into the context.globalState.<something> array
        const w_recentFiles: string[] = this._context.globalState.get(Constants.RECENT_FILES_KEY) || [];
        if (w_recentFiles) {
            if (!w_recentFiles.includes(p_file)) {
                w_recentFiles.push(p_file);
                if (w_recentFiles.length > 10) {
                    w_recentFiles.shift();
                }
            }
            this._context.globalState.update(Constants.RECENT_FILES_KEY, w_recentFiles); // update with added file
        } else {
            // First so create key entry
            this._context.globalState.update(Constants.RECENT_FILES_KEY, [p_file]); // array of single file
        }
        // lastFiles too
        // TODO : REFACTOR IF DUPLICATE CODE
        const w_lastFiles: string[] = this._context.globalState.get(Constants.LAST_FILES_KEY) || [];
        if (w_lastFiles) {
            if (!w_lastFiles.includes(p_file)) {
                w_lastFiles.push(p_file);
                if (w_lastFiles.length > 10) {
                    w_lastFiles.shift();
                }
            }
            this._context.globalState.update(Constants.LAST_FILES_KEY, w_lastFiles); // update with added file
        } else {
            // First so create key entry
            this._context.globalState.update(Constants.LAST_FILES_KEY, [p_file]); // array of single file
        }
    }

    /**
     * * Removes from context.globalState.leoRecentFiles if found (should not have duplicates)
     * @param p_file path+file name string
     */
    private _removeRecentFile(p_file: string): void {
        // TODO : BEFORE SAVE-AS IF ALREADY SAVED
        // Check if exist in context.globalState.<something> and remove if found
        const w_recentFiles: string[] = this._context.globalState.get(Constants.RECENT_FILES_KEY) || [];
        if (w_recentFiles && w_recentFiles.includes(p_file)) {
            w_recentFiles.splice(w_recentFiles.indexOf(p_file), 1);
            this._context.globalState.update(Constants.RECENT_FILES_KEY, w_recentFiles); // update with added file
        }
    }

    /**
     * * Removes from context.globalState.leoLastFiles if found (should not have duplicates)
     * @param p_file path+file name string
     */
    private _removeLastFile(p_file: string): void {
        // Check if exist in context.globalState.<something> and remove if found
        const w_lastFiles: string[] = this._context.globalState.get(Constants.LAST_FILES_KEY) || [];
        if (w_lastFiles && w_lastFiles.includes(p_file)) {
            w_lastFiles.splice(w_lastFiles.indexOf(p_file), 1);
            this._context.globalState.update(Constants.LAST_FILES_KEY, w_lastFiles); // update with added file
        }
    }

    /**
     * * Shows the recent Leo files list, choosing one will open it
     */
    public showRecentLeoFiles(): void {
        const w_recentFiles: string[] = this._context.globalState.get(Constants.RECENT_FILES_KEY) || [];
        if (!w_recentFiles.length) { return; }
        vscode.window.showQuickPick(
            w_recentFiles,
            { placeHolder: Constants.USER_MESSAGES.OPEN_RECENT_FILE }
        )
            .then(p_result => {
                if (p_result) {
                    this.openLeoFile(vscode.Uri.file(p_result));
                }
            });
    }

    /**
     * * Reveals the leoBridge server terminal output if not already visible
     */
    public showTerminalPane(): void {
        if (this._leoTerminalPane) {
            this._leoTerminalPane.show(true);
        }
    }

    /**
     * * Hides the leoBridge server terminal output
     */
    public hideTerminalPane(): void {
        if (this._leoTerminalPane) {
            this._leoTerminalPane.hide();
        }
    }

    /**
     * * Adds a message string to leoInteg's leoBridge server terminal output.
     * @param p_message The string to be added in the log
     */
    public addTerminalPaneEntry(p_message: string): void {
        if (this._leoTerminalPane) {
            this._leoTerminalPane.appendLine(p_message);
        }
    }

    /**
     * * Reveals the log pane if not already visible
     */
    public showLogPane(): void {
        this._leoLogPane.show(true);
    }

    /**
     * * Hides the log pane
     */
    public hideLogPane(): void {
        this._leoLogPane.hide();
    }

    /**
     * * Adds a message string to leoInteg's log pane. Used when leoBridge receives an async 'log' command.
     * @param p_message The string to be added in the log
     */
    public addLogPaneEntry(p_message: string): void {
        this._leoLogPane.appendLine(p_message);
    }

    /**
     * * 'getStates' action for use in debounced method call
     */
    private _triggerGetStates(): void {
        // Debounced timer has triggered so perform getStates action
        this._leoDocumentsProvider.refreshTreeRoot();
        this._leoButtonsProvider.refreshTreeRoot();
        this.sendAction(Constants.LEOBRIDGE.GET_STATES).then((p_package: LeoBridgePackage) => {
            if (p_package.states) {
                this.leoStates.setLeoStateFlags(p_package.states);
            }
        });
    }

    /**
     * * Returns the 'busy' state flag of the command stack, and leoBridge stack, while showing a message if it is.
     * Needed by special unstackable commands such as new, open,...
     */
    private _isBusy(p_all?: boolean): boolean {
        if (this._commandStack.size() || (p_all && this._leoBridge.isBusy())) {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.TOO_FAST);
            return true;
        } else {
            return false;
        }
    }

    /**
     * * Returns true if the current opened Leo document's filename has some content. (not a new unnamed file)
     */
    private _isCurrentFileNamed(): boolean {
        return !!this.leoStates.leoOpenedFileName.length; // checks if it's an empty string
    }

    /**
     * * Setup leoInteg's UI for having no opened Leo documents
     */
    private _setupNoOpenedLeoDocument(): void {
        this.leoStates.fileOpenedReady = false;
        this._bodyTextDocument = undefined;
        this.lastSelectedNode = undefined;
        this._refreshOutline(RevealType.RevealSelectFocus);
        this.closeBody();
    }

    /**
     * * A Leo file was opened: setup leoInteg's UI accordingly.
     */
    private _setupOpenedLeoDocument(p_openFileResult: LeoBridgePackageOpenedInfo): Thenable<vscode.TextEditor> {
        const w_selectedLeoNode = this.apToLeoNode(p_openFileResult.node, false); // Just to get gnx for the body's fist appearance
        this.leoStates.leoOpenedFileName = p_openFileResult.filename;

        // * If not unnamed file add to recent list & last opened list
        this._addRecentAndLastFile(p_openFileResult.filename);

        // * Could be already opened, so perform 'rename hack' as if another node was selected
        if (this._bodyTextDocument && this.bodyUri) {
            this._switchBody(w_selectedLeoNode.gnx);
        } else {
            this.bodyUri = utils.strToLeoUri(w_selectedLeoNode.gnx);
        }

        // * Start body pane system
        if (!this._bodyFileSystemStarted) {
            this._context.subscriptions.push(
                vscode.workspace.registerFileSystemProvider(Constants.URI_LEO_SCHEME, this._leoFileSystem, { isCaseSensitive: true })
            );
            this._bodyFileSystemStarted = true;
        }
        // * Startup flag
        this.leoStates.fileOpenedReady = true;
        // * Maybe first valid redraw of tree along with the selected node and its body
        this._refreshOutline(RevealType.RevealSelectFocus); // p_revealSelection flag set
        // this.setTreeViewTitle(Constants.GUI.TREEVIEW_TITLE); // ? Maybe unused when used with welcome content
        // * Maybe first StatusBar appearance
        this._leoStatusBar.update(true, 0, true);
        this._leoStatusBar.show(); // Just selected a node
        // * Show leo log pane
        this.showLogPane();
        // * Send config to python's side (for settings such as defaultReloadIgnore and checkForChangeExternalFiles)
        this.sendConfigToServer(this.config.getConfig());
        // * Refresh Opened tree views
        this._leoDocumentsProvider.refreshTreeRoot();
        this._leoButtonsProvider.refreshTreeRoot();
        // * Maybe first Body appearance
        return this.showBody(false);
    }

    /**
     * * Handles the change of vscode config: a onDidChangeConfiguration event triggered
     * @param p_event The configuration-change event passed by vscode
     */
    private _onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {
        if (p_event.affectsConfiguration(Constants.CONFIG_NAME)) {
            this.config.buildFromSavedSettings();
        }
    }

    /**
     * * Handles the opening of a file in vscode, and check if it's a Leo file
     * @param p_event The opened document event passed by vscode
     */
    private _onDidOpenTextDocument(p_document: vscode.TextDocument): void {
        if (this.leoStates.leoBridgeReady && p_document.uri.scheme === Constants.URI_FILE_SCHEME && p_document.uri.fsPath.toLowerCase().endsWith(".leo")) {
            if (!this._hasShownContextOpenMessage) {
                vscode.window.showInformationMessage(Constants.USER_MESSAGES.RIGHT_CLICK_TO_OPEN);
                this._hasShownContextOpenMessage = true;
            }
            // vscode.window.showQuickPick(
            //     [Constants.USER_MESSAGES.YES, Constants.USER_MESSAGES.NO],
            //     { placeHolder: Constants.USER_MESSAGES.OPEN_WITH_LEOINTEG }
            // )
            //     .then(p_result => {
            //         if (p_result && p_result === Constants.USER_MESSAGES.YES) {
            //             const w_uri = p_document.uri;
            //             vscode.window.showTextDocument(p_document.uri, { preview: true, preserveFocus: false })
            //                 .then(() => {
            //                     return vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            //                 })
            //                 .then(() => {
            //                     this.openLeoFile(w_uri);
            //                 });
            //         }
            //     });
        }
    }

    /**
     * * Handles the node expanding and collapsing interactions by the user in the treeview
     * @param p_event The event passed by vscode
     * @param p_expand True if it was an expand, false if it was a collapse event
     * @param p_treeView Pointer to the treeview itself, either the standalone treeview or the one under the explorer
     */
    private _onChangeCollapsedState(p_event: vscode.TreeViewExpansionEvent<LeoNode>, p_expand: boolean, p_treeView: vscode.TreeView<LeoNode>): void {
        // * Expanding or collapsing via the treeview interface selects the node to mimic Leo
        this.triggerBodySave(true);
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

    /**
     * * Handle the change of visibility of either outline treeview and refresh it if its visible
     * @param p_event The treeview-visibility-changed event passed by vscode
     * @param p_explorerView Flag to signify that the treeview who triggered this event is the one in the explorer view
     */
    private _onTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        if (p_event.visible) {
            this._lastVisibleTreeView = p_explorerView ? this._leoTreeExplorerView : this._leoTreeStandaloneView;
            this.setTreeViewTitle();
            this._needLastSelectedRefresh = true; // Its a new node in a new tree so refresh lastSelectedNode too
            this._refreshOutline(RevealType.RevealSelect);
        }
    }

    /**
     * * Handle the change of visibility of either outline treeview and refresh it if its visible
     * @param p_event The treeview-visibility-changed event passed by vscode
     * @param p_explorerView Flag to signify that the treeview who triggered this event is the one in the explorer view
     */
    private _onDocTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        if (p_explorerView) {
            // (Facultative/unused) Do something different if explorer view is used, instead of the standalone outline pane
        }
        if (p_event.visible) {
            this._leoDocumentsProvider.refreshTreeRoot();
        }
    }

    /**
     * * Handle the change of visibility of either outline treeview and refresh it if its visible
     * @param p_event The treeview-visibility-changed event passed by vscode
     * @param p_explorerView Flag to signify that the treeview who triggered this event is the one in the explorer view
     */
    private _onButtonsTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        if (p_explorerView) {
            // (Facultative/unused) Do something different if explorer view is used, instead of the standalone outline pane
        }
        if (p_event.visible) {
            this._leoButtonsProvider.refreshTreeRoot();
        }
    }

    /**
     * * Handles detection of the active editor having changed from one to another, or closed
     * TODO : Make sure the selection in tree if highlighted when a body pane is selected
     * @param p_event The editor itself that is now active
     * @param p_internalCall Flag used to signify the it was called voluntarily by leoInteg itself
     */
    private _onActiveEditorChanged(p_event: vscode.TextEditor | undefined, p_internalCall?: boolean): void {
        if (!p_internalCall) {
            this.triggerBodySave(true);// Save in case edits were pending
        }
        // * Status flag check
        if (!p_event && this._leoStatusBar.statusBarFlag) {
            return;
        }
        // * Status flag check
        if (vscode.window.activeTextEditor) {
            this._leoStatusBar.update(vscode.window.activeTextEditor.document.uri.scheme === Constants.URI_LEO_SCHEME);
        }
    }

    /**
     * * Handle typing that was detected in a document
     * @param p_event Text changed event passed by vscode
     */
    private _onDocumentChanged(p_event: vscode.TextDocumentChangeEvent): void {
        // ".length" check necessary, see https://github.com/microsoft/vscode/issues/50344
        if (p_event.contentChanges.length && (p_event.document.uri.scheme === Constants.URI_LEO_SCHEME)) {

            // * There was an actual change on a Leo Body by the user
            this._bodyLastChangedDocument = p_event.document;
            this._fromOutline = false; // Focus is on body pane

            // * If icon should change then do it now (if there's no document edit pending)
            if (this.lastSelectedNode && (!this._currentDocumentChanged || utils.leoUriToStr(p_event.document.uri) === this.lastSelectedNode.gnx)) {
                const w_hasBody = !!(p_event.document.getText().length);
                if (utils.isIconChangedByEdit(this.lastSelectedNode, w_hasBody)) {
                    this._bodySaveDocument(p_event.document)
                        .then(() => {
                            this.lastSelectedNode!.dirty = true;
                            this.lastSelectedNode!.hasBody = w_hasBody;
                            this._refreshOutline(RevealType.NoReveal); // NoReveal for keeping the same id and selection
                        });
                    return; // * Don't continue
                }
            }
        }
    }

    /**
     * * Save body to Leo if its dirty. That is, only if a change has been made to the body 'document' so far
     * @param p_forcedVsCodeSave Flag to also have vscode 'save' the content of this editor through the filesystem
     */
    public triggerBodySave(p_forcedVsCodeSave?: boolean): Thenable<boolean> {
        // * Save body to Leo if a change has been made to the body 'document' so far
        if (this._bodyLastChangedDocument && this._bodyLastChangedDocument.isDirty) {
            const w_document = this._bodyLastChangedDocument; // backup for bodySaveDocument before reset
            this._bodyLastChangedDocument = undefined; // reset to make falsy
            return this._bodySaveDocument(w_document, p_forcedVsCodeSave);
        } else {
            this._bodyLastChangedDocument = undefined;
            return Promise.resolve(true);
        }
    }

    /**
     * * Sets new body text on leo's side, and may optionally save vsCode's body editor (which will trim spaces)
     * @param p_document Vscode's text document which content will be used to be the new node's body text in Leo
     * @param p_forcedVsCodeSave Flag to also have vscode 'save' the content of this editor through the filesystem
     */
    private _bodySaveDocument(p_document: vscode.TextDocument, p_forcedVsCodeSave?: boolean): Thenable<boolean> {
        if (p_document) {
            // * Fetch gnx and document's body text first, to be reused more than once in this method
            const w_param = {
                gnx: utils.leoUriToStr(p_document.uri),
                body: p_document.getText()
            };
            return this.sendAction(Constants.LEOBRIDGE.SET_BODY, JSON.stringify(w_param)).then(() => {
                this.getStates();
                if (p_forcedVsCodeSave) {
                    return p_document.save(); // ! USED INTENTIONALLY: This trims trailing spaces
                }
                return Promise.resolve(p_document.isDirty);
            });
        } else {
            return Promise.resolve(false);
        }
    }

    /**
     * * Places selection on the required node in a 'timeout'. Used after refreshing the opened Leo documents view.
     * @param p_documentNode Document node instance in the Leo document view to be the 'selected' one.
     */
    public setDocumentSelection(p_documentNode: LeoDocumentNode): void {
        this._currentDocumentChanged = p_documentNode.documentEntry.changed;
        this.leoStates.leoOpenedFileName = p_documentNode.documentEntry.name;
        setTimeout(() => {
            if (!this._leoDocuments.visible && !this._leoDocumentsExplorer.visible) {
                return;
            }
            let w_trigger = false;
            let w_docView: vscode.TreeView<LeoDocumentNode>;
            if (this._leoDocuments.visible) {
                w_docView = this._leoDocuments;
            } else {
                w_docView = this._leoDocumentsExplorer;
            }
            if (w_docView.selection.length && w_docView.selection[0] === p_documentNode) {
                // console.log('already selected!');
            } else {
                w_trigger = true;
            }
            if (w_trigger) {
                w_docView.reveal(p_documentNode, { select: true, focus: false });
            }
        });
    }

    /**
     * * Show the outline, with Leo's selected node also selected, and optionally focussed
     * @param p_focusOutline Flag for focus to be placed in outline
     */
    public showOutline(p_focusOutline: boolean): void {
        if (this._lastSelectedNode) {
            this._lastVisibleTreeView.reveal(this._lastSelectedNode, {
                select: true,
                focus: p_focusOutline
            }).then(() => {
                // console.log('done showing/revealing outline');
            });
        }
    }

    /**
     * * Refresh tree for 'node hover icons' refresh
     * only after changing settings
     */
    public configTreeRefresh(): void {
        if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
            this._revealType = RevealType.RevealSelect;
            this._preventShowBody = true;
            this._leoTreeDataProvider.refreshTreeRoot();
        }
    }

    /**
     * * Refreshes the outline. A reveal type can be passed along to specify the reveal type for the selected node
     * @param p_revealType Facultative reveal type to specify type of reveal when the 'selected node' is encountered
     */
    private _refreshOutline(p_revealType?: RevealType): void {
        if (p_revealType !== undefined) { // To check if selected node should self-select while redrawing whole tree
            this._revealType = p_revealType; // To be read/cleared (in arrayToLeoNodesArray instead of directly by nodes)
        }
        // Force showing last used Leo outline first
        if (this._lastSelectedNode && !(this._leoTreeExplorerView.visible || this._leoTreeStandaloneView.visible)) {
            this._lastVisibleTreeView.reveal(this._lastSelectedNode).then(() => {
                this._leoTreeDataProvider.refreshTreeRoot();
            });
        } else {
            this._leoTreeDataProvider.refreshTreeRoot();
        }
    }

    /**
     * * 'TreeView.reveal' for any opened leo outline that is currently visible
     * @param p_leoNode The node to be revealed
     * @param p_options Options object for the revealed node to either also select it, focus it, and expand it
     */
    private _revealTreeViewNode(p_leoNode: LeoNode, p_options?: { select?: boolean, focus?: boolean, expand?: boolean | number }): Thenable<void> {
        if (this._leoTreeStandaloneView.visible) {
            return this._leoTreeStandaloneView.reveal(p_leoNode, p_options);
        }
        if (this._leoTreeExplorerView.visible && this.config.treeInExplorer) {
            return this._leoTreeExplorerView.reveal(p_leoNode, p_options);
        }
        return Promise.resolve(); // Defaults to resolving even if both are hidden
    }

    /**
     * * Launch the tree root, and optionally body, refresh processes, leading to _gotSelection upon reaching the selected node
     * @param p_refreshType choose to refresh the outline, or the outline and body pane along with it
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     */
    public launchRefresh(p_refreshType: RefreshType, p_fromOutline: boolean): void {
        // * Rules not specified with ternary operator(s) for clarity
        // Set w_revealType, it will ultimately set this._revealType. Used when finding the OUTLINE's selected node and setting or preventing focus into it
        // Set this._fromOutline. Used when finding the selected node and showing the BODY to set or prevent focus in it
        let w_revealType: RevealType = RevealType.NoReveal;
        if (p_fromOutline) {
            this._fromOutline = true;
            w_revealType = RevealType.RevealSelectFocus;
        } else {
            this._fromOutline = false;
            w_revealType = RevealType.RevealSelect;
        }
        // Set this._needRefreshBody. Used when finding the selected node and showing the BODY to trigger a 'fireRefreshFile'
        if (p_refreshType === RefreshType.RefreshTreeAndBody) {
            this._needRefreshBody = true;
            // When this refresh is launched with 'refresh body' requested, we need to lose any pending edits and save on vscode's side.
            if (this._bodyLastChangedDocument && this._bodyLastChangedDocument.isDirty) {
                this._bodyLastChangedDocument.save(); // ! Voluntarily save to 'clean' any pending body (lose trailing whitespace)
            }
        } else {
            this._needRefreshBody = false;
        }
        // * _focusInterrupt Override
        if (this._focusInterrupt) {
            // this._focusInterrupt = false; // TODO : Test if reverting this in _gotSelection is 'ok'
            w_revealType = RevealType.RevealSelect;
        }
        // * Launch Outline's Root Refresh Cycle
        this._refreshOutline(w_revealType);
        this.getStates();
    }

    /**
     * * Handle the selected node that was reached while converting received ap_nodes to LeoNodes
     * @param p_node The selected node that was reached while receiving 'children' from tree view api implementing Leo's outline
     */
    private _gotSelection(p_node: LeoNode): Thenable<vscode.TextEditor> {
        // * Use the 'from outline' concept to decide if focus should be on body or outline after editing a headline
        let w_showBodyKeepFocus: boolean = this._fromOutline; // Will preserve focus where it is without forcing into the body pane if true
        if (this._focusInterrupt) {
            this._focusInterrupt = false; // TODO : Test if reverting this in _gotSelection is 'ok'
            w_showBodyKeepFocus = true;
        }
        return this._applyNodeSelectionToBody(p_node, false, w_showBodyKeepFocus);
    }

    /**
     * * Converts an archived position object to a LeoNode instance
     * @param p_ap The archived position to convert
     * @param p_revealSelected Flag that will trigger the node to reveal, select, and focus if its selected node in Leo
     * @param p_specificNode Other specific LeoNode to be used to override when revealing the the selected node is encountered
     */
    public apToLeoNode(p_ap: ArchivedPosition, p_revealSelected?: boolean, p_specificNode?: LeoNode): LeoNode {
        // TODO : (CODE CLEANUP) p_revealSelected flag should be inverted, its rarely used by far
        let w_collapse: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
        if (p_ap.hasChildren) {
            w_collapse = p_ap.expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
        }
        // * Unknown attributes are one-way read-only data, don't carry this in for string key for leo/python side of things
        let w_u = false;
        if (p_ap.u) {
            w_u = p_ap.u;
            delete p_ap.u;
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
            w_u,                    // unknownAttributes
            this,                   // _leoIntegration pointer
            // If there's no reveal and its the selected node re-use the old id
            (!this._revealType && p_ap.selected && this.lastSelectedNode) ? this.lastSelectedNode.id : (++this._nextNodeId).toString()
        );
        if (p_revealSelected && this._revealType && p_ap.selected) {
            this._apToLeoNodeConvertReveal(p_specificNode ? p_specificNode : w_leoNode);
        }
        return w_leoNode;
    }

    /**
     * * Reveals the node that was detected as being the selected one while converting from archived positions
     * Also select it, or focus on it too depending on global this._revealType variable
     * @param p_leoNode The node that was detected as the selected node in Leo
     */
    private _apToLeoNodeConvertReveal(p_leoNode: LeoNode): void {
        this.leoStates.setSelectedNodeFlags(p_leoNode);
        // First setup flags for selecting and focusing based on the current reveal type needed
        const w_selectFlag = this._revealType >= RevealType.RevealSelect; // at least RevealSelect
        let w_focusFlag = this._revealType >= RevealType.RevealSelectFocus;  // at least RevealSelectFocus
        // Flags are setup so now reveal, select and / or focus as needed
        this._revealType = RevealType.NoReveal; // ok reset
        // If first time, or when treeview switched, lastSelectedNode will be undefined
        if (!this.lastSelectedNode || this._needLastSelectedRefresh) {
            this._needLastSelectedRefresh = false;
            this.lastSelectedNode = p_leoNode; // special case only: lastSelectedNode should be set in selectTreeNode
        }
        setTimeout(() => {
            // TODO : MAKE SURE TIMEOUT IS REALLY REQUIRED
            this._revealTreeViewNode(p_leoNode, { select: w_selectFlag, focus: w_focusFlag })
                .then(() => {
                    // console.log('did this ask for parent?', p_leoNode.id, p_leoNode.label); // ! debug
                    if (w_selectFlag) {
                        this._gotSelection(p_leoNode);
                    }
                });
        });
    }

    /**
     * * Converts an array of 'ap' to an array of leoNodes.  This is used in 'getChildren' of leoOutline.ts
     * @param p_array Array of archived positions to be converted to leoNodes for the vscode treeview
     */
    public arrayToLeoNodesArray(p_array: ArchivedPosition[]): LeoNode[] {
        const w_leoNodesArray: LeoNode[] = [];
        for (let w_apData of p_array) {
            const w_leoNode = this.apToLeoNode(w_apData, true);
            w_leoNodesArray.push(w_leoNode);
        }
        return w_leoNodesArray;
    }

    /**
     * * Makes sure the body now reflects the selected node. This is called after 'selectTreeNode', or after '_gotSelection' when refreshing.
     * @param p_node Node that was just selected
     * @param p_aside Flag to indicate opening 'Aside' was required
     * @param p_showBodyKeepFocus Flag used to keep focus where it was instead of forcing in body
     * @param p_force_open Flag to force opening the body pane editor
     */
    private _applyNodeSelectionToBody(p_node: LeoNode, p_aside: boolean, p_showBodyKeepFocus: boolean, p_force_open?: boolean): Thenable<vscode.TextEditor> {
        // Check first if body needs refresh: if so we will voluntarily throw out any pending edits on body
        this.triggerBodySave(); // Send body to Leo because we're about to (re)show a body of possibly different gnx
        this.lastSelectedNode = p_node; // Set the 'lastSelectedNode'  this will also set the 'marked' node context
        this._commandStack.newSelection();
        // * Is the last opened body still opened? If not the new gnx then make the body pane switch and show itself if needed,
        if (this._bodyTextDocument && !this._bodyTextDocument.isClosed) {
            // * Check if already opened and visible, _locateOpenedBody also sets bodyTextDocumentSameUri, bodyMainSelectionColumn, bodyTextDocument
            if (this._locateOpenedBody(p_node.gnx)) {
                // * Here we really tested _bodyTextDocumentSameUri set from _locateOpenedBody, (means we found the same already opened) so just show it
                this.bodyUri = utils.strToLeoUri(p_node.gnx);
                return this._showBodyIfRequired(p_aside, p_showBodyKeepFocus, p_force_open); // already opened in a column so just tell vscode to show it
            } else {
                // * So far, _bodyTextDocument is still opened and different from new selection: so "save & rename" to block undo/redos
                return this._switchBody(p_node.gnx)
                    .then(() => {
                        return this._showBodyIfRequired(p_aside, p_showBodyKeepFocus, p_force_open); // Also finish by showing it if not already visible
                    });
            }
        } else {
            // * Is the last opened body is closed so just open the newly selected one
            this.bodyUri = utils.strToLeoUri(p_node.gnx);
            return this._showBodyIfRequired(p_aside, p_showBodyKeepFocus, p_force_open);
        }
    }

    /**
     * * This function tries to prevent opening the body editor unnecessarily when hiding and re(showing) the outline pane
     * TODO : Find Better Conditions! Always true for now...
     * @param p_aside Flag for opening the editor beside any currently opened and focused editor
     * @param p_showBodyKeepFocus flag that when true will stop the editor from taking focus once opened
     * @param p_force_open Forces opening the body pane editor
     */
    private _showBodyIfRequired(p_aside: boolean, p_showBodyKeepFocus: boolean, p_force_open?: boolean): Thenable<vscode.TextEditor> {
        if (this._preventShowBody) {
            this._preventShowBody = false;
            return Promise.resolve(vscode.window.activeTextEditor!);
        }
        if (true || p_force_open || this._leoTreeStandaloneView.visible) {
            return this.showBody(p_aside, p_showBodyKeepFocus); // ! Always true for now to stabilize refreshes after derived files refreshes and others.
        } else {
            return Promise.resolve(vscode.window.activeTextEditor!);
        }
    }

    /**
     * * Save and rename from this.bodyUri to p_newGnx: This changes the body content & blocks 'undos' from crossing over
     * @param p_newGnx New gnx body id to switch to
     */
    private _switchBody(p_newGnx: string): Thenable<boolean> {
        if (this._bodyTextDocument) {
            return this._bodyTextDocument.save().then((p_result) => {
                const w_edit = new vscode.WorkspaceEdit();
                this._leoFileSystem.setRenameTime(p_newGnx);
                w_edit.renameFile(
                    this.bodyUri, // Old URI from last node
                    utils.strToLeoUri(p_newGnx), // New URI from selected node
                    { overwrite: true, ignoreIfExists: true }
                );
                return vscode.workspace.applyEdit(w_edit).then(p_result => {
                    this.bodyUri = utils.strToLeoUri(p_newGnx); // Old is now set to new to finish
                    return Promise.resolve(p_result); // Also finish by showing it if not already visible
                });
            });
        } else {
            return Promise.resolve(false);
        }
    }

    /**
     * * Sets globals if the current body is found opened in an editor panel for a particular gnx
     * @param p_gnx gnx to match
     */
    private _locateOpenedBody(p_gnx: string): boolean {
        let w_found = false;
        // * Only gets to visible editors, not every tab per editor
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (utils.leoUriToStr(p_textEditor.document.uri) === p_gnx) {
                w_found = true;
                this._bodyTextDocument = p_textEditor.document;
                this._bodyMainSelectionColumn = p_textEditor.viewColumn;
            }
        });
        return w_found;
    }

    /**
     * * Closes any body pane opened in this vscode window instance
     */
    public closeBody(): void {
        // TODO : Try to close body pane(s)
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (p_textEditor.document.uri.scheme === Constants.URI_LEO_SCHEME) {
                if (p_textEditor.hide) {
                    p_textEditor.hide();
                }
            }
        });
    }

    /**
     * * Opens an an editor for the currently selected node: "this.bodyUri". If already opened, this just 'reveals' it
     * @param p_aside Flag for opening the editor beside any currently opened and focused editor
     * @param p_preserveFocus flag that when true will stop the editor from taking focus once opened
     */
    public showBody(p_aside: boolean, p_preserveFocus?: boolean): Thenable<vscode.TextEditor> {
        // first setup timeout asking for gnx file refresh in case we were resolving a refresh of type 'RefreshTreeAndBody'
        if (this._needRefreshBody) {
            this._needRefreshBody = false; // Flag has triggered a body refresh so we clear it
            // TODO : CHECK IF TIMEOUT NECESSARY!
            setTimeout(() => {
                this._leoFileSystem.fireRefreshFile(utils.leoUriToStr(this.bodyUri));
            }, 0);
        }
        return vscode.workspace.openTextDocument(this.bodyUri).then(p_document => {

            this._bodyTextDocument = p_document;

            // TODO : Should get original @language effective value for specific 'top of document' body that is shown
            if (this.lastSelectedNode) {
                this._leoBridge.action(Constants.LEOBRIDGE.GET_LANGUAGE, this.lastSelectedNode.apJson)
                    .then(p_result => {
                        console.log('got language', p_result.language);
                        if (this._bodyTextDocument) {
                            vscode.languages.setTextDocumentLanguage(
                                this._bodyTextDocument,
                                Constants.BODY_LANGUAGES.plain
                            );
                        }
                    });
            }
            // if (this._bodyTextDocument.languageId !== Constants.BODY_LANGUAGES.default) {
            //     vscode.languages.setTextDocumentLanguage(this._bodyTextDocument, Constants.BODY_LANGUAGES.default);
            // }

            vscode.window.visibleTextEditors.forEach(p_textEditor => {
                if (p_textEditor.document.uri.fsPath === p_document.uri.fsPath) {
                    this._bodyMainSelectionColumn = p_textEditor.viewColumn;
                    this._bodyTextDocument = p_textEditor.document;
                }
            });
            // Setup options for the preview state of the opened editor, and to choose which column it should appear
            const w_showOptions: vscode.TextDocumentShowOptions = p_aside ?
                {
                    viewColumn: vscode.ViewColumn.Beside,
                    preserveFocus: p_preserveFocus, // an optional flag that when true will stop the editor from taking focus
                    preview: true // should text document be in preview only? set false for fully opened
                    // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top otherwise
                } : {
                    viewColumn: this._bodyMainSelectionColumn ? this._bodyMainSelectionColumn : 1, // view column in which the editor should be shown
                    preserveFocus: p_preserveFocus, // an optional flag that when true will stop the editor from taking focus
                    preview: false // should text document be in preview only? set false for fully opened
                    // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top otherwise
                };

            // NOTE: textEditor.show() is deprecated — Use window.showTextDocument instead.
            return vscode.window.showTextDocument(this._bodyTextDocument, w_showOptions).then(w_bodyEditor => {
                // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
                // other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
                return Promise.resolve(w_bodyEditor);
            });
        });
    }

    /**
     * * User has selected a node via mouse click or via 'enter' keypress in the outline, otherwise flag p_internalCall if used internally
     * @param p_node Node that was just selected
     * @param p_internalCall Flag used to indicate the selection is forced, and NOT originating from user interaction
     * @param p_aside Flag to force opening the body "Aside", i.e. when the selection was made from choosing "Open Aside"
     */
    public selectTreeNode(p_node: LeoNode, p_internalCall?: boolean, p_aside?: boolean): Thenable<vscode.TextEditor> {
        // * check if used via context menu's "open-aside" on an unselected node: check if p_node is currently selected, if not select it
        if (p_aside && p_node !== this.lastSelectedNode) {
            this._revealTreeViewNode(p_node, { select: true, focus: false }); // no need to set focus: tree selection is set to right-click position
        }
        this.leoStates.setSelectedNodeFlags(p_node);
        // TODO : #39 @boltex Save and restore selection, along with cursor position, from selection state saved in each node (or gnx array)
        this._leoStatusBar.update(true); // Just selected a node directly, or via expand/collapse
        const w_showBodyKeepFocus = p_aside ? this.config.treeKeepFocusWhenAside : this.config.treeKeepFocus;
        // * Check if having already this exact node position selected : Just show the body and exit!
        if (p_node === this.lastSelectedNode) {
            this._locateOpenedBody(p_node.gnx);
            return this.showBody(!!p_aside, w_showBodyKeepFocus); // voluntary exit
        }
        // * Set selected node in Leo via leoBridge
        this.sendAction(Constants.LEOBRIDGE.SET_SELECTED_NODE, p_node.apJson);
        return this._applyNodeSelectionToBody(p_node, !!p_aside, w_showBodyKeepFocus, true);
    }

    /**
     * * Adds a command to the stack to be resolved, returns true if possible (based on stack state and rules), false otherwise
     * @param p_action A string code constant member from Constants.LEOBRIDGE, which are commands for leobridgeserver.py
     * @param p_node Specific node to pass as parameter, or the selected node if omitted
     * @param p_refreshType Specifies to either refresh nothing, the tree or both body and tree when finished resolving
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     * @param p_providedHeadline Specific string to pass along as parameter with the action, similar to p_node parameter
     * @returns True if added successfully (see command stack 'rules' in commandStack.ts), false otherwise
     */
    public nodeCommand(p_action: string, p_node?: LeoNode, p_refreshType?: RefreshType, p_fromOutline?: boolean, p_providedHeadline?: string): boolean {
        this.triggerBodySave(); // No forced vscode save
        if (this._commandStack.add({
            action: p_action,
            node: p_node,  // Will return false for sure if already started and this is not undefined
            providedHeadline: p_providedHeadline ? p_providedHeadline : undefined,
            refreshType: p_refreshType ? p_refreshType : RefreshType.NoRefresh,
            fromOutline: !!p_fromOutline, // force boolean
        })) {
            return true;
        } else {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.TOO_FAST + p_action); // TODO : Use cleanup message string CONSTANT instead
            return false;
        }
    }

    /**
     * * Launches the 'Execute Script' Leo command with the selected text, if any, otherwise the selected node itself is used
     * @returns True if the selection, or node, was started as a script
     */
    public executeScript(): boolean {
        // * Check if selected string in the focused leo body
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri.scheme === Constants.URI_LEO_SCHEME) {
            // was active text editor leoBody, check if selection length
            if (vscode.window.activeTextEditor.selections.length === 1 && !vscode.window.activeTextEditor.selection.isEmpty) {
                // Exactly one selection range, and is not empty, so try "executing" only the selected content.
                let w_selection = vscode.window.activeTextEditor.selection;
                let w_script = vscode.window.activeTextEditor.document.getText(w_selection);
                if (w_script.length) {
                    return this.nodeCommand(Constants.LEOBRIDGE.EXECUTE_SCRIPT, undefined, RefreshType.RefreshTreeAndBody, false, w_script);
                }
            }

        }
        // * Catch all call: execute selected node outline with a single space as script
        return this.nodeCommand(Constants.LEOBRIDGE.EXECUTE_SCRIPT, undefined, RefreshType.RefreshTreeAndBody, false, " ");
    }

    /**
     * Changes the marked state of a specified, or currently selected node
     * @param p_isMark Set 'True' to mark, otherwise unmarks the node
     * @param p_node Specifies which node use, or leave undefined to mark or unmark the currently selected node
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     */
    public changeMark(p_isMark: boolean, p_node?: LeoNode, p_fromOutline?: boolean): void {
        if (this.nodeCommand(p_isMark ? Constants.LEOBRIDGE.MARK_PNODE : Constants.LEOBRIDGE.UNMARK_PNODE, p_node, RefreshType.RefreshTree, p_fromOutline)) {
            if (!p_node || p_node === this.lastSelectedNode) {
                utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_MARKED, p_isMark);
            }
        }
    }

    /**
     * * Asks for a new headline label, and replaces the current label with this new one one the specified, or currently selected node
     * @param p_node Specifies which node to rename, or leave undefined to rename the currently selected node
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     */
    public editHeadline(p_node?: LeoNode, p_fromOutline?: boolean): void {
        // * Only if no commands are waiting to finish because we need the exact label to show in the edit control for now, see TODO below
        if (this._isBusy()) { return; } // Warn user to wait for end of busy state
        this.triggerBodySave(true);
        if (!p_node && this.lastSelectedNode) {
            p_node = this.lastSelectedNode; // Gets last selected node if called via keyboard shortcut or command palette (not set in command stack class)
        }
        if (p_node) {
            this._headlineInputOptions.prompt = Constants.USER_MESSAGES.PROMPT_EDIT_HEADLINE;
            this._headlineInputOptions.value = p_node.label; // preset input pop up
            vscode.window.showInputBox(this._headlineInputOptions)
                .then(p_newHeadline => {
                    if (p_newHeadline) {
                        p_node!.label = p_newHeadline; // ! When labels change, ids will change and its selection and expansion states cannot be kept stable anymore.
                        this.nodeCommand(Constants.LEOBRIDGE.SET_HEADLINE, p_node, RefreshType.RefreshTree, p_fromOutline, p_newHeadline);
                    } else {
                        // TODO : Make sure focus is set back properly to either outline or body if this is canceled (Maybe unnecessary?)
                    }
                });
        }
    }

    /**
     * * Asks for a headline label to be entered and creates (inserts) a new node under the current, or specified, node
     * @param p_node specified under which node to insert, or leave undefined to use whichever is currently selected
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     * @param p_interrupt Signifies the insert action is actually interrupting itself (e.g. rapid CTRL+I actions by the user)
     */
    public insertNode(p_node?: LeoNode, p_fromOutline?: boolean, p_interrupt?: boolean): void {
        let w_fromOutline: boolean = !!p_fromOutline; // Use w_fromOutline for where we intend to leave focus when done with the insert
        if (p_interrupt) {
            this._focusInterrupt = true;
            w_fromOutline = this._fromOutline; // Going to use last state // TODO : MAKE SURE ITS STILL AVAILABLE AND VALID
        }
        if (!p_node || !this._isBusy()) {
            // * Only if no parameters or no stack at all
            this.triggerBodySave(true);
            this._headlineInputOptions.prompt = Constants.USER_MESSAGES.PROMPT_INSERT_NODE;
            this._headlineInputOptions.value = Constants.USER_MESSAGES.DEFAULT_HEADLINE;
            vscode.window.showInputBox(this._headlineInputOptions)
                .then(p_newHeadline => {
                    const w_action = p_newHeadline ? Constants.LEOBRIDGE.INSERT_NAMED_PNODE : Constants.LEOBRIDGE.INSERT_PNODE;
                    this.nodeCommand(w_action, p_node, RefreshType.RefreshTree, w_fromOutline, p_newHeadline); // p_node and p_newHeadline can be undefined
                });
        }
    }

    /**
     * * Asks for file name and path, then saves the Leo file
     * @param p_fromOutlineSignifies that the focus was, and should be brought back to, the outline
     */
    public saveAsLeoFile(p_fromOutline?: boolean): void {
        if (!this.leoStates.fileOpenedReady || this._isBusy(true)) { return; } // Warn user to wait for end of busy state
        if (this.leoStates.fileOpenedReady) {
            if (this.lastSelectedNode) {
                this.triggerBodySave(true)
                    .then(() => {
                        return this._leoFilesBrowser.getLeoFileUrl(true);
                    })
                    .then(p_chosenLeoFile => {
                        if (p_chosenLeoFile.trim()) {
                            if (this.leoStates.leoOpenedFileName) {
                                this._removeLastFile(this.leoStates.leoOpenedFileName);
                                this._removeRecentFile(this.leoStates.leoOpenedFileName);
                            }
                            this.nodeCommand(Constants.LEOBRIDGE.SAVE_FILE, undefined, RefreshType.RefreshTree, p_fromOutline, p_chosenLeoFile); // p_node and p_newHeadline can be undefined
                            this.leoStates.leoOpenedFileName = p_chosenLeoFile.trim();
                            this._leoStatusBar.update(true, 0, true);
                            this._addRecentAndLastFile(p_chosenLeoFile.trim());

                        }
                    });
            }
        } else {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
        }
    }

    /**
     * * Invokes the self.commander.save() Leo command
     * @param p_fromOutlineSignifies that the focus was, and should be brought back to, the outline
     */
    public saveLeoFile(p_fromOutline?: boolean): void {
        if (!this.leoStates.fileOpenedReady || this._isBusy(true)) { return; } // Warn user to wait for end of busy state

        // TODO : Specify which file when supporting multiple simultaneous opened Leo files
        if (this.leoStates.fileOpenedReady) {
            if (this.lastSelectedNode && this._isCurrentFileNamed()) {
                this.triggerBodySave(true)
                    .then(() => {
                        this.nodeCommand(Constants.LEOBRIDGE.SAVE_FILE, undefined, RefreshType.RefreshTree, p_fromOutline, ""); // p_node and p_newHeadline can be undefined
                    });
            } else {
                this.saveAsLeoFile(p_fromOutline); // Override this command call if file is unnamed!
            }
        } else {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
        }
    }

    /**
     * * Show switch document 'QuickPick' dialog and switch file if selection is made, or just return if no files are opened.
     */
    public switchLeoFile(): void {
        if (!this.leoStates.fileOpenedReady || this._isBusy()) { return; } // Warn user to wait for end of busy state
        // get list and show dialog to user, even if there's only one...but at least one!
        // TODO : p_package members names should be made into constants
        // TODO : Fix / Cleanup opened body panes close before reopening when switching
        this.triggerBodySave(true)
            .then(() => {
                return this._leoBridge.action(Constants.LEOBRIDGE.GET_OPENED_FILES);
            })
            .then(p_package => {
                const w_entries: ChooseDocumentItem[] = []; // Entries to offer as choices.
                const w_files: LeoDocument[] = p_package.openedFiles!.files;
                const w_selectedIndex: number = p_package.openedFiles!.index;
                let w_index: number = 0;
                let w_currentlySelected = "";  // ? not used elsewhere ?
                if (w_files && w_files.length) {
                    w_files.forEach(function (p_filePath: LeoDocument) {
                        if (w_index === w_selectedIndex) {
                            w_currentlySelected = p_filePath.name; // ? not used elsewhere ?
                        }
                        w_entries.push({
                            label: w_index.toString(),
                            description: p_filePath.name ? p_filePath.name : Constants.UNTITLED_FILE_NAME,
                            value: w_index,
                            alwaysShow: true
                        });
                        w_index++;
                    });
                    const w_pickOptions: vscode.QuickPickOptions = {
                        matchOnDescription: true,
                        placeHolder: Constants.USER_MESSAGES.CHOOSE_OPENED_FILE
                    };
                    vscode.window.showQuickPick(w_entries, w_pickOptions).then((p_chosenDocument) => {
                        if (p_chosenDocument) {
                            this.selectOpenedLeoDocument(p_chosenDocument.value);
                        } // else : cancelled so no action taken
                    });
                }
            });
    }

    /**
     * * Switches Leo document directly by index number. Used by document treeview and switchLeoFile command.
     */
    public selectOpenedLeoDocument(p_index: number): void {
        if (this._isBusy(true)) { return; } // Warn user to wait for end of busy state
        this._leoBridge.action(Constants.LEOBRIDGE.SET_OPENED_FILE, JSON.stringify({ "index": p_index }))
            .then((p_openFileResult: LeoBridgePackage) => {
                // Like we just opened or made a new file
                if (p_openFileResult.setOpened) {
                    this._setupOpenedLeoDocument(p_openFileResult.setOpened);
                } else {
                    console.log('Select Opened Leo File Error');
                }
            });
    }



    /**
     * * Close an opened Leo file
     */
    public closeLeoFile(): void {
        if (this._isBusy(true)) { return; } // Warn user to wait for end of busy state
        if (this.leoStates.fileOpenedReady) {
            const w_removeLastFileName = this.leoStates.leoOpenedFileName;
            this.triggerBodySave(true)
                .then(() => {
                    return this.sendAction(Constants.LEOBRIDGE.CLOSE_FILE, JSON.stringify({ forced: false }));
                })
                .then((p_package => {
                    if (p_package.closed) {
                        this._leoDocumentsProvider.refreshTreeRoot();
                        this._leoButtonsProvider.refreshTreeRoot();
                        this._removeLastFile(w_removeLastFileName);
                        if (p_package.closed.total === 0) {
                            this._setupNoOpenedLeoDocument();
                        } else {
                            this.launchRefresh(RefreshType.RefreshTreeAndBody, false);
                        }
                    } else if (p_package.closed === false) {
                        // Explicitly false and not just undefined
                        const w_askArg = Constants.USER_MESSAGES.SAVE_CHANGES + ' ' +
                            this.leoStates.leoOpenedFileName + ' ' +
                            // this._openedLeoDocuments[this._leoOpenedFilesIndex] + ' ' +
                            Constants.USER_MESSAGES.BEFORE_CLOSING;

                        const w_askSaveChangesInfoMessage: Thenable<vscode.MessageItem | undefined> = vscode.window.showInformationMessage(
                            w_askArg,
                            { modal: true },
                            ...Constants.ASK_SAVE_CHANGES_BUTTONS
                        );
                        w_askSaveChangesInfoMessage.then((p_result: vscode.MessageItem | undefined) => {
                            if (p_result) {
                                if (p_result.title === Constants.USER_MESSAGES.YES) {
                                    // save and close
                                    let w_savePromise: Promise<LeoBridgePackage>;
                                    if (this._isCurrentFileNamed()) {
                                        w_savePromise = this.sendAction(Constants.LEOBRIDGE.SAVE_FILE, JSON.stringify({ text: "" }));
                                    } else {
                                        w_savePromise = this._leoFilesBrowser.getLeoFileUrl(true).then((p_chosenLeoFile) => {
                                            if (p_chosenLeoFile.trim()) {
                                                return this.sendAction(Constants.LEOBRIDGE.SAVE_FILE, JSON.stringify({ text: p_chosenLeoFile.trim() }));
                                            } else {
                                                return Promise.reject();
                                            }
                                        });
                                    }
                                    return w_savePromise.then(() => {
                                        return this.sendAction(Constants.LEOBRIDGE.CLOSE_FILE, JSON.stringify({ forced: true }));
                                    }, () => {
                                        // canceled
                                        return Promise.reject();
                                    });
                                } else if (p_result.title === Constants.USER_MESSAGES.NO) {
                                    return this.sendAction(Constants.LEOBRIDGE.CLOSE_FILE, JSON.stringify({ forced: true }));
                                }
                            } else {
                                return Promise.reject(); // cancelled ask
                            }
                        }).then((p_packageAfterSave: LeoBridgePackage | undefined) => {
                            // * back from CLOSE_FILE action, the last that can be performed (after saving if dirty or not)
                            this._leoDocumentsProvider.refreshTreeRoot();
                            this._leoButtonsProvider.refreshTreeRoot();
                            this._removeLastFile(w_removeLastFileName);
                            if (p_packageAfterSave && p_packageAfterSave.closed && p_packageAfterSave.closed.total === 0) {
                                this._setupNoOpenedLeoDocument();
                            } else {
                                this.launchRefresh(RefreshType.RefreshTreeAndBody, false);
                            }
                        });
                    }
                    // else don't do anything
                }));
        } else {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.CLOSE_ERROR);
        }
    }

    /**
     * * Creates a new untitled Leo document
     * * If not shown already, it also shows the outline, body and log panes along with leaving focus in the outline
     */
    public newLeoFile(): void {
        if (this._isBusy(true)) { return; } // Warn user to wait for end of busy state
        this.triggerBodySave(true)
            .then(() => {
                return this.sendAction(Constants.LEOBRIDGE.OPEN_FILE, '""');
            })
            .then((p_openFileResult: LeoBridgePackage) => {
                if (p_openFileResult.opened) {
                    return this._setupOpenedLeoDocument(p_openFileResult.opened);
                } else {
                    console.log('New Leo File Error');
                }
            });
    }

    /**
     * * Shows an 'Open Leo File' dialog window and opens the chosen file
     * * If not shown already, it also shows the outline, body and log panes along with leaving focus in the outline
     */
    public openLeoFile(p_leoFileUri?: vscode.Uri): void {
        if (this._isBusy(true)) { return; } // Warn user to wait for end of busy state
        if (p_leoFileUri && p_leoFileUri.fsPath.trim()) {
            this.sendAction(Constants.LEOBRIDGE.OPEN_FILE, '"' + p_leoFileUri.fsPath.replace(/\\/g, "/") + '"')
                .then((p_openFileResult: LeoBridgePackage) => {
                    return this._setupOpenedLeoDocument(p_openFileResult.opened!);
                }, p_errorOpen => {
                    console.log('in .then not opened or already opened');
                    return Promise.reject(p_errorOpen);
                });
        } else {
            this._leoFilesBrowser.getLeoFileUrl()
                .then(p_chosenLeoFile => {
                    return this.sendAction(Constants.LEOBRIDGE.OPEN_FILE, '"' + p_chosenLeoFile + '"');
                }, p_errorGetFile => {
                    return Promise.reject(p_errorGetFile);
                })
                .then((p_openFileResult: LeoBridgePackage) => {
                    return this._setupOpenedLeoDocument(p_openFileResult.opened!);
                }, p_errorOpen => {
                    console.log('in .then not opened or already opened');
                    return Promise.reject(p_errorOpen);
                });
        }
    }

    /**
     * * Invoke an '@button' click directly by index string. Used by '@buttons' treeview.
     */
    public clickButton(p_node: LeoButtonNode): void {
        if (this._isBusy()) { return; } // Warn user to wait for end of busy state
        this._leoBridge.action(Constants.LEOBRIDGE.CLICK_BUTTON, JSON.stringify({ "index": p_node.button.index }))
            .then((p_clickButtonResult: LeoBridgePackage) => {
                // console.log('Back from clickButton, package is: ', p_clickButtonResult);
                this.launchRefresh(RefreshType.RefreshTreeAndBody, false);
            });
    }

    /**
     * * Removes an '@button' from Leo's button dict, directly by index string. Used by '@buttons' treeview.
     */
    public removeButton(p_node: LeoButtonNode): void {
        if (this._isBusy()) { return; } // Warn user to wait for end of busy state
        this._leoBridge.action(Constants.LEOBRIDGE.REMOVE_BUTTON, JSON.stringify({ "index": p_node.button.index }))
            .then((p_removeButtonResult: LeoBridgePackage) => {
                // console.log('Back from removeButton, package is: ', p_removeButtonResult);
                this.launchRefresh(RefreshType.RefreshTreeAndBody, false);
            });
    }

    /**
     * * Open quickPick/inputBox minibuffer pallette.
     * for the user to choose from all commands
     * available in this file's commander
     */
    public minibuffer(): void {
        if (this._isBusy()) { return; } // Warn user to wait for end of busy state
        const w_promise: Thenable<MinibufferCommand[]> = this._leoBridge.action(Constants.LEOBRIDGE.GET_COMMANDS, JSON.stringify({ "text": "" }))
            .then((p_result: LeoBridgePackage) => {
                if (p_result.commands && p_result.commands.length) {
                    return p_result.commands;
                } else {
                    return [];
                }
            });

        const w_options: vscode.QuickPickOptions = {
            placeHolder: Constants.USER_MESSAGES.MINIBUFFER_PROMPT,
            matchOnDetail: true
        };

        vscode.window.showQuickPick(w_promise, w_options).then((p_picked) => {
            if (p_picked && p_picked.func) {
                this.nodeCommand(p_picked.func, undefined, RefreshType.RefreshTreeAndBody, true);
            }
        });
    }

    /**
     * * Set the outline pane top bar string message
     * @param p_title new string to replace the current title
     */
    public setTreeViewTitle(p_title?: string): void {
        if (p_title) {
            this._currentOutlineTitle = p_title;
        }
        // * Set/Change outline pane title e.g. "INTEGRATION", "OUTLINE"
        if (this._leoTreeStandaloneView) {
            this._leoTreeStandaloneView.title = this._currentOutlineTitle;
        }
        if (this._leoTreeExplorerView) {
            this._leoTreeExplorerView.title = Constants.GUI.EXPLORER_TREEVIEW_PREFIX + this._currentOutlineTitle;
        }
    }

    /**
     * * Offer all leo commands in the command palette (This opens the palette with string '>leo:' already typed)
     */
    public showLeoCommands(): void {
        vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.QUICK_OPEN, Constants.GUI.QUICK_OPEN_LEO_COMMANDS);
    }

    /**
     * * StatusBar click handler
     */
    public statusBarOnClick(): void {
        if (this.leoStates.fileOpenedReady) {
            this.switchLeoFile();
        } else {
            this.showLeoCommands();
        }
    }

    public test(p_fromOutline?: boolean): void {
        this.statusBarOnClick(); // placeholder / test
    }
}
