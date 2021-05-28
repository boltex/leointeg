import * as vscode from "vscode";
import { debounce } from "debounce";
import * as utils from "./utils";
import { Constants } from "./constants";
import {
    LeoBridgePackage,
    RevealType,
    ArchivedPosition,
    Icon,
    ConfigMembers,
    ReqRefresh,
    ChooseDocumentItem,
    LeoDocument,
    MinibufferCommand,
    UserCommand,
    ShowBodyParam,
    BodySelectionInfo,
    BodyPosition,
    LeoGuiFindTabManagerSettings,
    LeoSearchSettings
} from "./types";
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
import { LeoFindPanelProvider } from "./leoFindPanel";

/**
 * * Orchestrates Leo integration into vscode
 */
export class LeoIntegration {

    // * Status Flags
    public finishedStartup: boolean = false;
    private _leoIsConnecting: boolean = false; // Used in connect method, to prevent other attempts while trying
    private _leoBridgeReadyPromise: Promise<LeoBridgePackage> | undefined; // Is set when leoBridge has a leo controller ready
    private _currentOutlineTitle: string = Constants.GUI.TREEVIEW_TITLE_INTEGRATION; // Might need to be re-set when switching visibility
    private _hasShownContextOpenMessage: boolean = false; // Used to show this information only once

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
    private _leoTreeProvider: LeoOutlineProvider; // TreeDataProvider single instance
    private _leoTreeView: vscode.TreeView<LeoNode>; // Outline tree view added to the Tree View Container with an Activity Bar icon
    private _leoTreeExView: vscode.TreeView<LeoNode>; // Outline tree view added to the Explorer Sidebar
    private _lastTreeView: vscode.TreeView<LeoNode>; // Last visible treeview
    private _treeId: number = 0; // Starting salt for tree node murmurhash generated Ids

    private _lastSelectedNode: LeoNode | undefined; // Last selected node we got a hold of; leoTreeView.selection maybe newer and unprocessed
    get lastSelectedNode(): LeoNode | undefined {
        return this._lastSelectedNode;
    }
    set lastSelectedNode(p_leoNode: LeoNode | undefined) { // Needs undefined type because it cannot be set in the constructor
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
    private _refreshType: ReqRefresh = {}; // Flags for commands to require parts of UI to refresh
    private _fromOutline: boolean = false; // Last command issued had focus on outline, as opposed to the body
    private _focusInterrupt: boolean = false; // Flag for preventing setting focus when interrupting (canceling) an 'insert node' text input dialog with another one

    // * Body Pane
    private _bodyFileSystemStarted: boolean = false;
    private _bodyEnablePreview: boolean = true;
    private _leoFileSystem: LeoBodyProvider; // as per https://code.visualstudio.com/api/extension-guides/virtual-documents#file-system-api
    private _bodyTextDocument: vscode.TextDocument | undefined; // Set when selected in tree by user, or opening a Leo file in showBody. and by _locateOpenedBody.
    private _bodyMainSelectionColumn: vscode.ViewColumn | undefined; // Column of last body 'textEditor' found, set to 1

    private _bodyPreviewMode: boolean = true;

    private _showBodyStarted: boolean = false; // Flag for when _applySelectionToBody 'show body' cycle is busy
    private _showBodyParams: ShowBodyParam | undefined; // _applySelectionToBody parameters, may be overwritten at each call if not finished

    // * Find panel
    private _findPanelWebviewView: vscode.WebviewView | undefined;
    private _findPanelWebviewExplorerView: vscode.WebviewView | undefined;

    // * Selection
    private _selectionDirty: boolean = false; // Flag set when cursor selection is changed
    private _selectionGnx: string = ""; // Packaged into 'BodySelectionInfo' structures, sent to Leo
    private _selection: vscode.Selection | undefined; // also packaged into 'BodySelectionInfo'
    private _scrollDirty: boolean = false; // Flag set when cursor selection is changed
    private _scrollGnx: string = "";
    private _scroll: vscode.Range | undefined;

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

    // * Leo Find Panel
    private _leoFindPanelProvider: vscode.WebviewViewProvider;

    // * Log and terminal Panes
    private _leoLogPane: vscode.OutputChannel = vscode.window.createOutputChannel(Constants.GUI.LOG_PANE_TITLE);
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
    private _bodyLastChangedDocumentSaved: boolean = true; // don't use 'isDirty' of the document!

    // * Debounced method used to get states for UI display flags (commands such as undo, redo, save, ...)
    public getStates: (() => void) & {
        clear(): void;
    } & {
        flush(): void;
    };

    // * Debounced method used to get opened Leo Files for the documents pane
    public refreshDocumentsPane: (() => void) & {
        clear(): void;
    } & {
        flush(): void;
    };

    constructor(private _context: vscode.ExtensionContext) {
        // * Setup States
        this.leoStates = new LeoStates(_context, this);

        // * Get configuration settings
        this.config = new Config(_context, this);

        // * also check workbench.editor.enablePreview
        this.config.buildFromSavedSettings();
        this._bodyEnablePreview = !!vscode.workspace.getConfiguration('workbench.editor').get("enablePreview");

        // * Build Icon filename paths
        this.nodeIcons = utils.buildNodeIconPaths(_context);
        this.documentIcons = utils.buildDocumentIconPaths(_context);
        this.buttonIcons = utils.buildButtonsIconPaths(_context);

        // * Create file browser instance
        this._leoFilesBrowser = new LeoFilesBrowser(_context);

        // * Setup leoBridge
        this._leoBridge = new LeoBridge(_context, this);

        // * Setup frontend command stack
        this._commandStack = new CommandStack(_context, this);

        // * Create a single data provider for both outline trees, Leo view and Explorer view
        this._leoTreeProvider = new LeoOutlineProvider(this);

        // * Create Leo stand-alone view and Explorer view outline panes
        // Uses 'select node' command, so 'onDidChangeSelection' is not used
        this._leoTreeView = vscode.window.createTreeView(Constants.TREEVIEW_ID, { showCollapseAll: false, treeDataProvider: this._leoTreeProvider });
        this._leoTreeView.onDidExpandElement((p_event => this._onChangeCollapsedState(p_event, true, this._leoTreeView)));
        this._leoTreeView.onDidCollapseElement((p_event => this._onChangeCollapsedState(p_event, false, this._leoTreeView)));
        this._leoTreeView.onDidChangeVisibility((p_event => this._onTreeViewVisibilityChanged(p_event, false))); // * Trigger 'show tree in Leo's view'
        this._leoTreeExView = vscode.window.createTreeView(Constants.TREEVIEW_EXPLORER_ID, { showCollapseAll: false, treeDataProvider: this._leoTreeProvider });
        this._leoTreeExView.onDidExpandElement((p_event => this._onChangeCollapsedState(p_event, true, this._leoTreeExView)));
        this._leoTreeExView.onDidCollapseElement((p_event => this._onChangeCollapsedState(p_event, false, this._leoTreeExView)));
        this._leoTreeExView.onDidChangeVisibility((p_event => this._onTreeViewVisibilityChanged(p_event, true))); // * Trigger 'show tree in explorer view'
        this._lastTreeView = this.config.treeInExplorer ? this._leoTreeExView : this._leoTreeView;

        // * Create Leo Opened Documents Treeview Providers and tree views
        this._leoDocumentsProvider = new LeoDocumentsProvider(this);
        this._leoDocuments = vscode.window.createTreeView(Constants.DOCUMENTS_ID, { showCollapseAll: false, treeDataProvider: this._leoDocumentsProvider });
        this._leoDocuments.onDidChangeVisibility((p_event => this._onDocTreeViewVisibilityChanged(p_event, false)));
        this._leoDocumentsExplorer = vscode.window.createTreeView(Constants.DOCUMENTS_EXPLORER_ID, { showCollapseAll: false, treeDataProvider: this._leoDocumentsProvider });
        this._leoDocumentsExplorer.onDidChangeVisibility((p_event => this._onDocTreeViewVisibilityChanged(p_event, true)));

        // * Create '@buttons' Treeview Providers and tree views
        this._leoButtonsProvider = new LeoButtonsProvider(this);
        this._leoButtons = vscode.window.createTreeView(Constants.BUTTONS_ID, { showCollapseAll: false, treeDataProvider: this._leoButtonsProvider });
        this._leoButtons.onDidChangeVisibility((p_event => this._onButtonsTreeViewVisibilityChanged(p_event, false)));
        this._leoButtonsExplorer = vscode.window.createTreeView(Constants.BUTTONS_EXPLORER_ID, { showCollapseAll: false, treeDataProvider: this._leoButtonsProvider });
        this._leoButtonsExplorer.onDidChangeVisibility((p_event => this._onButtonsTreeViewVisibilityChanged(p_event, true)));

        // * Create Body Pane
        this._leoFileSystem = new LeoBodyProvider(this);
        this._bodyMainSelectionColumn = 1;

        // * Create Status bar Entry
        this._leoStatusBar = new LeoStatusBar(_context, this);

        // * Automatic server start service
        this._serverService = new ServerService(_context, this);

        // * Leo Find Panel
        this._leoFindPanelProvider = new LeoFindPanelProvider(_context.extensionUri, _context, this);
        this._context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(Constants.FIND_ID, this._leoFindPanelProvider, { webviewOptions: { retainContextWhenHidden: true } }));
        this._context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(Constants.FIND_EXPLORER_ID, this._leoFindPanelProvider, { webviewOptions: { retainContextWhenHidden: true } }));

        // * React to change in active panel/text editor (window.activeTextEditor) - also fires when the active editor becomes undefined
        vscode.window.onDidChangeActiveTextEditor(p_editor => this._onActiveEditorChanged(p_editor));

        // * React to change in selection, cursor position and scroll position
        vscode.window.onDidChangeTextEditorSelection(p_event => this._onChangeEditorSelection(p_event));
        vscode.window.onDidChangeTextEditorVisibleRanges((p_event => this._onChangeEditorScroll(p_event)));

        // * Triggers when a different text editor/vscode window changed focus or visibility, or dragged
        // This is also what triggers after drag and drop, see '_onChangeEditorViewColumn'
        vscode.window.onDidChangeTextEditorViewColumn((p_columnChangeEvent) => this._changedTextEditorViewColumn(p_columnChangeEvent)); // Also triggers after drag and drop
        vscode.window.onDidChangeVisibleTextEditors((p_editors) => this._changedVisibleTextEditors(p_editors)); // Window.visibleTextEditors changed
        vscode.window.onDidChangeWindowState((p_windowState) => this._changedWindowState(p_windowState)); // Focus state of the current window changes

        // * React when typing and changing body pane
        vscode.workspace.onDidChangeTextDocument(p_textDocumentChange => this._onDocumentChanged(p_textDocumentChange));

        // * React to configuration settings events
        vscode.workspace.onDidChangeConfiguration(p_configChange => this._onChangeConfiguration(p_configChange));

        // * React to opening of any file in vscode
        vscode.workspace.onDidOpenTextDocument(p_document => this._onDidOpenTextDocument(p_document));

        // * Debounced refresh flags and UI parts, other than the tree and body, when operation(s) are done executing
        this.getStates = debounce(this._triggerGetStates, Constants.STATES_DEBOUNCE_DELAY);
        this.refreshDocumentsPane = debounce(this._refreshDocumentsPane, Constants.DOCUMENTS_DEBOUNCE_DELAY);
    }

    /**
     * * Core of the integration of Leo into vscode: Sends an action to leobridgeserver.py, to run in Leo.
     * @param p_action is the action string constant, from Constants.LEOBRIDGE
     * @param p_jsonParam (optional) JSON string to be given to the python script action call
     * @param p_deferredPayload (optional) a pre-made package that will be given back as the response, instead of package coming back from python
     * @param p_preventCall (optional) Flag for special case, only used at startup
     * @returns a Promise that will contain the JSON package answered back by leobridgeserver.py
     */
    public sendAction(p_action: string, p_jsonParam = "null", p_deferredPayload?: LeoBridgePackage, p_preventCall?: boolean): Promise<LeoBridgePackage> {
        return this._leoBridge.action(p_action, p_jsonParam, p_deferredPayload, p_preventCall);
    }

    /**
     * * leoInteg starting entry point
     * Starts a leoBridge server, and/or establish a connection to a server, based on config settings.
     */
    public startNetworkServices(): void {
        // * Check settings and start a server accordingly
        if (this.config.startServerAutomatically) {
            this.startServer();
        } else if (this.config.connectToServerAutomatically) {
            // * (via settings) Connect to Leo Bridge server automatically without starting one first
            this.connect();
        } else {
            this.finishedStartup = true;
        }
    }

    /**
     * * Starts an instance of a leoBridge server, and may connect to it afterwards, based on configuration flags.
     */
    public startServer(): void {
        if (!this._leoTerminalPane) {
            this._leoTerminalPane = vscode.window.createOutputChannel(Constants.GUI.TERMINAL_PANE_TITLE);
        }
        this._serverService.startServer(this.config.leoPythonCommand, this.config.leoServerPath)
            .then((p_message) => {
                utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, true); // server started
                if (this.config.connectToServerAutomatically) {
                    setTimeout(() => {
                        // Wait a full second
                        this.connect();
                    }, 1000);
                } else {
                    this.finishedStartup = true;
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
                    const w_lastFiles: string[] = this._context.globalState.get(Constants.LAST_FILES_KEY) || [];
                    if (w_lastFiles.length) {

                        // This context flag will trigger 'Connecting...' placeholder
                        utils.setContext(Constants.CONTEXT_FLAGS.AUTO_CONNECT, true);

                        setTimeout(() => {
                            this._openLastFiles(); // Try to open last opened files, if any
                        }, 0);

                    } else {
                        this.leoStates.leoBridgeReady = true;
                        this.finishedStartup = true;
                    }

                    this.showLogPane();
                    if (!this.config.connectToServerAutomatically) {
                        vscode.window.showInformationMessage(Constants.USER_MESSAGES.CONNECTED);
                    }
                }

                // TODO : Finish Closing and possibly SAME FOR OPENING AND CONNECTING
                // TODO : #14 @boltex COULD BE SOME FILES ALREADY OPENED OR NONE!

            },
            (p_reason) => {
                this._leoIsConnecting = false;
                this.cancelConnect(Constants.USER_MESSAGES.CONNECT_FAILED + ': ' + p_reason);
            });
    }

    /**
     * * Cancels websocket connection and reverts context flags.
     * Called from leoBridge.ts when its websocket reports disconnection.
     * @param p_message
     */
    public cancelConnect(p_message?: string): void {
        // 'disconnect error' versus 'failed to connect'
        if (this.leoStates.leoBridgeReady) {
            vscode.window.showErrorMessage(p_message ? p_message : Constants.USER_MESSAGES.DISCONNECTED);
        } else {
            vscode.window.showInformationMessage(p_message ? p_message : Constants.USER_MESSAGES.DISCONNECTED);
        }

        // to change the 'viewsWelcome' content.
        // bring back to !leoBridgeReady && !leoServerStarted && !startServerAutomatically && !connectToServerAutomatically"
        utils.setContext(Constants.CONTEXT_FLAGS.AUTO_START_SERVER, false);
        utils.setContext(Constants.CONTEXT_FLAGS.AUTO_CONNECT, false);
        this.finishedStartup = true;

        this.leoStates.fileOpenedReady = false;
        this.leoStates.leoBridgeReady = false;
        this._leoBridgeReadyPromise = undefined;
        this._leoStatusBar.update(false);
        this._refreshOutline(false, RevealType.NoReveal);
    }

    /**
     * * Send user's configuration through leoBridge to the server script
     * @param p_config A config object containing all the configuration settings
     * @returns promise that will resolves with the package from "applyConfig" call in Leo bridge server
     */
    public sendConfigToServer(p_config: ConfigMembers): Promise<LeoBridgePackage> {
        if (this.leoStates.leoBridgeReady) {
            return this.sendAction(Constants.LEOBRIDGE.APPLY_CONFIG, JSON.stringify(p_config));
        } else {
            return Promise.reject("Leo Bridge Not Ready");
        }
    }

    /**
     * * Open Leo files found in "context.globalState.leoFiles"
     * @returns promise that resolves with editor of last opened from the list, or rejects if empty
     */
    private _openLastFiles(): Promise<vscode.TextEditor> {
        // Loop through context.globalState.<something> and check if they exist: open them
        const w_lastFiles: string[] = this._context.globalState.get(Constants.LAST_FILES_KEY) || [];
        if (w_lastFiles.length) {
            return this.sendAction(Constants.LEOBRIDGE.OPEN_FILES, JSON.stringify({ files: w_lastFiles }))
                .then((p_openFileResult: LeoBridgePackage) => {
                    this.leoStates.leoBridgeReady = true;
                    this.finishedStartup = true;
                    return this._setupOpenedLeoDocument(p_openFileResult);
                }, p_errorOpen => {
                    this.leoStates.leoBridgeReady = true;
                    this.finishedStartup = true;
                    console.log('in .then not opened or already opened');
                    return Promise.reject(p_errorOpen);
                });
        } else {
            return Promise.reject("Recent files list is empty");
        }
    }

    /**
     * * Adds to the context.globalState.<xxx>files if not already in there (no duplicates)
     * @param p_file path+file name string
     * @returns A promise that resolves when all global storage modifications are done
     */
    private _addRecentAndLastFile(p_file: string): Promise<void> {
        if (!p_file.length) {
            return Promise.reject();
        }
        return Promise.all([
            utils.addFileToGlobal(this._context, p_file, Constants.RECENT_FILES_KEY),
            utils.addFileToGlobal(this._context, p_file, Constants.LAST_FILES_KEY)
        ]).then(() => {
            return Promise.resolve();
        });
    }

    /**
     * * Removes from context.globalState.leoRecentFiles if found (should not have duplicates)
     * @param p_file path+file name string
     * @returns A promise that resolves when the global storage modification is done
     */
    private _removeRecentFile(p_file: string): Thenable<void> {
        return utils.removeFileFromGlobal(this._context, p_file, Constants.RECENT_FILES_KEY);
    }

    /**
     * * Removes from context.globalState.leoLastFiles if found (should not have duplicates)
     * @param p_file path+file name string
     * @returns A promise that resolves when the global storage modification is done
     */
    private _removeLastFile(p_file: string): Thenable<void> {
        return utils.removeFileFromGlobal(this._context, p_file, Constants.LAST_FILES_KEY);
    }

    /**
     * * Shows the recent Leo files list, choosing one will open it
     * @returns A promise that resolves when the a file is finally opened, rejected otherwise
     */
    public showRecentLeoFiles(): Thenable<vscode.TextEditor | undefined> {
        const w_recentFiles: string[] = this._context.globalState.get(Constants.RECENT_FILES_KEY) || [];
        let q_chooseFile: Thenable<string | undefined>;
        if (w_recentFiles.length) {
            q_chooseFile = vscode.window.showQuickPick(
                w_recentFiles,
                { placeHolder: Constants.USER_MESSAGES.OPEN_RECENT_FILE }
            );
        } else {
            // No file to list
            return Promise.resolve(undefined);
        }
        return q_chooseFile.then((p_result) => {
            if (p_result) {
                return this.openLeoFile(vscode.Uri.file(p_result));
            } else {
                // Canceled
                return Promise.resolve(undefined);
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
        if (this._refreshType.documents) {
            this._refreshType.documents = false;
            this.refreshDocumentsPane();
        }
        if (this._refreshType.buttons) {
            this._refreshType.buttons = false;
            this._leoButtonsProvider.refreshTreeRoot();
        }
        if (this._refreshType.states) {
            this._refreshType.states = false;
            this.sendAction(Constants.LEOBRIDGE.GET_STATES)
                .then((p_package: LeoBridgePackage) => {

                    //                            **********************************
                    //                             TODO : Check if still same GNX !
                    //                            **********************************

                    if (p_package.states) {
                        this.leoStates.setLeoStateFlags(p_package.states);
                    }
                });
        }

    }

    /**
     * * Returns the 'busy' state flag of the command stack, and leoBridge stack, while showing a message if it is.
     * Needed by special unstackable commands such as new, open,...
     * @param p_all Flag to also return true if either front command stack or bridge stack is busy
     * @returns true if command stack is busy, also returns true if p_all flag is set and bridge is busy
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
     * * Promise that triggers body save (rejects if busy), and resolves when done
     * @param p_forcedVsCodeSave Flag to also have vscode 'save' the content of this editor through the filesystem
     * @returns a promise that resolves when the possible saving process is finished
     */
    private _isBusyTriggerSave(p_all: boolean, p_forcedVsCodeSave?: boolean): Promise<boolean> {
        if (this._isBusy(p_all)) {
            return Promise.reject("Command stack busy"); // Warn user to wait for end of busy state
        }
        return this.triggerBodySave(p_forcedVsCodeSave);
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
        this._refreshOutline(false, RevealType.NoReveal);
        this.refreshDocumentsPane();
        this._leoButtonsProvider.refreshTreeRoot();
        this.closeBody();
    }

    /**
     * * A Leo file was opened: setup leoInteg's UI accordingly.
     * @param p_openFileResult Returned info about currently opened and editing document
     * @return a promise that resolves to an opened body pane text editor
     */
    private _setupOpenedLeoDocument(p_openFileResult: LeoBridgePackage): Promise<vscode.TextEditor> {
        const w_selectedLeoNode = this.apToLeoNode(p_openFileResult.node!, false); // Just to get gnx for the body's fist appearance
        this.leoStates.leoOpenedFileName = p_openFileResult.filename!;

        // * If not unnamed file add to recent list & last opened list
        this._addRecentAndLastFile(p_openFileResult.filename!);

        // * Could be already opened, so perform 'rename hack' as if another node was selected
        if (this._bodyTextDocument && this.bodyUri) {
            // TODO : BUG WHEN SWITCHING LEO DOCUMENT : NEED CROSSOVER LOGIC!
            this._switchBody(w_selectedLeoNode.gnx, false, true);
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
        this._refreshOutline(true, RevealType.RevealSelectFocus); // p_revealSelection flag set
        // * Maybe first StatusBar appearance
        this._leoStatusBar.update(true, 0, true);
        this._leoStatusBar.show(); // Just selected a node
        // * Show leo log pane
        this.showLogPane();
        // * Send config to python's side (for settings such as defaultReloadIgnore and checkForChangeExternalFiles)
        this.sendConfigToServer(this.config.getConfig());
        // * Refresh Opened tree views
        this.refreshDocumentsPane();
        this._leoButtonsProvider.refreshTreeRoot();
        this.loadSearchSettings();
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
        // also check if workbench.editor.enablePreview
        this._bodyEnablePreview = !!vscode.workspace.getConfiguration('workbench.editor').get("enablePreview");
    }

    /**
     * * Handles the opening of a file in vscode, and check if it's a Leo file to suggest opening options
     * @param p_event The opened document event passed by vscode
     */
    private _onDidOpenTextDocument(p_document: vscode.TextDocument): void {
        if (this.leoStates.leoBridgeReady && p_document.uri.scheme === Constants.URI_LEO_SCHEME && p_document.uri.fsPath.toLowerCase().endsWith(".leo")) {
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
            // Pass
        } else {
            // * This part only happens if the user clicked on the arrow without trying to select the node
            this._revealTreeViewNode(p_event.element, { select: true, focus: false }); // No force focus : it breaks collapse/expand when direct parent
            this.selectTreeNode(p_event.element, true);  // not waiting for a .then(...) so not to add any lag
        }
        this.sendAction(p_expand ? Constants.LEOBRIDGE.EXPAND_NODE : Constants.LEOBRIDGE.COLLAPSE_NODE, p_event.element.apJson)
            .then(() => {
                if (this.config.leoTreeBrowse) {
                    this._refreshOutline(true, RevealType.RevealSelect);
                }
            });
    }

    /**
     * * Handle the change of visibility of either outline treeview and refresh it if its visible
     * @param p_event The treeview-visibility-changed event passed by vscode
     * @param p_explorerView Flag to signify that the treeview who triggered this event is the one in the explorer view
     */
    private _onTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        if (p_event.visible) {
            this._lastTreeView = p_explorerView ? this._leoTreeExView : this._leoTreeView;
            this.setTreeViewTitle();
            this._needLastSelectedRefresh = true; // Its a new node in a new tree so refresh lastSelectedNode too
            if (this.leoStates.fileOpenedReady) {
                this.loadSearchSettings();
            }
            this._refreshOutline(true, RevealType.RevealSelect);
        }
    }

    /**
     * * Handle the change of visibility of either outline treeview and refresh it if its visible
     * @param p_event The treeview-visibility-changed event passed by vscode
     * @param p_explorerView Flags that the treeview who triggered this event is the one in the explorer view
     */
    private _onDocTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        if (p_explorerView) { } // (Facultative/unused) Do something different if explorer view is used
        if (p_event.visible) {
            this.refreshDocumentsPane();
        }
    }

    /**
     * * Handle the change of visibility of either outline treeview and refresh it if its visible
     * @param p_event The treeview-visibility-changed event passed by vscode
     * @param p_explorerView Flags that the treeview who triggered this event is the one in the explorer view
     */
    private _onButtonsTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        if (p_explorerView) { } // (Facultative/unused) Do something different if explorer view is used
        if (p_event.visible) {
            this._leoButtonsProvider.refreshTreeRoot();
        }
    }

    /**
     * * Handles detection of the active editor having changed from one to another, or closed
     * TODO : Make sure the selection in tree if highlighted when a body pane is selected
     * @param p_editor The editor itself that is now active
     * @param p_internalCall Flag used to signify the it was called voluntarily by leoInteg itself
     */
    private _onActiveEditorChanged(p_editor: vscode.TextEditor | undefined, p_internalCall?: boolean): void {
        if (p_editor && p_editor.document.uri.scheme === Constants.URI_LEO_SCHEME) {
            if (this.bodyUri.fsPath !== p_editor.document.uri.fsPath) {
                this._hideDeleteBody(p_editor);
            }
            this._checkPreviewMode(p_editor);
        }
        if (!p_internalCall) {
            this.triggerBodySave(true); // Save in case edits were pending
        }
        // * Status flag check
        if (!p_editor && this._leoStatusBar.statusBarFlag) {
            return;
        }
        // * Status flag check
        if (vscode.window.activeTextEditor) {
            this._leoStatusBar.update(vscode.window.activeTextEditor.document.uri.scheme === Constants.URI_LEO_SCHEME);
        }
    }

    /**
     * * Moved a document to another column
     */
    public _changedTextEditorViewColumn(p_columnChangeEvent: vscode.TextEditorViewColumnChangeEvent): void {
        if (p_columnChangeEvent && p_columnChangeEvent.textEditor.document.uri.scheme === 'more') {
            this._checkPreviewMode(p_columnChangeEvent.textEditor);
        }
        this.triggerBodySave(true);
    }

    /**
     * * Tabbed on another editor
     */
    public _changedVisibleTextEditors(p_editors: vscode.TextEditor[]): void {
        if (p_editors && p_editors.length) {
            p_editors.forEach(p_textEditor => {
                if (p_textEditor && p_textEditor.document.uri.scheme === 'more') {
                    if (this.bodyUri.fsPath !== p_textEditor.document.uri.fsPath) {
                        this._hideDeleteBody(p_textEditor);
                    }
                    this._checkPreviewMode(p_textEditor);
                }
            });
        }
        this.triggerBodySave(true);
    }

    /**
     * * Whole window has been minimized/restored
     */
    public _changedWindowState(p_windowState: vscode.WindowState): void {
        // no other action
        this.triggerBodySave(true);
    }

    /**
     * * Handles detection of the active editor's selection change or cursor position
     * @param p_event a change event containing the active editor's selection, if any.
     */
    private _onChangeEditorSelection(p_event: vscode.TextEditorSelectionChangeEvent): void {
        if ((p_event.textEditor.document.uri.scheme === Constants.URI_LEO_SCHEME)) {
            if (p_event.selections.length) {
                this._selectionDirty = true;
                this._selection = p_event.selections[0];
                this._selectionGnx = utils.leoUriToStr(p_event.textEditor.document.uri);
            }
        }
    }

    /**
     * * Handles detection of the active editor's scroll position changes
     * @param p_event a change event containing the active editor's visible range, if any.
     */
    private _onChangeEditorScroll(p_event: vscode.TextEditorVisibleRangesChangeEvent): void {
        if ((p_event.textEditor.document.uri.scheme === Constants.URI_LEO_SCHEME)) {
            if (p_event.visibleRanges.length) {
                this._scrollDirty = true;
                this._scroll = p_event.visibleRanges[0];
                this._scrollGnx = utils.leoUriToStr(p_event.textEditor.document.uri);
            }
        }
    }

    /**
     * * Handle typing that was detected in a document
     * @param p_textDocumentChange Text changed event passed by vscode
     */
    private _onDocumentChanged(p_textDocumentChange: vscode.TextDocumentChangeEvent): void {
        // ".length" check necessary, see https://github.com/microsoft/vscode/issues/50344
        if (this.lastSelectedNode && p_textDocumentChange.contentChanges.length && (p_textDocumentChange.document.uri.scheme === Constants.URI_LEO_SCHEME)) {

            // * There was an actual change on a Leo Body by the user
            this._bodyLastChangedDocument = p_textDocumentChange.document;
            this._bodyLastChangedDocumentSaved = false;
            this._bodyPreviewMode = false;
            this._fromOutline = false; // Focus is on body pane

            // * If icon should change then do it now (if there's no document edit pending)
            if (!this._currentDocumentChanged || utils.leoUriToStr(p_textDocumentChange.document.uri) === this.lastSelectedNode.gnx) {
                const w_hasBody = !!(p_textDocumentChange.document.getText().length);
                if (utils.isIconChangedByEdit(this.lastSelectedNode, w_hasBody)) {
                    this._bodySaveDocument(p_textDocumentChange.document)
                        .then(() => {
                            if (this.lastSelectedNode) {
                                this.lastSelectedNode.dirty = true;
                                this.lastSelectedNode.hasBody = w_hasBody;
                                // NOT incrementing this.treeID to keep ids intact
                            }
                            // NoReveal since we're keeping the same id.
                            this._refreshOutline(false, RevealType.NoReveal);
                        });
                }
            }
        }
    }

    /**
     * * Save body to Leo if its dirty. That is, only if a change has been made to the body 'document' so far
     * @param p_forcedVsCodeSave Flag to also have vscode 'save' the content of this editor through the filesystem
     * @returns a promise that resolves when the possible saving process is finished
     */
    public triggerBodySave(p_forcedVsCodeSave?: boolean): Promise<boolean> {
        // * Save body to Leo if a change has been made to the body 'document' so far
        if (this._bodyLastChangedDocument &&
            this._bodyLastChangedDocument.isDirty &&
            !this._bodyLastChangedDocumentSaved) {
            const w_document = this._bodyLastChangedDocument; // backup for bodySaveDocument before reset
            if (p_forcedVsCodeSave) {
                // console.log('FORCED SAVE');
            }
            this._bodyLastChangedDocumentSaved = true;
            return this._bodySaveDocument(w_document, p_forcedVsCodeSave);

        } else {
            this._bodyLastChangedDocumentSaved = true;
            return this._bodySaveSelection();
        }
    }

    /**
     * * Saves the cursor position along with the text selection range and scroll position
     * @returns Promise that resolves when the "setSelection" action returns from Leo's side
     */
    private _bodySaveSelection(): Promise<boolean> {
        if (this._selectionDirty && this._selection) {
            // Prepare scroll data separately
            // ! TEST NEW SCROLL WITH SINGLE LINE NUMBER
            let w_scroll: number;
            if (this._selectionGnx === this._scrollGnx && this._scrollDirty) {
                w_scroll = this._scroll?.start.line || 0;
            } else {
                w_scroll = 0;
            }
            // let w_scroll: { start: BodyPosition; end: BodyPosition; };
            // if (this._selectionGnx === this._scrollGnx && this._scrollDirty) {
            //     w_scroll = {
            //         start: {
            //             line: this._scroll?.start.line || 0,
            //             col: this._scroll?.start.character || 0
            //         },
            //         end: {
            //             line: this._scroll?.end.line || 0,
            //             col: this._scroll?.end.character || 0
            //         }
            //     };
            // } else {
            //     w_scroll = {
            //         start: {
            //             line: 0, col: 0
            //         },
            //         end: {
            //             line: 0, col: 0
            //         }
            //     };
            // }
            // Send whole
            const w_param: BodySelectionInfo = {
                gnx: this._selectionGnx,
                scroll: w_scroll,
                insert: {
                    line: this._selection.active.line || 0,
                    col: this._selection.active.character || 0
                },
                start: {
                    line: this._selection.start.line || 0,
                    col: this._selection.start.character || 0
                },
                end: {
                    line: this._selection.end.line || 0,
                    col: this._selection.end.character || 0
                }

            };
            // console.log("set scroll to leo: " + w_scroll + " start:" + this._selection.start.line);

            this._scrollDirty = false;
            this._selectionDirty = false; // don't wait for return of this call
            return this.sendAction(Constants.LEOBRIDGE.SET_SELECTION, JSON.stringify(w_param))
                .then(p_result => {
                    return Promise.resolve(true);
                });
        } else {
            return Promise.resolve(true);
        }
    }

    /**
     * * Sets new body text on leo's side, and may optionally save vsCode's body editor (which will trim spaces)
     * @param p_document Vscode's text document which content will be used to be the new node's body text in Leo
     * @param p_forcedVsCodeSave Flag to also have vscode 'save' the content of this editor through the filesystem
     * @returns a promise that resolves when the complete saving process is finished
     */
    private _bodySaveDocument(p_document: vscode.TextDocument, p_forcedVsCodeSave?: boolean): Promise<boolean> {
        if (p_document) {
            // * Fetch gnx and document's body text first, to be reused more than once in this method
            const w_param = {
                gnx: utils.leoUriToStr(p_document.uri),
                body: p_document.getText()
            };
            this.sendAction(Constants.LEOBRIDGE.SET_BODY, JSON.stringify(w_param)); // Don't wait for promise
            // This bodySaveSelection is placed on the stack right after saving body, returns promise either way
            return this._bodySaveSelection()
                .then(() => {
                    this._refreshType.states = true;
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
     * * Places selection on the required node with a 'timeout'. Used after refreshing the opened Leo documents view.
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
    public showOutline(p_focusOutline?: boolean): void {
        if (this.lastSelectedNode) {
            this._lastTreeView.reveal(this.lastSelectedNode, {
                select: true,
                focus: p_focusOutline
            });
        }
    }

    /**
     * * Sets the outline pane top bar string message or refreshes with existing title if no title passed
     * @param p_title new string to replace the current title
     */
    public setTreeViewTitle(p_title?: string): void {
        if (p_title) {
            this._currentOutlineTitle = p_title;
        }
        // * Set/Change outline pane title e.g. "INTEGRATION", "OUTLINE"
        if (this._leoTreeView) {
            this._leoTreeView.title = this._currentOutlineTitle;
        }
        if (this._leoTreeExView) {
            this._leoTreeExView.title = Constants.GUI.EXPLORER_TREEVIEW_PREFIX + this._currentOutlineTitle;
        }
    }

    /**
     * * Refresh tree for 'node hover icons' to show up properly after changing their settings
     */
    public configTreeRefresh(): void {
        if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
            this._preventShowBody = true;
            this._refreshOutline(true, RevealType.RevealSelect);
        }
    }

    /**
     * * Refreshes the outline. A reveal type can be passed along to specify the reveal type for the selected node
     * @param p_revealType Facultative reveal type to specify type of reveal when the 'selected node' is encountered
     */
    private _refreshOutline(p_incrementTreeID: boolean, p_revealType?: RevealType): void {
        if (p_incrementTreeID) {
            this._treeId++;
        }
        if (p_revealType !== undefined) { // To check if selected node should self-select while redrawing whole tree
            this._revealType = p_revealType; // To be read/cleared (in arrayToLeoNodesArray instead of directly by nodes)
        }
        // Force showing last used Leo outline first
        if (this.lastSelectedNode && !(this._leoTreeExView.visible || this._leoTreeView.visible)) {
            this._lastTreeView.reveal(this.lastSelectedNode)
                .then(() => {
                    this._leoTreeProvider.refreshTreeRoot();
                });
        } else {
            this._leoTreeProvider.refreshTreeRoot();
        }
    }

    /**
     * * 'TreeView.reveal' for any opened leo outline that is currently visible
     * @param p_leoNode The node to be revealed
     * @param p_options Options object for the revealed node to either also select it, focus it, and expand it
     */
    private _revealTreeViewNode(p_leoNode: LeoNode, p_options?: { select?: boolean, focus?: boolean, expand?: boolean | number }): Thenable<void> {
        if (this._leoTreeView.visible) {
            return this._leoTreeView.reveal(p_leoNode, p_options);
        }
        if (this._leoTreeExView.visible && this.config.treeInExplorer) {
            return this._leoTreeExView.reveal(p_leoNode, p_options);
        }
        return Promise.resolve(); // Defaults to resolving even if both are hidden
    }

    /**
     * * Launches refresh for UI components and states
     * @param p_refreshType choose to refresh the outline, or the outline and body pane along with it
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     */
    public launchRefresh(p_refreshType: ReqRefresh, p_fromOutline: boolean, p_ap?: ArchivedPosition): void {
        // Set w_revealType, it will ultimately set this._revealType.
        // Used when finding the OUTLINE's selected node and setting or preventing focus into it
        // Set this._fromOutline. Used when finding the selected node and showing the BODY to set or prevent focus in it
        this._refreshType = Object.assign({}, p_refreshType);
        let w_revealType: RevealType;
        if (p_fromOutline) {
            this._fromOutline = true;
            w_revealType = RevealType.RevealSelectFocus;
        } else {
            this._fromOutline = false;
            w_revealType = RevealType.RevealSelect;
        }
        if (p_ap && this._refreshType.body &&
            this._bodyLastChangedDocument &&
            this._bodyLastChangedDocument.isDirty
        ) {
            // When this refresh is launched with 'refresh body' requested, we need to lose any pending edits and save on vscode's side.
            // do this only if gnx is different from what is coming from Leo in this refresh cycle
            if (
                p_ap.gnx !== utils.leoUriToStr(this._bodyLastChangedDocument.uri) &&
                !this._bodyLastChangedDocumentSaved
            ) {
                this._bodyLastChangedDocument.save(); // Voluntarily save to 'clean' any pending body
                this._bodyLastChangedDocumentSaved = true;
            }

            if (p_ap.gnx === utils.leoUriToStr(this._bodyLastChangedDocument.uri)) {
                this._leoFileSystem.preventSaveToLeo = true;
                this._bodyLastChangedDocument.save();
            }
        }
        // * _focusInterrupt insertNode Override
        if (this._focusInterrupt) {
            // this._focusInterrupt = false; // TODO : Test if reverting this in _gotSelection is 'ok'
            w_revealType = RevealType.RevealSelect;
        }
        // * Either the whole tree refreshes, or a single tree node is revealed when just navigating
        if (this._refreshType.tree) {
            this._refreshType.tree = false;
            this._refreshOutline(true, w_revealType);
        } else if (this._refreshType.node && p_ap) {
            // * Force single node "refresh" by revealing it, instead of "refreshing" it
            this._refreshType.node = false;
            const w_node = this.apToLeoNode(p_ap);
            this.leoStates.setSelectedNodeFlags(w_node);
            this._revealTreeViewNode(w_node, {
                select: true, focus: true // FOCUS FORCED TO TRUE always leave focus on tree when navigating
            });
            if (this._refreshType.body) {
                this._refreshType.body = false;
                this._tryApplyNodeToBody(w_node, false, true); // ! NEEDS STACK AND THROTTLE!
            }
        }
        this.getStates();
    }

    /**
     * * Refresh the documents pane
     */
    private _refreshDocumentsPane(): void {
        this._leoDocumentsProvider.refreshTreeRoot();
    }

    /**
     * * Handle the selected node that was reached while converting received ap_nodes to LeoNodes
     * @param p_node The selected node that was reached while receiving 'children' from tree view api implementing Leo's outline
     */
    private _gotSelection(p_node: LeoNode): void {
        // * Use the 'from outline' concept to decide if focus should be on body or outline after editing a headline
        let w_showBodyKeepFocus: boolean = this._fromOutline; // Will preserve focus where it is without forcing into the body pane if true
        if (this._focusInterrupt) {
            this._focusInterrupt = false; // TODO : Test if reverting this in _gotSelection is 'ok'
            w_showBodyKeepFocus = true;
        }
        this._tryApplyNodeToBody(p_node, false, w_showBodyKeepFocus);
    }

    /**
     * * Check if Leo should be focused on outline
     */
    public getBridgeFocus(): void {
        this.sendAction(Constants.LEOBRIDGE.GET_FOCUS)
            .then((p_resultFocus: LeoBridgePackage) => {
                if (p_resultFocus.focus) {
                    const w_focus = p_resultFocus.focus.toLowerCase();
                    if (w_focus.includes("tree") ||
                        w_focus.includes("head")) {
                        this._fromOutline = true;
                        // this.showOutline(true);
                    }
                }
            });
    }

    /**
     * * Converts an archived position object to a LeoNode instance
     * @param p_ap The archived position to convert
     * @param p_revealSelected Flag that will trigger the node to reveal, select, and focus if its selected node in Leo
     * @param p_specificNode Other specific LeoNode to be used to override when revealing the the selected node is encountered
     */
    public apToLeoNode(p_ap: ArchivedPosition, p_revealSelected?: boolean, p_specificNode?: LeoNode): LeoNode {
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
            utils.hashNode(p_ap, this._treeId.toString(36))
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
     * * Makes sure the body now reflects the selected node.
     * This is called after 'selectTreeNode', or after '_gotSelection' when refreshing.
     * @param p_node Node that was just selected
     * @param p_aside Flag to indicate opening 'Aside' was required
     * @param p_showBodyKeepFocus Flag used to keep focus where it was instead of forcing in body
     * @param p_force_open Flag to force opening the body pane editor
     */
    private _tryApplyNodeToBody(p_node: LeoNode, p_aside: boolean, p_showBodyKeepFocus: boolean, p_force_open?: boolean): Thenable<vscode.TextEditor> {

        // console.log('try to apply node -> ', p_node.gnx);

        this.lastSelectedNode = p_node; // Set the 'lastSelectedNode' this will also set the 'marked' node context
        this._commandStack.newSelection(); // Signal that a new selected node was reached and to stop using the received selection as target for next command

        if (this._bodyTextDocument) {
            // if not first time and still opened - also not somewhat exactly opened somewhere.
            if (
                !this._bodyTextDocument.isClosed &&
                !this._locateOpenedBody(p_node.gnx) // LOCATE NEW GNX
            ) {
                // if needs switching by actually having different gnx
                if (utils.leoUriToStr(this.bodyUri) !== p_node.gnx) {
                    this._locateOpenedBody(utils.leoUriToStr(this.bodyUri)); // * LOCATE OLD GNX FOR PROPER COLUMN*
                    return this._bodyTextDocument.save()
                        .then(() => {
                            return this._switchBody(p_node.gnx, p_aside, p_showBodyKeepFocus);
                        });
                }
            }
        } else {
            // first time?
            this.bodyUri = utils.strToLeoUri(p_node.gnx);
        }
        return this.showBody(p_aside, p_showBodyKeepFocus);

        /*
            this._showBodyParams = {
                node: p_node,
                aside: p_aside,
                showBodyKeepFocus: p_showBodyKeepFocus,
                force_open: p_force_open // can be undefined
            };
            // Start it if possible, otherwise the last _showBodyParams will be used again right after
            if (!this._showBodyStarted) {
                this._showBodyStarted = true;
                this._applyNodeToBody(this._showBodyParams)
                    .then((p_textEditor: vscode.TextEditor) => {
                        // finished
                        this._showBodyStarted = false;
                        if (this._showBodyParams) {
                            // New node to show again! Call itself faking params from the specified ones.
                            this._tryApplyNodeToBody(
                                this._showBodyParams.node,
                                this._showBodyParams.aside,
                                this._showBodyParams.showBodyKeepFocus,
                                this._showBodyParams.force_open
                            );
                        }
                    });
                // Clear global body params, will get refilled if needed
                this._showBodyParams = undefined;
            }
            */
    }

    /**
     * * Close body pane document and change the bodyUri
     * This blocks 'undos' from crossing over
     * @param p_newGnx New gnx body id to switch to
     */
    private _switchBody(p_newGnx: string, p_aside: boolean, p_preserveFocus?: boolean): Thenable<vscode.TextEditor> {

        const w_oldUri: vscode.Uri = this.bodyUri;

        // ? Set timestamps ?
        // this._leoFileSystem.setRenameTime(p_newGnx);

        let w_visibleCount = 0;
        vscode.window.visibleTextEditors.forEach(p_editor => {
            if (p_editor.document.uri.scheme === Constants.URI_LEO_SCHEME) {
                w_visibleCount++;
            }
        });

        if (this._bodyPreviewMode && this._bodyEnablePreview && w_visibleCount < 2) {
            // just show in same column and delete after
            this.bodyUri = utils.strToLeoUri(p_newGnx);
            const q_showBody = this.showBody(p_aside, p_preserveFocus);
            vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', w_oldUri.path);
            return q_showBody;
        } else {
            // Gotta delete to close all and re-open, so:
            // Promise to Delete first, synchronously (as thenable),
            // tagged along with automatically removeFromRecentlyOpened in parallel
            const w_edit = new vscode.WorkspaceEdit();
            w_edit.deleteFile(w_oldUri, { ignoreIfNotExists: true });
            return vscode.workspace.applyEdit(w_edit)
                .then(() => {
                    // Set new uri and remove from 'Recently opened'
                    this._bodyPreviewMode = true;
                    this.bodyUri = utils.strToLeoUri(p_newGnx);
                    // async, so don't wait for this to finish
                    if (w_oldUri.fsPath !== this.bodyUri.fsPath) {
                        vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', w_oldUri.path);
                    }
                    return this.showBody(p_aside, p_preserveFocus);
                });
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

    private _findUriColumn(p_uri: vscode.Uri): vscode.ViewColumn | undefined {
        let w_column: vscode.ViewColumn | undefined;
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (p_textEditor.document.uri.fsPath === p_uri.fsPath) {
                w_column = p_textEditor.viewColumn;
            }
        });
        return w_column;
    }

    private findGnxColumn(p_gnx: string): vscode.ViewColumn | undefined {
        let w_column: vscode.ViewColumn | undefined;
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (p_textEditor.document.uri.fsPath.substr(1) === p_gnx) {
                w_column = p_textEditor.viewColumn;
            }
        });
        return w_column;
    }

    private _hideDeleteBody(p_textEditor: vscode.TextEditor): void {
        console.log('DELETE EXTRANEOUS:', p_textEditor.document.uri.fsPath);
        const w_edit = new vscode.WorkspaceEdit();
        w_edit.deleteFile(p_textEditor.document.uri, { ignoreIfNotExists: true });
        if (p_textEditor.hide) {
            p_textEditor.hide();
        }
        vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', p_textEditor.document.uri.path);
    }

    private _checkPreviewMode(p_editor: vscode.TextEditor): void {
        // if selected gnx but in another column
        if (
            p_editor.document.uri.fsPath === this.bodyUri.fsPath &&
            p_editor.viewColumn !== this._bodyMainSelectionColumn
        ) {
            this._bodyPreviewMode = false;
            this._bodyMainSelectionColumn = p_editor.viewColumn;
        }
    }

    /**
     * * Closes any body pane opened in this vscode window instance
     */
    public closeBody(): void {
        // TODO : CLEAR UNDO HISTORY AND FILE HISTORY for this.bodyUri !
        if (this.bodyUri) {
            vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', this.bodyUri.path);
        }
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (p_textEditor.document.uri.scheme === Constants.URI_LEO_SCHEME) {
                vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', p_textEditor.document.uri.path);
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
    public showBody(p_aside: boolean, p_preserveFocus?: boolean): Promise<vscode.TextEditor> {

        // First setup timeout asking for gnx file refresh in case we were resolving a refresh of type 'RefreshTreeAndBody'
        if (this._refreshType.body) {
            this._refreshType.body = false;
            // TODO : CHECK IF TIMEOUT NECESSARY!
            setTimeout(() => {
                this._leoFileSystem.fireRefreshFile(utils.leoUriToStr(this.bodyUri));
            }, 0);
        }

        if (this._preventShowBody) {
            this._preventShowBody = false;
            return Promise.resolve(vscode.window.activeTextEditor!);
        }

        return Promise.resolve(vscode.workspace.openTextDocument(this.bodyUri)).then(p_document => {

            this._bodyTextDocument = p_document;

            // * Set document language along with the proper cursor position, selection range and scrolling position
            const q_bodyStates: Promise<LeoBridgePackage> = this.sendAction(Constants.LEOBRIDGE.GET_BODY_STATES, this.lastSelectedNode!.apJson);

            q_bodyStates.then(
                (p_bodyStates: LeoBridgePackage) => {
                    let w_language: string = p_bodyStates.language!;
                    // Replace language string if in 'exceptions' array
                    w_language = "leobody." + (Constants.LANGUAGE_CODES[w_language] || w_language);
                    // Apply language if the selected node is still the same after all those events
                    if (
                        !p_document.isClosed && this.lastSelectedNode &&
                        utils.leoUriToStr(p_document.uri) === this.lastSelectedNode.gnx
                    ) {
                        vscode.languages.setTextDocumentLanguage(p_document, w_language);
                    }
                }
            );

            // Find body pane's position if already opened with same gnx (language still needs to be set per position)
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
                    // selection is instead set when the GET_BODY_STATES above resolves
                } : {
                    viewColumn: this._bodyMainSelectionColumn ? this._bodyMainSelectionColumn : 1, // view column in which the editor should be shown
                    preserveFocus: p_preserveFocus, // an optional flag that when true will stop the editor from taking focus
                    preview: true // should text document be in preview only? set false for fully opened
                    // selection is instead set when the GET_BODY_STATES above resolves
                };

            // NOTE: textEditor.show() is deprecated — Use window.showTextDocument instead.
            const q_showTextDocument = vscode.window.showTextDocument(this._bodyTextDocument, w_showOptions);

            Promise.all([q_bodyStates, q_showTextDocument])
                .then((p_values: [LeoBridgePackage, vscode.TextEditor]) => {
                    const w_resultBodyStates = p_values[0];
                    const w_bodyTextEditor = p_values[1];
                    const w_leoBodySel: BodySelectionInfo = w_resultBodyStates.selection!;

                    // console.log("got states for same gnx", w_leoBodySel.gnx === this.lastSelectedNode!.gnx);
                    // console.log('id: ' + w_resultBodyStates.id + ' - got scroll: ', w_leoBodySel.scroll);

                    let w_scrollRange: vscode.Range | undefined;

                    // ! TEST scroll as single number instead.
                    const w_scroll: number = w_leoBodySel.scroll;
                    if (w_scroll) {
                        w_scrollRange = new vscode.Range(
                            w_scroll,
                            0,
                            w_scroll,
                            0
                        );
                    }

                    // Cursor position and selection range
                    const w_activeRow: number = w_leoBodySel.insert.line;
                    const w_activeCol: number = w_leoBodySel.insert.col;
                    let w_anchorLine: number = w_leoBodySel.start.line;
                    let w_anchorCharacter: number = w_leoBodySel.start.col;

                    if (w_activeRow === w_anchorLine &&
                        w_activeCol === w_anchorCharacter) {
                        // Active insertion same as start selection, so use the other ones
                        w_anchorLine = w_leoBodySel.end.line;
                        w_anchorCharacter = w_leoBodySel.end.col;
                    }

                    const w_selection = new vscode.Selection(
                        w_anchorLine,
                        w_anchorCharacter,
                        w_activeRow,
                        w_activeCol
                    );

                    w_bodyTextEditor.selection = w_selection; // set cursor insertion point & selection range

                    if (!w_scrollRange) {
                        w_scrollRange = w_bodyTextEditor.document.lineAt(0).range;
                    }

                    // TODO : SEE IF NEEDED OR EVEN IF SHOULD BE SET AT w_selection RANGE INSTEAD!
                    // ? does Leo even ever tries to set scroll away from selection after a search result?
                    // w_bodyTextEditor.revealRange(w_scrollRange); // set scroll approximation
                });

            return q_showTextDocument;
        });
    }

    /**
     * * Select a tree node. Either called from user interaction, or used internally (p_internalCall flag)
     * @param p_node Node that was just selected
     * @param p_internalCall Flag used to indicate the selection is forced, and NOT originating from user interaction
     * @param p_aside Flag to force opening the body "Aside", i.e. when the selection was made from choosing "Open Aside"
     * @returns a promise with the package gotten back from Leo when asked to select the tree node
     */
    public selectTreeNode(p_node: LeoNode, p_internalCall?: boolean, p_aside?: boolean): Promise<LeoBridgePackage | vscode.TextEditor> {

        this.triggerBodySave(true);

        // * check if used via context menu's "open-aside" on an unselected node: check if p_node is currently selected, if not select it
        if (p_aside && p_node !== this.lastSelectedNode) {
            this._revealTreeViewNode(p_node, { select: true, focus: false }); // no need to set focus: tree selection is set to right-click position
        }

        this.leoStates.setSelectedNodeFlags(p_node);
        this._leoStatusBar.update(true); // Just selected a node directly, or via expand/collapse
        const w_showBodyKeepFocus = p_aside ? this.config.treeKeepFocusWhenAside : this.config.treeKeepFocus;

        // * Check if having already this exact node position selected : Just show the body and exit
        // (other tree nodes with same gnx may have different syntax language coloring because of parents lineage)
        if (p_node === this.lastSelectedNode) {
            this._locateOpenedBody(p_node.gnx); // LOCATE NEW GNX
            return this.showBody(!!p_aside, w_showBodyKeepFocus); // Voluntary exit
        }

        // * Set selected node in Leo via leoBridge
        const q_setSelectedNode = this.sendAction(Constants.LEOBRIDGE.SET_SELECTED_NODE, p_node.apJson)
            .then((p_setSelectedResult) => {
                if (!p_internalCall) {
                    this._refreshType.states = true;
                    this.getStates();
                }
                return p_setSelectedResult;
            });

        // * Apply the node to the body text without waiting for the selection promise to resolve
        this._tryApplyNodeToBody(p_node, !!p_aside, w_showBodyKeepFocus, true);
        return q_setSelectedNode;
    }

    /**
     * * Tries to add a command to the frontend stack, returns true if added, false otherwise
     * @param p_action A string commands for leobridgeserver.py, from Constants.LEOBRIDGE,
     * @param p_node Specific node to pass as parameter, or the selected node if omitted
     * @param p_refresh Specifies to either refresh nothing, the tree or body and tree when finished
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     * @param p_text Specific string to pass along as parameter with the action, similar to p_node parameter
     * @returns Promise back from commands execution on leoBridgeServer if added, undefined otherwise
     * (see command stack 'rules' in commandStack.ts)
     */
    public nodeCommand(p_userCommand: UserCommand): Promise<LeoBridgePackage> | undefined {
        // No forced vscode save-triggers for direct calls from extension.js
        this.triggerBodySave();
        const q_result = this._commandStack.add(p_userCommand);
        if (q_result) {
            return q_result;
        } else {
            // TODO : Use cleanup message string CONSTANT instead
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.TOO_FAST + p_userCommand.action);
            return undefined;
        }
    }

    /**
     * * Changes the marked state of a specified, or currently selected node
     * @param p_isMark Set 'True' to mark, otherwise unmarks the node
     * @param p_node Specifies which node use, or leave undefined to mark or unmark the currently selected node
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     */
    public changeMark(p_isMark: boolean, p_node?: LeoNode, p_fromOutline?: boolean): Promise<LeoBridgePackage> {
        // No need to wait for body-save trigger for marking/un-marking a node
        const q_commandResult = this.nodeCommand({
            action: p_isMark ? Constants.LEOBRIDGE.MARK_PNODE : Constants.LEOBRIDGE.UNMARK_PNODE,
            node: p_node,
            refreshType: { tree: true },
            fromOutline: !!p_fromOutline
        });
        if (q_commandResult) {
            if (!p_node || p_node === this.lastSelectedNode) {
                utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_MARKED, p_isMark);
            }
            return q_commandResult;
        } else {
            return Promise.reject("Change mark on node not added on command stack");
        }
    }

    /**
     * * Asks for a new headline label, and replaces the current label with this new one one the specified, or currently selected node
     * @param p_node Specifies which node to rename, or leave undefined to rename the currently selected node
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     */
    public editHeadline(p_node?: LeoNode, p_fromOutline?: boolean): Promise<LeoBridgePackage | undefined> {
        return this._isBusyTriggerSave(false, true)
            .then(() => {
                if (!p_node && this.lastSelectedNode) {
                    p_node = this.lastSelectedNode; // Gets last selected node if called via keyboard shortcut or command palette (not set in command stack class)
                }
                if (p_node) {
                    this._headlineInputOptions.prompt = Constants.USER_MESSAGES.PROMPT_EDIT_HEADLINE;
                    this._headlineInputOptions.value = p_node.label; // preset input pop up
                    return vscode.window.showInputBox(this._headlineInputOptions);
                } else {
                    return Promise.reject("No node selected");
                }
            })
            .then(p_newHeadline => {
                if (p_newHeadline) {
                    p_node!.label = p_newHeadline; // ! When labels change, ids will change and its selection and expansion states cannot be kept stable anymore.
                    const q_commandResult = this.nodeCommand({
                        action: Constants.LEOBRIDGE.SET_HEADLINE,
                        node: p_node,
                        refreshType: { tree: true, states: true },
                        fromOutline: !!p_fromOutline,
                        name: p_newHeadline
                    });
                    if (q_commandResult) {
                        return q_commandResult;
                    } else {
                        return Promise.reject("Edit Headline not added on command stack");
                    }
                } else {
                    // Canceled
                    return Promise.resolve(undefined);
                }
            });
    }

    /**
     * * Asks for a headline label to be entered and creates (inserts) a new node under the current, or specified, node
     * @param p_node specified under which node to insert, or leave undefined to use whichever is currently selected
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     * @param p_interrupt Signifies the insert action is actually interrupting itself (e.g. rapid CTRL+I actions by the user)
     */
    public insertNode(p_node?: LeoNode, p_fromOutline?: boolean, p_interrupt?: boolean): Promise<LeoBridgePackage> {
        let w_fromOutline: boolean = !!p_fromOutline; // Use w_fromOutline for where we intend to leave focus when done with the insert
        if (p_interrupt) {
            this._focusInterrupt = true;
            w_fromOutline = this._fromOutline; // Going to use last state
        }
        // if no node parameter, the front command stack CAN be busy, but if a node is passed, stack must be free
        if (!p_node || !this._isBusy()) {
            this.triggerBodySave(true); // Don't wait for saving to resolve because we're waiting for user input anyways
            this._headlineInputOptions.prompt = Constants.USER_MESSAGES.PROMPT_INSERT_NODE;
            this._headlineInputOptions.value = Constants.USER_MESSAGES.DEFAULT_HEADLINE;
            return new Promise<LeoBridgePackage>((p_resolve, p_reject) => {
                vscode.window.showInputBox(this._headlineInputOptions)
                    .then(p_newHeadline => {
                        const w_action = p_newHeadline ? Constants.LEOBRIDGE.INSERT_NAMED_PNODE : Constants.LEOBRIDGE.INSERT_PNODE;
                        const q_commandResult = this.nodeCommand({
                            action: w_action,
                            node: p_node,
                            refreshType: { tree: true, states: true },
                            fromOutline: w_fromOutline,
                            name: p_newHeadline
                        });
                        if (q_commandResult) {
                            q_commandResult.then(p_package => p_resolve(p_package));
                        } else {
                            p_reject(w_action + " not added on command stack");
                        }
                    });
            });
        } else {
            return Promise.reject("Insert node not added on command stack");
        }
    }

    public startSearch(): void {
        let w_panelID = '';
        let w_panel: vscode.WebviewView | undefined;
        if (this._lastTreeView === this._leoTreeExView) {
            w_panelID = Constants.FIND_EXPLORER_ID;
            w_panel = this._findPanelWebviewExplorerView;
        } else {
            w_panelID = Constants.FIND_ID;
            w_panel = this._findPanelWebviewView;
        }

        vscode.commands.executeCommand(w_panelID + ".focus")
            .then(p_result => {
                if (w_panel &&
                    w_panel.show &&
                    !w_panel.visible) {
                    w_panel.show(false);
                }
                w_panel?.webview.postMessage({ type: 'selectFind' });
            });
    }

    public findNext(): void {
        const w_command = this.nodeCommand({
            action: Constants.LEOBRIDGE.FIND_NEXT,
            node: undefined,
            refreshType: { tree: true, body: true, documents: false, buttons: false, states: true },
            fromOutline: false
        });
        if (w_command) {
            w_command.then((p_resultFind: LeoBridgePackage) => {
                // console.log(JSON.stringify(p_resultFind, undefined, 4));
                if (!p_resultFind.found) {
                    vscode.window.showInformationMessage('Not found');
                } else {
                    this.getBridgeFocus();
                }
            });
        }
    }

    public findPrevious(): void {
        const w_command = this.nodeCommand({
            action: Constants.LEOBRIDGE.FIND_PREVIOUS,
            node: undefined,
            refreshType: { tree: true, body: true, documents: false, buttons: false, states: true },
            fromOutline: false
        });
        if (w_command) {
            w_command.then((p_resultFind: LeoBridgePackage) => {
                // console.log(JSON.stringify(p_resultFind, undefined, 4));
                if (!p_resultFind.found) {
                    vscode.window.showInformationMessage('Not found');
                } else {
                    this.getBridgeFocus();
                }
            });
        }
    }

    /**
     * * Opens quickPick minibuffer pallette to choose from all commands in this file's commander
     * @returns Promise that resolves when the chosen command is placed on the front-end command stack
     */
    public minibuffer(): Thenable<LeoBridgePackage | undefined> {
        // Wait for _isBusyTriggerSave resolve because the full body save may change available commands
        return this._isBusyTriggerSave(false)
            .then((p_saveResult) => {
                const q_commandList: Thenable<MinibufferCommand[]> = this.sendAction(Constants.LEOBRIDGE.GET_COMMANDS, JSON.stringify({ name: "" }))
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
                return vscode.window.showQuickPick(q_commandList, w_options);
            })
            .then((p_picked) => {
                if (p_picked && p_picked.func) {
                    const w_commandResult = this.nodeCommand({
                        action: p_picked.func,
                        node: undefined,
                        refreshType: { tree: true, body: true, documents: true, buttons: true, states: true },
                        fromOutline: false // true // TODO : Differentiate from outline?
                    });
                    return w_commandResult ? w_commandResult : Promise.reject("Command not added");
                } else {
                    // Canceled
                    return Promise.resolve(undefined);
                }
            });
    }

    /**
     * * Get settings from Leo and apply them to the find panel webviews
     */
    public loadSearchSettings(): void {
        this.sendAction(Constants.LEOBRIDGE.GET_SEARCH_SETTINGS)
            .then((p_result: LeoBridgePackage) => {
                const w_searchSettings: LeoGuiFindTabManagerSettings = p_result.searchSettings!;
                const w_settings: LeoSearchSettings = {
                    //Find/change strings...
                    findText: w_searchSettings.find_text,
                    replaceText: w_searchSettings.change_text,
                    // Find options...
                    wholeWord: w_searchSettings.whole_word,
                    ignoreCase: w_searchSettings.ignore_case,
                    regExp: w_searchSettings.pattern_match,
                    markFinds: w_searchSettings.mark_finds,
                    markChanges: w_searchSettings.mark_changes,
                    searchHeadline: w_searchSettings.search_headline,
                    searchBody: w_searchSettings.search_body,
                    // 0, 1 or 2 for outline, sub-outline, or node.
                    searchScope: 0 + (w_searchSettings.suboutline_only ? 1 : 0) + (w_searchSettings.node_only ? 2 : 0)
                };
                if (w_settings.searchScope > 2) {
                    console.error('searchScope SHOULD BE 0,1,2 only: ', w_settings.searchScope);
                }
                if (this._findPanelWebviewExplorerView) {
                    this._findPanelWebviewExplorerView.webview.postMessage({ type: 'setSettings', value: w_settings });
                }
                if (this._findPanelWebviewView) {
                    this._findPanelWebviewView.webview.postMessage({ type: 'setSettings', value: w_settings });
                }
            });
    }

    /**
     * * Send the settings to the Leo Bridge Server
     */
    public saveSearchSettings(p_settings: LeoSearchSettings): void {
        // convert to LeoGuiFindTabManagerSettings
        const w_settings: LeoGuiFindTabManagerSettings = {
            //Find/change strings...
            find_text: p_settings.findText,
            change_text: p_settings.replaceText,
            // Find options...
            ignore_case: p_settings.ignoreCase,
            mark_changes: p_settings.markChanges,
            mark_finds: p_settings.markFinds,
            node_only: !!(p_settings.searchScope === 2),
            pattern_match: p_settings.regExp,
            search_body: p_settings.searchBody,
            search_headline: p_settings.searchHeadline,
            suboutline_only: !!(p_settings.searchScope === 1),
            whole_word: p_settings.wholeWord
        };
        this.sendAction(Constants.LEOBRIDGE.SET_SEARCH_SETTINGS, JSON.stringify({ searchSettings: w_settings }));
    }

    /**
     * * Asks for file name and path, then saves the Leo file
     * @param p_fromOutlineSignifies that the focus was, and should be brought back to, the outline
     */
    public saveAsLeoFile(p_fromOutline?: boolean): Promise<LeoBridgePackage | undefined> {
        return this._isBusyTriggerSave(true, true)
            .then((p_saveResult) => {
                if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
                    return this._leoFilesBrowser.getLeoFileUrl(true);
                } else {
                    // 'when-conditions' should prevent this
                    vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                    return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                }
            })
            .then((p_chosenLeoFile) => {
                if (p_chosenLeoFile.trim()) {
                    const w_hasDot = p_chosenLeoFile.indexOf('.') !== -1;
                    if (!w_hasDot || (p_chosenLeoFile.split('.').pop() !== Constants.FILE_EXTENSION && w_hasDot)) {
                        if (!p_chosenLeoFile.endsWith(".")) {
                            p_chosenLeoFile += "."; // Add dot if needed
                        }
                        p_chosenLeoFile += Constants.FILE_EXTENSION; // Add extension
                    }
                    if (this.leoStates.leoOpenedFileName) {
                        this._removeLastFile(this.leoStates.leoOpenedFileName);
                        this._removeRecentFile(this.leoStates.leoOpenedFileName);
                    }
                    const q_commandResult = this.nodeCommand({
                        action: Constants.LEOBRIDGE.SAVE_FILE,
                        node: undefined,
                        refreshType: { tree: true, states: true, documents: true },
                        fromOutline: !!p_fromOutline,
                        name: p_chosenLeoFile
                    });
                    this.leoStates.leoOpenedFileName = p_chosenLeoFile.trim();
                    this._leoStatusBar.update(true, 0, true);
                    this._addRecentAndLastFile(p_chosenLeoFile.trim());
                    if (q_commandResult) {
                        return q_commandResult;
                    } else {
                        return Promise.reject("Save file not added on command stack");
                    }
                } else {
                    // Canceled
                    return Promise.resolve(undefined);
                }
            });
    }

    /**
     * * Invokes the self.commander.save() Leo command
     * @param p_fromOutlineSignifies that the focus was, and should be brought back to, the outline
     * @returns Promise that resolves when the save command is placed on the front-end command stack
     */
    public saveLeoFile(p_fromOutline?: boolean): Promise<LeoBridgePackage | undefined> {
        return this._isBusyTriggerSave(true, true)
            .then((p_saveResult) => {
                if (this.leoStates.fileOpenedReady) {
                    if (this.lastSelectedNode && this._isCurrentFileNamed()) {
                        const q_commandResult = this.nodeCommand({
                            action: Constants.LEOBRIDGE.SAVE_FILE,
                            node: undefined,
                            refreshType: { tree: true, states: true, documents: true },
                            fromOutline: !!p_fromOutline,
                            name: ""
                        });
                        return q_commandResult ? q_commandResult : Promise.reject("Save file not added on command stack");
                    } else {
                        return this.saveAsLeoFile(p_fromOutline); // Override this command call if file is unnamed!
                    }
                } else {
                    // 'when-conditions' should prevent this
                    vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                    return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                }
            });
    }


    /**
     * * Show switch document 'QuickPick' dialog and switch file if selection is made, or just return if no files are opened.
     * @returns A promise that resolves with a textEditor of the selected node's body from the newly selected document
     */
    public switchLeoFile(): Promise<vscode.TextEditor | undefined> {
        return this._isBusyTriggerSave(true, true)
            .then((p_saveResult) => {
                return this.sendAction(Constants.LEOBRIDGE.GET_OPENED_FILES);
            })
            .then((p_package) => {
                const w_entries: ChooseDocumentItem[] = []; // Entries to offer as choices.
                const w_files: LeoDocument[] = p_package.files!;
                let w_index: number = 0;
                if (w_files && w_files.length) {
                    w_files.forEach(function (p_filePath: LeoDocument) {
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
                    return vscode.window.showQuickPick(w_entries, w_pickOptions);
                } else {
                    // "No opened documents"
                    return Promise.resolve(undefined);
                }
            })
            .then((p_chosenDocument) => {
                if (p_chosenDocument) {
                    return Promise.resolve(this.selectOpenedLeoDocument(p_chosenDocument.value));
                } else {
                    // Canceled
                    return Promise.resolve(undefined);

                }
            });
    }

    /**
     * * Switches Leo document directly by index number. Used by document treeview and switchLeoFile command.
     * @returns A promise that resolves with a textEditor of the selected node's body from the newly opened document
     */
    public selectOpenedLeoDocument(p_index: number): Promise<vscode.TextEditor> {
        return this._isBusyTriggerSave(true, true)
            .then((p_saveResult) => {
                return this.sendAction(Constants.LEOBRIDGE.SET_OPENED_FILE, JSON.stringify({ index: p_index }));
            })
            .then((p_openFileResult: LeoBridgePackage) => {
                // Like we just opened or made a new file
                if (p_openFileResult.filename) {
                    return this._setupOpenedLeoDocument(p_openFileResult);
                } else {
                    console.log('Select Opened Leo File Error');
                    return Promise.reject('Select Opened Leo File Error');
                }
            });
    }

    /**
     * * Close an opened Leo file
     * @returns the launchRefresh promise started after it's done closing the Leo document
     */
    public closeLeoFile(): Promise<boolean> {
        let w_removeLastFileName: string = "";
        return this._isBusyTriggerSave(true, true)
            .then((p_saveResult) => {
                if (!this.leoStates.fileOpenedReady) {
                    vscode.window.showInformationMessage(Constants.USER_MESSAGES.CLOSE_ERROR);
                    return Promise.reject(Constants.USER_MESSAGES.CLOSE_ERROR);
                }
                w_removeLastFileName = this.leoStates.leoOpenedFileName;
                return this.sendAction(Constants.LEOBRIDGE.CLOSE_FILE, JSON.stringify({ forced: false }));
            })
            .then((p_tryCloseResult => {
                // Has a total member: closed file
                if (p_tryCloseResult.total || p_tryCloseResult.total === 0) {
                    this._removeLastFile(w_removeLastFileName);
                    if (p_tryCloseResult.total === 0) {
                        this._setupNoOpenedLeoDocument();
                    } else {
                        this.loadSearchSettings();
                        this.launchRefresh({ tree: true, body: true, documents: true, buttons: true, states: true }, false);
                    }
                    return Promise.resolve(true);
                } else {
                    // No total member: did not close file
                    const q_askSaveChangesInfoMessage: Thenable<vscode.MessageItem | undefined> = vscode.window.showInformationMessage(
                        Constants.USER_MESSAGES.SAVE_CHANGES + ' ' +
                        this.leoStates.leoOpenedFileName + ' ' +
                        Constants.USER_MESSAGES.BEFORE_CLOSING,
                        { modal: true },
                        ...Constants.ASK_SAVE_CHANGES_BUTTONS
                    );
                    return Promise.resolve(q_askSaveChangesInfoMessage)
                        .then((p_askSaveResult: vscode.MessageItem | undefined) => {
                            if (p_askSaveResult) {
                                if (p_askSaveResult.title === Constants.USER_MESSAGES.YES) {
                                    // save and then force-close
                                    let w_savePromise: Promise<LeoBridgePackage | undefined>;
                                    if (this._isCurrentFileNamed()) {
                                        w_savePromise = this.sendAction(Constants.LEOBRIDGE.SAVE_FILE, JSON.stringify({ name: "" }));
                                    } else {
                                        w_savePromise = this._leoFilesBrowser.getLeoFileUrl(true).then((p_chosenLeoFile) => {
                                            if (p_chosenLeoFile.trim()) {
                                                return this.sendAction(Constants.LEOBRIDGE.SAVE_FILE, JSON.stringify({ name: p_chosenLeoFile.trim() }));
                                            } else {
                                                // Canceled
                                                return Promise.resolve(undefined);
                                            }
                                        });
                                    }
                                    return w_savePromise
                                        .then((p_packageAfterSave) => {
                                            return this.sendAction(Constants.LEOBRIDGE.CLOSE_FILE, JSON.stringify({ forced: true }));
                                        }, () => {
                                            return Promise.reject("Save failed");
                                        });
                                } else if (p_askSaveResult.title === Constants.USER_MESSAGES.NO) {
                                    // Don't want to save so just force-close directly
                                    return this.sendAction(Constants.LEOBRIDGE.CLOSE_FILE, JSON.stringify({ forced: true }));
                                } else {
                                    // Canceled
                                    return Promise.resolve(undefined);
                                }
                            } else {
                                // Canceled
                                return Promise.resolve(undefined);
                            }
                        })
                        .then((p_closeResult: LeoBridgePackage | undefined) => {
                            if (p_closeResult) {
                                // * back from CLOSE_FILE action, the last that can be performed (after saving if dirty or not)
                                this._removeLastFile(w_removeLastFileName);
                                if (p_closeResult && p_closeResult.total === 0) {
                                    this._setupNoOpenedLeoDocument();
                                } else {
                                    this.loadSearchSettings();
                                    this.launchRefresh({ tree: true, body: true, documents: true, buttons: true, states: true }, false);
                                }
                                return Promise.resolve(true);
                            }
                            // Canceled
                            return Promise.resolve(false);
                        });
                }
            }));
    }

    /**
     * * Creates a new untitled Leo document
     * * If not shown already, it also shows the outline, body and log panes along with leaving focus in the outline
     * @returns A promise that resolves with a textEditor of the new file
     */
    public newLeoFile(): Promise<vscode.TextEditor> {
        return this._isBusyTriggerSave(true, true)
            .then((p_saveResult) => {
                return this.sendAction(Constants.LEOBRIDGE.OPEN_FILE, '""');
            })
            .then((p_openFileResult: LeoBridgePackage) => {
                if (p_openFileResult.filename) {
                    return this._setupOpenedLeoDocument(p_openFileResult);
                } else {
                    return Promise.reject('New Leo File Error');
                }
            });
    }

    /**
     * * Shows an 'Open Leo File' dialog window and opens the chosen file
     * * If not shown already, it also shows the outline, body and log panes along with leaving focus in the outline
     * @returns A promise that resolves with a textEditor of the chosen file
     */
    public openLeoFile(p_leoFileUri?: vscode.Uri): Promise<vscode.TextEditor | undefined> {
        return this._isBusyTriggerSave(true, true)
            .then((p_saveResult) => {
                let q_openedFile: Promise<LeoBridgePackage | undefined>; // Promise for opening a file
                if (p_leoFileUri && p_leoFileUri.fsPath.trim()) {
                    const w_fixedFilePath: string = p_leoFileUri.fsPath.replace(/\\/g, "/");
                    q_openedFile = this.sendAction(Constants.LEOBRIDGE.OPEN_FILE, JSON.stringify({ filename: w_fixedFilePath }));
                } else {
                    q_openedFile = this._leoFilesBrowser.getLeoFileUrl()
                        .then(p_chosenLeoFile => {
                            if (p_chosenLeoFile.trim()) {
                                return this.sendAction(Constants.LEOBRIDGE.OPEN_FILE, JSON.stringify({ filename: p_chosenLeoFile }));
                            } else {
                                return Promise.resolve(undefined);
                            }
                        }, p_errorGetFile => {
                            return Promise.reject(p_errorGetFile);
                        });
                }
                return q_openedFile;
            })
            .then((p_openFileResult: LeoBridgePackage | undefined) => {
                if (p_openFileResult) {
                    return this._setupOpenedLeoDocument(p_openFileResult);
                } else {
                    return Promise.resolve(undefined);
                }
            }, p_errorOpen => {
                console.log('in .then not opened or already opened'); // TODO : IS REJECTION BEHAVIOR NECESSARY HERE TOO?
                return Promise.reject(p_errorOpen);
            });
    }

    /**
     * * Invoke an '@button' click directly by index string. Used by '@buttons' treeview.
     * @returns the launchRefresh promise started after it's done running the 'atButton' command
     */
    public clickAtButton(p_node: LeoButtonNode): Promise<boolean> {
        return this._isBusyTriggerSave(false)
            .then((p_saveResult) => {
                return this.sendAction(Constants.LEOBRIDGE.CLICK_BUTTON, JSON.stringify({ index: p_node.button.index }));
            })
            .then((p_clickButtonResult: LeoBridgePackage) => {
                this.launchRefresh({ tree: true, body: true, documents: true, buttons: true, states: true }, false);
                return Promise.resolve(true); // TODO launchRefresh should be a returned promise
            });
    }

    /**
     * * Removes an '@button' from Leo's button dict, directly by index string. Used by '@buttons' treeview.
     * @returns the launchRefresh promise started after it's done removing the button
     */
    public removeAtButton(p_node: LeoButtonNode): Promise<boolean> {
        return this._isBusyTriggerSave(false)
            .then((p_saveResult) => {
                return this.sendAction(Constants.LEOBRIDGE.REMOVE_BUTTON, JSON.stringify({ index: p_node.button.index }));
            })
            .then((p_removeButtonResult: LeoBridgePackage) => {
                this.launchRefresh({ buttons: true }, false);
                return Promise.resolve(true); // TODO launchRefresh should be a returned promise
            });
    }

    /**
     * * Capture instance for further calls on find panel webview
     */
    public setFindPanel(p_panel: vscode.WebviewView) {

        if (this._lastTreeView === this._leoTreeExView) {
            this._findPanelWebviewExplorerView = p_panel;
        } else {
            this._findPanelWebviewView = p_panel;
        }

        // TODO :
        // action get search settings
        //  .THEN
        // this._findPanelWebviewView?.webview.postMessage({ type: 'setSettings' , value: ''});
    }

    /**
     * * StatusBar click handler
     * @returns Thenable from the statusBar click customizable behavior
     */
    public statusBarOnClick(): Thenable<unknown> {
        // TODO : Set definitive (customizable?) behavior (For now, offer to switch documents, or show leoInteg's commands)
        if (this.leoStates.fileOpenedReady) {
            return this.switchLeoFile();
        } else {
            return vscode.commands.executeCommand(Constants.VSCODE_COMMANDS.QUICK_OPEN, Constants.GUI.QUICK_OPEN_LEO_COMMANDS);
        }
    }

    /**
     * * Test/Dummy command
     * @param p_fromOutline Flags if the call came with focus on the outline
     * @returns Thenable from the tested functionality
     */
    public test(p_fromOutline?: boolean): Thenable<unknown> {
        // return this.statusBarOnClick();

        // vscode.commands.executeCommand(Constants.COMMANDS.MARK_SELECTION)
        //     .then((p_result) => {
        //         console.log(
        //             'BACK FROM EXEC COMMAND ' +
        //             Constants.COMMANDS.MARK_SELECTION +
        //             ', p_result: ',
        //             JSON.stringify(p_result)
        //         );

        //     });

        // Test setting scroll / selection range

        /*
        vscode.window.showQuickPick(["get", "set"]).then(p_results => {
            console.log('quick pick result:', p_results);
            let w_selection: vscode.Selection;
            let w_action = "";
            if (p_results === "get") {
               //  w_action = Constants.LEOBRIDGE.GET_SEARCH_SETTINGS;
                // w_selection = new vscode.Selection(1, 1, 1, 6);
                this.loadSearchSettings();
            } else {
                w_action = Constants.LEOBRIDGE.SET_SEARCH_SETTINGS;
                // w_selection = new vscode.Selection(2, 2, 3, 3);
            }
            console.log('w_action', w_action);
            const searchSettings: LeoGuiFindTabManagerSettings = {
                find_text: "new find text",
                change_text: "",
                ignore_case: false, // diff
                mark_changes: false,
                mark_finds: true, // diff
                node_only: false,
                pattern_match: false,
                search_body: true,
                search_headline: true,
                suboutline_only: false,
                whole_word: false
            };

            if (w_action) {
                this.sendAction(
                    w_action, JSON.stringify({ searchSettings: searchSettings })
                ).then((p_result: LeoBridgePackage) => {
                    console.log('got back settings: ', p_result);
                });
            }
        });
        */

        /*
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            console.log('p_textEditor.document.uri.scheme ', p_textEditor.document.uri.scheme);

            if (p_textEditor.document.uri.scheme === Constants.URI_LEO_SCHEME) {
                console.log('found');

                p_textEditor.selection = w_selection; // set cursor insertion point & selection range
                // if (!w_scrollRange) {
                //     w_scrollRange = p_textEditor.document.lineAt(0).range;
                // }
                // p_textEditor.revealRange(w_scrollRange); // set
            }
        });
        */

        // GET_FOCUS AS A TEST
        return this.sendAction(
            // Constants.LEOBRIDGE.TEST, JSON.stringify({ testParam: "Some String" })
            Constants.LEOBRIDGE.GET_FOCUS, JSON.stringify({ testParam: "Some String" })
        ).then((p_result: LeoBridgePackage) => {
            console.log('get focus: ', p_result);

            // this.launchRefresh({ buttons: true }, false);
            // return vscode.window.showInformationMessage(
            //     ' back from test, called from ' +
            //     (p_fromOutline ? "outline" : "body") +
            //     ', with result: ' +
            //     JSON.stringify(p_result)
            // );
        });
    }

}
