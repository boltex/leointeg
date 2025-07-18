import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { debounce } from "lodash";
import * as fs from 'fs';
import * as path from "path";
import * as utils from './utils';
import { Constants } from './constants';
import {
    LeoBridgePackage,
    RevealType,
    Focus,
    ArchivedPosition,
    Icon,
    ConfigMembers,
    ReqRefresh,
    ChooseDocumentItem,
    LeoDocument,
    UserCommand,
    BodySelectionInfo,
    LeoGuiFindTabManagerSettings,
    LeoSearchSettings,
    ChooseRClickItem,
    RClick,
    LeoGotoNavKey,
    ChosePositionItem,
    UnlType
} from './types';
import { Config } from './config';
import { LeoFilesBrowser } from './leoFileBrowser';
import { LeoApOutlineProvider } from './leoApOutline';
import { LeoBodyProvider } from './leoBody';
import { LeoBodyDetachedProvider } from "./leoBodyDetached";
import { LeoBridge } from './leoBridge';
import { ServerService } from './serverManager';
import { LeoStatusBar } from './leoStatusBar';
import { CommandStack } from './commandStack';
import { LeoDocumentsProvider, LeoDocumentNode } from './leoDocuments';
import { LeoStates } from './leoStates';
import { LeoButtonsProvider, LeoButtonNode } from './leoButtons';
import { LeoFindPanelProvider } from './leoFindPanelWebview';
import { LeoSettingsProvider } from './leoSettingsWebview';
import { LeoGotoProvider, LeoGotoNode } from './leoGoto';
import { LeoUndosProvider, LeoUndoNode } from './leoUndos';
import { UnlProvider } from "./unlProvider";

/**
 * * Orchestrates Leo integration into vscode
 */
export class LeoIntegration {
    // * Status Flags
    public activated: boolean = true; // Set to false when deactivating the extension
    private _leoBridgeReadyPromise: Promise<LeoBridgePackage> | undefined; // Is set when leoBridge has a leo controller ready
    private _currentOutlineTitle: string = Constants.GUI.TREEVIEW_TITLE_INTEGRATION; // Might need to be re-set when switching visibility
    private _hasShownContextOpenMessage: boolean = false; // Used to show this information only once

    // * State flags
    public leoStates: LeoStates;
    public isExecuteScript = false; // An execute script (CTRL+B) is running

    // * UNL link provider
    public linkProvider: UnlProvider;

    // * General integration usage variables
    private _clipboardContent: string = "";

    // * Frontend command stack
    private _commandStack: CommandStack;

    // * Configuration Settings Service
    public config: Config; // Public configuration service singleton, used in leoSettingsWebview, leoBridge, for inverted contrast
    private _checkConfirmBeforeCloseTimer?: NodeJS.Timer;

    // * Icon Paths
    public nodeIcons: Icon[] = []; // Singleton static array of all icon paths used for rendering in treeview
    public undoIcons: Icon[] = [];
    public documentIcons: Icon[] = [];
    public buttonIcons: Icon[] = [];
    public gotoIcons: Icon[] = [];

    // * File Browser
    private _leoFilesBrowser: LeoFilesBrowser; // Browsing dialog service singleton used in the openLeoFile and save-as methods

    // * LeoBridge
    private _leoBridge: LeoBridge; // Singleton service to access the Leo server.

    // * Commands stack finishing resolving "refresh flags", for type of refresh after finishing stack
    public finalFocus: Focus = Focus.NoChange; // Set in _setupRefresh : Last command issued had focus on outline, as opposed to the body
    public showBodyIfClosed: boolean = false;
    public showOutlineIfClosed: boolean = false;
    public refreshPreserveRange = false; // this makes the next refresh cycle preserve the "findFocusTree" flag once.

    private _refreshType: ReqRefresh = {}; // Set in _setupRefresh : Flags for commands to require parts of UI to refresh

    private __refreshNode: ArchivedPosition | undefined; // Set in _setupRefresh : Last command issued a specific node to reveal
    private _lastRefreshNodeTS: number = 0;
    get _refreshNode(): ArchivedPosition | undefined {
        return this.__refreshNode;
    }
    set _refreshNode(p_ap: ArchivedPosition | undefined) {
        // Needs undefined type because it cannot be set in the constructor
        this.__refreshNode = p_ap;
        this._lastRefreshNodeTS = performance.now();
    }

    // * Automatic leoserver startup management service
    private _serverService: ServerService;
    public serverVersion: {
        major: number;
        minor: number;
        patch: number;
    } = {
            major: 0,
            minor: 0,
            patch: 0
        };

    public serverHasOpenedFile: boolean = false; // Server reported at least one opened file: for fileOpenedReady transition check.

    private _serverOpenedFileName: string = ""; // Server last reported opened file name.
    get serverOpenedFileName(): string {
        return this._serverOpenedFileName;
    }
    set serverOpenedFileName(s: string) {
        let w_isNew = false;
        if (this._serverOpenedFileName !== s) {
            this._serverOpenedFileName = s;
            this.leoStates.leoOpenedFileName = s; // In case context flag not set yet.
            w_isNew = true;
        }

        // Add to desc.
        let w_desc = "";
        const w_filename = s ? utils.getFileFromPath(s) : Constants.UNTITLED_FILE_NAME;
        let w_path = "";
        const n = s ? s.lastIndexOf(w_filename) : -1;
        if (n >= 0 && n + w_filename.length >= s.length) {
            w_path = s.substring(0, n);
        }
        w_desc = w_filename + (w_path ? " in " + w_path : '');

        if (this._titleDesc !== w_desc) {
            this._titleDesc = w_desc;
            this.refreshDesc();
        }
        if (w_isNew && s) {
            // save to workspace 'last active file' momento.
            utils.setGlobalLastActiveFile(this._context, s);
        }

    }
    private _titleDesc = "";

    public serverOpenedNode: ArchivedPosition | undefined; // Server last reported opened node.
    private _focusInterrupt: boolean = false; // Flag for preventing setting focus when interrupting (canceling) an 'insert node' text input dialog with another one

    // * Outline Pane
    private _leoTreeProvider: LeoApOutlineProvider; // TreeDataProvider single instance
    private _leoTreeView: vscode.TreeView<ArchivedPosition>; // Outline tree view added to the Tree View Container with an Activity Bar icon
    private _leoTreeExView: vscode.TreeView<ArchivedPosition>; // Outline tree view added to the Explorer Sidebar
    private _lastTreeView: vscode.TreeView<ArchivedPosition>; // Last visible treeview
    private _renamingHeadline: string = "";
    private _pendingReveal: Thenable<void> | undefined;
    private _nextRevealParams: {
        tree: vscode.TreeView<ArchivedPosition>, element: ArchivedPosition, options?: {
            select?: boolean;
            focus?: boolean;
            expand?: boolean | number;
        }
    } | undefined;

    private _revealNodeRetriedRefreshOutline: boolean = false; // USED IN _refreshOutline and _revealNode

    // Last selected node we got a hold of;
    //  -  leoTreeView.selection maybe newer (user click) and unprocessed
    //  -  this._refreshNode maybe newer (refresh from server) and unprocessed
    private _lastSelectedNode: ArchivedPosition | undefined;
    private _lastSelectedNodeTS: number = 0;
    get lastSelectedNode(): ArchivedPosition | undefined {
        return this._lastSelectedNode;
    }
    set lastSelectedNode(p_ap: ArchivedPosition | undefined) {
        // Needs undefined type because it cannot be set in the constructor
        this._lastSelectedNode = p_ap;
        this._lastSelectedNodeTS = performance.now();
    }

    // * Outline Pane redraw/refresh flags. Also set when calling refreshTreeRoot
    // If there's no reveal and its the selected node, the old id will be re-used for the node. (see _id property in LeoNode)
    private _revealType: RevealType = RevealType.NoReveal; // to be read/cleared in arrayToLeoNodesArray, to check if any should self-select

    private _preventShowBody = false; // Used when refreshing treeview from config: It requires not to open the body pane when refreshing

    // * Reveal Timers
    private _gotSelectedNodeBodyTimer: undefined | NodeJS.Timeout;
    private _gotSelectedNodeRevealTimer: undefined | NodeJS.Timeout;
    private _showBodySwitchBodyTimer: undefined | NodeJS.Timeout;
    private _leoDocumentsRevealTimer: undefined | NodeJS.Timeout;

    // * Reveal Promises
    private _documentPaneReveal: Thenable<void> | undefined;
    private _undoPaneReveal: Thenable<void> | undefined;

    // * Documents Pane
    private _leoDocumentsProvider: LeoDocumentsProvider;
    private _leoDocuments: vscode.TreeView<LeoDocumentNode>;
    private _leoDocumentsExplorer: vscode.TreeView<LeoDocumentNode>;

    // * Goto nav panel
    public leoGotoProvider: LeoGotoProvider;
    // private _leoGoto: vscode.TreeView<LeoGotoNode>;
    // private _leoGotoExplorer: vscode.TreeView<LeoGotoNode>;

    // * Undos pane
    private _leoUndosProvider!: LeoUndosProvider;
    private _leoUndos!: vscode.TreeView<LeoUndoNode>;
    private _leoUndosShown = false;
    private _leoUndosExplorer!: vscode.TreeView<LeoUndoNode>;
    private _leoUndosExplorerShown = false;
    private _lastLeoUndos: vscode.TreeView<LeoUndoNode> | undefined;

    // * '@button' pane
    private _leoButtonsProvider: LeoButtonsProvider;
    private _leoButtons: vscode.TreeView<LeoButtonNode>;
    private _leoButtonsExplorer: vscode.TreeView<LeoButtonNode>;
    private _rclickSelected: number[] = [];

    // * Find panel
    private _findPanelWebviewView: vscode.WebviewView | undefined;
    private _findPanelWebviewExplorerView: vscode.WebviewView | undefined;
    private _lastFindView: vscode.WebviewView | undefined;  // ? Maybe unused ?
    private _findNeedsFocus: number = 0; // 0 none, 1 find, 2 nav
    private _lastSettingsUsed: LeoSearchSettings | undefined; // Last settings loaded / saved for current document
    public findFocusTree = false;
    public findHeadlineRange: [number, number] = [0, 0];
    public findHeadlinePosition: ArchivedPosition | undefined;
    private _lastCommandFindEndOutline: number = 0; // Means that last command resolved as a find operation with selection on outline

    // * Interactive Find Input
    private _interactiveSearchInputBox: vscode.InputBox | undefined;

    // * Leo Find Panel
    private _leoFindPanelProvider: vscode.WebviewViewProvider;

    // * Body Pane
    private _changedBodyWithMirrorDetached: string | undefined = undefined; // "id/gnx" string as true
    private _changedDetachedWithMirrorBody: string | undefined = undefined; // "id/gnx" string as true
    private _bodyFileSystemStarted: boolean = false;
    private _detachedFileSystemStarted: boolean = false;
    private _bodyEnablePreview: boolean = true;
    private _leoFileSystem: LeoBodyProvider; // as per https://code.visualstudio.com/api/extension-guides/virtual-documents#file-system-api
    private _leoDetachedFileSystem!: LeoBodyDetachedProvider; // as per https://code.visualstudio.com/api/extension-guides/virtual-documents#file-system-api
    private _bodyTextDocument: vscode.TextDocument | undefined; // Set when selected in tree by user, or opening a Leo file in showBody. and by _locateOpenedBody.
    public bodyDetachedTextDocument: vscode.TextDocument | undefined; // Last active detached body.
    private _bodyMainSelectionColumn: vscode.ViewColumn | undefined; // Column of last body 'textEditor' found, set to 1

    private _languageFlagged: string[] = [];

    private _bodyPreviewMode: boolean = true;

    private _editorTouched: boolean = false; // Flag for applying editor changes to body when 'icon' state change and 'undo' back to untouched

    private _bodyStatesTimer: NodeJS.Timeout | undefined;

    public preventIconChange: boolean = false; // Prevent refresh outline to keep selected node icon

    private _bodyUri: vscode.Uri = utils.strToLeoUri('');
    get bodyUri(): vscode.Uri {
        return this._bodyUri;
    }
    set bodyUri(p_uri: vscode.Uri) {
        this._leoFileSystem.setNewBodyUriTime(p_uri);
        this._bodyUri = p_uri;
    }

    // * Selection & scroll
    private _selectionDirty: boolean = false; // Flag set when cursor selection is changed
    private _selectionGnx: string = ''; // Packaged into 'BodySelectionInfo' structures, sent to Leo
    private _selection: vscode.Selection | undefined; // also packaged into 'BodySelectionInfo'
    private _scrollDirty: boolean = false; // Flag set when cursor selection is changed
    private _scrollGnx: string = '';
    private _scroll: vscode.Range | undefined;

    // * Settings / Welcome webview
    public leoSettingsWebview: LeoSettingsProvider;

    // * Log and terminal Panes
    private _leoLogPane: undefined | vscode.OutputChannel;

    // * Status Bar
    private _leoStatusBar: LeoStatusBar; // removed until proper API for knowing focus placement

    // * Edit/Insert Headline Input Box System made with 'createInputBox'.
    private _hib: undefined | vscode.InputBox;
    private _hibResolve: undefined | ((value: string | PromiseLike<string | undefined> | undefined) => void);
    private _onDidHideResolve: undefined | ((value: PromiseLike<void> | undefined) => void);
    private _hibLastValue: undefined | string;
    private _hibInterrupted = false;
    private _hibDisposables: vscode.Disposable[] = [];

    // * Timing
    private _needLastSelectedRefresh = false; // USED IN showBody
    private _bodyLastChangedDocument: vscode.TextDocument | undefined; // Only set in _onDocumentChanged
    private _bodyLastChangedDocumentSaved: boolean = true; // don't use 'isDirty' of the document!

    // * Debounced method used to check for closed detached/body tabs
    public checkClosedTabs: (() => void);

    // * Debounced method used to refresh language of the active commander's detached bodies 
    public refreshCommanderDetachedLanguage: (() => void);

    // * Debounced method used to refresh the outline-tree title desc
    public refreshDesc: (() => void);

    // * Debounced method used to get states for UI display flags (commands such as undo, redo, save, ...)
    public getStates: (() => void);

    // * Debounced method used to get set status bar with the current UNL
    public getUNL: (() => void);

    // * Debounced method used to get opened Leo Files for the documents pane
    public refreshDocumentsPane: (() => void);

    // * Debounced method used to get content of the at-buttons pane
    public refreshButtonsPane: (() => void);

    // * Debounced method used to get content of the goto pane
    public refreshGotoPane: (() => void);

    // * Debounced method used to get content of the undos pane
    public refreshUndoPane: (() => void);

    // * Debounced method used to set focused element of the undos pane
    public setUndoSelection: ((p_node: LeoUndoNode) => void);

    // * Debounced method for refreshing the UI
    public launchRefresh: (() => void);

    constructor(private _context: vscode.ExtensionContext) {

        const w_effectiveLeojsInExplorer = vscode.workspace.getConfiguration('leojs').get('treeInExplorer', false);

        // * Setup States
        this.leoStates = new LeoStates(_context, this);

        // * Get configuration settings
        this.config = new Config(_context, this);

        // * also check workbench.editor.enablePreview
        this.config.buildFromSavedSettings();
        this._bodyEnablePreview = !!vscode.workspace
            .getConfiguration('workbench.editor')
            .get('enablePreview');

        // * Build Icon filename paths
        this.nodeIcons = utils.buildNodeIconPaths(_context);
        this.undoIcons = utils.buildUndoIconPaths(_context);
        this.documentIcons = utils.buildDocumentIconPaths(_context);
        this.buttonIcons = utils.buildButtonsIconPaths(_context);
        this.gotoIcons = utils.buildGotoIconPaths(_context);

        // * Create file browser instance
        this._leoFilesBrowser = new LeoFilesBrowser(_context);

        // * Setup leoBridge
        this._leoBridge = new LeoBridge(_context, this);

        // * Setup frontend command stack
        this._commandStack = new CommandStack(_context, this);

        // * UNL and URL link handler provider
        this.linkProvider = new UnlProvider();
        this._context.subscriptions.push(
            vscode.languages.registerDocumentLinkProvider(
                [
                    { scheme: Constants.URI_FILE_SCHEME },
                    { scheme: Constants.URI_UNTITLED_SCHEME },
                    { scheme: Constants.URI_LEO_SCHEME },
                    { scheme: Constants.URI_LEO_DETACHED_SCHEME },
                    { language: Constants.OUTPUT_CHANNEL_LANGUAGE }
                ],
                this.linkProvider
            )
        );

        // * Create a single data provider for both outline trees, Leo view and Explorer view
        this._leoTreeProvider = new LeoApOutlineProvider(this.nodeIcons, !!this.config.invertNodeContrast, this);

        // * Create Leo stand-alone view and Explorer view outline panes
        // Uses 'select node' command, so 'onDidChangeSelection' is not used
        this._leoTreeView = vscode.window.createTreeView(Constants.TREEVIEW_ID, {
            showCollapseAll: false,
            treeDataProvider: this._leoTreeProvider,
        });
        this._context.subscriptions.push(
            this._leoTreeView,
            this._leoTreeView.onDidExpandElement((p_event) =>
                this._onChangeCollapsedState(p_event, true, this._leoTreeView)
            ),
            this._leoTreeView.onDidCollapseElement((p_event) =>
                this._onChangeCollapsedState(p_event, false, this._leoTreeView)
            ),
            this._leoTreeView.onDidChangeVisibility((p_event) =>
                this._onTreeViewVisibilityChanged(p_event, false)
            )
        );

        this._leoTreeExView = vscode.window.createTreeView(Constants.TREEVIEW_EXPLORER_ID, {
            showCollapseAll: false,
            treeDataProvider: this._leoTreeProvider,
        });
        this._context.subscriptions.push(
            this._leoTreeExView,
            this._leoTreeExView.onDidExpandElement((p_event) =>
                this._onChangeCollapsedState(p_event, true, this._leoTreeExView)
            ),
            this._leoTreeExView.onDidCollapseElement((p_event) =>
                this._onChangeCollapsedState(p_event, false, this._leoTreeExView)
            ),
            this._leoTreeExView.onDidChangeVisibility((p_event) =>
                this._onTreeViewVisibilityChanged(p_event, true)
            )
        );

        // * Init this._lastTreeView based on config only assuming explorer is default sidebar view
        this._lastTreeView = (this.config.treeInExplorer && !w_effectiveLeojsInExplorer) ? this._leoTreeExView : this._leoTreeView;

        // * Create Leo Opened Documents Treeview Providers and tree views
        this._leoDocumentsProvider = new LeoDocumentsProvider(this);
        this._leoDocuments = vscode.window.createTreeView(Constants.DOCUMENTS_ID, {
            showCollapseAll: false,
            treeDataProvider: this._leoDocumentsProvider,
        });
        this._context.subscriptions.push(
            this._leoDocuments,
            this._leoDocuments.onDidChangeVisibility((p_event) =>
                this._onDocTreeViewVisibilityChanged(p_event, false)
            )
        );
        this._leoDocumentsExplorer = vscode.window.createTreeView(Constants.DOCUMENTS_EXPLORER_ID, {
            showCollapseAll: false,
            treeDataProvider: this._leoDocumentsProvider,
        });
        this._context.subscriptions.push(
            this._leoDocumentsExplorer,
            this._leoDocumentsExplorer.onDidChangeVisibility((p_event) =>
                this._onDocTreeViewVisibilityChanged(p_event, true)
            )
        );

        // * Create '@buttons' Treeview Providers and tree views
        this._leoButtonsProvider = new LeoButtonsProvider(this);
        this._leoButtons = vscode.window.createTreeView(Constants.BUTTONS_ID, {
            showCollapseAll: false,
            treeDataProvider: this._leoButtonsProvider,
        });
        this._context.subscriptions.push(
            this._leoButtons,
            this._leoButtons.onDidChangeVisibility((p_event) =>
                this._onButtonsTreeViewVisibilityChanged(p_event, false)
            )
        );
        this._leoButtonsExplorer = vscode.window.createTreeView(Constants.BUTTONS_EXPLORER_ID, {
            showCollapseAll: false,
            treeDataProvider: this._leoButtonsProvider,
        });
        this._context.subscriptions.push(
            this._leoButtonsExplorer,
            this._leoButtonsExplorer.onDidChangeVisibility((p_event) =>
                this._onButtonsTreeViewVisibilityChanged(p_event, true)
            )
        );

        // * Create goto Treeview Providers and tree views
        this.leoGotoProvider = new LeoGotoProvider(this);

        // * Create 'Undo History' Treeview Providers and tree views
        this._leoUndosProvider = new LeoUndosProvider(this);
        this._context.subscriptions.push(
            this._leoUndos,
            this._leoUndos = vscode.window.createTreeView(Constants.UNDOS_ID, {
                showCollapseAll: false,
                treeDataProvider: this._leoUndosProvider,
            }),
            this._leoUndos.onDidChangeVisibility((p_event) =>
                this._onUndosTreeViewVisibilityChanged(p_event, false)
            )
        );
        this._context.subscriptions.push(
            this._leoUndosExplorer,
            this._leoUndosExplorer = vscode.window.createTreeView(Constants.UNDOS_EXPLORER_ID, {
                showCollapseAll: false,
                treeDataProvider: this._leoUndosProvider,
            }),
            this._leoUndosExplorer.onDidChangeVisibility((p_event) =>
                this._onUndosTreeViewVisibilityChanged(p_event, true)
            )
        );

        // * Create Body Pane
        this._leoFileSystem = new LeoBodyProvider(this);
        this._leoDetachedFileSystem = new LeoBodyDetachedProvider(this);

        this._bodyMainSelectionColumn = 1;

        // * Create Status bar Entry
        this._leoStatusBar = new LeoStatusBar(_context, this);

        // * Automatic server start service
        this._serverService = new ServerService(_context, this);

        // * Leo Find Panel
        this._leoFindPanelProvider = new LeoFindPanelProvider(
            _context.extensionUri,
            _context,
            this
        );
        this._context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                Constants.FIND_ID,
                this._leoFindPanelProvider,
                { webviewOptions: { retainContextWhenHidden: true } }
            )
        );
        this._context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                Constants.FIND_EXPLORER_ID,
                this._leoFindPanelProvider,
                { webviewOptions: { retainContextWhenHidden: true } }
            )
        );

        // * Configuration / Welcome webview
        this.leoSettingsWebview = new LeoSettingsProvider(_context, this);

        // * 'onDid' event detections. All pushed as disposables in context.subscription
        this._context.subscriptions.push(

            vscode.window.tabGroups.onDidChangeTabGroups((p_tabGroupEvent) =>
                this._onTabGroupsChanged(p_tabGroupEvent)
            ),
            vscode.window.tabGroups.onDidChangeTabs((p_tabEvent) =>
                this._onTabsChanged(p_tabEvent)
            ),

            // * React to change in active panel/text editor (window.activeTextEditor) - also fires when the active editor becomes undefined
            vscode.window.onDidChangeActiveTextEditor((p_editor) =>
                this._onActiveEditorChanged(p_editor)
            ),

            // * React to change in selection, cursor position and scroll position
            vscode.window.onDidChangeTextEditorSelection((p_event) =>
                this._onChangeEditorSelection(p_event)
            ),
            vscode.window.onDidChangeTextEditorVisibleRanges((p_event) =>
                this._onChangeEditorScroll(p_event)
            ),

            // * Triggers when a different text editor/vscode window changed focus or visibility, or dragged
            // This is also what triggers after drag and drop, see '_onChangeEditorViewColumn'
            vscode.window.onDidChangeTextEditorViewColumn((p_columnChangeEvent) =>
                this._changedTextEditorViewColumn(p_columnChangeEvent)
            ), // Also triggers after drag and drop
            vscode.window.onDidChangeVisibleTextEditors((p_editors) =>
                this._changedVisibleTextEditors(p_editors)
            ), // Window.visibleTextEditors changed
            vscode.window.onDidChangeWindowState((p_windowState) =>
                this._changedWindowState(p_windowState)
            ), // Focus state of the current window changes

            // * React when typing and changing body pane
            vscode.workspace.onDidChangeTextDocument((p_textDocumentChange) =>
                this._onDocumentChanged(p_textDocumentChange)
            ),

            // * React to configuration settings events
            vscode.workspace.onDidChangeConfiguration((p_configChange) =>
                this._onChangeConfiguration(p_configChange)
            ),

            // * React to opening of any file in vscode
            vscode.workspace.onDidOpenTextDocument((p_document) =>
                this._onDidOpenTextDocument(p_document)
            )
        );
        // * Debounced refresh flags and UI parts, other than the tree and body
        this.checkClosedTabs = debounce(
            this._checkClosedTabs,
            Constants.CLEANUP_DEBOUNCE_DELAY
        );
        this.refreshCommanderDetachedLanguage = debounce(
            this._refreshCommanderDetachedLanguage,
            Constants.DETACHED_LANGUAGE_DELAY
        );
        this.refreshDesc = debounce(
            this._refreshDesc,
            Constants.OUTLINE_DESC_DEBOUNCE_DELAY
        );
        this.getStates = debounce(
            this._triggerGetStates,
            Constants.STATES_DEBOUNCE_DELAY
        );
        this.getUNL = debounce(
            this._getUNL,
            Constants.UNL_DEBOUNCE_DELAY
        );
        this.refreshDocumentsPane = debounce(
            this._refreshDocumentsPane,
            Constants.DOCUMENTS_DEBOUNCE_DELAY
        );
        this.refreshButtonsPane = debounce(
            this._refreshButtonsPane,
            Constants.BUTTONS_DEBOUNCE_DELAY
        );
        this.refreshGotoPane = debounce(
            this._refreshGotoPane,
            Constants.GOTO_DEBOUNCE_DELAY
        );
        this.refreshUndoPane = debounce(
            this._refreshUndoPane,
            Constants.UNDOS_DEBOUNCE_DELAY
        );
        this.setUndoSelection = debounce(
            this._setUndoSelection,
            Constants.UNDOS_REVEAL_DEBOUNCE_DELAY
        );
        this.launchRefresh = debounce(
            this._launchRefresh,
            Constants.REFRESH_DEBOUNCE_DELAY
        );
    }

    /**
     * * Core of the integration of Leo into vscode: Sends an action to the leoBridge in leoserver.py.
     * @param p_action is the action string constant, from Constants.LEOBRIDGE
     * @param p_param (optional) JSON string to be given to the python script action call
     * @param p_deferredPayload (optional) a pre-made package that will be given back as the response, instead of package coming back from python
     * @param p_preventCall (optional) Flag for special case, only used at startup
     * @returns a Promise that will contain the JSON package answered back by the leoBridge in leoserver.py
     */
    public sendAction(
        p_action: string,
        p_param?: { [key: string]: any },
        p_deferredPayload?: LeoBridgePackage,
        p_preventCall?: boolean
    ): Promise<LeoBridgePackage> {
        return this._leoBridge.action(p_action, p_param, p_deferredPayload, p_preventCall);
    }

    /**
     * * leoInteg starting entry point
     * Starts a leoBridge server, and/or establish a connection to a server, based on config settings.
     */
    public startNetworkServices(): void {

        let q_checkPath;
        if (!this.config.leoEditorPath.trim()) {
            q_checkPath = this.findInstallPath();
        } else {
            q_checkPath = Promise.resolve();
        }

        // * Check settings and start a server accordingly
        q_checkPath.then(() => {
            if (this.config.startServerAutomatically) {
                if (this.config.limitUsers > 1) {
                    utils.findSingleAvailablePort(this.config.connectionPort)
                        .then((_p_availablePort) => {
                            this.startServer();
                        }, (_p_reason) => {
                            // Rejected: Multi user port IN USE so skip start
                            if (this.config.connectToServerAutomatically) {
                                // Still try to connect if auto-connect is 'on'
                                this.connect();
                            }
                        });
                } else {
                    this.startServer();
                }
            } else if (this.config.connectToServerAutomatically) {
                // * (via settings) Connect to Leo Bridge server automatically without starting one first
                this.connect();
            } else {
                this.leoStates.leoStartupFinished = true;
            }
        });
    }

    public async findInstallPath(): Promise<string> {

        return new Promise((p_resolve, _p_reject) => {
            // Find Leo's installation folder with command line tricks from Matt Wilkie 
            const options = { encoding: 'utf-8' as BufferEncoding };
            const isWindows = process.platform === 'win32';
            let hasCreated = false;
            let python = this.config.leoPythonCommand;
            if (!python) {
                python = Constants.DEFAULT_PYTHON;
                if (isWindows) {
                    python = Constants.WIN32_PYTHON;
                }
            }

            // Your command
            let output = "";
            try {
                output = execSync(python + ' -c "import leo; import os; print(os.path.dirname(leo.__file__))"', options);
            } catch (error) {
                output = ""; // Clear to make sure
            }

            if (!output) {
                try {
                    if (isWindows) {
                        execSync('echo g.es_print(g.app.loadManager.computeLeoDir()) > tmp_locate_leo_dir.leox', options);
                    } else {
                        execSync('echo "g.es_print(g.app.loadManager.computeLeoDir())" > tmp_locate_leo_dir.leox', options);
                    }
                    hasCreated = true;

                } catch (e) {
                    // pass
                }
                try {

                    output = execSync('leo-messages --silent --script=tmp_locate_leo_dir.leox', options);

                } catch (error) {
                    output = ""; // Clear to make sure
                } finally {
                    if (isWindows) {
                        execSync('del tmp_locate_leo_dir.leox', options);
                    } else {
                        execSync('rm tmp_locate_leo_dir.leox', options);
                    }
                }
            }

            if (output && output.trim()) {

                output = output.trim();

                if (output.endsWith('/leo') || output.endsWith('\\leo')) {
                    output = output.slice(0, -4);
                }

                // Set config option to the proper leo path.
                this.config.setLeoIntegSettings(
                    [{
                        code: Constants.CONFIG_NAMES.LEO_EDITOR_PATH,
                        value: output
                    }]
                ).then(() => {
                    this.leoSettingsWebview.changedConfiguration();
                    vscode.window.showInformationMessage('Leo-Editor installation folder found automatically as ' + output);
                    p_resolve(output);
                });
            } else {
                p_resolve(""); // Empty string when not found.
            }
        });

    }

    /**
     * * Starts an instance of a leoBridge server, and may connect to it afterwards, based on configuration flags.
     */
    public startServer(): void {
        if (this.leoStates.leoStartingServer) {
            return;
        }
        this.leoStates.leoStartingServer = true;
        this.leoStates.leoStartupFinished = false;
        this.showLogPane();
        this._serverService
            .startServer(
                this.config.leoPythonCommand,
                this.config.leoEditorPath,
                this.config.connectionPort
            )
            .then(
                (_p_message) => {
                    utils.setContext(Constants.CONTEXT_FLAGS.SERVER_STARTED, true); // server started
                    if (this.config.connectToServerAutomatically) {
                        setTimeout(() => {
                            // wait a few milliseconds
                            this.connect();
                            this.leoStates.leoStartingServer = false;
                        }, 1500);
                    } else {
                        this.leoStates.leoStartingServer = false;
                        this.leoStates.leoStartupFinished = true;
                    }
                },
                (p_reason) => {
                    // This context flag will remove the 'Starting server' welcome view
                    this.leoStates.leoStartingServer = false;
                    this.leoStates.leoStartupFinished = true;
                    if (
                        [Constants.USER_MESSAGES.LEO_PATH_MISSING,
                        Constants.USER_MESSAGES.CANNOT_FIND_SERVER_SCRIPT].includes(p_reason)
                    ) {
                        vscode.window.showErrorMessage(Constants.USER_MESSAGES.START_SERVER_ERROR + p_reason, "Choose Folder")
                            .then(p_chosenButton => {
                                if (p_chosenButton === 'Choose Folder') {
                                    vscode.commands.executeCommand(Constants.COMMANDS.CHOOSE_LEO_FOLDER);
                                }
                            });
                    } else {
                        vscode.window.showErrorMessage(
                            Constants.USER_MESSAGES.START_SERVER_ERROR + p_reason,
                        );
                    }
                }
            );
    }

    /**
     * * Kills the server process if it was started by this instance of the extension
     */
    public killServer(): void {
        this._serverService.killServer();
    }

    /**
     * * Disconnects from the server
     */
    public stopConnection(): void {
        this._leoBridge.closeLeoProcess();
    }

    /**
     * * Initiate a connection to the leoBridge server, then show view title, log pane, and set 'bridge ready' flags.
     */
    public connect(): void {
        this.showLogPane();

        if (this.leoStates.leoBridgeReady || this.leoStates.leoConnecting) {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.ALREADY_CONNECTED);
            return;
        }
        this.leoStates.leoConnecting = true;
        this.leoStates.leoStartupFinished = false;
        this._leoBridgeReadyPromise = this._leoBridge.initLeoProcess(
            this._serverService.usingPort // This will be zero if no port found
        );
        this._leoBridgeReadyPromise.then(
            (p_package) => {
                // Check if hard-coded first package signature / id
                if (p_package.id !== Constants.STARTING_PACKAGE_ID) {
                    this.cancelConnect(Constants.USER_MESSAGES.CONNECT_ERROR);
                } else {
                    // Connected ok
                    let q_leoID: Thenable<unknown>;
                    // Check for missing leoID: if set explicitly to null
                    if (p_package['leoID'] === null) {
                        // Unset leoID !
                        this.leoStates.leoIDMissing = true;
                        q_leoID = this.setLeoID();

                    } else {
                        q_leoID = Promise.resolve();
                    }

                    q_leoID.then(() => {
                        this.serverHasOpenedFile = !!p_package.commander;
                        const w_lastFiles: string[] =
                            this._context.workspaceState.get(Constants.LAST_FILES_KEY) || [];
                        if (w_lastFiles.length && !this.serverHasOpenedFile) {
                            // This context flag will trigger 'Connecting...' placeholder
                            // utils.setContext(Constants.CONTEXT_FLAGS.AUTO_CONNECT, true);
                            setTimeout(() => {
                                // Try to open last opened files, if any
                                this._openLastFiles().catch(_error => {
                                    // No open files
                                });
                            }, 0);
                        } else {
                            this.leoStates.leoConnecting = false;
                            this.leoStates.leoBridgeReady = true;
                            this.leoStates.leoStartupFinished = true;
                        }

                        if (this.serverHasOpenedFile) {
                            this.serverOpenedFileName = p_package.commander!.fileName;
                            this.serverOpenedNode = p_package.node!;
                            // will provoke _setupOpenedLeoDocument
                            this.loadSearchSettings();
                            // Server already had opened files.
                            this.setupRefresh(
                                this.finalFocus,
                                {
                                    tree: true,
                                    body: true,
                                    documents: true,
                                    buttons: true,
                                    states: true,
                                }
                            );
                            this.launchRefresh();
                        }

                        if (!this.config.connectToServerAutomatically) {
                            vscode.window.showInformationMessage(Constants.USER_MESSAGES.CONNECTED);
                        }

                        this.checkVersion();
                    });

                }

            },
            (p_reason) => {
                this.cancelConnect(Constants.USER_MESSAGES.CONNECT_FAILED + ': ' + p_reason);
            }
        );
    }

    /**
     * * Cancels websocket connection and reverts context flags.
     * Called from leoBridge.ts when its websocket reports disconnection.
     * @param p_message
     */
    public cancelConnect(p_message?: string): void {
        // 'disconnect error' versus 'failed to connect'
        const showMessageFn = this.leoStates.leoBridgeReady ? vscode.window.showErrorMessage : vscode.window.showInformationMessage;
        showMessageFn(
            p_message ? p_message : Constants.USER_MESSAGES.DISCONNECTED
        );
        this.leoStates.leoStartupFinished = true;
        this.leoStates.leoConnecting = false;
        this.leoStates.fileOpenedReady = false;
        this.leoStates.leoBridgeReady = false;
        this._leoBridgeReadyPromise = undefined;
        this._leoStatusBar.hide();
        this._refreshOutline(false, RevealType.NoReveal);
    }

    /**
     * * Inputs user for ID, then sets on server. If install path is known, also asks to save.
     * @returns a promise that resolves when the id is sent to the server or input is canceled
     */
    public async setLeoID(): Promise<unknown> {

        // showInputBox
        const w_idInputOption: vscode.InputBoxOptions = {
            title: 'Enter Leo id', // Over input
            prompt: "leoID.txt not found: " +
                "Enter an id that identifies you uniquely. \n" +
                "Leo uses this id to uniquely identify nodes.",
            validateInput: (value) => {
                if (!utils.cleanLeoID(value)) {
                    return "Your id should contain only letters and numbers\n" +
                        "and must be at least 3 characters in length.";
                } else {
                    return "";
                }
            },
            ignoreFocusOut: true
        };

        let w_idResult = await vscode.window.showInputBox(w_idInputOption);
        // p_idResult is string | undefined
        if (w_idResult) {
            w_idResult = utils.cleanLeoID(w_idResult);
        }
        if (w_idResult) {
            // OK: id valid!
            this.sendAction(
                Constants.LEOBRIDGE.SET_LEOID,
                { leoID: w_idResult }
            );
            this.leoStates.leoIDMissing = false; // At least set for this session


            // Ask to save to .leoID.txt in Leo's dir.
            return vscode.window.showInformationMessage(
                "Save Leo ID?",
                {
                    modal: true,
                    detail: "Write id '" + w_idResult + "' in " + Constants.LEO_ID_NAME + "?"
                },
                "Save ID"
            ).then(answer => {
                if (answer === "Save ID") {
                    const w_leoDir = this.config.leoEditorPath;
                    const w_userHome: undefined | string = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

                    const w_folders = [];
                    if (w_userHome) {
                        w_folders.push([
                            path.join(w_userHome, ".leo"),
                            path.join(w_userHome, ".leo", Constants.LEO_ID_NAME)
                        ]);
                    }
                    w_folders.push([
                        path.join(w_leoDir, Constants.CONFIG_PATH),
                        path.join(w_leoDir, Constants.CONFIG_PATH, Constants.LEO_ID_NAME)
                    ]);
                    w_folders.push([
                        path.join(w_leoDir, Constants.SERVER_PATH),
                        path.join(w_leoDir, Constants.SERVER_PATH, Constants.LEO_ID_NAME)
                    ]);

                    let w_wroteFile = false;
                    w_folders.forEach(p_dir_file => {
                        if (!w_wroteFile && fs.existsSync(p_dir_file[0])) {
                            // .leo in user home exists
                            try {
                                fs.writeFileSync(p_dir_file[1], w_idResult!, { encoding: 'utf8', flag: 'w' });
                                if (fs.existsSync(p_dir_file[1])) {
                                    vscode.window.showInformationMessage(Constants.LEO_ID_NAME + " created in " + p_dir_file[0]);
                                    w_wroteFile = true;
                                    return true;
                                }
                            } catch (p_err) {
                                console.log('Could not write ' + p_dir_file[1]);
                            }
                        }
                    });
                    if (w_wroteFile) {
                        return true;
                    } else {
                        vscode.window.showWarningMessage("can not create " + Constants.LEO_ID_NAME);
                    }

                } else {
                    vscode.window.showInformationMessage("Using ID " + w_idResult + " for this Leo session only.");
                }
                return false;
            });

        } else {
            // invalid or canceled
            // Show a message with button to call this command again
            vscode.window.showWarningMessage("Leo ID not set", "Set Leo ID")
                .then(p_chosenButton => {
                    if (p_chosenButton === "Set Leo ID") {
                        vscode.commands.executeCommand(Constants.COMMANDS.SET_LEOID);
                    }
                });
        }
        return true;

    }

    /**
     * * Checks the server version and pops up a message to the user if an update is possible
     */
    public checkVersion(): void {
        this.sendAction(Constants.LEOBRIDGE.GET_VERSION).then((p_rv: LeoBridgePackage) => {
            let w_ok = false;
            if (p_rv && p_rv.major !== undefined && p_rv.minor !== undefined && p_rv.patch !== undefined) {
                this.serverVersion = { major: p_rv.major, minor: p_rv.minor, patch: p_rv.patch };
                if (utils.compareVersions(this.serverVersion, Constants.MIN_SERVER_VERSION_NUMBER)) {
                    w_ok = true;
                }
            }
            if (!w_ok) {
                vscode.window.showErrorMessage(
                    Constants.USER_MESSAGES.MINIMUM_LEO_VERSION_STRING
                );
            }
        });
    }

    /**
     * * Popup browser to choose Leo-Editor installation folder path
     */
    public chooseLeoFolder(): void {
        utils.chooseLeoFolderDialog().then(p_chosenPath => {
            if (p_chosenPath && p_chosenPath.length) {
                this.config.setLeoIntegSettings(
                    [{
                        code: Constants.CONFIG_NAMES.LEO_EDITOR_PATH,
                        value: p_chosenPath[0].fsPath
                    }]
                ).then(() => {
                    this.leoSettingsWebview.changedConfiguration();
                    vscode.window.showInformationMessage("Leo-Editor installation folder chosen as " + p_chosenPath[0].fsPath);
                    if (!this.leoStates.leoStartupFinished && this.config.startServerAutomatically) {
                        this.startServer();
                    }
                });
            }
        });
    }

    /**
     * * Send user's configuration through leoBridge to the server script
     * @param p_config A config object containing all the configuration settings
     * @returns promise that will resolves with the package from "applyConfig" call in Leo bridge server
     */
    public sendConfigToServer(p_config: ConfigMembers): Promise<LeoBridgePackage> {
        if (this.leoStates.leoBridgeReady) {
            p_config.uAsNumber = true; // Force uAsNumber to be true starting at leoInteg 1.0.8
            return this.sendAction(Constants.LEOBRIDGE.APPLY_CONFIG, p_config);
        } else {
            return Promise.reject('Leo Bridge Not Ready');
        }
    }

    public async handleUnl(p_arg: { unl: string, scheme: string }): Promise<void> {

        if (!this.leoStates.leoBridgeReady || !this.leoStates.fileOpenedReady) {
            this.addLogPaneEntry('Handle UNL: No Commander started');
            return;
        }

        const leoJsExtension = vscode.extensions.getExtension('boltex.leojs');
        if (leoJsExtension !== undefined && leoJsExtension.isActive) {
            // If leojs is active only honor UNLS clicked in LeoInteg Panels only.
            if (p_arg.scheme !== Constants.URI_LEO_SCHEME) {
                console.log('LeoJS active: UNL ignored by LeoInteg');
                return;
            }
        }
        await this.triggerBodySave(true);
        try {

            if (p_arg.unl) {

                return this.sendAction(
                    Constants.LEOBRIDGE.HANDLE_UNL,
                    { unl: p_arg.unl }
                ).then((_p_result: LeoBridgePackage) => {
                    this.setupRefresh(
                        Focus.NoChange,
                        {
                            tree: true,
                            body: true,
                            goto: true,
                            states: true,
                            documents: true,
                            buttons: true
                        }
                    );
                    this.launchRefresh();
                    this.loadSearchSettings();

                });

            } else {
                console.log('NO ARGUMENT FOR HANDLE URL! ', p_arg);
            }
        }
        catch (e) {
            console.log('FAILED HANDLE URL! ', p_arg);
        }
    }

    public async gotoLineInLeoOutline(p_arg: any): Promise<any> {
        // When the active editor is an external file referenced by an @file node 
        // in the current Leo outline, this method finds that @file node,
        // selects it in the Leo outline, and attempts to place the cursor
        // to the corresponding line number in the body pane of the selected node.
        // It processes the first matching @file node found.

        if (!utils.compareVersions(this.serverVersion, { major: 1, minor: 0, patch: 12 })) {
            return Promise.resolve();
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showErrorMessage('No active editor');
            return;
        }

        const document = editor.document;
        const position = editor.selection.active;
        const lineNumber = position.line; // 0-indexed
        let filePath = utils.capitalizeDrive(document.uri.fsPath);

        await this.triggerBodySave(true);
        try {

            const p_result: LeoBridgePackage = await this.sendAction(
                Constants.LEOBRIDGE.GOTO_LINE_IN_LEO_OUTLINE,
                { filePath, lineNumber }
            );

            if (p_result['found']) {
                await this.showBody(false);
                this.setupRefresh(
                    Focus.Body,
                    {
                        tree: true,
                        body: true,
                        states: true,
                        scroll: true, // Scroll to the position in the body
                        buttons: false,
                        documents: false,
                        goto: false,
                    },
                    p_result.node || this.lastSelectedNode
                );
                this.launchRefresh();
            } else {
                // Not found. Offer to import as an @auto, an @clean, or to cancel.
                // Open modal dialog with options.
                const choices = [
                    { title: '@clean', },
                    { title: '@edit', },
                    { title: '@asis', },
                    { title: 'Cancel', isCloseAffordance: true },
                ];
                const selection = await vscode.window.showInformationMessage( // Added await
                    `The file "${filePath}" was not found in the current Leo outline.`,
                    {
                        detail: 'Import with...',
                        modal: true
                    },
                    ...choices
                );
                if (selection?.title.startsWith('@')) {

                    // get which import type was selected
                    const importType = selection.title; // '@clean', '@edit', or '@asis'

                    const insertResult = await this.sendAction(
                        Constants.LEOBRIDGE.INSERT_FILE_NODE,
                        { filePath, importType }
                    );

                    const refreshResult = await this.sendAction(
                        Constants.LEOBRIDGE.REFRESH_FROM_DISK_PNODE,
                        utils.buildNodeCommand(insertResult.node || this.lastSelectedNode!)
                    );

                    if (insertResult && refreshResult) {

                        // After import, show the line in Leo outline again
                        const secondShowLine = await this.sendAction(
                            Constants.LEOBRIDGE.GOTO_LINE_IN_LEO_OUTLINE,
                            { filePath, lineNumber }
                        );

                        if (!secondShowLine['found']) {
                            vscode.window.showInformationMessage(
                                `The file "${filePath}" was not found in the current Leo outline after import.`
                            );
                        } else {
                            await this.showBody(false);
                        }
                        // refresh the outline and body
                        this.setupRefresh(
                            Focus.Body,
                            {
                                tree: true,
                                body: true,
                                goto: true,
                                scroll: !!secondShowLine['found'], // Scroll to the position in the body if found
                                states: true,
                                documents: true,
                                buttons: true
                            },
                            secondShowLine.node || this.lastSelectedNode
                        );
                        return this.launchRefresh();
                    }

                } else {
                    // Handle Cancel or dismiss
                    console.log('User cancelled or dismissed the dialog');
                }
            }
        }
        catch (e) {
            console.log('FAILED SHOW LINE IN LEO OUTLINE', p_arg);
        }
    }

    public async importIntoLeoOutline(p_arg: vscode.Uri): Promise<any> {

        let filePath = utils.capitalizeDrive(p_arg.fsPath);
        const choices = [
            'Default Import',
            'As @auto',
            'As @clean',
            'As @edit',
            'As @asis',
        ];

        let result: LeoBridgePackage;

        // * Use quick pick to ask for import type
        const selection = await vscode.window.showQuickPick(choices, {
            placeHolder: 'Import into Leo Outline',
        });

        if (selection && selection === "Default Import") {
            result = await this.sendAction(
                Constants.LEOBRIDGE.IMPORT_ANY_FILE,
                { filenames: [filePath] }
            );

        } else if (selection && selection.startsWith("As ")) {

            const importType = selection.split(' ')[1].toLowerCase(); // '@auto', '@clean', '@edit', or '@asis'

            const insertResult = await this.sendAction(
                Constants.LEOBRIDGE.INSERT_FILE_NODE,
                { filePath, importType }
            );

            result = await this.sendAction(
                Constants.LEOBRIDGE.REFRESH_FROM_DISK_PNODE,
                utils.buildNodeCommand(insertResult.node || this.lastSelectedNode!)
            );
        } else {
            // Handle Cancel or dismiss
            return Promise.resolve();
        }

        this.setupRefresh(
            Focus.Outline, // No change in focus, but refresh all panels
            {
                tree: true,
                body: true,
                states: true,
                buttons: false,
                documents: true,
                goto: false,
            },
            result.node || this.lastSelectedNode
        );
        return this.launchRefresh();

    }

    /**
     * * Open Leo files found in "context.workspaceState.leoFiles"
     * @returns promise that resolves immediately, or rejects if empty, or files not opened.
     */
    private _openLastFiles(): Promise<LeoBridgePackage> {
        // Loop through context.workspaceState.<something> and check if they exist: open them
        const w_lastFiles: string[] = this._context.workspaceState.get(Constants.LAST_FILES_KEY) || [];
        if (w_lastFiles.length) {
            return this.sendAction(
                Constants.LEOBRIDGE.OPEN_FILES,
                { files: w_lastFiles }
            ).then(
                (p_openFileResult: LeoBridgePackage) => {

                    if (p_openFileResult.total) {

                        let q_finalResult: Promise<LeoBridgePackage>;

                        // Check for last active Leo document
                        const w_lastActive = utils.getGlobalLastActiveFile(this._context);

                        //  Need to switch ?
                        if (w_lastActive && p_openFileResult.filename! !== w_lastActive) {
                            // Call server "get all opened commanders"
                            q_finalResult = this.sendAction(
                                Constants.LEOBRIDGE.GET_OPENED_FILES
                            ).then((p_openedFiles) => {
                                const w_files: LeoDocument[] = p_openedFiles.files || [];
                                let w_index: number = 0;
                                let w_indexToSelect: number = -1;
                                if (w_files && w_files.length) {
                                    w_files.forEach((i_file: LeoDocument) => {
                                        i_file.index = w_index;
                                        if (i_file.name === w_lastActive) {
                                            w_indexToSelect = w_index;
                                        }
                                        w_index++;
                                    });
                                }
                                if (w_indexToSelect >= 0) {
                                    // found it!

                                    // Select from list if present, by index with "set opened file"
                                    return this.sendAction(
                                        Constants.LEOBRIDGE.SET_OPENED_FILE, { index: w_indexToSelect }
                                    );
                                } else {
                                    // return default package
                                    return p_openedFiles;
                                }
                            });
                        } else {
                            q_finalResult = Promise.resolve(p_openFileResult);
                        }

                        q_finalResult.then((p_fileResult) => {

                            this.serverHasOpenedFile = true;
                            this.serverOpenedFileName = p_fileResult.filename!;
                            this.serverOpenedNode = p_fileResult.node!;
                            this._finishOpenLastFiles();

                            this.loadSearchSettings();
                            this.setupRefresh(
                                this.finalFocus,
                                {
                                    tree: true,
                                    body: true,
                                    documents: true,
                                    buttons: true,
                                    states: true,
                                    goto: true,
                                },
                                p_fileResult.node
                            );
                            this.launchRefresh();
                            return p_fileResult;
                        });

                        return q_finalResult;

                    } else {
                        this.serverHasOpenedFile = false;
                        this.serverOpenedFileName = "";
                        this.serverOpenedNode = undefined;
                        this._finishOpenLastFiles();
                        this.launchRefresh();
                        return Promise.reject('Recent files list is empty');
                    }

                },
                (p_errorOpen) => {
                    this._finishOpenLastFiles();
                    this.launchRefresh();

                    console.log('in .then not opened or already opened');
                    return Promise.reject(p_errorOpen);
                }
            );
        } else {
            return Promise.reject('Recent files list is empty');
        }
    }

    /**
     * Setup flags for end of opening last-files.
     */
    private _finishOpenLastFiles(): void {
        // set connecting false and other flags to finish 'open last files'
        this.leoStates.leoBridgeReady = true;
        this.leoStates.leoStartupFinished = true;
        setTimeout(() => {
            this.leoStates.leoConnecting = false;
        }, 100);

    }
    /**
     * * Adds to the context.workspaceState.<xxx>files if not already in there (no duplicates)
     * @param p_file path+file name string
     * @returns A promise that resolves when all workspace storage modifications are done
     */
    private async _addRecentAndLastFile(p_file: string): Promise<void> {

        if (!p_file.length) {
            return Promise.resolve();
        }

        await Promise.all([
            utils.addFileToWorkspace(this._context, p_file, Constants.RECENT_FILES_KEY),
            utils.addFileToWorkspace(this._context, p_file, Constants.LAST_FILES_KEY),
        ]);

        return Promise.resolve();
    }

    /**
     * * Removes from context.workspaceState.leoRecentFiles if found (should not have duplicates)
     * @param p_file path+file name string
     * @returns A promise that resolves when the workspace storage modification is done
     */
    private _removeRecentFile(p_file: string): Thenable<void> {
        return utils.removeFileFromWorkspace(this._context, p_file, Constants.RECENT_FILES_KEY);
    }

    /**
     * * Removes from context.workspaceState.leoLastFiles if found (should not have duplicates)
     * @param p_file path+file name string
     * @returns A promise that resolves when the workspace storage modification is done
     */
    private _removeLastFile(p_file: string): Thenable<void> {
        return utils.removeFileFromWorkspace(this._context, p_file, Constants.LAST_FILES_KEY);
    }

    /**
     * * Shows the recent Leo files list, choosing one will open it
     * @returns A promise that resolves when the a file is finally opened, rejected otherwise
     */
    public async showRecentLeoFiles(): Promise<LeoBridgePackage | undefined> {

        const w_recentFiles: string[] =
            this._context.workspaceState.get(Constants.RECENT_FILES_KEY) || [];
        let q_chooseFile: Thenable<string | undefined>;

        // Remove duplicates after capitalizing starting drive letters. (on windows) 
        const normalizedPaths = w_recentFiles.map((filePath: string): string => {
            if (filePath.length > 1 && filePath[1] === ':') {
                // Check if the first character is a letter
                if (filePath[0] >= 'a' && filePath[0] <= 'z') {
                    // Convert the first character to uppercase
                    return filePath[0].toUpperCase() + filePath.slice(1);
                }
            }
            return filePath; // Return the original path if no changes are needed
        }

        );
        const uniquePaths = Array.from(new Set(normalizedPaths));

        if (uniquePaths.length) {
            q_chooseFile = vscode.window.showQuickPick(uniquePaths, {
                placeHolder: Constants.USER_MESSAGES.OPEN_RECENT_FILE,
            });
        } else {
            // No file to list
            return Promise.resolve(undefined);
        }

        const w_result = await q_chooseFile;
        if (w_result) {
            const fileUri = vscode.Uri.file(w_result);
            if (fs.existsSync(fileUri.fsPath)) {
                return this.openLeoFile(vscode.Uri.file(w_result));
            } else {
                vscode.window.showInformationMessage('File does not exist: ' + fileUri.fsPath);
                // Remove from recent list!
                this._removeRecentFile(w_result);
                return Promise.resolve(undefined);
            }
        } else {
            // Canceled
            return Promise.resolve(undefined);
        }
    }

    /**
     * * Reveals the log pane if not already visible
     */
    public showLogPane(): void {
        if (!this._leoLogPane) {
            // * output channel instantiation
            this._leoLogPane = vscode.window.createOutputChannel(
                Constants.GUI.LOG_PANE_TITLE
            );
            this._context.subscriptions.push(this._leoLogPane);
        }
        this._leoLogPane.show(true);
    }

    /**
     * * Hides the log pane
     */
    public hideLogPane(): void {
        if (this._leoLogPane) {
            this._leoLogPane.hide();
        }
    }

    /**
     * * Adds a message string to leoInteg's log pane. Used when leoBridge receives an async 'log' command.
     * @param p_message The string to be added in the log
     */
    public addLogPaneEntry(p_message: string): void {
        if (this._leoLogPane) {
            this._leoLogPane.appendLine(p_message);
        } else {
            console.log('LEOINTEG ERROR : addLogPaneEntry without log pane!');
        }
    }

    /**
     * * 'getStates' action for use in debounced method call
     */
    private _triggerGetStates(): void {

        if (this._refreshType.documents) {
            this._refreshType.documents = false;
            this.refreshDocumentsPane();
        }
        if (this._refreshType.goto) {
            this._refreshType.goto = false;
            this.refreshGotoPane();
        }
        if (this._refreshType.buttons) {
            this._refreshType.buttons = false;
            this.refreshButtonsPane();
        }
        if (this._refreshType.states) {
            this._refreshType.states = false;
            this.sendAction(Constants.LEOBRIDGE.GET_STATES)
                .then((p_package: LeoBridgePackage) => {
                    if (p_package.states) {
                        this.leoStates.setLeoStateFlags(p_package.states);
                    }
                });
            this.refreshUndoPane();
            this.getUNL();
        }
        this.refreshBodyStates(); // Set language and wrap states, if different.

    }

    /**
     * 'getUnl' action for use in status bar
     */
    private _getUNL(): void {

        if (!utils.compareVersions(this.serverVersion, { major: 1, minor: 0, patch: 10 })) {
            return;
        }
        // IF SERVER VERSION >= 10 get unl action !
        this.sendAction(Constants.LEOBRIDGE.GET_UNL)
            .then((p_package: LeoBridgePackage) => {
                if (p_package.unl) {
                    this._leoStatusBar.setString(p_package.unl);
                }
            });

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
     * @param p_all Flag for 'isBusy' check: will block if bridge is busy, not just commands on stack
     * @param p_forcedVsCodeSave Flag to also have vscode 'save' the content of this editor through the filesystem
     * @returns a promise that resolves when the possible saving process is finished
     */
    private _isBusyTriggerSave(p_all: boolean, p_forcedVsCodeSave?: boolean): Promise<unknown> {
        if (this._isBusy(p_all)) {
            return Promise.reject('Command stack busy'); // Warn user to wait for end of busy state
        }
        return this.triggerBodySave(p_forcedVsCodeSave);
    }

    /**
     * * Check if the current file is an already saved/named file
     * @returns true if the current opened Leo document's filename has some content. (not a new unnamed file)
     */
    private _isCurrentFileNamed(): boolean {
        return !!this.leoStates.leoOpenedFileName.length; // checks if it's an empty string
    }

    /**
     * * Setup leoInteg's UI for having no opened Leo documents
     */
    private _setupNoOpenedLeoDocument(): void {
        // Close ALL detached bodies.
        const w_foundTabs: Set<vscode.Tab> = new Set();
        const w_foundUri: Set<vscode.Uri> = new Set();
        for (const p_tabGroup of vscode.window.tabGroups.all) {
            for (const p_tab of p_tabGroup.tabs) {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_DETACHED_SCHEME
                ) {
                    w_foundTabs.add(p_tab);
                    w_foundUri.add((p_tab.input as vscode.TabInputText).uri);
                }
            }
        }
        if (w_foundTabs.size) {
            void vscode.window.tabGroups.close([...w_foundTabs], true);
            for (const w_uri of w_foundUri) {
                void vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', w_uri);
            }
        }
        this._nextRevealParams = undefined;
        void this.checkConfirmBeforeClose();
        this.leoStates.fileOpenedReady = false;
        this.leoStates.leoCommanderId = "";
        this._bodyTextDocument = undefined;
        this.bodyDetachedTextDocument = undefined;
        this.lastSelectedNode = undefined;
        utils.setGlobalLastActiveFile(this._context, "");
        this._refreshOutline(false, RevealType.NoReveal);
        this.refreshDocumentsPane();
        this.refreshButtonsPane();
        this.refreshUndoPane();
        this._leoStatusBar.hide();
        this.closeBody();
    }

    /**
     * * A Leo file was opened: setup leoInteg's UI accordingly.
     * @return a promise that resolves to an opened body pane text editor
     */
    private _setupOpenedLeoDocument(): void {
        this._needLastSelectedRefresh = true;
        // const w_selectedLeoNode = this.apToLeoNode(p_openFileResult.node!, false); // Just to get gnx for the body's fist appearance
        this.leoStates.leoOpenedFileName = this.serverOpenedFileName;
        // * Startup flag
        if (!this.leoStates.fileOpenedReady) {
            this.leoStates.fileOpenedReady = true;
        }
        this.showBodyIfClosed = true;
        this.showOutlineIfClosed = true;
        this.setupRefresh(
            Focus.Body, // Original Leo seems to open itself with focus in body.
            {
                tree: true,
                body: true,
                states: true,
                buttons: true,
                documents: true,
                goto: true
            },
            this.serverOpenedNode
        );
        // * Start body pane system
        if (!this._bodyFileSystemStarted) {
            this._context.subscriptions.push(
                vscode.workspace.registerFileSystemProvider(
                    Constants.URI_LEO_SCHEME,
                    this._leoFileSystem,
                    { isCaseSensitive: true }
                )
            );
            this._bodyFileSystemStarted = true;
        }
        if (!this._detachedFileSystemStarted) {
            this._context.subscriptions.push(
                vscode.workspace.registerFileSystemProvider(
                    Constants.URI_LEO_DETACHED_SCHEME,
                    this._leoDetachedFileSystem,
                    { isCaseSensitive: true }
                )
            );
            this._detachedFileSystemStarted = true;
        }
        if (this.config.showUnlOnStatusBar && utils.compareVersions(this.serverVersion, { major: 1, minor: 0, patch: 10 })) {
            this._leoStatusBar.show();
        }
        this.sendConfigToServer(this.config.getConfig());
        this.loadSearchSettings();

    }

    /**
     * * Handles the change of vscode config: a onDidChangeConfiguration event triggered
     * @param p_event The configuration-change event passed by vscode
     */
    private _onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {

        if (
            p_event.affectsConfiguration(Constants.CONFIG_NAME)
            // ||
            // p_event.affectsConfiguration('editor.fontSize') ||
            // p_event.affectsConfiguration('window.zoomLevel')
        ) {
            this.config.setLeoIntegSettingsPromise.then(
                () => {
                    this.config.buildFromSavedSettings();
                    this.leoSettingsWebview.changedConfiguration();

                    if (p_event.affectsConfiguration(Constants.CONFIG_NAME + "." + Constants.CONFIG_NAMES.SHOW_BRANCH_OUTLINE)) {
                        this._refreshDesc();
                    }

                    if (
                        p_event.affectsConfiguration(Constants.CONFIG_NAME + "." + Constants.CONFIG_NAMES.INVERT_NODES) ||
                        p_event.affectsConfiguration(Constants.CONFIG_NAME + "." + Constants.CONFIG_NAMES.SHOW_EDIT) ||
                        p_event.affectsConfiguration(Constants.CONFIG_NAME + "." + Constants.CONFIG_NAMES.SHOW_ADD) ||
                        p_event.affectsConfiguration(Constants.CONFIG_NAME + "." + Constants.CONFIG_NAMES.SHOW_MARK) ||
                        p_event.affectsConfiguration(Constants.CONFIG_NAME + "." + Constants.CONFIG_NAMES.SHOW_CLONE) ||
                        p_event.affectsConfiguration(Constants.CONFIG_NAME + "." + Constants.CONFIG_NAMES.SHOW_COPY)
                    ) {
                        this.configTreeRefresh();
                    }

                    if (this.config.showUnlOnStatusBar && this.leoStates.fileOpenedReady && this._leoStatusBar) {
                        this._leoStatusBar.show();
                    }
                    if (!this.config.showUnlOnStatusBar && this._leoStatusBar) {
                        this._leoStatusBar.hide();
                    }

                    if (this.leoStates.leoBridgeReady && p_event.affectsConfiguration(Constants.CONFIG_NAME + "." + Constants.CONFIG_NAMES.ASK_FOR_EXIT_CONFIRMATION_IF_DIRTY)) {
                        if (!this.config.askForExitConfirmationIfDirty) {
                            void this.config.setConfirmBeforeClose(false); // was set false. so dont check for sure.
                        }
                        this.checkConfirmBeforeClose(); // may have been set true or false
                    }

                }
            );

        }

        // also check if workbench.editor.enablePreview
        this._bodyEnablePreview = !!vscode.workspace
            .getConfiguration('workbench.editor')
            .get('enablePreview');

        // Check For "workbench.editor.enablePreview" to be true.
        // Leave small delay for multiple possible forced changes at startup
        setTimeout(() => {
            this.config.checkEnablePreview();
            this.config.checkCloseEmptyGroups();
            this.config.checkBodyWrap();
        }, 150);
    }

    /**
     * * Handles the opening of a file in vscode, and check if it's a Leo file to suggest opening options
     * @param p_event The opened document event passed by vscode
     */
    private _onDidOpenTextDocument(p_document: vscode.TextDocument): void {
        if (
            this.leoStates.leoBridgeReady &&
            p_document.uri.scheme === Constants.URI_FILE_SCHEME &&
            (
                p_document.uri.fsPath.toLowerCase().endsWith('.leo') ||
                p_document.uri.fsPath.toLowerCase().endsWith('.leojs')
            )
        ) {
            if (!this._hasShownContextOpenMessage) {
                vscode.window.showInformationMessage(Constants.USER_MESSAGES.RIGHT_CLICK_TO_OPEN);
                this._hasShownContextOpenMessage = true;
            }
        }
    }

    /**
     * * Handles the node expanding and collapsing interactions by the user in the treeview
     * @param p_event The event passed by vscode
     * @param p_expand True if it was an expand, false if it was a collapse event
     * @param p_treeView Pointer to the treeview itself, either the standalone treeview or the one under the explorer
     */
    private async _onChangeCollapsedState(
        p_event: vscode.TreeViewExpansionEvent<ArchivedPosition>,
        p_expand: boolean,
        p_treeView: vscode.TreeView<ArchivedPosition>
    ): Promise<unknown> {
        // * Expanding or collapsing via the treeview interface selects the node to mimic Leo
        await this.triggerBodySave(true);
        // * Set expanded flag even on leointeg's vscode side of things, mostly for 'insert node'.
        if (p_expand) {
            p_event.element.expanded = true;
        } else {
            p_event.element.expanded = false;
        }
        // * distinguish between: changing expand state on already-selected node -vs- selecting at the same time as clicking caret.
        if (p_treeView.selection[0] && utils.buildApId(p_treeView.selection[0]) === utils.buildApId(p_event.element)) {
            // * This happens if the tree selection is already the same as the expanded/collapsed node
            // Pass
        } else {
            if (this.config.leoTreeBrowse) {
                // * This part only happens if the user clicked on the arrow without trying to select the node
                this._revealNode(p_event.element, { select: true, focus: false }); // No force focus : it breaks collapse/expand when direct parent
                this.selectTreeNode(p_event.element, true); // not waiting for a .then(...) so not to add any lag
            }
        }

        // * vscode will update its tree by itself, but we need to change Leo's model of its outline
        return this.sendAction(
            p_expand ? Constants.LEOBRIDGE.EXPAND_NODE : Constants.LEOBRIDGE.COLLAPSE_NODE,
            utils.buildNodeCommand(p_event.element)
        );

    }

    /**
     * * Handle the change of visibility of either outline treeview and refresh it if its visible
     * @param p_event The treeview-visibility-changed event passed by vscode
     * @param p_explorerView Flag to signify that the treeview who triggered this event is the one in the explorer view
     */
    private _onTreeViewVisibilityChanged(
        p_event: vscode.TreeViewVisibilityChangeEvent,
        p_explorerView: boolean
    ): void {
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
     * * Handle the change of visibility of either leo-documents treeview and refresh it if its visible
     * @param p_event The treeview-visibility-changed event passed by vscode
     * @param p_explorerView Flags that the treeview who triggered this event is the one in the explorer view
     */
    private _onDocTreeViewVisibilityChanged(
        p_event: vscode.TreeViewVisibilityChangeEvent,
        p_explorerView: boolean
    ): void {
        if (p_explorerView) {
        } // (Facultative/unused) Do something different if explorer view is used
        if (p_event.visible) {
            this.refreshDocumentsPane(); // Have to force refresh to force selection!
        }
    }

    /**
     * * Handle the change of visibility of either buttons treeview and refresh it if its visible
     * @param p_event The treeview-visibility-changed event passed by vscode
     * @param p_explorerView Flags that the treeview who triggered this event is the one in the explorer view
     */
    private _onButtonsTreeViewVisibilityChanged(
        p_event: vscode.TreeViewVisibilityChangeEvent,
        p_explorerView: boolean
    ): void {
        if (p_explorerView) {
        } // (Facultative/unused) Do something different if explorer view is used
        if (p_event.visible) {
            // this.refreshButtonsPane(); // No need to refresh because no selection needs to be set
        }
    }

    /**
     * * Handle the change of visibility of either undo treeview and refresh it if its visible
     * @param p_event The treeview-visibility-changed event passed by vscode
     * @param p_explorerView Flags that the treeview who triggered this event is the one in the explorer view
     */
    private _onUndosTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        if (p_event.visible) {
            const lastLeoUndos = p_explorerView ? this._leoUndosExplorer : this._leoUndos;
            const undosShown = p_explorerView ? this._leoUndosExplorerShown : this._leoUndosShown;

            this._lastLeoUndos = lastLeoUndos;
            if (undosShown) {
                this._leoUndosProvider.refreshTreeRoot(); // Already shown, will redraw but not re-select
            }

            if (p_explorerView) {
                this._leoUndosExplorerShown = true;
            } else {
                this._leoUndosShown = true;
            }
        }
    }

    /**
     * * Handle the change of visibility of either find panel
     * @param p_event The visibility-changed event passed by vscode
     * @param p_explorerView Flags that the treeview who triggered this event is the one in the explorer view
     */
    private _onFindViewVisibilityChanged(p_explorerView: boolean): void {
        const currentView = p_explorerView ? this._findPanelWebviewExplorerView : this._findPanelWebviewView;

        if (currentView?.visible) {
            this._lastFindView = currentView;
            this.checkForceFindFocus(false);
            this.setGotoContent();

            if (this.leoGotoProvider.isSelected) {
                this.revealGotoNavEntry(this.leoGotoProvider.selectedNodeIndex, true);
            }
        }
    }

    /**
     * React to the closing of 'tabs' via
     * events from vscode.window.tabGroups
     */
    public _onTabGroupsChanged(_p_event: vscode.TabGroupChangeEvent): void {
        this.checkClosedTabs(); // debounced
    }

    /**
     * React to the closing of 'tabgroups' via
     * events from vscode.window.tabGroups
     */
    public _onTabsChanged(_p_event: vscode.TabChangeEvent): void {
        this.checkClosedTabs(); // debounced
    }

    /**
     * * Handles detection of the active editor having changed from one to another, or closed
     * @param p_editor The editor itself that is now active
     * @param p_internalCall Flag used to signify the it was called voluntarily by leoInteg itself
     */
    private _onActiveEditorChanged(
        p_editor: vscode.TextEditor | undefined,
        p_internalCall?: boolean
    ): void {
        if (p_editor) {
            this._hideBodiesUnknownToFileSys([p_editor]);
        }
        if (!p_internalCall) {
            this.triggerBodySave(true, true); // Save in case edits were pending
        }
        // removed until proper API for knowing focus placement
        // // * Status flag check
        // if (!p_editor && this._leoStatusBar.statusBarFlag) {
        //     return;
        //     // this._leoStatusBar.update(false);
        // }
        // // * Status flag check
        // setTimeout(() => {
        //     if (vscode.window.activeTextEditor) {
        //         this._leoStatusBar.update(
        //             vscode.window.activeTextEditor.document.uri.scheme === Constants.URI_LEO_SCHEME
        //         );
        //     }
        // }, 0);
    }

    /**
     * * Moved a document to another column
     * @param p_columnChangeEvent  event describing the change of a text editor's view column
     */
    public _changedTextEditorViewColumn(
        p_columnChangeEvent: vscode.TextEditorViewColumnChangeEvent
    ): void {
        if (p_columnChangeEvent && p_columnChangeEvent.textEditor.document.uri.scheme === Constants.URI_LEO_SCHEME) {
            this._checkPreviewMode(p_columnChangeEvent.textEditor);
        }
        this.triggerBodySave(true, true);
    }

    /**
     * * Tabbed on another editor
     * @param p_editors text editor array (to be checked for changes in this method)
     */
    public _changedVisibleTextEditors(p_editors: readonly vscode.TextEditor[]): void {
        if (p_editors && p_editors.length) {
            this._hideBodiesUnknownToFileSys(p_editors);
        }
        this.triggerBodySave(true, true);
    }

    /**
     * * Whole window has been minimized/restored
     * @param _p_windowState the state of the window that changed
     */
    public _changedWindowState(_p_windowState: vscode.WindowState): void {
        // no other action
        this.triggerBodySave(true, true);
    }

    /**
     * * Handles detection of the active editor's selection change or cursor position
     * @param p_event a change event containing the active editor's selection, if any.
     */
    private _onChangeEditorSelection(p_event: vscode.TextEditorSelectionChangeEvent): void {
        if (
            p_event.textEditor.document.uri.scheme === Constants.URI_LEO_SCHEME ||
            p_event.textEditor.document.uri.scheme === Constants.URI_LEO_DETACHED_SCHEME
        ) {
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
        if (
            p_event.textEditor.document.uri.scheme === Constants.URI_LEO_SCHEME ||
            p_event.textEditor.document.uri.scheme === Constants.URI_LEO_DETACHED_SCHEME
        ) {
            if (p_event.visibleRanges.length) {
                this._scrollDirty = true;
                this._scroll = p_event.visibleRanges[0];
                this._scrollGnx = utils.leoUriToStr(p_event.textEditor.document.uri);
            }
        }
    }

    /**
     * * Handle typing, undos and read-from-file refreshes that was detected as a document change
     * @param p_textDocumentChange Text changed event passed by vscode
     */
    private _onDocumentChanged(p_textDocumentChange: vscode.TextDocumentChangeEvent): void {

        if (
            p_textDocumentChange.contentChanges.length &&
            (p_textDocumentChange.document.uri.scheme === Constants.URI_LEO_DETACHED_SCHEME)
        ) {
            const w_detachedGnx = utils.leoUriToStr(p_textDocumentChange.document.uri);
            const [unused, id, gnx] = p_textDocumentChange.document.uri.path.split("/");
            const w_bodyText = p_textDocumentChange.document.getText().replace(/\r\n/g, "\n");
            const w_hasBody = !!w_bodyText.length;

            const w_selectedCId = this.leoStates.leoCommanderId; // g.app.windowList[this.frameIndex].c.id.toString();
            const w_sameCommander = w_selectedCId === id;
            let w_needDocRefresh = false;
            let w_alreadySaved = false;
            let w_v: ArchivedPosition | undefined;

            w_v = this._leoDetachedFileSystem.openedBodiesVNodes[w_detachedGnx];

            // console.log(this._changedBodyWithMirrorDetached, (w_v && (w_bodyText === w_v._lastBodyData)));

            if (this._changedBodyWithMirrorDetached || (w_v && (w_bodyText === w_v._lastBodyData))) {
                // console.log('document changed DETACHED not user modification ' + (this.changedBodyWithMirrorDetached ? " Cleared changedBodyWithMirrorDetached" : ""), (w_v && (w_bodyText === w_v._lastBodyData)));
                // WAS NOT A USER MODIFICATION?
                this._changedBodyWithMirrorDetached = undefined;
                this._bodySaveDocument(p_textDocumentChange.document);
                return;
            } else if (w_v._lastBodyData) {
                w_v._lastBodyData = undefined;
            }

            this.bodyDetachedTextDocument = p_textDocumentChange.document;

            // * If body changed a line with and '@' directive, set w_needsRefresh
            let w_needsRefresh = false;

            for (const p_change of p_textDocumentChange.contentChanges) {
                if (p_change.rangeLength || p_change.text.includes('@')) {
                    // is replacing a chunk. (pasting, deleting a range)
                    w_needsRefresh = true;
                    break;
                }
            }

            // * Detect in active editor if current cursor line is language related, set w_needsRefresh if so.
            const w_textEditor = vscode.window.activeTextEditor;
            if (
                w_textEditor && w_textEditor.selections && w_textEditor.selections.length &&
                !w_needsRefresh && p_textDocumentChange.document.uri.fsPath === w_textEditor.document.uri.fsPath
            ) {
                for (const p_selection of w_textEditor.selections) {
                    if (p_selection.active.line < w_textEditor.document.lineCount) {
                        // TRY TO DETECT IF LANGUAGE RESET NEEDED!
                        let w_line = w_textEditor.document.lineAt(p_selection.active.line).text;
                        if (w_line.trim().startsWith('@') || w_line.includes('language') || w_line.includes('wrap') || w_line.includes('killcolor') || w_line.includes('nocolor-node')) {
                            w_needsRefresh = true;
                            break;
                        }
                    }
                }
            }

            const w_uriKey = utils.leoUriToStr(this.bodyDetachedTextDocument.uri);
            const w_node = this._leoDetachedFileSystem.openedBodiesVNodes[w_uriKey];
            const w_detachedIconChanged = !w_node.dirty || (!!w_node.hasBody === !w_hasBody);

            // If same commander, and node icon changed (or whole document was unchanged)
            if (w_sameCommander) {
                if (!this.leoStates.leoChanged || w_detachedIconChanged) {
                    if (!w_alreadySaved) {
                        // console.log(
                        //     'bodySAVE DETACHED because icon changed:\n' +
                        //     ' this.leoStates.leoChanged: ' + this.leoStates.leoChanged +
                        //     '\n w_node.dirty' + w_node.dirty +
                        //     "\n!!w_node.hasBody === !w_hasBody" + (!!w_node.hasBody === !w_hasBody)
                        // );

                        void this._bodySaveDocument(this.bodyDetachedTextDocument);
                        w_alreadySaved = true;
                    }
                    if (w_detachedIconChanged) {
                        this.findFocusTree = false;
                        // NOT incrementing this.treeID to keep ids intact
                        // NoReveal since we're keeping the same id.
                        this._refreshOutline(false, RevealType.NoReveal);
                    }
                }
            } else {
                for (const doc of this._leoDocumentsProvider.lastDocumentList) {
                    if (doc.documentEntry.id.toString() === id) {
                        // found it.
                        if (!doc.documentEntry.changed) {
                            // not changed, so needs refresh of documents.
                            w_needDocRefresh = true;
                            if (!w_alreadySaved) {
                                void this._bodySaveDocument(this.bodyDetachedTextDocument);
                                w_alreadySaved = true;
                            }
                        }
                        break;
                    }
                }
            }

            // * SET NEW VSNODE STATES FOR FUTURE w_detachedIconChanged DETECTION!
            w_node.dirty = true;
            w_node.hasBody = w_hasBody;

            if (w_needsRefresh) {
                if (!w_alreadySaved) {
                    void this._bodySaveDocument(this.bodyDetachedTextDocument);
                    w_alreadySaved = true;
                }
                // REFRESH LANGUAGE OF THIS DETACHED BODY
                const w_foundVnode = this._leoDetachedFileSystem.openedBodiesVNodes[utils.leoUriToStr(p_textDocumentChange.document.uri)];
                if (w_foundVnode) {
                    if (!w_alreadySaved) {
                        // console.log('bodySAVE DETACHED because w_needsRefresh');

                        void this._bodySaveDocument(this.bodyDetachedTextDocument);
                        w_alreadySaved = true;
                    }

                    this._getBodyLanguage(w_v, id).then((p_language) => {
                        if (this.bodyDetachedTextDocument && p_language !== this.bodyDetachedTextDocument.languageId) {
                            void this._setBodyLanguage(this.bodyDetachedTextDocument, p_language);
                        }
                    });

                } else {
                    console.log('DETACHED VNODE not found when resetting language');
                }
                // REFRESH LANGUAGE OF OTHER DETACHED BODIES WITH DELAY
                this.refreshCommanderDetachedLanguage();
            }

            // * CHECK FOR BODY THAT MATCHES! set w_sameBodyTabOpened if so.
            let w_sameBodyTabOpened = false;
            for (const p_tabGroup of vscode.window.tabGroups.all) {
                for (const p_tab of p_tabGroup.tabs) {
                    if (p_tab.input &&
                        (p_tab.input as vscode.TabInputText).uri &&
                        ((p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_SCHEME)
                    ) {
                        if (gnx === utils.leoUriToStr((p_tab.input as vscode.TabInputText).uri)) {
                            w_sameBodyTabOpened = true;
                            break;
                        }
                    }
                }
                if (w_sameBodyTabOpened) {
                    // console.log('found same body that MATCHES!');
                    break;
                }
            }

            // Check if exact same commander AND same gnx: BOTH THE SAME so refresh the body!
            if (w_sameCommander) {
                if (w_sameBodyTabOpened && this.lastSelectedNode && gnx === this.lastSelectedNode.gnx) {
                    // Same commander AND same gnx  !  
                    if (!w_alreadySaved) {
                        // console.log('bodySAVE DETACHED because same tab opened');
                        void this._bodySaveDocument(this.bodyDetachedTextDocument);
                        w_alreadySaved = true;
                    }
                    if (this._leoFileSystem.watchedBodiesGnx.includes(gnx)) {
                        // console.log("setting changedDetachedWithMirrorBody");

                        this._changedDetachedWithMirrorBody = `${id}/${gnx}`; // PREVENT DOUBLE REFRESH
                    }
                    // console.log('fire refresh of body');
                    this._leoFileSystem.fireRefreshFile(this.lastSelectedNode.gnx);
                }

                if (w_needsRefresh) {
                    this.debouncedRefreshBodyStates(50); // And maybe changed in other node of same commander!
                }

            } else if (w_needDocRefresh) {
                this.refreshDocumentsPane();
            }

            if (!this.leoStates.leoChanged) {
                // also refresh document panel (icon may be dirty now)
                this.leoStates.leoChanged = true;
                this.refreshDocumentsPane();
            }

        }

        // ".length" check necessary, see https://github.com/microsoft/vscode/issues/50344
        if (
            this.lastSelectedNode &&
            p_textDocumentChange.contentChanges.length &&
            p_textDocumentChange.document.uri.scheme === Constants.URI_LEO_SCHEME
        ) {

            // * There was a on a Leo Body by the user OR FROM LEO REFRESH FROM FILE
            this._bodyLastChangedDocument = p_textDocumentChange.document;
            this._bodyLastChangedDocumentSaved = false;
            this._editorTouched = true; // To make sure to transfer content to Leo even if all undone
            this._bodyPreviewMode = false;
            let w_hasSameDetachedTab = false;
            const c_id = this.leoStates.leoCommanderId;
            const w_lastSelNodeGnx = this.lastSelectedNode.gnx;


            // CHECK FOR DETACHED THAT MATCHES! 
            for (const p_tabGroup of vscode.window.tabGroups.all) {
                for (const p_tab of p_tabGroup.tabs) {
                    if (p_tab.input &&
                        (p_tab.input as vscode.TabInputText).uri &&
                        (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_DETACHED_SCHEME
                    ) {
                        const [unused, id, gnx] = (p_tab.input as vscode.TabInputText).uri.path.split("/");
                        if (id === c_id && gnx === w_lastSelNodeGnx) {
                            w_hasSameDetachedTab = true;
                            break;
                        }
                    }
                }
                if (w_hasSameDetachedTab) {
                    // console.log('found same DETACHED that MATCHES!');
                    break;
                }
            }

            // * If icon should change then do it now (if there's no document edit pending)
            if (
                utils.leoUriToStr(p_textDocumentChange.document.uri) === this.lastSelectedNode.gnx
            ) {
                const w_bodyText = p_textDocumentChange.document.getText().replace(/\r\n/g, "\n");
                const w_hasBody = !!w_bodyText.length;
                const w_iconChanged = utils.isIconChangedByEdit(this.lastSelectedNode, w_hasBody);

                let w_skipSave = false;

                if (
                    this._changedDetachedWithMirrorBody ||
                    (this._leoFileSystem.lastGnx === this.lastSelectedNode.gnx &&
                        w_bodyText === this._leoFileSystem.lastBodyData)
                ) {
                    // WAS NOT A USER MODIFICATION? (external file change, replace, replace-then-find)
                    // console.log(
                    //     '--------- document changed BODY not user modification ' +
                    //     (this.changedDetachedWithMirrorBody ? " Cleared changedDetachedWithMirrorBody ! " : ""),
                    //     (this._leoFileSystem.lastGnx === this.lastSelectedNode.gnx &&
                    //         w_bodyText === this._leoFileSystem.lastBodyData)
                    // );
                    // Set proper cursor insertion point and selection range.
                    this._changedDetachedWithMirrorBody = undefined;
                    // this._bodySaveDocument(p_textDocumentChange.document);
                    // ALSO check if the icon would change!
                    this.showBody(false, true, true);
                    // this.refreshCommanderDetachedLanguage();
                    // w_skipSave = true;
                    return; // ! TEST WITH / WITHOUT RETURN !

                } else {
                    this._leoFileSystem.lastBodyData = undefined;
                    // console.log('document changed BODY !');
                }

                if (!this.leoStates.leoChanged || w_iconChanged || w_hasSameDetachedTab) {
                    // console.log('need to change icon');

                    if (this.preventIconChange && !w_skipSave) {
                        // TODO : CLEANUP "preventIconChange" IF NOT NEEDED !
                        // this.preventIconChange = false;

                    } else {
                        // this.preventIconChange = false;
                        if (this.lastSelectedNode) {
                            this.lastSelectedNode.dirty = true;
                            this.lastSelectedNode.hasBody = w_hasBody;
                        }

                        let q_save = Promise.resolve(true);
                        if (w_skipSave && w_iconChanged) {
                            q_save = Promise.resolve(true);
                        } else {
                            // Document pane icon needs refresh (changed) and/or outline icon changed
                            q_save = this._bodySaveDocument(p_textDocumentChange.document);
                        }
                        q_save.then(() => {
                            if (w_hasSameDetachedTab && this.lastSelectedNode) {
                                const gnxString = `${c_id}/${w_lastSelNodeGnx}`;
                                if (this._leoDetachedFileSystem.watchedBodiesGnx.includes(gnxString)) {
                                    // console.log("setting changedBodyWithMirrorDetached");
                                    this._changedBodyWithMirrorDetached = gnxString; // PREVENT DOUBLE REFRESH
                                }
                                // console.log('fire refresh of DETACHED');

                                this._leoDetachedFileSystem.fireRefreshFile(gnxString);
                            }
                            if (w_iconChanged) {
                                // NOT incrementing this.treeID to keep ids intact
                                // NoReveal since we're keeping the same id.
                                this._refreshOutline(false, RevealType.NoReveal);
                            }
                        });
                    }
                    this.preventIconChange = false; // SET FALSE AFTER NO MATTER WHAT

                    if (!this.leoStates.leoChanged) {
                        // also refresh document panel (icon may be dirty now)
                        this.leoStates.leoChanged = true;
                        this.refreshDocumentsPane();
                    }
                }
            }

            // * If body changed a line with and '@' directive refresh body states
            let w_needsRefresh = false;
            for (const p_change of p_textDocumentChange.contentChanges) {
                if (p_change.rangeLength || p_change.text.includes('@')) {
                    // There may have been an @
                    w_needsRefresh = true;
                    break;
                }
            }

            const w_textEditor = vscode.window.activeTextEditor;

            if (w_textEditor && p_textDocumentChange.document.uri.fsPath === w_textEditor.document.uri.fsPath) {
                for (const p_selection of w_textEditor.selections) {
                    // TRY TO DETECT IF LANGUAGE RESET NEEDED!
                    if (p_selection.active.line < w_textEditor.document.lineCount) {
                        let w_line = w_textEditor.document.lineAt(p_selection.active.line).text;
                        if (w_line.trim().startsWith('@') || w_line.includes('language') || w_line.includes('wrap') || w_line.includes('killcolor') || w_line.includes('nocolor-node')) {
                            w_needsRefresh = true;
                            break;
                        }
                    }
                }
            }
            if (w_needsRefresh) {
                this.debouncedRefreshBodyStates(Constants.BODY_STATES_DEBOUNCE_DELAY);
                this.refreshCommanderDetachedLanguage();
            }

        }
    }

    /**
     * * Refresh the outline's description (debounced):
     * <branch>: <filename> in <path>
     */
    private _refreshDesc(): void {
        if (this.leoStates.fileOpenedReady) {

            if (this.config.showBranchInOutlineTitle) {
                this.sendAction(
                    Constants.LEOBRIDGE.GET_BRANCH
                ).then(
                    (p_result: LeoBridgePackage) => {
                        let w_branch = "";
                        if (p_result && p_result.branch) {
                            w_branch = p_result.branch + ": ";
                        }

                        if (this._leoTreeView) {
                            this._leoTreeView.description = w_branch + this._titleDesc;
                        }
                        if (this._leoTreeExView) {
                            this._leoTreeExView.description = w_branch + this._titleDesc;
                        }
                    }
                );
            } else {
                if (this._leoTreeView) {
                    this._leoTreeView.description = this._titleDesc;
                }
                if (this._leoTreeExView) {
                    this._leoTreeExView.description = this._titleDesc;
                }
            }

        } else {
            if (this._leoTreeView) {
                this._leoTreeView.description = "";
            }
            if (this._leoTreeExView) {
                this._leoTreeExView.description = "";
            }
        }
    }

    public checkConfirmBeforeClose(): void {
        // Debounced
        if (this._checkConfirmBeforeCloseTimer) {
            clearTimeout(this._checkConfirmBeforeCloseTimer);
        }
        this._checkConfirmBeforeCloseTimer = setTimeout(async () => {
            let hasDirty = false;
            if (this.leoStates.leoBridgeReady) {
                const w_package = await this.sendAction(Constants.LEOBRIDGE.GET_OPENED_FILES);
                if (w_package && w_package.files) {
                    for (const doc of w_package.files) {
                        if (doc.changed) {
                            hasDirty = true;
                        }
                    }
                }
            }
            if (this.config.askForExitConfirmationIfDirty) {
                void this.config.setConfirmBeforeClose(hasDirty);
            }
        }, 150);
    }

    /**
     * * Capture instance for further calls on find panel webview
     * @param p_panel The panel (usually that got the latest onDidReceiveMessage)
     */
    public setFindPanel(p_panel: vscode.WebviewView): void {
        if (p_panel.viewType === Constants.FIND_EXPLORER_ID) {
            // Explorer find panel
            this._lastFindView = this._findPanelWebviewExplorerView;
            this._findPanelWebviewExplorerView = p_panel;
            this._context.subscriptions.push(
                p_panel.onDidChangeVisibility(() =>
                    this._onFindViewVisibilityChanged(true)
                ));
        } else {
            // Leo Pane find panel
            this._findPanelWebviewView = p_panel;
            this._lastFindView = this._findPanelWebviewView;
            this._context.subscriptions.push(
                p_panel.onDidChangeVisibility(() =>
                    this._onFindViewVisibilityChanged(false)
                ));
        }
        this.setGotoContent();
        this.checkForceFindFocus(true);
    }

    /**
     * * Validate headline edit input box if active, or, Save body to the Leo app if its dirty.
     * @param p_forcedVsCodeSave Flag to also have vscode 'save' the content of this editor through the filesystem
     * @returns a promise that resolves when the possible saving process is finished
     */
    public triggerBodySave(p_forcedVsCodeSave?: boolean, p_fromFocusChange?: boolean): Promise<unknown> {

        // * Check if headline edit input box is active. Validate it with current value.
        if (!p_fromFocusChange && this._hib && this._hib.enabled) {
            this._hibInterrupted = true;
            this._hib.enabled = false;
            this._hibLastValue = this._hib.value;
            this._hib.hide();
            if (this._onDidHideResolve) {
                console.error('IN triggerBodySave AND _onDidHideResolve PROMISE ALREADY EXISTS!');
            }
            const w_resolveAfterEditHeadline = new Promise<void>((p_resolve, _p_reject) => {
                this._onDidHideResolve = p_resolve;
            });
            return w_resolveAfterEditHeadline;
        }

        // * Save any 'detached' dirty panels to leo
        for (const doc of vscode.workspace.textDocuments) {
            if (!doc.isClosed && doc.isDirty && doc.uri.scheme === Constants.URI_LEO_DETACHED_SCHEME) {
                void this._bodySaveDocument(doc, p_forcedVsCodeSave);
            }
        }

        // * Save body to Leo if a change has been made to the body 'document' so far
        let q_savePromise: Promise<boolean>;
        if (
            this._bodyLastChangedDocument &&
            (this._bodyLastChangedDocument.isDirty || this._editorTouched) &&
            !this._bodyLastChangedDocumentSaved
        ) {
            // * Is dirty and unsaved, so proper save is in order
            const w_document = this._bodyLastChangedDocument; // backup for bodySaveDocument before reset
            this._bodyLastChangedDocumentSaved = true;
            this._editorTouched = false;
            q_savePromise = this._bodySaveDocument(w_document, p_forcedVsCodeSave);
        } else if (
            p_forcedVsCodeSave &&
            this._bodyLastChangedDocument &&
            this._bodyLastChangedDocument.isDirty &&
            this._bodyLastChangedDocumentSaved
        ) {
            // * Had 'forcedVsCodeSave' and isDirty only, so just clean up dirty VSCODE document flag.
            this._bodyLastChangedDocument.save(); // ! USED INTENTIONALLY: This trims trailing spaces
            q_savePromise = this._bodySaveSelection(); // just save selection if it's changed
        } else {
            this._bodyLastChangedDocumentSaved = true;
            q_savePromise = this._bodySaveSelection();  // just save selection if it's changed
        }
        return q_savePromise.then((p_result) => {
            // this.debouncedRefreshBodyStates(); // ! test this !

            return p_result;
        }, (p_reason) => {
            console.log('BodySave rejected :', p_reason);
            return false;
        });
    }

    /**
     * * Saves the cursor position along with the text selection range and scroll position
     * of the last body, or detached body pane, that had its cursor info set in this._selection, etc.
     * @returns Promise that resolves when the "setSelection" action returns from Leo's side
     */
    private async _bodySaveSelection(): Promise<boolean> {
        if (this._selectionDirty && this._selection) {
            // Prepare scroll data separately
            // ! TEST NEW SCROLL WITH SINGLE LINE NUMBER
            let w_scroll: number;
            if (this._selectionGnx === this._scrollGnx && this._scrollDirty) {
                w_scroll = this._scroll?.start.line || 0;
            } else {
                w_scroll = 0;
            }

            let gnx: string | undefined;
            let id: string = "";

            if (!this._selectionGnx.includes('/')) {
                // leo body
                gnx = this._selectionGnx;
            } else {
                // DETACHED
                [id, gnx] = this._selectionGnx.split('/');

            }

            const w_param: BodySelectionInfo = {
                gnx: gnx,
                scroll: w_scroll,
                insert: {
                    line: this._selection.active.line || 0,
                    col: this._selection.active.character || 0,
                },
                start: {
                    line: this._selection.start.line || 0,
                    col: this._selection.start.character || 0,
                },
                end: {
                    line: this._selection.end.line || 0,
                    col: this._selection.end.character || 0,
                },
            };

            if (id) {
                w_param["commanderId"] = id;
            }

            this._scrollDirty = false;
            this._selectionDirty = false; // don't wait for return of this call

            await this.sendAction(Constants.LEOBRIDGE.SET_SELECTION, w_param);

            return Promise.resolve(true);
        } else {
            return Promise.resolve(true);
        }
    }

    /**
     * * Sets new body text (or detached body) on leo's side, and may optionally save vsCode's body editor (which will trim spaces)
     * @param p_document Vscode's text document which content will be used to be the new node's body text in Leo
     * @param p_forcedVsCodeSave Flag to also have vscode 'save' the content of this editor through the filesystem
     * @returns a promise that resolves when the complete saving process is finished
     */
    private async _bodySaveDocument(
        p_document: vscode.TextDocument,
        p_forcedVsCodeSave?: boolean
    ): Promise<boolean> {

        if (p_document) {

            let id: string = ""; // STARTS FALSY
            let w_gnx: string;

            if (p_document.uri.scheme === Constants.URI_LEO_DETACHED_SCHEME) {
                // detached body
                id = p_document.uri.path.split("/")[1];
                // find commander
                w_gnx = p_document.uri.path.split("/")[2];

            } else {
                // regular body
                w_gnx = utils.leoUriToStr(p_document.uri);
            }

            const w_param: Record<string, string> = {
                gnx: w_gnx,
                body: p_document.getText().replace(/\r\n/g, "\n"),
            };
            if (id) {
                w_param["commanderId"] = id;
            }
            // Don't wait for promise!
            this.sendAction(Constants.LEOBRIDGE.SET_BODY, w_param);

            // await for bodySaveSelection that is placed on the stack right after saving body
            await this._bodySaveSelection();

            if (!id) {
                // if NOT detached
                this._refreshType.states = true;
                this.getStates();
            }

            if (p_forcedVsCodeSave) {
                return p_document.save(); // ! USED INTENTIONALLY: This trims trailing spaces
            }

            return Promise.resolve(p_document.isDirty);
        } else {
            return Promise.resolve(false);
        }
    }

    /**
     * * Sets new body text on leo's side before vscode closes itself if body is dirty
     * @param p_document Vscode's text document which content will be used to be the new node's body text in Leo
     * @returns a promise that resolves when the complete saving process is finished
     */
    private _bodySaveDeactivate(
        p_document: vscode.TextDocument
    ): Promise<LeoBridgePackage> {
        const w_param = {
            gnx: utils.leoUriToStr(p_document.uri),
            body: p_document.getText().replace(/\r\n/g, "\n"),
        };
        return this.sendAction(Constants.LEOBRIDGE.SET_BODY, w_param);
    }

    /**
     * Reveal that queues a follow up to prevent revealing before the last one finished.
     */
    public safeReveal(tree: vscode.TreeView<ArchivedPosition>, element: ArchivedPosition, options?: {
        select?: boolean;
        focus?: boolean;
        expand?: boolean | number;
    }): Thenable<void> {
        if (!this._pendingReveal) {
            // No reveal is currently pending, start the reveal
            this._pendingReveal = this._performReveal(tree, element, options);
            return this._pendingReveal;
        } else {
            // A reveal is already pending, store the parameters for the next reveal
            this._nextRevealParams = { tree, element, options };
            return this._pendingReveal;
        }
    }

    private _performReveal(tree: vscode.TreeView<ArchivedPosition>, element: ArchivedPosition, options?: {
        select?: boolean;
        focus?: boolean;
        expand?: boolean | number;
    }): Thenable<void> {
        return tree.reveal(element, options).then(
            () => this._handleRevealCompletion(),
            (error) => this._handleRevealCompletion(error)
        );
    }

    private _handleRevealCompletion(error?: any): Thenable<void> | void {
        if (this._nextRevealParams) {
            // If there are queued reveal parameters, start the next reveal
            const { tree, element, options } = this._nextRevealParams;
            this._nextRevealParams = undefined;
            this._pendingReveal = this._performReveal(tree, element, options);
            return this._pendingReveal;
        } else {
            // No more reveals are queued, clear the pending reveal
            this._pendingReveal = undefined;
            if (error) {
                // Propagate the error if there was one
                throw error;
            }
        }
    }

    /**
     * * Sets the outline pane top bar string message or refreshes with existing title if no title passed
     * * This includes the '*' asterisk that signifies 'document changed'
     * @param p_title new string to replace the current title
     */
    public setTreeViewTitle(p_title?: string): void {
        if (p_title) {
            this._currentOutlineTitle = p_title;
        }
        // * Set/Change outline pane title e.g. "INTEGRATION", "OUTLINE"
        const w_changed = this.leoStates.fileOpenedReady && this._serverOpenedFileName && this.leoStates.leoChanged ? "*" : "";
        if (this._leoTreeView) {
            this._leoTreeView.title = this._currentOutlineTitle + w_changed;
        }
        if (this._leoTreeExView) {
            this._leoTreeExView.title =
                Constants.GUI.EXPLORER_TREEVIEW_PREFIX + this._currentOutlineTitle + w_changed;
        }
        this.refreshDesc();
    }

    /**
     * * Show the outline, with Leo's selected node also selected, and optionally focussed
     * @param p_focusOutline Flag for focus to be placed in outline
     */
    public async showOutline(p_focusOutline?: boolean): Promise<unknown> {

        this._revealType = RevealType.RevealSelectFocus;
        let q_outline: Thenable<unknown>;

        if (!this.isOutlineVisible()) {
            let w_viewName: string;
            if (this._lastTreeView === this._leoTreeExView) {
                w_viewName = Constants.TREEVIEW_EXPLORER_ID;
            } else {
                w_viewName = Constants.TREEVIEW_ID;
            }
            q_outline = vscode.commands.executeCommand(w_viewName + ".focus");
        } else {
            q_outline = Promise.resolve();
        }
        q_outline.then(() => {
            if (this.lastSelectedNode) {
                return this.safeReveal(this._lastTreeView, this.lastSelectedNode, {
                    select: true,
                    focus: !!p_focusOutline,
                }).then(
                    () => { }, // ok
                    (p_reason) => {
                        console.log('showOutline could not reveal. Reason: ', p_reason);
                    }
                );
            }
            return Promise.resolve();
        });
        return q_outline;
    }

    /**
     * * Refresh tree for 'node hover icons' to show up properly after changing their settings
     */
    public configTreeRefresh(): void {
        this._leoTreeProvider.setInvertFlag(this.config.invertNodeContrast);
        if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
            this._preventShowBody = true;
            this._refreshOutline(true, RevealType.RevealSelect);
        }
    }

    /**
     * * Setup global refresh options
     * @param p_finalFocus final focus placement
     * @param p_refreshType Refresh flags for each UI part
     * @param p_node The AP node to be refreshed if refresh type 'node' only is set
     */
    public setupRefresh(p_finalFocus: Focus, p_refreshType: ReqRefresh, p_node?: ArchivedPosition, p_preserveRange?: boolean): void {
        if (p_preserveRange) {
            this.refreshPreserveRange = true; // Will be cleared after a refresh cycle.
        }
        // Set final "focus-placement" EITHER true or false
        this.finalFocus = p_finalFocus;
        // Set all properties WITHOUT clearing others.
        Object.assign(this._refreshType, p_refreshType);
        if (p_node) {
            this._refreshNode = p_node;
        } else {
            this._refreshNode = undefined;
        }
    }

    /**
     * * Launches refresh for UI components: treeviews, body, and context states
     */
    private async _launchRefresh(): Promise<unknown> {

        this._refreshDetachedBodies();

        if (this._lastCommandFindEndOutline) {
            this._lastCommandFindEndOutline--; // decrement from 2 to 1 the first time, keeping the flag for 1 refresh.
        }

        if (!this.refreshPreserveRange) {
            if (this.findFocusTree) {
                // had a range but now refresh from other than find/replace
                // So make sure tree is also refreshed.
                this._refreshType.tree = true;
            }
            // Clear no matter what.
            this.findFocusTree = false;
        } else {
            this.refreshPreserveRange = false; // preserved once, now cleared.
        }

        // check states for having at least a document opened
        if (!this.serverHasOpenedFile && this.leoStates.leoBridgeReady && this.leoStates.fileOpenedReady) {
            return this._setupNoOpenedLeoDocument(); // Had some opened but all closed now!
        }
        if (this.serverHasOpenedFile && this.leoStates.leoBridgeReady && !this.leoStates.fileOpenedReady) {
            this._setupOpenedLeoDocument(); // Was all closed but has some opened now!
            await this.leoStates.qLastContextChange; // Has a commander opened, but wait for UI!
        }

        let w_revealType: RevealType;
        if (this.finalFocus.valueOf() === Focus.Outline) {
            w_revealType = RevealType.RevealSelectFocus;
        } else {
            w_revealType = RevealType.RevealSelect;
        }

        if (
            this._refreshNode &&
            this._refreshType.body &&
            this._bodyLastChangedDocument &&
            this._bodyLastChangedDocument.isDirty
        ) {
            // When this refresh is launched with 'refresh body' requested, we need to lose any pending edits and save on vscode's side.
            // Do this only if gnx is different from what is coming from Leo in this refresh cycle.
            const w_lastChangedDocGnx = utils.leoUriToStr(this._bodyLastChangedDocument.uri);
            if (
                this._refreshNode.gnx !== w_lastChangedDocGnx && !this._bodyLastChangedDocumentSaved
            ) {
                this._bodyLastChangedDocument.save(); // Voluntarily save to 'clean' any pending body (no await)
                this._bodyLastChangedDocumentSaved = true;
            }
            if (this._refreshNode.gnx === w_lastChangedDocGnx) {
                this._leoFileSystem.preventSaveToLeo = true;
                await this._bodyLastChangedDocument.save(); // SAME GNX : so wait for it! (await)
            }
        }

        // * _focusInterrupt insertNode Override
        if (this._focusInterrupt) {
            // this._focusInterrupt = false; // TODO : Test if reverting this in _gotSelection is 'ok'
            w_revealType = RevealType.RevealSelect;
        }

        const w_showBodyNoFocus: boolean = this.finalFocus.valueOf() !== Focus.Body;

        // * Force refresh tree when body update required for 'navigation/insert node' commands
        if (
            this.showBodyIfClosed &&
            this.showOutlineIfClosed &&
            !this.isOutlineVisible() &&
            this._refreshType.body
        ) {
            // console.log('HAD TO ADJUST!');
            this._refreshType.tree = true;
        }

        // * Either the whole tree refreshes, or a single tree node is revealed when just navigating
        if (this._refreshType.tree) {
            this._refreshType.tree = false;
            this._refreshType.node = false; // Also clears node
            if (!this.isOutlineVisible() && !this.showOutlineIfClosed && this._refreshType.body) {
                // wont get 'gotSelectedNode so show body!
                this._refreshType.body = false;
                this._tryApplyNodeToBody(this._refreshNode || this.serverOpenedNode || this.lastSelectedNode!, false, w_showBodyNoFocus);
            }
            this._refreshOutline(true, w_revealType);
        } else if (this._refreshType.node && this._refreshNode) {
            // * Force single node "refresh" by revealing it, instead of "refreshing" it
            this._refreshType.node = false;
            this.leoStates.setSelectedNodeFlags(this._refreshNode);
            let w_showOutline = this.isOutlineVisible();
            if (!this.isOutlineVisible() && this.showOutlineIfClosed) {
                this.showOutlineIfClosed = false;
                w_showOutline = true;
            }
            this._revealNode(
                this._refreshNode,
                {
                    select: true,
                    focus: w_showOutline
                }
            );
            if (this._refreshType.body) {
                // * if no outline visible, just update body pane as needed
                if (!this.isOutlineVisible()) {
                    this._refreshType.body = false;
                    this._tryApplyNodeToBody(this._refreshNode, false, w_showBodyNoFocus);
                }
            }
        } else if (this._refreshType.body) {
            this._refreshType.body = false;
            this._tryApplyNodeToBody(this._refreshNode || this.serverOpenedNode || this.lastSelectedNode!, false, w_showBodyNoFocus);
        }
        return this.getStates();
    }

    /**
     * * Adds 'do nothing' to the frontend stack and refreshes all parts.
     * @returns Promise back from command's execution, if added on stack, undefined otherwise.
     */
    public fullRefresh(): Promise<LeoBridgePackage> | undefined {
        const w_command: UserCommand = {
            action: Constants.LEOBRIDGE.DO_NOTHING,
            finalFocus: this.finalFocus,
            refreshType: {
                tree: true,
                body: true,
                documents: true,
                buttons: true,
                states: true,
            }
        };
        const q_result = this._commandStack.add(w_command);

        if (q_result) {
            q_result.then((p_doNothingPackage) => {
                if (p_doNothingPackage.commander) {
                    p_doNothingPackage.filename = p_doNothingPackage.commander.fileName;
                    this.serverOpenedFileName = p_doNothingPackage.filename;
                    this.serverOpenedNode = p_doNothingPackage.node!;
                }
            });
        }

        return q_result;
    }

    private _refreshDetachedBodies() {
        //  Refresh detached bodies as needed IF SAME COMMANDER, AND CLOSE : 
        if (!this.leoStates.fileOpenedReady) {
            this._refreshType.excludeDetached = false;
            return;
        }

        const c_id = this.leoStates.leoCommanderId;
        const q_foundResults: Array<Promise<LeoBridgePackage>> = [];
        const w_sentFoundTabs: Array<vscode.Tab> = [];
        const w_sentFoundUri: Array<vscode.Uri> = [];
        let w_hasDetached = false;

        for (const p_tabGroup of vscode.window.tabGroups.all) {
            for (const p_tab of p_tabGroup.tabs) {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_DETACHED_SCHEME
                ) {
                    const w_uri = (p_tab.input as vscode.TabInputText).uri;
                    const [unused, id, gnx] = w_uri.path.split("/");

                    if (id === c_id) {
                        w_hasDetached = true;
                    }

                    // Refresh detached bodies if same commander  // ! ALSO FIRE REFRESH !
                    if (!this._refreshType.excludeDetached && this._refreshType.body && id === c_id) {
                        // console.log('fire refresh DETACHED in _refreshDetachedBodies');
                        this._leoDetachedFileSystem.fireRefreshFile(`${id}/${gnx}`);
                    }

                    // if refresh tree is true, validate that opened detached of same commander still valid and close as needed.
                    if (this._refreshType.tree && id === c_id && !this._refreshType.documents) {
                        const w_foundVnode = this._leoDetachedFileSystem.openedBodiesVNodes[utils.leoUriToStr(w_uri)];
                        if (w_foundVnode) {
                            w_sentFoundTabs.push(p_tab);
                            w_sentFoundUri.push(w_uri);
                            q_foundResults.push(
                                this.sendAction(
                                    Constants.LEOBRIDGE.GET_IS_VALID,
                                    utils.buildNodeCommand(w_foundVnode) // No need to specify commander
                                )
                            );
                        }
                    } else if (this._refreshType.documents) {
                        const w_foundVnode = this._leoDetachedFileSystem.openedBodiesVNodes[utils.leoUriToStr(w_uri)];
                        if (w_foundVnode) {
                            const param = utils.buildNodeCommand(w_foundVnode);
                            param["commanderId"] = id;
                            w_sentFoundTabs.push(p_tab);
                            w_sentFoundUri.push(w_uri);
                            q_foundResults.push(
                                this.sendAction(
                                    Constants.LEOBRIDGE.GET_IS_VALID,
                                    param
                                )
                            );
                        }

                    }

                }

            }
        }
        if (w_hasDetached && this._refreshType.tree) {
            this.refreshCommanderDetachedLanguage(); // May have moved outside of language specific outline
        }
        this._refreshType.excludeDetached = false;

        if (q_foundResults.length) {

            return Promise.all(q_foundResults).then((p_results) => {
                const w_foundTabs: Set<vscode.Tab> = new Set();
                const w_foundUri: Set<vscode.Uri> = new Set();

                let w_resultIndex = 0;
                for (const w_res of p_results) {
                    if (!w_res.valid) {
                        w_foundTabs.add(w_sentFoundTabs[w_resultIndex]);
                        w_foundUri.add(w_sentFoundUri[w_resultIndex]);
                    }
                    w_resultIndex = w_resultIndex + 1;
                }

                if (w_foundTabs.size) {
                    void vscode.window.tabGroups.close([...w_foundTabs], true);
                    for (const w_uri of w_foundUri) {
                        void vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', w_uri);
                    }
                }
            });
        }

    }

    public showNavResults(): Thenable<unknown> {
        this.leoGotoProvider.refreshTreeRoot();
        return this.showGotoPane({ preserveFocus: true }); // show but dont change focus
    }

    /**
     * * Checks timestamp only, if is still the latest lastReceivedNode
      * @param ts timestamp of last time
     */
    public isTsStillValid(ts: number): boolean {

        if (
            this._commandStack.lastReceivedNode &&
            this._commandStack.lastReceivedNodeTS > ts &&
            (this._commandStack.finalRefreshType.tree || this._commandStack.finalRefreshType.node)
        ) {
            // new commandStack lastReceivedNode, is different and newer and tree/node has to refresh
            return false;
        }
        // also test other sources ,and check if command also not started to go back to original gnx
        // by checking if the test above only failed for gnx being the same
        if (
            this._refreshNode &&
            this._lastRefreshNodeTS > ts &&
            this._lastRefreshNodeTS < this._lastSelectedNodeTS
        ) {
            // new _refreshNode is different and newer
            return false;
        }
        if (
            this.lastSelectedNode &&
            this._lastSelectedNodeTS > ts &&
            this._lastRefreshNodeTS < this._lastSelectedNodeTS &&
            this._commandStack.lastReceivedNodeTS < this._lastSelectedNodeTS
        ) {
            // new lastSelectedNode is different and newer
            return false;
        }
        return true;
    }

    /**
     * * Checks if gnx for body is still the latest lastReceivedNode gnx
     * TODO : MAYBE NOT REQUIRED ?
     * @param gnx node identity to check
     * @param ts timestamp of last time that this gnx was set as the body
     */
    public isGnxStillValid(gnx: string, ts: number): boolean {

        if (
            this._commandStack.lastReceivedNode &&
            this._commandStack.lastReceivedNode.gnx !== gnx &&
            this._commandStack.lastReceivedNodeTS > ts &&
            (this._commandStack.finalRefreshType.tree || this._commandStack.finalRefreshType.node)
        ) {
            // new commandStack lastReceivedNode, is different and newer and tree/node has to refresh
            return false;
        }
        // also test other sources ,and check if command also not started to go back to original gnx
        // by checking if the test above only failed for gnx being the same
        if (
            this._refreshNode &&
            this._refreshNode.gnx !== gnx &&
            this._lastRefreshNodeTS > ts &&
            this._lastRefreshNodeTS < this._lastSelectedNodeTS
        ) {
            // new _refreshNode is different and newer
            return false;
        }
        if (
            this.lastSelectedNode &&
            this.lastSelectedNode.gnx !== gnx &&
            this._lastSelectedNodeTS > ts &&
            this._lastRefreshNodeTS < this._lastSelectedNodeTS &&
            this._commandStack.lastReceivedNodeTS < this._lastSelectedNodeTS
        ) {
            // new lastSelectedNode is different and newer
            return false;
        }
        return true;
    }

    /**
     * * Checks if gnx is the same but at a later timestamp
     * TODO : MAYBE NOT REQUIRED ?
     * @param gnx node identity to check
     * @param ts timestamp limit
     */
    public isGnxReselected(gnx: string, ts: number): boolean {

        if (
            this._commandStack.lastReceivedNode &&
            this._commandStack.lastReceivedNode.gnx === gnx &&
            this._commandStack.lastReceivedNodeTS > ts &&
            (this._commandStack.finalRefreshType.tree || this._commandStack.finalRefreshType.node)
        ) {
            // new commandStack lastReceivedNode, is different and newer and tree/node has to refresh
            return true;
        }
        // also test other sources
        if (
            this._refreshNode &&
            this._refreshNode.gnx === gnx &&
            this._lastRefreshNodeTS > ts
        ) {
            // new _refreshNode is different and newer
            return true;
        }
        if (
            this.lastSelectedNode &&
            this.lastSelectedNode.gnx !== gnx &&
            this._lastSelectedNodeTS > ts
        ) {
            // new lastSelectedNode is different and newer
            return true;
        }
        return false;
    }

    /**
     * * Refreshes the outline. A reveal type can be passed along for selected node.
     * @param p_incrementTreeID Flag meaning for the _treeId counter to be incremented
     * @param p_revealType Facultative reveal type to specify type of reveal when the 'selected node' is encountered
     */
    private _refreshOutline(p_incrementTreeID: boolean, p_revealType?: RevealType): void {

        if (p_incrementTreeID) {
            this._leoTreeProvider.incTreeId();
        }
        if (p_revealType !== undefined && p_revealType.valueOf() >= this._revealType.valueOf()) {
            // To check if selected node should self-select while redrawing whole tree
            this._revealType = p_revealType; // To be read/cleared (in arrayToLeoNodesArray instead of directly by nodes)
        }
        try {
            if (!this.isOutlineVisible() && this.showOutlineIfClosed) {
                this.showOutlineIfClosed = false;
                // Force showing last used Leo outline first
                let w_viewName: string;
                if (this._lastTreeView === this._leoTreeExView) {
                    w_viewName = Constants.TREEVIEW_EXPLORER_ID;
                } else {
                    w_viewName = Constants.TREEVIEW_ID;
                }
                vscode.commands.executeCommand(w_viewName + ".focus").then(
                    () => {
                        this._revealNodeRetriedRefreshOutline = false;
                        this._leoTreeProvider.refreshTreeRoot();
                    },
                    (p_reason) => {
                        // Reveal failed: retry once.
                        console.log('_refreshOutline could not reveal. Rejected reason: ', p_reason);
                        this._leoTreeProvider.refreshTreeRoot();
                    }
                );

            } else {
                this.showOutlineIfClosed = false;
                // was visible, just refresh
                this._leoTreeProvider.refreshTreeRoot();
            }
        } catch (error) {
            // Also retry once on error
            console.log('_refreshOutline could not reveal. Catch Error: ', error);
            this._leoTreeProvider.refreshTreeRoot();
        }
    }

    /**
     * * 'TreeView.reveal' for any opened leo outline that is currently visible
     * @param p_leoNode The node to be revealed
     * @param p_options Options object for the revealed node to either also select it, focus it, and expand it
     * @returns Thenable from the reveal tree node action, resolves directly if no tree visible
     */
    private _revealNode(
        p_leoNode: ArchivedPosition,
        p_options?: { select?: boolean; focus?: boolean; expand?: boolean | number }
    ): void {
        let w_treeview: vscode.TreeView<ArchivedPosition> | undefined;
        if (this._leoTreeView.visible) {
            w_treeview = this._leoTreeView;
        }
        if (this._leoTreeExView.visible && this.config.treeInExplorer && !vscode.workspace.getConfiguration('leojs').get('treeInExplorer', false)) {
            w_treeview = this._leoTreeExView;
        }
        if (!w_treeview && (this.showOutlineIfClosed || (p_options && p_options.focus))) {
            this.showOutlineIfClosed = false;
            w_treeview = this._lastTreeView;
            if (p_options) {
                p_options.focus = true;
            } else {
                p_options = {
                    focus: true,
                    select: true
                };
            }
        }
        try {
            if (w_treeview) {
                this.safeReveal(w_treeview, p_leoNode, p_options).then(
                    () => {
                        // ok
                        this._revealNodeRetriedRefreshOutline = false;
                    },
                    (p_reason) => {
                        console.log('_revealNode could not reveal. Reason: ', p_reason);

                        if (!this._revealNodeRetriedRefreshOutline) {
                            this._revealNodeRetriedRefreshOutline = true;
                            // Reveal failed. Retry refreshOutline once
                            this._refreshOutline(true, RevealType.RevealSelect);
                        }
                    }
                );
            }

        } catch (p_error) {
            console.error("_revealNode error: ", p_error);
            // Retry refreshOutline once
            if (!this._revealNodeRetriedRefreshOutline) {
                this._revealNodeRetriedRefreshOutline = true;
                // Reveal failed. Retry refreshOutline once
                this._refreshOutline(true, RevealType.RevealSelect);
            }
        }
    }

    /**
     * * Handle the selected node that was reached while converting received ap_nodes.
     * @param p_element The "selected" ArchivedPosition element reached.
     */
    public gotSelectedNode(p_element: ArchivedPosition): void {

        const w_focusTree = (this._revealType.valueOf() >= RevealType.RevealSelectFocus.valueOf());
        const w_last = this.lastSelectedNode;

        if (
            !w_focusTree &&
            this._refreshType.scroll &&
            w_last &&
            utils.isApEqual(w_last, p_element) &&
            this._lastTreeView &&
            this._lastTreeView.visible

        ) {
            this.safeReveal(this._lastTreeView, p_element, {
                select: true,
                focus: false
            }).then(
                () => {
                    //ok
                },
                () => {
                    // 
                    console.log('gotSelectedNode scroll mode reveal error catched');
                }
            );
            // ! MINIMAL TIMEOUT REQUIRED ! WHY ?? (works so leave)
            if (this._gotSelectedNodeBodyTimer) {
                clearTimeout(this._gotSelectedNodeBodyTimer);
            }
            this._gotSelectedNodeBodyTimer = setTimeout(() => {
                this.showBody(false, this.finalFocus.valueOf() !== Focus.Body); // SAME with scroll information specified
            }, 25);
        } else {

            if (this._revealType) {
                if (this._gotSelectedNodeRevealTimer) {
                    clearTimeout(this._gotSelectedNodeRevealTimer);
                }
                this._gotSelectedNodeRevealTimer = setTimeout(() => {
                    this.safeReveal(this._lastTreeView, p_element, {
                        select: true,
                        focus: w_focusTree
                    }).then(() => {
                        // ok
                    }, (_p_reason) => {
                        // Reveal failed. Retry refreshOutline once
                        this._refreshOutline(true, RevealType.RevealSelect);
                    });
                    // Done, so reset reveal type 'flag'
                    this._revealType = RevealType.NoReveal;
                }, 0);
            }

            // Apply node to body pane
            let w_showBodyNoFocus: boolean = this.finalFocus.valueOf() !== Focus.Body; // Will preserve focus where it is without forcing into the body pane if true
            if (this._focusInterrupt) {
                this._focusInterrupt = false;
                w_showBodyNoFocus = true;
            }
            if (!w_last || this._needLastSelectedRefresh) {
                // lastSelectedNode will be set in _tryApplyNodeToBody !
                this._needLastSelectedRefresh = false;
            }

            if (this._bodyTextDocument &&
                !this._bodyTextDocument.isClosed && // IS OPENED
                !this._refreshType.body && // NO NEED TO REFRESH BODY !
                this._locateOpenedBody(p_element.gnx) // DID LOCATE NEW GNX => ALREADY SHOWN!
            ) {
                // * Just make sure body selection is considered done.
                this.lastSelectedNode = p_element; // Set the 'lastSelectedNode' this will also set the 'marked' node context
                this._commandStack.newSelection(); // Signal that a new selected node was reached and to stop using the received selection as target for next command
                this._preventShowBody = false; // in case it was a config-changed-refresh
            } else {
                // * Actually run the normal 'APPLY NODE TO BODY' to show or switch
                this._tryApplyNodeToBody(p_element, false, w_showBodyNoFocus);
            }

            // Set context flags
            this.leoStates.setSelectedNodeFlags(p_element);
        }

    }

    /**
     * * Public method exposed as 'refreshDocumentsPane' setter/getter to refresh the documents pane
     * Document Panel May be refreshed by other services (states service, ...)
     */
    private _refreshDocumentsPane(): void {
        this._leoDocumentsProvider.refreshTreeRoot();
        this.checkConfirmBeforeClose();
    }

    /**
     * * Public method exposed as 'refreshButtonsPane' setter/getter to refresh the buttons pane
     * Buttons Panel May be refreshed by other services (states service, ...)
     */
    private _refreshButtonsPane(): void {
        this._leoButtonsProvider.refreshTreeRoot();
    }

    /**
     * * Public method exposed as 'refreshGotoPane' setter/getter to refresh the Goto pane
     * Goto Panel May be refreshed by other services (states service, ...)
     */
    private _refreshGotoPane(): void {
        this.leoGotoProvider.refreshTreeRoot();
    }

    /**
     * * Refreshes the undo pane
     * Goto Panel May be refreshed by other services (states service, ...)
     */
    private _refreshUndoPane(): void {
        this._leoUndosProvider.refreshTreeRoot();
    }

    /**
     * * Makes sure the body now reflects the selected node.
     * This is called after 'selectTreeNode', or after '_gotSelection' when refreshing.
     * @param p_node Node that was just selected
     * @param p_aside Flag to indicate opening 'Aside' was required
     * @param p_preventTakingFocus Flag used to keep focus where it was instead of forcing in body
     * @returns a text editor of the p_node parameter's gnx (As 'leo' file scheme). Or rejects if interrupted.
     */
    private _tryApplyNodeToBody(
        p_node: ArchivedPosition,
        p_aside: boolean,
        p_preventTakingFocus: boolean,
    ): Thenable<void | vscode.TextEditor> {

        this.lastSelectedNode = p_node; // Set the 'lastSelectedNode' this will also set the 'marked' node context
        this._commandStack.newSelection(); // Signal that a new selected node was reached and to stop using the received selection as target for next command

        if (this._bodyTextDocument) {
            // if not first time and still opened - also not somewhat exactly opened somewhere.
            if (
                !this._bodyTextDocument.isClosed &&
                !this._locateOpenedBody(p_node.gnx) // COULD NOT LOCATE NEW GNX
            ) {
                // if needs switching by actually having different gnx
                if (utils.leoUriToStr(this.bodyUri) !== p_node.gnx) {
                    // * LOCATE OLD GNX FOR PROPER COLUMN
                    this._locateOpenedBody(utils.leoUriToStr(this.bodyUri));
                    // Make sure any pending changes in old body are applied before switching
                    return this._bodyTextDocument.save().then(() => {
                        return this._switchBody(p_aside, p_preventTakingFocus);
                    });
                }
            }
        }
        // first time or no body opened
        this.bodyUri = utils.strToLeoUri(p_node.gnx);
        if (this._isBodyVisible() === 0 && !this.showBodyIfClosed) {
            return Promise.resolve();
        }
        return this.showBody(p_aside, p_preventTakingFocus);
    }

    /**
     * * Close body pane document and change the bodyUri to this.lastSelectedNode's gnx
     * This blocks 'undos' from crossing over
     * @param p_aside From 'Open Aside'.
     * @param p_preventTakingFocus prevents forcing focus on text body.
     */
    private _switchBody(
        p_aside: boolean,
        p_preventTakingFocus?: boolean
    ): Thenable<void | vscode.TextEditor> {
        const w_oldUri: vscode.Uri = this.bodyUri;
        const w_newUri: vscode.Uri = utils.strToLeoUri(this.lastSelectedNode!.gnx);
        const w_newTS = performance.now();
        const w_visibleCount = this._isBodyVisible();

        this.bodyUri = w_newUri; // New GLOBAL BODY URI

        if (w_visibleCount === 0 && !this.showBodyIfClosed) {
            return Promise.resolve();
        }

        if (w_visibleCount === 1) {
            this._bodyPreviewMode = this._isBodyPreview(); // recheck in case user double clicked on title
        }

        if (this.lastSelectedNode && this._bodyPreviewMode && this._bodyEnablePreview && w_visibleCount < 2) {

            // just show in same column and delete after
            const q_showBody = this.showBody(p_aside, p_preventTakingFocus);

            if (w_oldUri.fsPath !== this.bodyUri.fsPath) {
                q_showBody.then(() => {
                    const w_tabsToCloseFound: vscode.Tab[] = [];
                    let q_lastSecondSaveFound: Thenable<boolean> = Promise.resolve(true);
                    vscode.window.tabGroups.all.forEach((p_tabGroup) => {
                        p_tabGroup.tabs.forEach((p_tab) => {
                            if (p_tab.input &&
                                (p_tab.input as vscode.TabInputText).uri &&
                                (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_SCHEME &&
                                (p_tab.input as vscode.TabInputText).uri.fsPath === w_oldUri.fsPath
                            ) {
                                // Make sure it's saved AGAIN!!
                                if (
                                    p_tab.isDirty &&
                                    this._bodyLastChangedDocument &&
                                    (p_tab.input as vscode.TabInputText).uri.fsPath === this._bodyLastChangedDocument.uri.fsPath
                                ) {
                                    // console.log('LAST SECOND SAVE1!');
                                    this._leoFileSystem.preventSaveToLeo = true;
                                    this._editorTouched = false;
                                    q_lastSecondSaveFound = this._bodyLastChangedDocument.save();
                                }
                                w_tabsToCloseFound.push(p_tab);
                            }
                        });
                    });
                    if (w_tabsToCloseFound.length) {
                        q_lastSecondSaveFound.then(() => {
                            vscode.window.tabGroups.close(w_tabsToCloseFound, true);
                        });
                    }
                    // Remove from potential 'recently opened'
                    vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', w_oldUri);

                });
            }
            return q_showBody;
        } else {
            // Close ALL LEO EDITORS first !
            const w_tabsToCloseAll: vscode.Tab[] = [];
            let q_lastSecondSaveAll: Thenable<boolean> = Promise.resolve(true);

            vscode.window.tabGroups.all.forEach((p_tabGroup) => {
                p_tabGroup.tabs.forEach((p_tab) => {
                    if (p_tab.input &&
                        (p_tab.input as vscode.TabInputText).uri &&
                        (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_SCHEME &&
                        w_newUri.fsPath !== (p_tab.input as vscode.TabInputText).uri.fsPath // Maybe useless to check if different!
                    ) {

                        if (
                            p_tab.isDirty &&
                            this._bodyLastChangedDocument &&
                            (p_tab.input as vscode.TabInputText).uri.fsPath === this._bodyLastChangedDocument.uri.fsPath
                        ) {
                            // console.log('LAST SECOND SAVE2!');
                            this._leoFileSystem.preventSaveToLeo = true;
                            this._editorTouched = false;
                            q_lastSecondSaveAll = this._bodyLastChangedDocument.save();
                        }

                        w_tabsToCloseAll.push(p_tab);
                    }
                });
            });

            let q_closeAll: Thenable<unknown>;
            if (w_tabsToCloseAll.length) {
                q_closeAll = q_lastSecondSaveAll.then(() => {
                    return vscode.window.tabGroups.close(w_tabsToCloseAll, true);
                });

            } else {
                q_closeAll = Promise.resolve();
            }

            // async, so don't wait for this to finish
            if (w_oldUri.fsPath !== w_newUri.fsPath) {
                vscode.commands.executeCommand(
                    'vscode.removeFromRecentlyOpened',
                    w_oldUri
                );
            }

            return q_closeAll.then(() => {
                this._bodyPreviewMode = true;
                // * CHECK ALL 3 POSSIBLE NEW PLACES FOR BODY SWITCH AFTER q_bodyStates & q_showTextDocument
                if (
                    // Should the gnx be relevant?  !this.isGnxStillValid(w_newGnx, w_newTS)
                    !this.isTsStillValid(w_newTS)
                ) {
                    return;
                }
                return this.showBody(p_aside, p_preventTakingFocus);
            });
        }
    }

    /**
     * * Sets globals if the current body is found opened in an editor panel for a particular gnx
     * @param p_gnx gnx to match
     * @returns true if located and found, false otherwise
     */
    private _locateOpenedBody(p_gnx: string): boolean {
        let w_found = false;
        vscode.window.tabGroups.all.forEach((p_tabGroup) => {
            p_tabGroup.tabs.forEach((p_tab) => {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_SCHEME &&
                    utils.leoUriToStr((p_tab.input as vscode.TabInputText).uri) === p_gnx
                ) {
                    vscode.workspace.textDocuments.forEach((p_textDocument) => {
                        if (
                            utils.leoUriToStr(p_textDocument.uri) === p_gnx
                        ) {
                            w_found = true;
                            this._bodyTextDocument = p_textDocument; // vscode.workspace.openTextDocument
                            this._bodyMainSelectionColumn = p_tab.group.viewColumn;
                        }
                    });
                }
            });
        });
        return w_found;
    }

    /**
     * * Checks for all tabs if any are 'leoBody' scheme
     * @returns total found
     */
    private _isBodyVisible(): number {
        let w_total = 0;
        vscode.window.tabGroups.all.forEach((p_tabGroup) => {
            p_tabGroup.tabs.forEach((p_tab) => {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_SCHEME
                ) {
                    w_total++;
                }
            });
        });
        return w_total;
    }

    /**
     * * Checks for all tabs if any are 'leoBody' scheme
     * @returns total found
     */
    private _isBodyPreview(): boolean {
        let w_isPreview: boolean = true;
        let w_found: boolean = false;
        vscode.window.tabGroups.all.forEach((p_tabGroup) => {
            p_tabGroup.tabs.forEach((p_tab) => {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_SCHEME
                ) {
                    w_found = true;
                    if (!p_tab.isPreview) {
                        w_isPreview = false;
                    }
                }
            });
        });
        if (w_found) {
            return w_isPreview;
        } else {
            return false;
        }
    }

    private _checkClosedTabs(): void {
        // check if selected body still has opened textEditors
        let bodyCount = 0;
        for (const p_tabGroup of vscode.window.tabGroups.all) {
            for (const p_tab of p_tabGroup.tabs) {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    ((p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_SCHEME)
                ) {
                    // a normal body (non detached found)
                    bodyCount++;
                    break;
                }
            }
            if (bodyCount) {
                break;
            }
        }
        if (!bodyCount) {
            // Make sure no more saving over possible detached with same gnx
            this._bodyLastChangedDocument = undefined;
            this._bodyLastChangedDocumentSaved = false;
        }
        this._leoFileSystem.cleanupBodies();
        this._leoDetachedFileSystem.cleanupDetachedBodies();
    }

    /**
     * * Checks if outline is visible
     * @returns true if either outline is visible
     */
    public isOutlineVisible(): boolean {
        return this._leoTreeExView.visible || this._leoTreeView.visible;
    }

    /**
     * Close all tabs that are not part of their filesystems
     * * This matches cleanupDetachedBodies from leoBodyDetached !
     */
    private _hideBodiesUnknownToFileSys(p_editors: readonly vscode.TextEditor[]): void {
        p_editors.forEach((p_editor) => {
            if (p_editor) {
                switch (p_editor.document.uri.scheme) {
                    case Constants.URI_LEO_SCHEME:
                        if (this.bodyUri.fsPath !== p_editor.document.uri.fsPath) {
                            void this._hideDeleteBody(p_editor);
                        }
                        this._checkPreviewMode(p_editor);
                        break;

                    case Constants.URI_LEO_DETACHED_SCHEME:
                        const w_gnx = utils.leoUriToStr(p_editor.document.uri);
                        //if (!this._leoDetachedFileSystem.watchedBodiesGnx.includes(w_gnx)) {
                        if (!this._leoDetachedFileSystem.openedBodiesVNodes[w_gnx]) {
                            // unknown to the detached filesystem
                            void this._hideDeleteBody(p_editor);
                        }
                        break;

                    default:
                        break;
                }

            }

        });
    }

    /**
     * * Closes non-existing text-editor body if it doesn't match bodyUri
     * @param p_textEditor the editor to close
     * @returns promise that resolves to true if it closed tabs, false if none were found
     */
    private _hideDeleteBody(p_textEditor: vscode.TextEditor): void {
        const w_foundTabs: vscode.Tab[] = [];
        const w_editorFsPath = p_textEditor.document.uri.fsPath;
        vscode.window.tabGroups.all.forEach((p_tabGroup) => {
            p_tabGroup.tabs.forEach((p_tab) => {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    (p_tab.input as vscode.TabInputText).uri.scheme.startsWith(Constants.URI_LEO_SCHEME) &&
                    (p_tab.input as vscode.TabInputText).uri.fsPath === w_editorFsPath
                ) {
                    w_foundTabs.push(p_tab);
                }
            });
        });

        // * Make sure the closed/deleted body is not remembered as vscode's recent files!
        vscode.commands.executeCommand(
            'vscode.removeFromRecentlyOpened',
            p_textEditor.document.uri
        );

        if (w_foundTabs.length) {
            vscode.window.tabGroups.close(w_foundTabs, true);
            return;
        }

        return;
    }

    /**
     * * Clears the global 'Preview Mode' flag if the given editor is not in the main body column
     * @param p_editor is the editor to check for is in the same column as the main one
     */
    private _checkPreviewMode(p_editor: vscode.TextEditor): void {
        // if selected gnx but in another column
        if (
            p_editor.document.uri.scheme === Constants.URI_LEO_SCHEME &&
            p_editor.document.uri.fsPath === this.bodyUri.fsPath &&
            p_editor.viewColumn !== this._bodyMainSelectionColumn
        ) {
            this._bodyPreviewMode = false;
            this._bodyMainSelectionColumn = p_editor.viewColumn;
        }
    }


    /**
     * * Closes any body pane opened in this vscode window instance
     * @returns a promise that resolves when the file is closed and removed from recently opened list
     */
    public closeBody(): Thenable<any> {

        const w_foundTabs: vscode.Tab[] = [];
        vscode.window.tabGroups.all.forEach((p_tabGroup) => {
            p_tabGroup.tabs.forEach((p_tab) => {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_SCHEME
                ) {
                    w_foundTabs.push(p_tab);
                }
            });
        });

        let q_closedTabs;
        if (w_foundTabs.length) {
            q_closedTabs = vscode.window.tabGroups.close(w_foundTabs, true);
            w_foundTabs.forEach((p_tab) => {
                if (p_tab.input) {

                    vscode.commands.executeCommand(
                        'vscode.removeFromRecentlyOpened',
                        (p_tab.input as vscode.TabInputText).uri
                    );
                    // Delete to close all other body tabs.
                    // (w_oldUri will be deleted last below)
                    const w_edit = new vscode.WorkspaceEdit();
                    w_edit.deleteFile((p_tab.input as vscode.TabInputText).uri, { ignoreIfNotExists: true });
                    vscode.workspace.applyEdit(w_edit);
                }
            });
        } else {
            q_closedTabs = Promise.resolve(true);

        }

        let q_closedBody;
        if (this.bodyUri) {
            q_closedBody = vscode.commands.executeCommand(
                'vscode.removeFromRecentlyOpened',
                this.bodyUri
            );
        } else {
            q_closedBody = Promise.resolve(true);
        }

        return Promise.all([q_closedTabs, q_closedBody]);
    }

    /**
     * * cleanupBody closes all remaining body pane to shut down this vscode window
     * @returns a promise that resolves when done saving and closing
     */
    public cleanupBody(): Thenable<any> {
        let q_save: Thenable<any>;
        //
        if (this._bodyLastChangedDocument &&
            this._bodyLastChangedDocument.isDirty &&
            utils.leoUriToStr(this.bodyUri) === utils.leoUriToStr(this._bodyLastChangedDocument.uri)
        ) {
            q_save = this._bodySaveDeactivate(this._bodyLastChangedDocument);
        } else {
            q_save = Promise.resolve(true);
        }

        // Adding log in the chain of events
        let q_edit: Thenable<boolean>;
        if (this.bodyUri) {
            const w_edit = new vscode.WorkspaceEdit();
            w_edit.deleteFile(this.bodyUri, { ignoreIfNotExists: true });
            q_edit = vscode.workspace.applyEdit(w_edit).then(() => {
                return true;
            }, () => {
                return false;
            });
        } else {
            q_edit = Promise.resolve(true);
        }
        Promise.all([q_save, q_edit])
            .then(() => {
                return this.closeBody();
            }, () => {
                return true;
            });

        return q_save;
    }

    /**
     * * Opens an an editor for the currently selected node: "this.bodyUri". If already opened, this just 'reveals' it
     * @param p_aside Flag for opening the editor beside any currently opened and focused editor
     * @param p_preventTakingFocus flag that when true will stop the editor from taking focus once opened
     * @returns a promise of an editor, or void if body had been changed again in the meantime.
     */
    public async showBody(p_aside: boolean, p_preventTakingFocus?: boolean, p_preventReveal?: boolean): Promise<vscode.TextEditor | void> {

        const w_openedDocumentTS = performance.now();
        const w_openedDocumentGnx = utils.leoUriToStr(this.bodyUri);
        let q_saved: Thenable<unknown> | undefined;

        // First setup timeout asking for gnx file refresh in case we were resolving a refresh of type 'RefreshTreeAndBody'
        if (this._refreshType.body) {
            this._refreshType.body = false;

            if (this._bodyLastChangedDocument &&
                !this._bodyLastChangedDocument.isClosed &&
                (this._bodyLastChangedDocument.isDirty || this._editorTouched) &&
                w_openedDocumentGnx === utils.leoUriToStr(this._bodyLastChangedDocument.uri)
            ) {

                // ! FAKE SAVE to make sure body is not dirty !
                this._leoFileSystem.preventSaveToLeo = true;
                this._editorTouched = false;
                q_saved = this._bodyLastChangedDocument.save();
            }

            if (q_saved) {
                await q_saved;
                this.preventIconChange = true;
                // console.log('fire refresh body in showBody1');
                this._leoFileSystem.fireRefreshFile(w_openedDocumentGnx);
            }

        }
        // Handle 'Prevent Show Body flag' and return
        if (this._preventShowBody) {
            this._preventShowBody = false;
            return Promise.resolve(vscode.window.activeTextEditor!);
        }

        // * Step 1 : Open the document
        const w_openedDocument = await vscode.workspace.openTextDocument(this.bodyUri);
        this._bodyLastChangedDocument = undefined;
        this._bodyLastChangedDocumentSaved = false;

        this._bodyTextDocument = w_openedDocument;

        // * Set document language along with the proper cursor position, selection range and scrolling position
        let q_bodyStates: Promise<LeoBridgePackage> | undefined;
        if (!this._needLastSelectedRefresh) {

            q_bodyStates = this.sendAction(
                Constants.LEOBRIDGE.GET_BODY_STATES,
                utils.buildNodeCommand(this.lastSelectedNode!)
            );

            q_bodyStates.then((p_bodyStates: LeoBridgePackage) => {

                let w_language: string = p_bodyStates.language!;
                let w_wrap: boolean = !!p_bodyStates.wrap;
                let w_tabWidth: number | boolean = p_bodyStates.tabWidth || !!p_bodyStates.tabWidth;

                let w_gnx: string | undefined = p_bodyStates.selection?.gnx; // ? To verify if better than w_openedDocumentGnx ?

                // Replace language string if in 'exceptions' array
                w_language = Constants.LEO_LANGUAGE_PREFIX +
                    (Constants.LANGUAGE_CODES[w_language] || w_language) +
                    (w_wrap ? Constants.LEO_WRAP_SUFFIX : "");

                let w_debugMessage = "";
                let w_needRefreshFlag = false;

                // Apply language if the selected node is still the same after all those events
                if (!w_openedDocument.isClosed) {
                    // w_openedDocument still OPEN
                    if (this.isTsStillValid(w_openedDocumentTS)) { // No need to check gnx of command stack){
                        // command stack last node is still valid
                        if (this.lastSelectedNode && w_openedDocumentGnx === this.lastSelectedNode.gnx) {
                            // still same gnx as this.bodyUri
                            this._setBodyLanguage(w_openedDocument, w_language);
                        } else {
                            // NOT SAME GNX!
                            w_debugMessage = "all good but not same GNX!?!";
                            w_needRefreshFlag = true;
                        }

                    } else {
                        // NOT VALID : NEW NODE SELECTED SINCE THIS STARTED!
                        w_debugMessage = "New node selected since this started!";
                        w_needRefreshFlag = false;

                    }

                } else {
                    w_debugMessage = "w_openedDocument is CLOSED " + w_openedDocument.uri.fsPath;
                    w_needRefreshFlag = false;
                }

                // * Debug Info
                // if (w_debugMessage) {
                //     console.log(w_debugMessage);
                //     console.log("w_openedDocumentGnx", w_openedDocumentGnx);
                //     console.log("this.lastSelectedNode.gnx", this.lastSelectedNode!.gnx);
                //     console.log("w_gnx", w_gnx);
                // }

                if (w_needRefreshFlag) {
                    if (this._showBodySwitchBodyTimer) {
                        clearTimeout(this._showBodySwitchBodyTimer);
                    }
                    // redo apply to body!
                    this._showBodySwitchBodyTimer = setTimeout(() => {
                        if (this.lastSelectedNode) {
                            this._switchBody(false, p_preventTakingFocus);
                        }
                    }, 0);

                }
                return p_bodyStates;
            });
        }

        // Find body pane's position if already opened with same gnx (language still needs to be set per position)
        let w_foundDocOpened = false;
        vscode.window.tabGroups.all.forEach((p_tabGroup) => {
            p_tabGroup.tabs.forEach((p_tab) => {

                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_SCHEME &&
                    (p_tab.input as vscode.TabInputText).uri.fsPath === w_openedDocument.uri.fsPath) {
                    vscode.workspace.textDocuments.forEach((p_textDocument) => {
                        if (
                            p_textDocument.uri.scheme === Constants.URI_LEO_SCHEME &&
                            p_textDocument.uri.fsPath === (p_tab.input as vscode.TabInputText).uri.fsPath
                        ) {
                            this._bodyTextDocument = p_textDocument; // vscode.workspace.openTextDocument
                            this._bodyMainSelectionColumn = p_tab.group.viewColumn;
                            if (p_preventReveal) {
                                if (p_tab.isActive) {
                                    w_foundDocOpened = true;
                                }
                            } else {
                                w_foundDocOpened = true;
                            }
                        }
                    });
                }
            });
        });

        if (!w_foundDocOpened && p_preventReveal) {
            return; // ! HAD PREVENT REVEAL !
        }

        if (w_foundDocOpened && !q_saved) {
            // Was the same and was asked to show body (and did not already had to fake-save and refresh)
            // this.preventIconChange = true; // ? NEEDED ?
            // console.log('fire refresh body in showBody2');

            this._leoFileSystem.fireRefreshFile(w_openedDocumentGnx);
        }

        // Setup options for the preview state of the opened editor, and to choose which column it should appear
        const w_showOptions: vscode.TextDocumentShowOptions = p_aside
            ? {
                viewColumn: vscode.ViewColumn.Beside,
                preserveFocus: p_preventTakingFocus,
                preview: true, // should text document be in preview only? set false for fully opened
            }
            : {
                viewColumn: this._bodyMainSelectionColumn
                    ? this._bodyMainSelectionColumn
                    : 1,
                preserveFocus: p_preventTakingFocus,
                preview: true, // should text document be in preview only? set false for fully opened
            };

        // * CHECK ALL 3 POSSIBLE NEW PLACES FOR BODY SWITCH AFTER "await vscode.workspace.openTextDocument"
        if (
            w_openedDocument.isClosed ||
            !this.isTsStillValid(w_openedDocumentTS) // No need to check gnx

            // Should the gnx be relevant? -> !this.isGnxStillValid(w_openedDocumentGnx, w_openedDocumentTS)

        ) {
            this.preventIconChange = false;
            return;
        }

        // * Actually Show the body pane document in a text editor
        const q_showTextDocument = vscode.window.showTextDocument(
            this._bodyTextDocument,
            w_showOptions
        ).then(
            (p_result) => {
                this.showBodyIfClosed = false;
                return p_result;
            },
            (p_reason) => {
                console.log('showTextDocument rejected: ', p_reason);
            }
        );

        // else q_bodyStates will exist.
        if (q_bodyStates && !this._needLastSelectedRefresh) {
            Promise.all([q_bodyStates, q_showTextDocument]).then(
                (p_values: [LeoBridgePackage, vscode.TextEditor | void]) => {

                    // * Set text selection range
                    const w_resultBodyStates = p_values[0];
                    const w_bodyTextEditor = p_values[1];
                    if (!w_resultBodyStates.selection) {
                        console.log("no selection in returned package from get_body_states");
                    }

                    const w_leoBodySel: BodySelectionInfo = w_resultBodyStates.selection!;

                    // * CHECK ALL 3 POSSIBLE NEW PLACES FOR BODY SWITCH AFTER q_bodyStates & q_showTextDocument
                    if (
                        w_openedDocument.isClosed ||
                        !this.isTsStillValid(w_openedDocumentTS) ||
                        (this.lastSelectedNode && w_leoBodySel.gnx !== this.lastSelectedNode.gnx)
                        // Should the gnx be relevant? -> !this.isGnxStillValid(w_openedDocumentGnx, w_openedDocumentTS)
                    ) {
                        return;
                    }

                    // Cursor position and selection range
                    const w_activeRow: number = w_leoBodySel.insert.line;
                    const w_activeCol: number = w_leoBodySel.insert.col;
                    let w_anchorLine: number = w_leoBodySel.start.line;
                    let w_anchorCharacter: number = w_leoBodySel.start.col;

                    if (w_activeRow === w_anchorLine && w_activeCol === w_anchorCharacter) {
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

                    let w_scrollRange: vscode.Range | undefined;

                    // Build scroll position from selection range.
                    w_scrollRange = new vscode.Range(
                        w_activeRow,
                        w_activeCol,
                        w_activeRow,
                        w_activeCol
                    );

                    if (w_bodyTextEditor) {
                        // this._revealType = RevealType.NoReveal; // ! IN CASE THIS WAS STILL UP FROM SHOW_OUTLINE

                        w_bodyTextEditor.selection = w_selection; // set cursor insertion point & selection range
                        if (!w_scrollRange) {
                            w_scrollRange = w_bodyTextEditor.document.lineAt(0).range;
                        }

                        if (this._refreshType.scroll) {
                            this._refreshType.scroll = false;
                            // Set scroll approximation
                            w_bodyTextEditor.revealRange(w_scrollRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                        }

                    } else {
                        console.log("no selection in returned package from showTextDocument");
                    }

                }
            );
        }

        return q_showTextDocument;
    }

    /**
     * * Looks for given position's coloring language, taking account of '@killcolor', etc.
     */
    private async _getBodyLanguage(p: ArchivedPosition, c_id?: string): Promise<string> {
        if (!p) {
            p = this.lastSelectedNode!;
        }
        const param = utils.buildNodeCommand(p);
        if (c_id) {
            param["commanderId"] = c_id;
        }
        return this.sendAction(
            Constants.LEOBRIDGE.GET_BODY_STATES,
            param
        ).then((p_bodyStates: LeoBridgePackage) => {
            let w_language = p_bodyStates.language;
            let w_wrap: boolean = !!p_bodyStates.wrap;

            if (w_language) {
                // Replace language string if in 'exceptions' array
                w_language = Constants.LEO_LANGUAGE_PREFIX +
                    (Constants.LANGUAGE_CODES[w_language] || w_language) +
                    (w_wrap ? Constants.LEO_WRAP_SUFFIX : "");

                return w_language;
            } else {
                return "";
            }
        });
    }

    /**
     * * Sets vscode's body-pane editor's language
     */
    private _setBodyLanguage(p_document: vscode.TextDocument, p_language: string): Thenable<vscode.TextDocument> {

        return vscode.languages.setTextDocumentLanguage(p_document, p_language).then(
            (p_mewDocument) => { return p_mewDocument; }, // ok - language found
            (p_error) => {
                // ERROR: Output error info
                let w_langName: string = p_error.toString().split('\n')[0];
                if (w_langName.length > 36 && w_langName.includes(Constants.LEO_LANGUAGE_PREFIX)) {
                    w_langName = w_langName.substring(36);
                } else {
                    w_langName = "";
                }
                if (w_langName && !this._languageFlagged.includes(w_langName)) {
                    this._languageFlagged.push(w_langName);
                    if (w_langName.endsWith(Constants.LEO_WRAP_SUFFIX)) {
                        w_langName = w_langName.slice(0, -Constants.LEO_WRAP_SUFFIX.length);
                    }
                    if (w_langName.startsWith(Constants.LEO_LANGUAGE_PREFIX)) {
                        w_langName = w_langName.slice(Constants.LEO_LANGUAGE_PREFIX.length);
                    }
                    vscode.window.showInformationMessage(
                        w_langName + Constants.USER_MESSAGES.LANGUAGE_NOT_SUPPORTED
                    );
                } else if (!w_langName) {
                    // Document was closed: refresh after a timeout cycle (should not happen!)
                    setTimeout(() => {
                        this.setupRefresh(
                            this.finalFocus,
                            {
                                // tree: true,
                                body: true,
                                // documents: true,
                                // buttons: false,
                                states: true,
                            }
                        );
                        this.launchRefresh();
                    }, 0);
                }
                return p_document;
            }
        );
    }

    /**
     * * Refreshes body pane's statuses such as applied language file type, word-wrap state, etc.
     */
    public refreshBodyStates(): void {
        if (!this._bodyTextDocument || !this.lastSelectedNode) {
            return;
        }

        // * Set document language along with the proper cursor position, selection range and scrolling position
        this._getBodyLanguage(this.lastSelectedNode!).then((p_language) => {
            // Apply language if the selected node is still the same after all those events
            if (this._bodyTextDocument &&
                !this._bodyTextDocument.isClosed &&
                this.lastSelectedNode &&
                p_language !== this._bodyTextDocument.languageId &&
                utils.leoUriToStr(this._bodyTextDocument.uri) === this.lastSelectedNode.gnx
            ) {
                this._setBodyLanguage(this._bodyTextDocument, p_language);
            }
        });
    }

    /**
     * * Refresh body states after a small debounced delay.
     */
    public debouncedRefreshBodyStates(p_delay?: number) {

        if (!p_delay) {
            p_delay = 0;
        }

        if (this._bodyStatesTimer) {
            clearTimeout(this._bodyStatesTimer);
        }
        if (p_delay === 0) {
            if (this._bodyLastChangedDocument && !this._bodyLastChangedDocument.isClosed && this.leoStates.fileOpenedReady) {
                this._bodySaveDocument(this._bodyLastChangedDocument);
            }
            this.refreshBodyStates();
        } else {
            this._bodyStatesTimer = setTimeout(() => {
                if (this._bodyLastChangedDocument && !this._bodyLastChangedDocument.isClosed && this.leoStates.fileOpenedReady) {
                    this._bodySaveDocument(this._bodyLastChangedDocument);
                }
                this.refreshBodyStates();
            }, p_delay);
        }

    }

    /**
     * Debounced refresh language for all detached bodies of active commander
     */
    private _refreshCommanderDetachedLanguage(): void {

        const c_id = this.leoStates.leoCommanderId;
        const w_documents: vscode.TextDocument[] = [];
        const w_uris: string[] = [];

        for (const p_tabGroup of vscode.window.tabGroups.all) {
            for (const p_tab of p_tabGroup.tabs) {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    ((p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_DETACHED_SCHEME)
                ) {
                    const [unused, id, gnx] = (p_tab.input as vscode.TabInputText).uri.path.split("/");
                    if (id === c_id) {
                        // From same commander
                        if (!w_uris.includes((p_tab.input as vscode.TabInputText).uri.toString())) {
                            w_uris.push((p_tab.input as vscode.TabInputText).uri.toString());
                        }

                    }
                }
            }
        }

        for (const w_doc of vscode.workspace.textDocuments) {
            if (!w_doc.isClosed && w_uris.includes(w_doc.uri.toString())) {
                w_documents.push(w_doc);
            }
        }

        for (const w_doc of w_documents) {
            const w_foundVnode = this._leoDetachedFileSystem.openedBodiesVNodes[utils.leoUriToStr(w_doc.uri)];
            const id = w_doc.uri.path.split("/")[1];
            if (w_foundVnode) {
                void this.sendAction(
                    Constants.LEOBRIDGE.GET_BODY_STATES,
                    { gnx: w_foundVnode.gnx, commanderId: id }
                ).then((p_bodyStates: LeoBridgePackage) => {
                    let w_language: string = p_bodyStates.language!;
                    let w_wrap: boolean = !!p_bodyStates.wrap;
                    let w_tabWidth: number | boolean = p_bodyStates.tabWidth || !!p_bodyStates.tabWidth;

                    // Replace language string if in 'exceptions' array
                    w_language = Constants.LEO_LANGUAGE_PREFIX +
                        (Constants.LANGUAGE_CODES[w_language] || w_language) +
                        (w_wrap ? Constants.LEO_WRAP_SUFFIX : "");

                    // Apply language if the selected node is still the same after all those events
                    if (!w_doc.isClosed) {
                        // w_doc still OPEN
                        this._setBodyLanguage(w_doc, w_language);

                    }

                });
            } else {
                console.log('DETACHED VNODE not found when resetting language');
            }
        }

    }

    /**
     * * Opens quickPick minibuffer pallette to choose from all commands in this file's commander
     * @returns Promise that resolves when the chosen command is placed on the front-end command stack
     */
    public async minibuffer(): Promise<LeoBridgePackage | undefined> {

        // Wait for _isBusyTriggerSave resolve because the full body save may change available commands
        await this._isBusyTriggerSave(false, true);

        let w_history: string[] = [];
        if (utils.compareVersions(this.serverVersion, { major: 1, minor: 0, patch: 8 })) {
            const w_historyPackage = await this.sendAction("!get_history");
            w_history = w_historyPackage.history || [];
        }

        const q_commandList: Thenable<vscode.QuickPickItem[]> = this.sendAction(
            Constants.LEOBRIDGE.GET_COMMANDS
        ).then((p_result: LeoBridgePackage) => {
            if (p_result.commands && p_result.commands.length) {
                const w_regexp = new RegExp('\\s+', 'g');
                p_result.commands.forEach(p_command => {
                    if (p_command.detail) {
                        p_command.detail = p_command.detail.trim().replace(w_regexp, ' ');
                    }
                });
                // Remove unsupported commands
                for (const p_name of Constants.unsupportedMinibufferCommands) {
                    const i_command = p_result.commands.findIndex((object) => {
                        return object.label === p_name;
                    });
                    if (i_command !== -1) {
                        p_result.commands.splice(i_command, 1);
                    }
                }
                // Add some commands traditionally from plugins or other sources
                p_result.commands.push(...Constants.addMinibufferCommands);

                // Keep only without details and remove @buttons and delete-@buttons
                // (keeps the minibuffer list cleaner)
                const w_noDetails: vscode.QuickPickItem[] = [];
                const stash_button: string[] = [];
                const stash_rclick: string[] = [];
                const stash_command: string[] = [];

                for (const w_com of p_result.commands) {
                    if (
                        !w_com.detail && !(
                            w_com.label.startsWith(Constants.USER_MESSAGES.MINIBUFFER_BUTTON_START) ||
                            w_com.label.startsWith(Constants.USER_MESSAGES.MINIBUFFER_RCLICK_START) ||
                            w_com.label === Constants.USER_MESSAGES.MINIBUFFER_SCRIPT_BUTTON ||
                            w_com.label.startsWith(Constants.USER_MESSAGES.MINIBUFFER_DEL_SCRIPT_BUTTON) ||
                            w_com.label.startsWith(Constants.USER_MESSAGES.MINIBUFFER_DEL_BUTTON_START) ||
                            w_com.label.startsWith(Constants.USER_MESSAGES.MINIBUFFER_COMMAND_START)
                        )
                    ) {
                        w_noDetails.push(w_com);
                    }

                    if (w_com.label.startsWith(Constants.USER_MESSAGES.MINIBUFFER_BUTTON_START)) {
                        stash_button.push(w_com.label);
                    }
                    if (w_com.label.startsWith(Constants.USER_MESSAGES.MINIBUFFER_RCLICK_START)) {
                        stash_rclick.push(w_com.label);
                    }
                    if (w_com.label.startsWith(Constants.USER_MESSAGES.MINIBUFFER_COMMAND_START)) {
                        stash_command.push(w_com.label);
                    }
                }

                for (const p_command of w_noDetails) {
                    if (stash_button.includes(Constants.USER_MESSAGES.MINIBUFFER_BUTTON_START + p_command.label)) {
                        p_command.description = Constants.USER_MESSAGES.MINIBUFFER_BUTTON;
                    }
                    if (stash_rclick.includes(Constants.USER_MESSAGES.MINIBUFFER_RCLICK_START + p_command.label)) {
                        p_command.description = Constants.USER_MESSAGES.MINIBUFFER_RCLICK;
                    }
                    if (stash_command.includes(Constants.USER_MESSAGES.MINIBUFFER_COMMAND_START + p_command.label)) {
                        p_command.description = Constants.USER_MESSAGES.MINIBUFFER_COMMAND;
                    }
                    if (!p_command.description) {
                        p_command.description = Constants.USER_MESSAGES.MINIBUFFER_USER_DEFINED;
                    }
                }

                const w_withDetails = p_result.commands.filter(p_command => !!p_command.detail);

                // Only sort 'regular' Leo commands, leaving custom commands at the top
                w_withDetails.sort((a, b) => {
                    return a.label < b.label ? -1 : (a.label === b.label ? 0 : 1);
                });

                const w_result: vscode.QuickPickItem[] = [];

                if (w_history.length) {
                    w_result.push(Constants.MINIBUFFER_QUICK_PICK);
                }

                // Finish minibuffer list
                if (w_noDetails.length) {
                    w_result.push(...w_noDetails);
                }

                // Separator above real commands, if needed...
                if (w_noDetails.length || w_history.length) {
                    w_result.push({
                        label: "", kind: vscode.QuickPickItemKind.Separator
                    });
                }

                w_result.push(...w_withDetails);

                return w_result;
            } else {
                return [];
            }
        });

        const w_choices = await q_commandList;

        const w_disposables: vscode.Disposable[] = [];

        const q_minibufferQuickPick: Promise<vscode.QuickPickItem | undefined> = new Promise((resolve, _reject) => {
            const quickPick = vscode.window.createQuickPick();
            quickPick.items = w_choices;
            quickPick.placeholder = Constants.USER_MESSAGES.MINIBUFFER_PROMPT;
            quickPick.matchOnDetail = true;

            w_disposables.push(
                quickPick.onDidChangeSelection(selection => {
                    if (selection[0]) {
                        resolve(selection[0]);
                        quickPick.hide();
                    }
                }),
                quickPick.onDidAccept(_accepted => {
                    if (/^\d+$/.test(quickPick.value)) {
                        // * Was an integer
                        this.gotoGlobalLine(Number(quickPick.value));
                        resolve(undefined);
                        quickPick.hide();
                    }
                }),
                quickPick.onDidChangeValue(changed => {
                    if (/^\d+$/.test(changed)) {
                        if (quickPick.items.length) {
                            quickPick.items = [];
                        }
                    } else if (quickPick.items !== w_choices) {
                        quickPick.items = w_choices;
                    }
                }),
                quickPick.onDidHide(() => {
                    resolve(undefined);
                }),
                quickPick
            );
            quickPick.show();

        });

        const w_picked: vscode.QuickPickItem | undefined = await q_minibufferQuickPick;

        w_disposables.forEach(d => d.dispose());

        // First, check for undo-history list being requested
        if (w_picked && w_picked.label === Constants.USER_MESSAGES.MINIBUFFER_HISTORY_LABEL) {
            return this._showMinibufferHistory(w_choices, w_history);
        }
        if (w_picked) {
            return this._doMinibufferCommand(w_picked);
        }
    }

    /**
     * * Opens quickPick of minibuffer's commands history
     * @returns Promise that resolves when the chosen command is placed on the front-end command stack
     */
    private async _showMinibufferHistory(p_choices: vscode.QuickPickItem[], p_history: string[]): Promise<LeoBridgePackage | undefined> {

        if (!p_history || !p_history.length) {
            return Promise.resolve(undefined);
        }

        // Build from list of strings (labels).
        let w_commandList: vscode.QuickPickItem[] = [];
        for (const w_command of p_history) {
            let w_found = false;
            for (const w_pick of p_choices) {
                if (w_pick.label === w_command) {
                    w_commandList.push(w_pick);
                    w_found = true;
                    break;
                }
            }
            if (!w_found) {
                w_commandList.push({
                    label: w_command,
                    description: Constants.USER_MESSAGES.MINIBUFFER_BAD_COMMAND,
                    detail: `No command function for ${w_command}`
                });
            }
        }
        if (!w_commandList.length) {
            return;
        }

        // Add Nav tab special commands
        const w_options: vscode.QuickPickOptions = {
            placeHolder: Constants.USER_MESSAGES.MINIBUFFER_PROMPT,
            matchOnDetail: true,
        };
        const w_picked = await vscode.window.showQuickPick(w_commandList.reverse(), w_options);
        return this._doMinibufferCommand(w_picked);
    }

    /**
     * * Perform chosen minibuffer command
     */
    private async _doMinibufferCommand(p_picked?: vscode.QuickPickItem): Promise<LeoBridgePackage | undefined> {
        // First, add to minibuffer history for that commander.
        if (p_picked && utils.compareVersions(this.serverVersion, { major: 1, minor: 0, patch: 8 })) {
            await this.sendAction("!add_history", { command: p_picked.label });
        }
        // Second, check for overridden command: Exit by doing the overridden command.
        if (p_picked &&
            p_picked.label &&
            Constants.MINIBUFFER_OVERRIDDEN_COMMANDS[p_picked.label]) {
            return vscode.commands.executeCommand(
                Constants.MINIBUFFER_OVERRIDDEN_COMMANDS[p_picked.label]
            );
        }
        // Ok, it was really a minibuffer command
        if (p_picked && p_picked.label) {
            const w_commandResult = this.nodeCommand({
                action: "-" + p_picked.label,
                node: undefined,
                refreshType: {
                    tree: true,
                    body: true,
                    documents: true,
                    buttons: true,
                    states: true,
                },
                finalFocus: Focus.NoChange, // TODO: Fetch focus location from Leo?
            });
            return w_commandResult;
        }
    }

    /**
     * Show a headline input box that resolves to undefined only with escape.
     * Other Leo commands interrupt by accepting the value entered so far.
     */
    private _showHeadlineInputBox(p_options: vscode.InputBoxOptions): Promise<string | undefined> {

        const hib = vscode.window.createInputBox();
        this._hibLastValue = undefined; // Prepare for 'cancel' as default.
        const q_headlineInputBox = new Promise<string | undefined>((p_resolve, _p_reject) => {

            hib.ignoreFocusOut = !!p_options.ignoreFocusOut;
            hib.value = p_options.value!;
            hib.valueSelection = p_options.valueSelection;
            hib.prompt = p_options.prompt;
            this._hibDisposables.push(hib.onDidAccept(() => {
                if (this._hib) {
                    this._hib.enabled = false;
                    this._hibLastValue = this._hib.value;
                    this._hib.hide();
                }
            }, this));
            if (this._hibResolve) {
                console.error('IN _showHeadlineInputBox AND THE _hibResolve PROMISE ALREADY EXISTS!');
            }
            this._hibResolve = p_resolve;
            // onDidHide handles CANCEL AND ACCEPT AND INTERCEPT !
            this._hibDisposables.push(hib.onDidHide(() => {
                if (this._hib) {
                    this._hibLastValue = this._hib.value; // * FORCE VALUE EVEN WHEN CANCELLING LIKE IN ORIGINAL LEO !
                }
                this.leoStates.leoEditHeadline = false;
                if (this._hibResolve) {
                    // RESOLVE whatever value was set otherwise undefined will mean 'canceled'.
                    this._hibResolve(this._hibLastValue);
                    // Dispose of everything disposable with the edit headline process.
                    for (const disp of this._hibDisposables) {
                        disp.dispose();
                    }
                    // Empty related global variables.
                    this._hibDisposables = [];
                    this._hibResolve = undefined;
                    this._hib = undefined;
                } else {
                    console.log('ERROR ON onDidHide NO _hibResolve !');
                }
            }, this));
            this._hibDisposables.push(hib);
            // setup finished, set command context and show it! 
            this._hib = hib;
            this.leoStates.leoEditHeadline = true;
            this._hib.show();
        });
        return q_headlineInputBox;
    }
    /**
     * * Previous / Next Node Buttons
     * @param p_next Flag to mean 'next' instead of default 'previous'
     * @returns the promise from the command sent to the leo bridge
     */
    public async prevNextNode(p_next: boolean, p_fromOutline?: boolean): Promise<any> {

        await this._isBusyTriggerSave(false, true);

        let w_command: string;
        if (p_next) {
            w_command = Constants.LEOBRIDGE.GOTO_NEXT_HISTORY;
        } else {
            w_command = Constants.LEOBRIDGE.GOTO_PREV_HISTORY;
        }
        return this.nodeCommand({
            action: w_command,
            node: undefined,
            refreshType: { tree: true, states: true, body: true },
            finalFocus: p_fromOutline ? Focus.Outline : Focus.Body
        });
    }

    /**
     * * Select a tree node. Either called from user interaction, or used internally (p_internalCall flag)
     * @param p_node Node that was just selected
     * @param p_internalCall Flag used to indicate the selection is forced, and NOT originating from user interaction
     * @param p_aside Flag to force opening the body "Aside", i.e. when the selection was made from choosing "Open Aside"
     * @returns a promise with the package gotten back from Leo when asked to select the tree node
     */
    public async selectTreeNode(
        p_node: ArchivedPosition,
        p_internalCall?: boolean,
        //p_aside?: boolean
    ): Promise<void | LeoBridgePackage | vscode.TextEditor> {

        await this.triggerBodySave(true);

        // * check if used via context menu's "open-aside" on an unselected node: check if p_node is currently selected, if not select it
        // if (p_aside && p_node !== this.lastSelectedNode) {
        //     this._revealNode(p_node, { select: true, focus: false }); // no need to set focus: tree selection is set to right-click position
        // }

        this.leoStates.setSelectedNodeFlags(p_node);

        // removed until proper API for knowing focus placement
        // this._leoStatusBar.update(true); // Just selected a node directly, or via expand/collapse

        // const w_showBodyKeepFocus = p_aside
        //     ? this.config.treeKeepFocusWhenAside
        //     : this.config.treeKeepFocus;

        // * Check if having already this exact node position selected : Just show the body and exit
        // (other tree nodes with same gnx may have different syntax language coloring because of parents lineage)
        if (p_node === this.lastSelectedNode) {
            this._locateOpenedBody(p_node.gnx); // LOCATE NEW GNX
            // MAYBE DETACHED BODY CHANGED THAT CONTENT!
            this._leoFileSystem.setNewBodyUriTime(utils.strToLeoUri(p_node.gnx));

            return this.showBody(false, this.config.treeKeepFocus).catch((_p_error) => {
                return Promise.resolve(); // intercept cancellation as success: next one is going to replace anyways.
            });
            // Voluntary exit
        }

        // * Set selected node in Leo via leoBridge
        const q_setSelectedNode = this.sendAction(
            Constants.LEOBRIDGE.SET_SELECTED_NODE,
            utils.buildNodeCommand(p_node)
        ).then((p_setSelectedResult) => {
            if (!p_internalCall) {
                if (this.findFocusTree) {
                    // had a range but now refresh from other than find/replace
                    // So make sure tree is also refreshed.
                    this.findFocusTree = false;
                    this.setupRefresh(
                        Focus.Outline,
                        {
                            tree: true,
                            body: true,
                            // documents: false,
                            // buttons: false,
                            // states: false,
                        }
                    );
                    this._launchRefresh();
                    return p_setSelectedResult;
                }


                this._refreshType.states = true;
                this.getStates();
            }
            return p_setSelectedResult;
        });

        // * Apply the node to the body text without waiting for the selection promise to resolve
        this.showBodyIfClosed = true;
        this._tryApplyNodeToBody(p_node, false, this.config.treeKeepFocus);
        return q_setSelectedNode;
    }

    /**
     * * Opens a detached body aside, and set focus in a body pane locked to its commander/gnx. 
     * - Does not select the node in the outline.
     * - If already opened aside in the same targeted column, just reveal.
     * @param p is the position node to be opened aside
     */
    public async openAside(p?: ArchivedPosition): Promise<unknown> {
        // Those 'body panes' opened aside, (other than the main body pane), 
        // stay opened until the node's gnx becomes invalid/deleted, or it's commander is closed.
        await this.triggerBodySave(true);

        let c_id = this.leoStates.leoCommanderId;
        if (!p) {
            p = this.lastSelectedNode!;
        }
        const detachedUri = utils.strToLeoDetachedUri(`${c_id}/${p.gnx}`);

        // * Step 1 : Open the document
        this._leoDetachedFileSystem.setNewBodyUriTime(detachedUri, p);
        const w_openedDocument = await vscode.workspace.openTextDocument(detachedUri);
        this.bodyDetachedTextDocument = w_openedDocument;

        let q_bodyStates = this.sendAction(
            Constants.LEOBRIDGE.GET_BODY_STATES,
            utils.buildNodeCommand(p!)
        );

        const w_showOptions: vscode.TextDocumentShowOptions =
        {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: this.config.treeKeepFocusWhenAside,
            preview: false,
        };
        // * Actually Show the body pane document in a text editor
        const q_showTextDocument = vscode.window.showTextDocument(
            this.bodyDetachedTextDocument,
            w_showOptions
        );

        q_bodyStates.then((p_bodyStates: LeoBridgePackage) => {
            let w_language: string = p_bodyStates.language!;
            let w_wrap: boolean = !!p_bodyStates.wrap;
            let w_tabWidth: number | boolean = p_bodyStates.tabWidth || !!p_bodyStates.tabWidth;
            let w_gnx: string | undefined = p_bodyStates.selection?.gnx; // ? To verify if better than w_openedDocumentGnx ?

            // Replace language string if in 'exceptions' array
            w_language = Constants.LEO_LANGUAGE_PREFIX +
                (Constants.LANGUAGE_CODES[w_language] || w_language) +
                (w_wrap ? Constants.LEO_WRAP_SUFFIX : "");

            // Apply language if the selected node is still the same after all those events
            if (!w_openedDocument.isClosed) {
                // w_openedDocument still OPEN
                this._setBodyLanguage(w_openedDocument, w_language);

            }
            return p_bodyStates;
        });


        Promise.all([q_bodyStates, q_showTextDocument]).then(
            (p_values: [LeoBridgePackage, vscode.TextEditor]) => {

                // * Set text selection range
                const w_resultBodyStates = p_values[0];
                const w_bodyTextEditor = p_values[1];
                if (!w_resultBodyStates.selection) {
                    console.log("no selection in returned package from get_body_states");
                }

                const w_leoBodySel: BodySelectionInfo = w_resultBodyStates.selection!;

                // Cursor position and selection range
                const w_activeRow: number = w_leoBodySel.insert.line;
                const w_activeCol: number = w_leoBodySel.insert.col;
                let w_anchorLine: number = w_leoBodySel.start.line;
                let w_anchorCharacter: number = w_leoBodySel.start.col;

                if (w_activeRow === w_anchorLine && w_activeCol === w_anchorCharacter) {
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

                let w_scrollRange: vscode.Range | undefined;

                // Build scroll position from selection range.
                w_scrollRange = new vscode.Range(
                    w_activeRow,
                    w_activeCol,
                    w_activeRow,
                    w_activeCol
                );

                if (w_bodyTextEditor) {
                    // this._revealType = RevealType.NoReveal; // ! IN CASE THIS WAS STILL UP FROM SHOW_OUTLINE

                    w_bodyTextEditor.selection = w_selection; // set cursor insertion point & selection range
                    if (!w_scrollRange) {
                        w_scrollRange = w_bodyTextEditor.document.lineAt(0).range;
                    }

                    if (this._refreshType.scroll) {
                        this._refreshType.scroll = false;
                        // Set scroll approximation
                        w_bodyTextEditor.revealRange(w_scrollRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                    }

                } else {
                    console.log("no selection in returned package from showTextDocument");
                }

            }
        );
        return q_showTextDocument;
    }

    /**
     * * Tries to add a command to the frontend stack, returns true if added, false otherwise
     * @param p_userCommand Contains command details such as action, node, fromOutline, refresh type, etc.
     * @returns Promise back from command's execution, if added on stack, undefined otherwise.
     * (see command stack 'rules' in commandStack.ts)
     */
    public async nodeCommand(p_userCommand: UserCommand, p_isNavigation?: boolean): Promise<LeoBridgePackage | undefined> {
        // No forced vscode save-triggers for direct calls from extension.js
        await this.triggerBodySave();
        if (p_isNavigation) {
            // If any navigation command is used from outline or command palette: show body.
            this.showBodyIfClosed = true;
            // If alt+arrow is used to navigate: SHOW and leave focus on outline.
            this.showOutlineIfClosed = true;

            if (p_userCommand.refreshType.body) {
                // If this is a navigation command, dont refresh DETACHED
                p_userCommand.refreshType.excludeDetached = true;
            }
        }

        const q_result = this._commandStack.add(p_userCommand);
        if (q_result) {
            return q_result;
        } else {
            vscode.window.showInformationMessage(
                Constants.USER_MESSAGES.TOO_FAST + p_userCommand.action
            );
            return undefined;
        }
    }

    /**
     * * Changes the marked state of a specified, or currently selected node
     * @param p_isMark Set 'True' to mark, otherwise unmarks the node
     * @param p_node Specifies which node use, or leave undefined to mark or unmark the currently selected node
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     * @returns Promise of LeoBridgePackage from execution on the Leo server.
     */
    public changeMark(
        p_isMark: boolean,
        p_node?: ArchivedPosition,
        p_fromOutline?: boolean
    ): Promise<LeoBridgePackage | undefined> {
        // No need to wait for body-save trigger for marking/un-marking a node
        const q_commandResult = this.nodeCommand({
            action: p_isMark ? Constants.LEOBRIDGE.MARK_PNODE : Constants.LEOBRIDGE.UNMARK_PNODE,
            node: p_node,
            refreshType: { tree: true, states: true },
            finalFocus: p_fromOutline ? Focus.Outline : Focus.Body
        });
        if (q_commandResult) {
            if (!p_node || p_node === this.lastSelectedNode) {
                utils.setContext(Constants.CONTEXT_FLAGS.SELECTED_MARKED, p_isMark);
            }
            return q_commandResult;
        } else {
            return Promise.reject('Change mark on node not added on command stack');
        }
    }

    /**
     * * Asks for a new headline label, and replaces the current label with this new one one the specified, or currently selected node
     * @param p_node Specifies which node to rename, or leave undefined to rename the currently selected node
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     * @returns Promise of LeoBridgePackage from execution on the server.
     */
    public async editHeadline(
        p_node?: ArchivedPosition,
        p_fromOutline?: boolean,
        p_prompt?: string
    ): Promise<LeoBridgePackage | undefined> {

        if (this._hib && this._hib.enabled) {
            return Promise.resolve(undefined); // DO NOT REACT IF ALREADY EDITING A HEADLINE! 
        }

        await this._isBusyTriggerSave(false, true);

        let w_finalFocus: Focus = p_fromOutline ? Focus.Outline : Focus.Body; // Use w_fromOutline for where we intend to leave focus when done with the insert

        if (!p_node && this.lastSelectedNode) {
            p_node = this.lastSelectedNode; // Gets last selected node if called via keyboard shortcut or command palette (not set in command stack class)
        }
        if (!p_node) {
            return Promise.reject('No node selected');
        }

        const w_headlineInputOptions: vscode.InputBoxOptions = {
            ignoreFocusOut: false,
            value: p_node.headline,  // preset input pop up
            valueSelection: undefined,
            prompt: p_prompt || Constants.USER_MESSAGES.PROMPT_EDIT_HEADLINE,
        };
        let w_newHeadline = await this._showHeadlineInputBox(w_headlineInputOptions);

        let q_commandResult;
        if ((typeof w_newHeadline !== "undefined") && w_newHeadline !== this._renamingHeadline) {
            // Is different!
            p_node!.headline = w_newHeadline;
            q_commandResult = this.nodeCommand({
                action: Constants.LEOBRIDGE.SET_HEADLINE,
                node: p_node,
                refreshType: { tree: true, states: true },
                finalFocus: w_finalFocus,
                name: w_newHeadline,
            });
            q_commandResult;

        } else {
            // Canceled
            q_commandResult = Promise.resolve(undefined);
        }
        q_commandResult.then(() => {
            if (this._onDidHideResolve) {
                this._onDidHideResolve(undefined);
                this._onDidHideResolve = undefined;
            }
        });
    }

    /**
     * * Asks for a headline label to be entered and creates (inserts) a new node under the current, or specified, node
     * @param p_node specified under which node to insert, or leave undefined to use whichever is currently selected
     * @param p_fromOutline Signifies that the focus was, and should be brought back to, the outline
     * @param p_interrupt Signifies the insert action is actually interrupting itself (e.g. rapid CTRL+I actions by the user)
     * @returns Promise of LeoBridgePackage from execution the server.
     */
    public async insertNode(
        p_node?: ArchivedPosition,
        p_fromOutline?: boolean,
        p_asChild?: boolean
    ): Promise<LeoBridgePackage | undefined> {

        let w_hadHib = false;
        if (this._hib && this._hib.enabled) {
            w_hadHib = true;
        }

        if (!this.isOutlineVisible()) {
            p_fromOutline = false;
        }

        let w_finalFocus: Focus = p_fromOutline ? Focus.Outline : Focus.Body;
        if (w_hadHib) {
            this._focusInterrupt = true; // this will affect next refresh by triggerbodysave, not the refresh of this pass
        }

        // if no node parameter, the front command stack CAN be busy, but if a node is passed, stack must be free
        if (!p_node || !this._isBusy()) {
            await this.triggerBodySave(true); // Don't wait for saving to resolve because we're waiting for user input anyways
            // this._headlineInputOptions.prompt = Constants.USER_MESSAGES.PROMPT_INSERT_NODE;

            const w_headlineInputOptions: vscode.InputBoxOptions = {
                ignoreFocusOut: false,
                value: Constants.USER_MESSAGES.DEFAULT_HEADLINE,
                valueSelection: undefined,
                prompt: p_asChild ? Constants.USER_MESSAGES.PROMPT_INSERT_CHILD : Constants.USER_MESSAGES.PROMPT_INSERT_NODE
            };

            const p_newHeadline = await this._showHeadlineInputBox(w_headlineInputOptions);

            // return new Promise<LeoBridgePackage|undefined>((p_resolve, p_reject) => {

            if (this._hibInterrupted) {
                w_finalFocus = Focus.NoChange;
                this._hibInterrupted = false;
            }

            // * if node has child and is expanded: turn p_asChild to true!
            if (
                p_node &&
                p_node.expanded // === vscode.TreeItemCollapsibleState.Expanded
            ) {
                p_asChild = true;
            }
            if (
                !p_node &&
                this.lastSelectedNode &&
                this.lastSelectedNode.expanded //  === vscode.TreeItemCollapsibleState.Expanded
            ) {
                p_asChild = true;
            }
            let w_action = p_newHeadline
                ? (p_asChild ? Constants.LEOBRIDGE.INSERT_CHILD_NAMED_PNODE : Constants.LEOBRIDGE.INSERT_NAMED_PNODE)
                : (p_asChild ? Constants.LEOBRIDGE.INSERT_CHILD_PNODE : Constants.LEOBRIDGE.INSERT_PNODE);

            let q_commandResult;
            const w_refreshType: ReqRefresh = { states: true };

            if (this.isOutlineVisible()) {
                w_refreshType.tree = true;
            } else {
                w_refreshType.body = true;
            }

            q_commandResult = this.nodeCommand(
                {
                    action: w_action,
                    node: p_node,
                    refreshType: w_refreshType,
                    finalFocus: w_finalFocus,
                    name: p_newHeadline,
                }
            );

            return q_commandResult.then((p_package) => {
                if (this._onDidHideResolve) {
                    this._onDidHideResolve(undefined);
                    this._onDidHideResolve = undefined;
                }
                // p_resolve(p_package);
                return p_package;
            });

            // });

        } else {
            return Promise.reject('Insert node not added on command stack');
        }
    }

    /**
     * * Place the XML or JSON Leo outline tree on the clipboard for the given node.
     */
    public async copyNode(
        p_node?: ArchivedPosition,
        p_fromOutline?: boolean
    ): Promise<LeoBridgePackage | undefined> {

        await this._isBusyTriggerSave(false, true);

        const w_commandResult = this.nodeCommand({
            action: Constants.LEOBRIDGE.COPY_PNODE,
            node: p_node,
            refreshType: {},
            finalFocus: p_fromOutline ? Focus.Outline : Focus.Body
        });
        return w_commandResult.then(p_package => {
            if (p_package && p_package.string) {
                this.replaceClipboardWith(p_package.string);
            } else {
            }
            return p_package;
        });
    }

    /**
     * * Place the XML or JSON Leo outline tree on the clipboard for the given node.
     */
    public async copyNodeAsJson(): Promise<LeoBridgePackage | undefined> {

        await this._isBusyTriggerSave(false, true);

        const w_commandResult = this.nodeCommand({
            action: Constants.LEOBRIDGE.COPY_PNODE_AS_JSON,
            node: undefined,
            refreshType: {},
            finalFocus: Focus.NoChange,
        });
        return w_commandResult.then(p_package => {
            if (p_package && p_package.string) {
                this.replaceClipboardWith(p_package.string);
            } else {
            }
            return p_package;
        });

    }

    /**
     * * Place the XML or JSON Leo outline tree on the clipboard for the given node.
     */
    public async copyGnx(): Promise<unknown> {

        await this._isBusyTriggerSave(false, true);

        const w_commandResult = this.nodeCommand({
            action: Constants.LEOBRIDGE.DO_NOTHING,
            node: undefined,
            refreshType: {},
            finalFocus: Focus.NoChange,
        });

        return w_commandResult.then(p_package => {
            if (p_package && p_package.node) {
                this.replaceClipboardWith(p_package.node.gnx);
            }
            return p_package;
        });
    }

    /**
     * * Place the XML or JSON Leo outline tree on the clipboard for the given node, and removes it.
     */
    public async cutNode(
        p_node?: ArchivedPosition,
        p_fromOutline?: boolean
    ): Promise<LeoBridgePackage | undefined> {

        await this._isBusyTriggerSave(false, true);

        const w_commandResult = this.nodeCommand({
            action: Constants.LEOBRIDGE.CUT_PNODE,
            node: p_node,
            refreshType: { tree: true, body: true, states: true },
            finalFocus: p_fromOutline ? Focus.Outline : Focus.Body,
        });

        return w_commandResult.then(p_package => {
            if (p_package && p_package.string) {
                this.replaceClipboardWith(p_package.string);
            }
            return p_package;
        });

    }

    /**
     * * Creates a section of tree outline from the XML or JSON Leo outline on the clipboard.
     */
    public async pasteNode(
        p_node?: ArchivedPosition,
        p_fromOutline?: boolean
    ): Promise<LeoBridgePackage | undefined> {

        await this._isBusyTriggerSave(false, true);

        const text = await this.asyncGetTextFromClipboard();

        const w_commandResult = this.nodeCommand({
            action: Constants.LEOBRIDGE.PASTE_PNODE,
            node: p_node,
            refreshType: { tree: true, body: true, states: true },
            name: text,
            finalFocus: p_fromOutline ? Focus.Outline : Focus.Body,
        });
        return w_commandResult;

    }

    /**
     * * Creates, while preserving the top gnx of a section of tree outline, from the clipboard content.
     */
    public async pasteAsCloneNode(
        p_node?: ArchivedPosition,
        p_fromOutline?: boolean
    ): Promise<LeoBridgePackage | undefined> {

        await this._isBusyTriggerSave(false, true);

        const text = await this.asyncGetTextFromClipboard();

        const w_commandResult = this.nodeCommand({
            action: Constants.LEOBRIDGE.PASTE_CLONE_PNODE,
            node: p_node,
            refreshType: { tree: true, body: true, states: true },
            name: text,
            finalFocus: p_fromOutline ? Focus.Outline : Focus.Body,
        });
        return w_commandResult;
    }

    /**
     * * Creates, while preserving the top gnx of a section of tree outline, from the clipboard content.
     */
    public async pasteAsTemplate(
        p_node?: ArchivedPosition,
        p_fromOutline?: boolean
    ): Promise<LeoBridgePackage | undefined> {

        await this._isBusyTriggerSave(false, true);

        const text = await this.asyncGetTextFromClipboard();

        const w_commandResult = this.nodeCommand({
            action: Constants.LEOBRIDGE.PASTE_AS_TEMPLATE,
            node: p_node,
            refreshType: { tree: true, body: true, states: true },
            name: text,
            finalFocus: p_fromOutline ? Focus.Outline : Focus.Body,
        });
        return w_commandResult;
    }

    /**
     * * Asks for uA name, and value, then sets is on the server
     */
    public async setUa(): Promise<unknown> {
        let w_name = "";

        await this._isBusyTriggerSave(false);

        let w_uaName = await vscode.window.showInputBox({
            title: Constants.USER_MESSAGES.SET_UA_NAME_TITLE,
            prompt: Constants.USER_MESSAGES.SET_UA_NAME_PROMPT,
            placeHolder: Constants.USER_MESSAGES.SET_UA_NAME_PLACEHOLDER
        });
        // trim string and re-check if valid string
        if (w_uaName && w_uaName.trim()) {
            w_uaName = w_uaName.trim();
            w_name = w_uaName;

            const w_uaVal = await vscode.window.showInputBox({
                title: Constants.USER_MESSAGES.SET_UA_VAL_TITLE,
                prompt: Constants.USER_MESSAGES.SET_UA_VAL_PROMPT,
                placeHolder: Constants.USER_MESSAGES.SET_UA_VAL_PLACEHOLDER
            });

            if (w_name && !(typeof w_uaVal === 'undefined' || w_uaVal === null)) {
                // ok got both name and val
                return this.sendAction(
                    Constants.LEOBRIDGE.SET_UA_MEMBER,
                    { name: w_name, value: w_uaVal }
                ).then((_p_resultTag: LeoBridgePackage) => {
                    this.setupRefresh(
                        Focus.NoChange,
                        {
                            tree: true,
                            // body: false,
                            // documents: false,
                            // buttons: false,
                            // states: false,
                        }
                    );
                    this.launchRefresh();
                });
            }

        }

        return Promise.resolve(); // canceled

    }

    /**
     * * Replaces the system's clipboard with the given string
     * @param p_string actual string content to go onto the clipboard
     * @returns a promise that resolves when the string is put on the clipboard
     */
    public replaceClipboardWith(p_string: string): Thenable<void> {
        this._clipboardContent = p_string; // also set immediate clipboard string
        return vscode.env.clipboard.writeText(p_string);
    }

    /**
     * * Asynchronous clipboards getter
     * Get the system's clipboard contents and returns a promise
     * Also puts it in the global clipboardContents variable
     * @returns a promise of the clipboard string content
     */
    public async asyncGetTextFromClipboard(): Promise<string> {
        const s = await vscode.env.clipboard.readText();
        // Set immediate clipboard string for future read
        this._clipboardContent = s;
        // Return from synchronous clipboards getter
        return this.getTextFromClipboard();
    }

    /**
     * * Synchronous clipboards getter
     * @returns the global variable 'clipboardContent' that was set by asyncGetTextFromClipboard
     */
    public getTextFromClipboard(): string {
        return this._clipboardContent;
    }

    /**
     * Put UNL of current node on the clipboard. 
     * @para optional unlType to specify type.
     */
    public unlToClipboard(unlType?: UnlType): Thenable<void> {

        if (!utils.compareVersions(this.serverVersion, { major: 1, minor: 0, patch: 10 })) {
            return Promise.resolve();
        }
        // "shortGnx" | "fullGnx" | "shortLegacy" | "fullLegacy"
        let short = unlType && unlType.includes('short');
        let legacy = unlType && unlType.includes('Legacy');
        // IF SERVER VERSION >= 10 get unl action !
        return this.sendAction(Constants.LEOBRIDGE.GET_UNL, { short: short, legacy: legacy })
            .then((p_package: LeoBridgePackage) => {
                if (p_package.unl) {
                    return this.replaceClipboardWith(p_package.unl);
                }
            });
    }

    /**
     * * Mimic vscode's CTRL+P to find any position by it's headline
     */
    public async gotoAnywhere(): Promise<unknown> {
        await this._isBusyTriggerSave(false);

        const q_positions: Thenable<vscode.QuickPickItem[]> = this.sendAction(
            Constants.LEOBRIDGE.GET_POSITION_DATA
        ).then((p_result: LeoBridgePackage) => {
            if (p_result["position-data-dict"]) {

                const allPositions: ChosePositionItem[] = [];
                // Options for date to look like : Saturday, September 17, 2016
                const w_dateOptions: Intl.DateTimeFormatOptions = { weekday: "long", year: 'numeric', month: "long", day: 'numeric' };

                Object.values(p_result["position-data-dict"]).forEach(p_position => {
                    let w_description = p_position.gnx; // Defaults as gnx.
                    const w_gnxParts = w_description.split('.');
                    const dateString = w_gnxParts[1] ? w_gnxParts[1] : "";

                    if (w_gnxParts.length === 3 && dateString.length === 14 && /^\d+$/.test(dateString)) {
                        // legit 3 part numeric gnx, so build a string date
                        const dateString = w_gnxParts[1];
                        const w_year = +dateString.substring(0, 4); // unary + operator to convert the strings to numbers.
                        const w_month = +dateString.substring(4, 6);
                        const w_day = +dateString.substring(6, 8);
                        const w_date = new Date(w_year, w_month - 1, w_day);
                        w_description = `by ${w_gnxParts[0]} on ${w_date.toLocaleDateString("en-US", w_dateOptions)}`;
                    }
                    allPositions.push({
                        label: p_position.headline,
                        position: p_position,
                        description: w_description
                    });
                });

                return allPositions;
            } else {
                return [];
            }
        });

        const w_options: vscode.QuickPickOptions = {
            placeHolder: Constants.USER_MESSAGES.SEARCH_POSITION_BY_HEADLINE
        };

        const p_picked = await vscode.window.showQuickPick(q_positions, w_options);

        if (p_picked && p_picked.label) {
            return this.sendAction(
                Constants.LEOBRIDGE.SET_SELECTED_NODE,
                utils.buildNodeCommand((p_picked as ChosePositionItem).position)
            ).then((p_resultTag: LeoBridgePackage) => {
                this.setupRefresh(
                    Focus.Body, // Finish in body pane given explicitly because last focus was in input box.
                    {
                        tree: true,
                        body: true,
                        // documents: false,
                        // buttons: false,
                        states: true,
                    },
                    p_resultTag.node
                );
                this.launchRefresh();
            });
        }

        return Promise.resolve(undefined); // Canceled

    }

    /**
     * * Opens user interface to choose chapter
     * Offers choices of chapters below the input dialog to choose from,
     * and selects the chosen - or typed - chapter
     */
    public async chapterSelect(): Promise<unknown> {

        await this._isBusyTriggerSave(false);

        const q_chaptersList: Thenable<vscode.QuickPickItem[]> = this.sendAction(
            Constants.LEOBRIDGE.GET_CHAPTERS
        ).then((p_result: LeoBridgePackage) => {
            if (p_result.chapters && p_result.chapters.length) {
                const chapters: vscode.QuickPickItem[] = [];

                p_result.chapters.forEach(p_chapter => {
                    chapters.push({
                        label: p_chapter
                    });
                });

                return chapters;
            } else {
                return [];
            }
        });

        // Add Nav tab special commands
        const w_options: vscode.QuickPickOptions = {
            placeHolder: Constants.USER_MESSAGES.SELECT_CHAPTER_PROMPT
        };

        const p_picked = await vscode.window.showQuickPick(q_chaptersList, w_options);

        if (p_picked && p_picked.label) {
            return this.sendAction(
                Constants.LEOBRIDGE.CHAPTER_SELECT,
                { name: p_picked.label }
            ).then((p_resultTag: LeoBridgePackage) => {
                this.setupRefresh(
                    Focus.NoChange,
                    {
                        tree: true,
                        body: true,
                        // documents: false,
                        // buttons: false,
                        states: true,
                    },
                    p_resultTag.node
                );
                this.launchRefresh();
            });
        }

        return Promise.resolve(undefined); // Canceled

    }

    /**
     * * Opens the Nav tab and focus on nav text input
     * @param p_string an optional string to be placed in the nav text input
     */
    public async findQuick(p_string?: string, p_forceEnter?: boolean): Promise<unknown> {

        let w_panelID = '';
        let w_panel: vscode.WebviewView | undefined;

        if (this._lastTreeView === this._leoTreeExView) {
            w_panelID = Constants.FIND_EXPLORER_ID;
            w_panel = this._findPanelWebviewExplorerView;
        } else {
            w_panelID = Constants.FIND_ID;
            w_panel = this._findPanelWebviewView;
        }

        await vscode.commands.executeCommand(w_panelID + '.focus');

        if (w_panel && w_panel.show && !w_panel.visible) {
            w_panel.show(false);
        }
        const w_message: { [key: string]: string | boolean } = { type: 'selectNav' };
        if (p_string && p_string.trim()) {
            w_message["text"] = p_string.trim();
        }
        if (p_forceEnter) {
            w_message["forceEnter"] = true;
        }
        if (w_panel) {
            void w_panel.webview.postMessage(w_message);
        } else {
            setTimeout(() => {
                let w_panel: vscode.WebviewView | undefined;
                if (this._lastTreeView === this._leoTreeExView) {
                    w_panel = this._findPanelWebviewExplorerView;
                } else {
                    w_panel = this._findPanelWebviewView;
                }
                void w_panel?.webview.postMessage(w_message);
            }, 290);
        }

        return Promise.resolve();

    }

    /**
     * * Opens the Nav tab with the selected text as the search string.
     */
    public findQuickSelected(): Thenable<unknown> {
        if (vscode.window.activeTextEditor) {
            const editor = vscode.window.activeTextEditor;
            const selection = editor.selection;
            if (!selection.isEmpty) {
                const text = editor.document.getText(selection).replace(/\r\n/g, "\n");
                return this.findQuick(text, true);
            }
        }
        return this.findQuick("", true);
    }

    /**
     * * Lists all nodes in reversed gnx order, newest to oldest.
     */
    public async findQuickTimeline(): Promise<unknown> {
        await this.sendAction(Constants.LEOBRIDGE.FIND_QUICK_TIMELINE);
        this.leoGotoProvider.refreshTreeRoot();
        return this.showGotoPane();
    }


    /**
     * * Lists all nodes that are changed (aka "dirty") since last save.
     */
    public async findQuickChanged(): Promise<unknown> {
        await this.sendAction(Constants.LEOBRIDGE.FIND_QUICK_CHANGED);
        this.leoGotoProvider.refreshTreeRoot();
        return this.showGotoPane();
    }

    /**
     * * Lists nodes from c.nodeHistory.
     */
    public async findQuickHistory(): Promise<unknown> {
        await this.sendAction(Constants.LEOBRIDGE.FIND_QUICK_HISTORY);
        this.leoGotoProvider.refreshTreeRoot();
        return this.showGotoPane();
    }

    /**
     * * List all marked nodes.
     */
    public async findQuickMarked(p_preserveFocus?: boolean): Promise<unknown> {
        await this.sendAction(Constants.LEOBRIDGE.FIND_QUICK_MARKED);
        this.leoGotoProvider.refreshTreeRoot();
        if (
            p_preserveFocus && (
                (this._findPanelWebviewView && this._findPanelWebviewView.visible) ||
                (this._findPanelWebviewExplorerView && this._findPanelWebviewExplorerView.visible)
            )
        ) {
            return Promise.resolve();
        }
        return this.showGotoPane();
    }

    /**
     * * Opens goto and focus in depending on passed options
     */
    public showGotoPane(p_options?: { preserveFocus?: boolean }): Thenable<unknown> {
        let w_panelID = '';
        let w_panel: vscode.WebviewView | undefined;
        if (this._lastTreeView === this._leoTreeExView) {
            w_panelID = Constants.FIND_EXPLORER_ID;
            w_panel = this._findPanelWebviewExplorerView;
        } else {
            w_panelID = Constants.FIND_ID;
            w_panel = this._findPanelWebviewView;
        }
        return vscode.commands.executeCommand(w_panelID + '.focus', p_options).then((_p_result) => {
            if (w_panel && w_panel.show && !w_panel.visible) {
                w_panel.show(false);
            }
            const w_message: { [key: string]: string } = { type: 'showGoto' };
            if (w_panel) {
                void w_panel.webview.postMessage(w_message);
            } else {
                setTimeout(() => {
                    let w_panel: vscode.WebviewView | undefined;
                    if (this._lastTreeView === this._leoTreeExView) {
                        w_panel = this._findPanelWebviewExplorerView;
                    } else {
                        w_panel = this._findPanelWebviewView;
                    }
                    void w_panel?.webview.postMessage(w_message);
                }, 290);
            }
        });
    }

    /**
     * * Handles a click (selection) of a nav panel node: Sends 'goto' command to server.
     */
    public async gotoNavEntry(p_node: LeoGotoNode): Promise<unknown> {
        if (!p_node) {
            console.log('ERROR NO NODE TO SHOW IN GOTO PANE!');
            return;
        }

        await this._isBusyTriggerSave(false, true);
        this.leoGotoProvider.resetSelectedNode(p_node); // Inform controller of last index chosen

        if (p_node.entryType === 'tag') {
            // * For when the nav input IS CLEARED : GOTO PANE LISTS ALL TAGS!
            // The node clicked was one of the tags, pre-fill the nac search with this tag and open find pane
            let w_string: string = p_node.label as string;
            let w_panelID = '';
            let w_panel: vscode.WebviewView | undefined;
            if (this._lastTreeView === this._leoTreeExView) {
                w_panelID = Constants.FIND_EXPLORER_ID;
                w_panel = this._findPanelWebviewExplorerView;
            } else {
                w_panelID = Constants.FIND_ID;
                w_panel = this._findPanelWebviewView;
            }
            await vscode.commands.executeCommand(w_panelID + '.focus');

            if (this._findPanelWebviewView && this._findPanelWebviewView.visible) {
                w_panel = this._findPanelWebviewView;
            } else if (this._findPanelWebviewExplorerView && this._findPanelWebviewExplorerView.visible) {
                w_panel = this._findPanelWebviewExplorerView;
            }

            if (w_panel && w_panel.show && !w_panel.visible) {
                w_panel.show(false);
            }
            const w_message: { [key: string]: string; } = { type: 'selectNav' };
            if (w_string && w_string.trim()) {
                w_message["text"] = w_string.trim();
            }
            await w_panel!.webview.postMessage(w_message);
            // Do search

            setTimeout(async () => {
                await this.sendAction(Constants.LEOBRIDGE.NAV_SEARCH);
                this.leoGotoProvider.refreshTreeRoot();
                await this.showGotoPane({ preserveFocus: true }); // show but dont change focus
            }, 10);

        } else if (p_node.entryType !== 'generic' && p_node.entryType !== 'parent') {
            // Other and not a tag so just locate the entry in either body or outline
            const p_navEntryResult = await this.sendAction(
                Constants.LEOBRIDGE.GOTO_NAV_ENTRY,
                { key: p_node.key }
            );

            if (!p_navEntryResult.focus) {
                return vscode.window.showInformationMessage(Constants.USER_MESSAGES.SEARCH_NOT_FOUND);
            } else {
                let w_revealTarget = Focus.Body;
                const w_focus = p_navEntryResult.focus.toLowerCase();

                if (w_focus.includes('tree') || w_focus.includes('head')) {
                    // tree
                    w_revealTarget = Focus.Outline;
                    this.showOutlineIfClosed = true;
                } else {
                    this.showBodyIfClosed = true;
                }

                this.setupRefresh(
                    // ! KEEP FOCUS ON GOTO PANE !
                    Focus.Goto,
                    {
                        tree: true,
                        body: true,
                        scroll: w_revealTarget === Focus.Body,
                        // documents: false,
                        // buttons: false,
                        states: true,
                    },
                    p_navEntryResult.node
                );

                return this.launchRefresh();
            }
        }
    }

    /**
     * Reveals and selects the specific nav entry in the results of the nav pane.
     */
    public revealGotoNavEntry(p_index: number, p_preserveFocus?: boolean): void {
        if (this._findPanelWebviewExplorerView && this._findPanelWebviewExplorerView.visible) {
            void this._findPanelWebviewExplorerView!.webview.postMessage({ type: 'revealNavEntry', value: p_index, preserveFocus: p_preserveFocus });
        } else if (this._findPanelWebviewView && this._findPanelWebviewView.visible) {
            void this._findPanelWebviewView!.webview.postMessage({ type: 'revealNavEntry', value: p_index, preserveFocus: p_preserveFocus });
        }
    }

    /**
     * * Goto the next, previous, first or last nav entry via arrow keys in
     */
    public navigateNavEntry(p_nav: LeoGotoNavKey): void {
        this.leoGotoProvider.navigateNavEntry(p_nav);
    }

    /**
     * * Handles an enter press in the 'nav pattern' input
     */
    public async navEnter(): Promise<LeoBridgePackage> {
        await this._isBusyTriggerSave(false, true);
        const w_package = await this.sendAction(
            Constants.LEOBRIDGE.NAV_SEARCH
        );
        this.showNavResults();
        return w_package;
    }

    /**
     * * Handles a debounced text change in the nav pattern input box
     */
    public async navTextChange(): Promise<LeoBridgePackage> {
        await this._isBusyTriggerSave(false, true);
        const w_package = await this.sendAction(
            Constants.LEOBRIDGE.NAV_HEADLINE_SEARCH
        );
        this.showNavResults();
        return w_package;
    }

    /**
     * * CLears the nav search results of the goto pane
     */
    public async navTextClear(): Promise<LeoBridgePackage> {
        await this._isBusyTriggerSave(false, true);
        const w_package = await this.sendAction(
            Constants.LEOBRIDGE.NAV_CLEAR
        );
        this.leoGotoProvider.refreshTreeRoot();
        return w_package;
    }

    /**
     * * Opens the find panel and focuses on the "find/replace" field, selecting all it's content.
     */
    public startSearch(): void {
        this._isBusyTriggerSave(false, true);
        // already instantiated & shown ?
        let w_panel: vscode.WebviewView | undefined;

        if (this._findPanelWebviewView && this._findPanelWebviewView.visible) {
            w_panel = this._findPanelWebviewView;
        } else if (this._findPanelWebviewExplorerView && this._findPanelWebviewExplorerView.visible) {
            w_panel = this._findPanelWebviewExplorerView;
        }

        if (w_panel) {
            // ALREADY VISIBLE FIND PANEL
            this._findNeedsFocus = 0;
            w_panel.webview.postMessage({ type: 'selectFind' });
            return;
        }

        this._findNeedsFocus = 1;
        setTimeout(() => {
            this._findNeedsFocus = 0;
        }, 250);
        let w_panelID = '';
        if (this._lastTreeView === this._leoTreeExView) {
            w_panelID = Constants.FIND_EXPLORER_ID;
        } else {
            w_panelID = Constants.FIND_ID;
        }
        vscode.commands.executeCommand(w_panelID + '.focus');
        return;
    }

    /**
     * Check if search input should be forced-focused again
     */
    public checkForceFindFocus(_p_fromInit: boolean): void {
        if (this._findNeedsFocus) {
            let message = 'selectFind';
            if (this._findNeedsFocus === 2) {
                message = 'selectNav';
            }
            this._findNeedsFocus = 0; // Set false before timeout.
            setTimeout(() => {
                let w_panel: vscode.WebviewView | undefined;
                if (this._findPanelWebviewView && this._findPanelWebviewView.visible) {
                    w_panel = this._findPanelWebviewView;
                } else if (this._findPanelWebviewExplorerView && this._findPanelWebviewExplorerView.visible) {
                    w_panel = this._findPanelWebviewExplorerView;
                }
                if (w_panel) {
                    this._findNeedsFocus = 0;
                    w_panel.webview.postMessage({ type: message });
                }
            }, 60);

        }
    }

    /**
     * * Get a find pattern string input from the user
     * @param p_replace flag for doing a 'replace' instead of a 'find'
     * @param p_uniqueRegex flag for using the "all unique regex" commands
     * @returns Promise of string or undefined if cancelled
     */
    private _inputFindPattern(p_replace?: boolean, p_value?: string): Thenable<string | undefined> {
        let w_title, w_prompt, w_placeHolder;
        w_title = p_replace ? Constants.USER_MESSAGES.REPLACE_TITLE : Constants.USER_MESSAGES.SEARCH_TITLE;
        w_prompt = p_replace ? Constants.USER_MESSAGES.REPLACE_PROMPT : Constants.USER_MESSAGES.SEARCH_PROMPT;
        w_placeHolder = p_replace ? Constants.USER_MESSAGES.REPLACE_PLACEHOLDER : Constants.USER_MESSAGES.SEARCH_PLACEHOLDER;
        return vscode.window.showInputBox({
            title: w_title,
            prompt: w_prompt,
            value: p_value,
            placeHolder: w_placeHolder,
        });
    }

    /**
     * * Find next / previous commands
     * @param p_fromOutline
     * @param p_reverse
     * @returns Promise that resolves when the "launch refresh" is started
     */
    public async find(p_fromOutline: boolean, p_reverse: boolean): Promise<any> {
        const w_action: string = p_reverse
            ? Constants.LEOBRIDGE.FIND_PREVIOUS
            : Constants.LEOBRIDGE.FIND_NEXT;

        await this._isBusyTriggerSave(false, true);

        const p_findResult = await this.sendAction(w_action, { fromOutline: !!p_fromOutline });

        this.findFocusTree = false; // Reset flag for headline range

        if (!p_findResult.found || !p_findResult.focus) {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.SEARCH_NOT_FOUND);
        } else {
            let w_finalFocus = Focus.Body;
            const w_focus = p_findResult.focus.toLowerCase();
            if (w_focus.includes('tree') || w_focus.includes('head')) {
                // tree
                this._lastCommandFindEndOutline = 2;
                w_finalFocus = Focus.Outline;
                this.showOutlineIfClosed = true;
                // * SETUP HEADLINE RANGE
                this.findFocusTree = true;
                // Default to 0,0 if range not available
                const range = p_findResult.range ? p_findResult.range : [0, 0];
                this.findHeadlineRange = [range[0], range[1]];
                this.findHeadlinePosition = p_findResult.node;
            } else {
                this.showBodyIfClosed = true;
            }
            this.setupRefresh(
                w_finalFocus, // ! Unlike gotoNavEntry, this sets focus in outline -or- body.
                {
                    tree: true, // HAVE to refresh tree because find folds/unfolds only result outline paths
                    body: true,
                    scroll: p_findResult.found && w_finalFocus === Focus.Body,
                    // documents: false,
                    // buttons: false,
                    states: true,
                },
                p_findResult.node!,
                this.findFocusTree
            );
            this.launchRefresh();
        }
    }

    /**
     * * find-var or find-def commands
     * @param p_def find-def instead of find-var
     * @returns Promise that resolves when the "launch refresh" is started
     */
    public async findSymbol(): Promise<any> {

        await this._isBusyTriggerSave(false, true);

        const p_findResult = await this.sendAction(Constants.LEOBRIDGE.FIND_DEF, { fromOutline: false });

        if (!p_findResult.found) {
            return vscode.window.showInformationMessage(Constants.USER_MESSAGES.SEARCH_NOT_FOUND);
        } else {

            if (p_findResult.use_nav_pane) {
                this.leoGotoProvider.refreshTreeRoot();
                this.showGotoPane({ preserveFocus: true }); // show but dont change focus

                let w_revealTarget = Focus.Body;
                const w_focus = p_findResult.focus ? p_findResult.focus.toLowerCase() : "";

                if (w_focus.includes('tree') || w_focus.includes('head')) {
                    // tree
                    w_revealTarget = Focus.Outline;
                    this.showOutlineIfClosed = true;
                } else {
                    this.showBodyIfClosed = true;
                }
                this.loadSearchSettings(); // The nav text should now be set.
                this.setupRefresh(
                    // ! KEEP FOCUS ON GOTO PANE !
                    Focus.Goto,
                    {
                        tree: true,
                        body: true,
                        scroll: w_revealTarget === Focus.Body,
                        // documents: false,
                        // buttons: false,
                        states: true,
                    },
                    p_findResult.node
                );
            } else {
                // clones
                this.setupRefresh(

                    Focus.NoChange,
                    {
                        tree: true,
                        body: true,
                        // documents: false,
                        // buttons: false,
                        states: true,
                    },
                    p_findResult.node
                );
            }

            return this.launchRefresh();
        }

    }

    /**
     * * Replace / Replace-Then-Find commands
     * @param p_fromOutline
     * @param p_thenFind
     * @returns Promise that resolves when the "launch refresh" is started
     */
    public async replace(p_fromOutline: boolean, p_thenFind: boolean): Promise<any> {
        const w_action: string = p_thenFind
            ? Constants.LEOBRIDGE.REPLACE_THEN_FIND
            : Constants.LEOBRIDGE.REPLACE;

        await this._isBusyTriggerSave(false, true);

        const w_replaceResult = await this.sendAction(w_action, { fromOutline: !!p_fromOutline });

        this.findFocusTree = false; // Reset flag for headline range

        let w_finalFocus = Focus.Body;
        let w_focus = w_replaceResult.focus ? w_replaceResult.focus : "body";
        w_focus = w_focus.toLowerCase();
        if (w_focus.includes('tree') || w_focus.includes('head')) {
            // tree
            this._lastCommandFindEndOutline = 2;
            w_finalFocus = Focus.Outline;
            this.showOutlineIfClosed = true;
            // * SETUP HEADLINE RANGE
            this.findFocusTree = true;
            // Default to 0,0 if range not available
            const range = w_replaceResult.range ? w_replaceResult.range : [0, 0];
            this.findHeadlineRange = [range[0], range[1]];
            this.findHeadlinePosition = w_replaceResult.node;
        } else {
            this.showBodyIfClosed = true;
        }
        this.setupRefresh(
            w_finalFocus, // ! Unlike gotoNavEntry, this sets focus in outline -or- body.
            {
                tree: true, // HAVE to refresh tree because find folds/unfolds only result outline paths
                body: true,
                scroll: w_replaceResult.found && w_finalFocus === Focus.Body,
                // documents: false,
                // buttons: false,
                states: true,
            },
            w_replaceResult.node!,
            this.findFocusTree
        );
        this.launchRefresh();
    }

    /**
     * Interactive Search to implement search-backward, re-search, word-search. etc.
     * HAS SPECIAL SYSTEM WITH _lastCommandFindEndOutline TO FAKE FOCUS ZONE PROVENANCE DETECTION
     */
    public async interactiveSearch(p_backward: boolean, p_regex: boolean, p_word: boolean): Promise<unknown> {

        this._isBusyTriggerSave(false, true);

        if (p_regex && p_word) {
            console.error('interactiveSearch called with both "WORD" and "REGEX"');
            return;
        }

        let w_searchTitle = Constants.USER_MESSAGES.INT_SEARCH_TITLE;
        let w_searchPrompt = Constants.USER_MESSAGES.INT_SEARCH_PROMPT;
        let w_searchPlaceholder = Constants.USER_MESSAGES.SEARCH_PLACEHOLDER;

        if (p_backward) {
            w_searchTitle += Constants.USER_MESSAGES.INT_SEARCH_BACKWARD;
        }
        if (p_regex) {
            w_searchTitle = Constants.USER_MESSAGES.INT_SEARCH_REGEXP + w_searchTitle;
        }
        if (p_word) {
            w_searchTitle = Constants.USER_MESSAGES.INT_SEARCH_WORD + w_searchTitle;
        }

        const disposables: vscode.Disposable[] = [];

        // Get value from find panel input
        const w_startValue = this._lastSettingsUsed!.findText === Constants.USER_MESSAGES.FIND_PATTERN_HERE ? '' : this._lastSettingsUsed!.findText;

        try {
            return await new Promise<unknown>((resolve, _reject) => {
                const input = vscode.window.createInputBox();
                input.title = w_searchTitle;
                input.value = w_startValue;
                input.prompt = w_searchPrompt;
                input.placeholder = w_searchPlaceholder;

                disposables.push(
                    input.onDidAccept(async () => {
                        if (!input.value) {
                            input.hide();
                            return resolve(true); // Cancelled with escape or empty string.
                        }
                        const value = input.value; // maybe this was replace.

                        const w_action: string = Constants.LEOBRIDGE.INTERACTIVE_SEARCH;

                        const w_options: { [key: string]: any } = {
                            findText: value,
                            word: p_word,
                            regex: p_regex,
                            backward: p_backward,
                        };

                        // KEEP undefined to re-use last starting focus zone (outline in this case)
                        if (!this._lastCommandFindEndOutline) {
                            // TODO : Send real parameter when possible (vscode prevents focus detection)
                            w_options.fromOutline = "false"; // Not from a find ending on outline, so set to false.
                        }
                        const p_findResult = await this.sendAction(
                            w_action,
                            w_options
                        );

                        this.findFocusTree = false; // Reset flag for headline range

                        if (!p_findResult.found || !p_findResult.focus) {
                            vscode.window.showInformationMessage(Constants.USER_MESSAGES.SEARCH_NOT_FOUND);
                            input.hide();
                        } else {
                            let w_finalFocus = Focus.Body;
                            const w_focus = p_findResult.focus.toLowerCase();
                            if (w_focus.includes('tree') || w_focus.includes('head')) {
                                // tree
                                this._lastCommandFindEndOutline = 2;
                                w_finalFocus = Focus.Outline;
                                this.showOutlineIfClosed = true;
                                // * SETUP HEADLINE RANGE
                                this.findFocusTree = true;
                                // Default to 0,0 if range not available
                                const range = p_findResult.range ? p_findResult.range : [0, 0];
                                this.findHeadlineRange = [range[0], range[1]];
                                this.findHeadlinePosition = p_findResult.node;
                            } else {
                                this.showBodyIfClosed = true;
                            }
                            this.loadSearchSettings();
                            this.setupRefresh(
                                w_finalFocus, // ! Unlike gotoNavEntry, this sets focus in outline -or- body.
                                {
                                    tree: true, // HAVE to refresh tree because find folds/unfolds only result outline paths
                                    body: true,
                                    scroll: p_findResult.found && w_finalFocus === Focus.Body,
                                    // documents: false,
                                    // buttons: false,
                                    states: true,
                                },
                                p_findResult.node!,
                                this.findFocusTree
                            );
                            this.launchRefresh();
                            input.hide();
                        }

                    }),
                    input.onDidHide(() => {
                        return resolve(true);
                    })
                );
                if (this._interactiveSearchInputBox) {
                    this._interactiveSearchInputBox.dispose(); // just in case.
                }
                this._interactiveSearchInputBox = input;
                this._interactiveSearchInputBox.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
            this._interactiveSearchInputBox?.hide();
        }

    }

    /**
     * * Find / Replace All
     * @returns Promise of LeoBridgePackage from execution or undefined if cancelled
     */
    public findAll(p_replace: boolean): Promise<any> {
        const w_action: string = p_replace
            ? Constants.LEOBRIDGE.REPLACE_ALL
            : Constants.LEOBRIDGE.FIND_ALL;

        let w_searchString: string = this._lastSettingsUsed!.findText;
        let w_replaceString: string = this._lastSettingsUsed!.replaceText;

        const w_startValue = this._lastSettingsUsed!.findText === Constants.USER_MESSAGES.FIND_PATTERN_HERE ? '' : this._lastSettingsUsed!.findText;
        const w_startReplace = this._lastSettingsUsed?.replaceText;

        return this._isBusyTriggerSave(false, true)
            .then((_p_saveResult) => {
                return this._inputFindPattern(false, w_startValue)
                    .then((p_findString) => {
                        if (!p_findString) {
                            return true; // Cancelled with escape or empty string.
                        }
                        w_searchString = p_findString;
                        if (p_replace) {
                            return this._inputFindPattern(true, w_startReplace).then((p_replaceString) => {
                                if (p_replaceString === undefined) {
                                    return true;
                                }
                                w_replaceString = p_replaceString;
                                return false;
                            });
                        }
                        return false;
                    });
            })
            .then((p_cancelled: boolean) => {
                if (this._lastSettingsUsed && !p_cancelled) {
                    this._lastSettingsUsed.findText = w_searchString;
                    this._lastSettingsUsed.replaceText = w_replaceString;
                    this.saveSearchSettings(this._lastSettingsUsed); // No need to wait, will be stacked.
                    return this.sendAction(w_action)
                        .then((p_findResult: LeoBridgePackage) => {
                            let w_finalFocus = Focus.Body;
                            const w_focus = p_findResult.focus!.toLowerCase();
                            if (w_focus.includes('tree') || w_focus.includes('head')) {
                                // tree
                                w_finalFocus = Focus.Outline;
                            }
                            this.loadSearchSettings();
                            this.setupRefresh(
                                w_finalFocus,
                                {
                                    tree: true,
                                    body: true,
                                    // documents: false,
                                    // buttons: false,
                                    states: true
                                }
                            );
                            this.launchRefresh();
                        });
                }
            });
    }

    /**
     * * Clone Find All / Marked / Flattened
     * @param p_marked flag for finding marked nodes
     * @param p_flat flag to get flattened results
     * @returns Promise of LeoBridgePackage from execution or undefined if cancelled
     */
    public cloneFind(p_marked: boolean, p_flat: boolean): Promise<any> {
        let w_searchString: string = this._lastSettingsUsed!.findText;
        let w_action: string;
        if (p_marked) {
            w_action = p_flat
                ? Constants.LEOBRIDGE.CLONE_FIND_FLATTENED_MARKED
                : Constants.LEOBRIDGE.CLONE_FIND_MARKED;
        } else {
            w_action = p_flat
                ? Constants.LEOBRIDGE.CLONE_FIND_ALL_FLATTENED
                : Constants.LEOBRIDGE.CLONE_FIND_ALL;
        }

        if (p_marked) {
            // don't use find methods.
            return this.nodeCommand({
                action: w_action,
                node: undefined,
                refreshType: { tree: true, body: true, states: true },
                finalFocus: Focus.NoChange,
            }) || Promise.resolve();
        }

        const w_startValue = this._lastSettingsUsed!.findText === Constants.USER_MESSAGES.FIND_PATTERN_HERE ? '' : this._lastSettingsUsed!.findText;

        return this._isBusyTriggerSave(false, true)
            .then(() => {
                return this._inputFindPattern(false, w_startValue)
                    .then((p_findString) => {
                        if (!p_findString) {
                            return true; // Cancelled with escape or empty string.
                        }
                        w_searchString = p_findString;
                        return false;
                    });
            })
            .then((p_cancelled: boolean) => {
                if (this._lastSettingsUsed && !p_cancelled) {
                    this._lastSettingsUsed.findText = w_searchString;
                    this.saveSearchSettings(this._lastSettingsUsed); // No need to wait, will be stacked.
                    return this.sendAction(w_action)
                        .then((p_cloneFindResult: LeoBridgePackage) => {
                            let w_finalFocus = Focus.Body;
                            const w_focus = p_cloneFindResult.focus!.toLowerCase();
                            if (w_focus.includes('tree') || w_focus.includes('head')) {
                                // tree
                                w_finalFocus = Focus.Outline;
                            }
                            this.loadSearchSettings();
                            this.setupRefresh(
                                w_finalFocus,
                                {
                                    tree: true,
                                    body: true,
                                    // documents: false,
                                    // buttons: false,
                                    states: true
                                }
                            );
                            this.launchRefresh();
                        });
                }
            });
    }

    /**
     * * Set search setting in the search webview
     * @param p_id string id of the setting name
     */
    public async setSearchSetting(p_id: string): Promise<unknown> {
        this._isBusyTriggerSave(false, true);
        // already instantiated & shown ?
        let w_panel: vscode.WebviewView | undefined;

        if (this._findPanelWebviewView && this._findPanelWebviewView.visible) {
            w_panel = this._findPanelWebviewView;
        } else if (this._findPanelWebviewExplorerView && this._findPanelWebviewExplorerView.visible) {
            w_panel = this._findPanelWebviewExplorerView;
        }

        if (w_panel) {
            // ALREADY VISIBLE FIND PANEL
            w_panel!.webview.postMessage({ type: 'setSearchSetting', id: p_id });
            return;
        }
        // Find panel to show based on last regular outline pane visible.
        let w_panelID = '';
        if (this._lastTreeView === this._leoTreeExView) {
            w_panelID = Constants.FIND_EXPLORER_ID;
        } else {
            w_panelID = Constants.FIND_ID;
        }
        await vscode.commands.executeCommand(w_panelID + '.focus');

        return new Promise((p_resolve, _p_reject) => {
            setTimeout(() => {
                if (this._findPanelWebviewView && this._findPanelWebviewView.visible) {
                    w_panel = this._findPanelWebviewView;
                } else if (this._findPanelWebviewExplorerView && this._findPanelWebviewExplorerView.visible) {
                    w_panel = this._findPanelWebviewExplorerView;
                }
                if (w_panel) {
                    w_panel!.webview.postMessage({ type: 'setSearchSetting', id: p_id });
                }
                p_resolve(undefined);
            }, 250);
        });
    }

    /**
     * Send the new content of the goto pane to the findPanel.
     */
    public setGotoContent(): void {
        const content = this.leoGotoProvider.nodeList.map(
            (gotoNode) => {
                return {
                    "tooltip": gotoNode.tooltip,
                    "key": gotoNode.key,
                    "entryType": gotoNode.entryType,
                    "description": gotoNode.description,
                    "label": gotoNode.leoPaneLabel
                };
            }
        );
        if (this._findPanelWebviewExplorerView && this._findPanelWebviewExplorerView.visible) {
            void this._findPanelWebviewExplorerView!.webview.postMessage({ type: 'refreshGoto', gotoContent: content });
        }
        if (this._findPanelWebviewView && this._findPanelWebviewView.visible) {
            void this._findPanelWebviewView!.webview.postMessage({ type: 'refreshGoto', gotoContent: content });
        }
    }

    /**
     * * Gets the search settings from Leo, and applies them to the find panel webviews
     */
    public loadSearchSettings(): void {
        this.sendAction(Constants.LEOBRIDGE.GET_SEARCH_SETTINGS).then(
            (p_result: LeoBridgePackage) => {
                const w_searchSettings: LeoGuiFindTabManagerSettings = p_result.searchSettings!;
                const w_settings: LeoSearchSettings = {
                    isTag: w_searchSettings.is_tag,
                    navText: w_searchSettings.nav_text,
                    showParents: w_searchSettings.show_parents,
                    searchOptions: w_searchSettings.search_options,
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
                    // 0, 1, 2 or 3 for outline, sub-outline, node-only or file-only.
                    searchScope:
                        0 +
                        (w_searchSettings.suboutline_only ? 1 : 0) +
                        (w_searchSettings.node_only ? 2 : 0) +
                        (w_searchSettings.file_only ? 3 : 0),
                };
                if (w_settings.searchScope > 3) {
                    console.error('searchScope SHOULD BE 0, 1, 2, 3 only: ', w_settings.searchScope);
                }
                this._lastSettingsUsed = w_settings;
                if (this._findPanelWebviewExplorerView) {
                    this._findPanelWebviewExplorerView.webview.postMessage({
                        type: 'setSettings',
                        value: w_settings,
                    });
                }
                if (this._findPanelWebviewView) {
                    this._findPanelWebviewView.webview.postMessage({
                        type: 'setSettings',
                        value: w_settings,
                    });
                }
            }
        );
    }

    /**
     * * Send the settings to the Leo Bridge Server
     * @param p_settings the search settings to be set server side to affect next results
     * @returns the promise from the server call
     */
    public saveSearchSettings(p_settings: LeoSearchSettings): Promise<LeoBridgePackage> {
        this._lastSettingsUsed = p_settings;
        // convert to LeoGuiFindTabManagerSettings
        const w_settings: LeoGuiFindTabManagerSettings = {
            // Nav settings
            is_tag: p_settings.isTag,
            nav_text: p_settings.navText,
            show_parents: p_settings.showParents,
            search_options: p_settings.searchOptions,
            // Find/change strings...
            find_text: p_settings.findText,
            change_text: p_settings.replaceText,
            // Find options...
            ignore_case: p_settings.ignoreCase,
            mark_changes: p_settings.markChanges,
            mark_finds: p_settings.markFinds,
            node_only: !!(p_settings.searchScope === 2),
            file_only: !!(p_settings.searchScope === 3),
            pattern_match: p_settings.regExp,
            search_body: p_settings.searchBody,
            search_headline: p_settings.searchHeadline,
            suboutline_only: !!(p_settings.searchScope === 1),
            whole_word: p_settings.wholeWord,
        };
        return this.sendAction(
            Constants.LEOBRIDGE.SET_SEARCH_SETTINGS,
            { searchSettings: w_settings }
        );
    }

    /**
     * * Goto Global Line
     */
    public gotoGlobalLine(p_lineNumber?: number): void {
        if (p_lineNumber === null || p_lineNumber === undefined) {
            this.triggerBodySave(false)
                .then(() => {
                    return vscode.window.showInputBox({
                        title: Constants.USER_MESSAGES.TITLE_GOTO_GLOBAL_LINE,
                        placeHolder: Constants.USER_MESSAGES.PLACEHOLDER_GOTO_GLOBAL_LINE,
                        prompt: Constants.USER_MESSAGES.PROMPT_GOTO_GLOBAL_LINE,
                    });
                })
                .then((p_inputResult?: string) => {
                    if (p_inputResult) {
                        const w_line = parseInt(p_inputResult);
                        if (!isNaN(w_line)) {
                            this.sendAction(Constants.LEOBRIDGE.GOTO_GLOBAL_LINE, { line: w_line }).then((_p_resultGoto: LeoBridgePackage) => {
                                this.setupRefresh(Focus.Body, { tree: true, body: true, scroll: true, states: true, });
                                this.launchRefresh();
                            });
                        }
                    }
                });
        } else if (!isNaN(p_lineNumber)) {
            // p_lineNumber is a number
            this.sendAction(Constants.LEOBRIDGE.GOTO_GLOBAL_LINE, { line: p_lineNumber }).then((_p_resultGoto: LeoBridgePackage) => {
                this.setupRefresh(Focus.Body, { tree: true, body: true, states: true, });
                this.launchRefresh();
            });
        }
    }

    /**
     * * Tag Children
     */
    public tagChildren(): void {
        this.triggerBodySave(false)
            .then(() => {
                return vscode.window.showInputBox({
                    title: Constants.USER_MESSAGES.TITLE_TAG_CHILDREN,
                    placeHolder: Constants.USER_MESSAGES.PLACEHOLDER_TAG,
                    prompt: Constants.USER_MESSAGES.PROMPT_TAG,
                });
            })
            .then((p_inputResult?: string) => {
                if (p_inputResult && p_inputResult.trim()) {
                    p_inputResult = p_inputResult.trim();
                    // check for special chars first
                    if (p_inputResult.split(/(&|\||-|\^)/).length > 1) {
                        vscode.window.showInformationMessage(Constants.USER_MESSAGES.TAGS_CHARACTERS_ERROR);
                        return;
                    }
                    this.sendAction(
                        Constants.LEOBRIDGE.TAG_CHILDREN,
                        { tag: p_inputResult }
                    ).then((_p_resultTag: LeoBridgePackage) => {
                        this.setupRefresh(
                            Focus.NoChange,
                            {
                                tree: true,
                                // body: false,
                                // documents: false,
                                // buttons: false,
                                states: true,
                            }
                        );
                        this.launchRefresh();
                    });
                }
            });
    }


    /**
     * * Tag Node
     */
    public tagNode(p_node?: ArchivedPosition): void {
        this.triggerBodySave(false)
            .then(() => {
                return vscode.window.showInputBox({
                    title: Constants.USER_MESSAGES.TITLE_TAG_NODE,
                    placeHolder: Constants.USER_MESSAGES.PLACEHOLDER_TAG,
                    prompt: Constants.USER_MESSAGES.PROMPT_TAG,
                });
            })
            .then((p_inputResult?: string) => {

                if (p_inputResult && p_inputResult.trim()) {
                    p_inputResult = p_inputResult.trim();
                    // check for special chars first
                    if (p_inputResult.split(/(&|\||-|\^)/).length > 1) {
                        vscode.window.showInformationMessage(Constants.USER_MESSAGES.TAGS_CHARACTERS_ERROR);
                        return;
                    }
                    let w_param: { [key: string]: any; } = {};
                    if (p_node) {
                        w_param = utils.buildNodeCommand(p_node);
                    }
                    w_param.tag = p_inputResult;
                    this.sendAction(
                        Constants.LEOBRIDGE.TAG_NODE,
                        w_param
                    ).then((_p_resultTag: LeoBridgePackage) => {

                        this.setupRefresh(
                            Focus.NoChange,
                            {
                                tree: true,
                                // body: false,
                                // documents: false,
                                // buttons: false,
                                states: true,
                            }
                        );
                        this.launchRefresh();
                    });
                }
            });
    }

    /**
     * * Remove single Tag on selected node
     */
    public removeTag(p_node?: ArchivedPosition): void {

        if ((p_node && p_node.nodeTags) || (this.lastSelectedNode && this.lastSelectedNode.nodeTags)) {
            this.triggerBodySave(false)
                .then(() => {
                    return this.sendAction(
                        Constants.LEOBRIDGE.GET_UA,
                        p_node ? utils.buildNodeCommand(p_node) : undefined
                    );

                })
                .then((p_package: LeoBridgePackage) => {
                    if (p_package.ua && p_package.ua !== null) {

                        let uaQty = Object.keys(p_package.ua).length;
                        let tagQty = 0;
                        if (uaQty) {
                            tagQty = p_package.ua.__node_tags ? p_package.ua.__node_tags.length : 0;
                        }
                        if (tagQty) {
                            return p_package.ua.__node_tags;
                        }

                    } else {
                        return [];
                    }
                })
                .then((p_nodeTags: string[]) => {
                    if (!p_nodeTags.length) {
                        return "";
                    }
                    return vscode.window.showQuickPick(p_nodeTags, {
                        title: Constants.USER_MESSAGES.TITLE_REMOVE_TAG,
                        placeHolder: Constants.USER_MESSAGES.PLACEHOLDER_TAG,
                        canPickMany: false
                        // prompt: Constants.USER_MESSAGES.PROMPT_TAG,
                    });
                })
                .then((p_inputResult?: string) => {
                    if (p_inputResult && p_inputResult.trim()) {
                        let w_param: { [key: string]: any; } = {};
                        if (p_node) {
                            w_param = utils.buildNodeCommand(p_node);
                        }
                        w_param.tag = p_inputResult.trim();
                        this.sendAction(
                            Constants.LEOBRIDGE.REMOVE_TAG,
                            w_param
                        ).then((_p_resultTag: LeoBridgePackage) => {
                            this.setupRefresh(
                                Focus.NoChange,
                                {
                                    tree: true,
                                    // body: false,
                                    // documents: false,
                                    // buttons: false,
                                    states: true,
                                }
                            );
                            this.launchRefresh();
                        });
                    }
                });
        } else if (this.lastSelectedNode) {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.NO_TAGS_ON_NODE + this.lastSelectedNode.headline);
        } else {
            return;
        }

    }

    /**
     * * Remove all tags on selected node
     */
    public removeTags(p_node?: ArchivedPosition): void {
        if ((p_node && p_node.nodeTags) || (this.lastSelectedNode && this.lastSelectedNode.nodeTags)) {
            this.triggerBodySave(false)
                .then(() => {
                    this.sendAction(
                        Constants.LEOBRIDGE.REMOVE_TAGS,
                        p_node ? utils.buildNodeCommand(p_node) : undefined
                    ).then((_p_resultTag: LeoBridgePackage) => {
                        this.setupRefresh(
                            Focus.NoChange,
                            {
                                tree: true,
                                // body: false,
                                // documents: false,
                                // buttons: false,
                                states: true,
                            }
                        );
                        this.launchRefresh();
                    });
                });
        } else if (this.lastSelectedNode) {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.NO_TAGS_ON_NODE + this.lastSelectedNode.headline);
        } else {
            return;
        }
    }

    /**
     * * Clone Find Tag
     */
    public cloneFindTag(): void {
        this.triggerBodySave(false)
            .then(() => {
                const w_startValue = this._lastSettingsUsed!.findText === Constants.USER_MESSAGES.FIND_PATTERN_HERE ? '' : this._lastSettingsUsed!.findText;
                return vscode.window.showInputBox({
                    value: w_startValue,
                    title: Constants.USER_MESSAGES.TITLE_FIND_TAG,
                    placeHolder: Constants.USER_MESSAGES.PLACEHOLDER_CLONE_FIND_TAG,
                    prompt: Constants.USER_MESSAGES.PROMPT_CLONE_FIND_TAG,
                });
            })
            .then((p_inputResult?: string) => {
                if (p_inputResult && p_inputResult.trim()) {
                    this.sendAction(
                        Constants.LEOBRIDGE.CLONE_FIND_TAG,
                        { tag: p_inputResult.trim() }
                    ).then((p_resultFind: LeoBridgePackage) => {
                        if (!p_resultFind.found) {
                            // Not found
                        }
                        this.setupRefresh(
                            Focus.NoChange,
                            {
                                tree: true,
                                body: true,
                                // documents: false,
                                // buttons: false,
                                states: true,
                            }
                        );
                        this.launchRefresh();
                    });
                }
            });
    }

    /**
     * * Places selection on the required node with a 'timeout'. Used after refreshing the opened Leo documents view.
     * @param p_documentNode Document node instance in the Leo document view to be the 'selected' one.
     */
    public setDocumentSelection(p_documentNode: LeoDocumentNode): void {
        this.leoStates.leoChanged = p_documentNode.documentEntry.changed; // also set here since slightly newer.
        this.leoStates.leoOpenedFileName = p_documentNode.documentEntry.name;
        if (this._leoDocumentsRevealTimer) {
            clearTimeout(this._leoDocumentsRevealTimer);
        }
        this._leoDocumentsRevealTimer = setTimeout(() => {
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
            if (w_trigger && !this._documentPaneReveal) {
                this._documentPaneReveal = w_docView.reveal(p_documentNode, { select: true, focus: false })
                    .then(
                        (_p_result) => {
                            // Shown document node
                            this._documentPaneReveal = undefined;
                        },
                        (p_reason) => {
                            this._documentPaneReveal = undefined;
                            console.log('shown doc error on reveal: ', p_reason);
                        }
                    );
            }
        }, 150);
    }

    /**
     * * Cycle opened documents
     */
    public async tabCycle(): Promise<unknown> {
        await this._isBusyTriggerSave(true, true);
        const w_package = await this.sendAction(Constants.LEOBRIDGE.GET_OPENED_FILES);
        const w_files: LeoDocument[] = w_package.files!;
        let w_index: number = 0;
        let w_chosenIndex = 0;
        if (w_files && w_files.length && w_files.length > 1) {
            w_files.forEach(function (p_filePath: LeoDocument) {
                if (p_filePath.selected) {
                    if (w_index === w_files.length - 1) {
                        w_chosenIndex = 0;
                    } else {
                        w_chosenIndex = w_index + 1;
                    }
                }
                w_index++;
            });
        } else {
            // "Only one, or no opened documents"
            return undefined;
        }
        this.finalFocus = Focus.Outline;
        return this.selectOpenedLeoDocument(w_chosenIndex);
    }

    /**
     * * Asks for file name and path, then saves the Leo file
     * @param p_fromOutlineSignifies that the focus was, and should be brought back to, the outline
     * @returns a promise from saving the file results, or that will resolve to undefined if cancelled
     */
    public saveAsLeoFile(p_fromOutline?: boolean): Promise<LeoBridgePackage | undefined> {
        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
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
                    if (
                        !w_hasDot ||
                        ((p_chosenLeoFile.split('.').pop() !== Constants.FILE_EXTENSION) &&
                            (p_chosenLeoFile.split('.').pop() !== Constants.JS_FILE_EXTENSION) &&
                            (p_chosenLeoFile.split('.').pop() !== Constants.DB_FILE_EXTENSION))
                    ) {
                        if (!p_chosenLeoFile.endsWith('.')) {
                            p_chosenLeoFile += '.'; // Add dot if needed
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
                        finalFocus: p_fromOutline ? Focus.Outline : Focus.Body,
                        name: p_chosenLeoFile,
                    });
                    this.leoStates.leoOpenedFileName = p_chosenLeoFile.trim();
                    // this._leoStatusBar.update(true, 0, true); // removed until proper API for knowing focus placement
                    this._addRecentAndLastFile(p_chosenLeoFile.trim());
                    if (q_commandResult) {
                        return q_commandResult;
                    } else {
                        return Promise.reject('Save file not added on command stack');
                    }
                } else {
                    // Canceled
                    return Promise.resolve(undefined);
                }
            });
    }

    /**
     * * Asks for .leojs file name and path, then saves the JSON Leo file
     * @param p_fromOutlineSignifies that the focus was, and should be brought back to, the outline
     * @returns a promise from saving the file results, or that will resolve to undefined if cancelled
     */
    public saveAsLeoJsFile(p_fromOutline?: boolean): Promise<LeoBridgePackage | undefined> {
        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
                    return this._leoFilesBrowser.getLeoJsFileUrl();
                } else {
                    // 'when-conditions' should prevent this
                    vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                    return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                }
            })
            .then((p_chosenLeoFile) => {
                if (p_chosenLeoFile.trim()) {
                    const w_hasDot = p_chosenLeoFile.indexOf('.') !== -1;
                    if (
                        !w_hasDot ||
                        (p_chosenLeoFile.split('.').pop() !== Constants.JS_FILE_EXTENSION && w_hasDot)
                    ) {
                        if (!p_chosenLeoFile.endsWith('.')) {
                            p_chosenLeoFile += '.'; // Add dot if needed
                        }
                        p_chosenLeoFile += Constants.JS_FILE_EXTENSION; // Add extension
                    }
                    if (this.leoStates.leoOpenedFileName) {
                        this._removeLastFile(this.leoStates.leoOpenedFileName);
                        this._removeRecentFile(this.leoStates.leoOpenedFileName);
                    }
                    const q_commandResult = this.nodeCommand({
                        action: Constants.LEOBRIDGE.SAVE_FILE,
                        node: undefined,
                        refreshType: { tree: true, states: true, documents: true },
                        finalFocus: p_fromOutline ? Focus.Outline : Focus.Body,
                        name: p_chosenLeoFile,
                    });
                    this.leoStates.leoOpenedFileName = p_chosenLeoFile.trim();
                    // this._leoStatusBar.update(true, 0, true);// removed until proper API for knowing focus placement
                    this._addRecentAndLastFile(p_chosenLeoFile.trim());
                    if (q_commandResult) {
                        return q_commandResult;
                    } else {
                        return Promise.reject('Save file not added on command stack');
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
    public async saveLeoFile(p_fromOutline?: boolean): Promise<LeoBridgePackage | undefined> {

        await this._isBusyTriggerSave(true, true);

        if (this.leoStates.fileOpenedReady) {
            if (this.lastSelectedNode && this._isCurrentFileNamed()) {
                const q_commandResult = this.nodeCommand({
                    action: Constants.LEOBRIDGE.SAVE_FILE,
                    node: undefined,
                    refreshType: { tree: true, states: true, documents: true },
                    finalFocus: p_fromOutline ? Focus.Outline : Focus.Body,
                    name: '',
                });
                return q_commandResult;
            } else {
                return this.saveAsLeoFile(p_fromOutline); // Override this command call if file is unnamed!
            }
        } else {
            // 'when-conditions' should prevent this
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
            return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
        }
    }

    /**
     * * Show switch document 'QuickPick' dialog and switch file if selection is made, or just return if no files are opened.
     * @returns A promise that resolves with a LeoBridgePackage if document switched, or undefined if no switch/canceled.
     */
    public async switchLeoFile(): Promise<LeoBridgePackage | undefined> {
        await this._isBusyTriggerSave(true, true);
        const w_package = await this.sendAction(Constants.LEOBRIDGE.GET_OPENED_FILES);
        const w_entries: ChooseDocumentItem[] = []; // Entries to offer as choices.
        const w_files: LeoDocument[] = w_package.files!;
        let w_index: number = 0;
        let w_chosenDocument;
        if (w_files && w_files.length) {
            w_files.forEach(function (p_filePath: LeoDocument) {
                w_entries.push({
                    label: w_index.toString(),
                    description: p_filePath.name
                        ? p_filePath.name
                        : Constants.UNTITLED_FILE_NAME,
                    value: w_index,
                    alwaysShow: true,
                });
                w_index++;
            });
            const w_pickOptions: vscode.QuickPickOptions = {
                matchOnDescription: true,
                placeHolder: Constants.USER_MESSAGES.CHOOSE_OPENED_FILE,
            };
            w_chosenDocument = await vscode.window.showQuickPick(w_entries, w_pickOptions);
        } else {
            // "No opened documents"
            return undefined;
        }
        if (w_chosenDocument) {
            this.finalFocus = Focus.Outline;
            return this.selectOpenedLeoDocument(w_chosenDocument.value);
        }
    }

    /**
     * * Switches Leo document directly by index number. Used by document treeview and switchLeoFile command.
     * @param p_index position of the opened Leo document in the document array
     * @returns A promise that resolves with a textEditor of the selected node's body from the newly opened document
     */
    public async selectOpenedLeoDocument(p_index: number): Promise<LeoBridgePackage> {
        await this._isBusyTriggerSave(true, true);
        const w_openFileResult = await this.sendAction(
            Constants.LEOBRIDGE.SET_OPENED_FILE,
            { index: p_index }
        );
        // Like we just opened or made a new file
        if (w_openFileResult.total) {
            this.serverHasOpenedFile = true;
            this.serverOpenedFileName = w_openFileResult.filename!;
            this.serverOpenedNode = w_openFileResult.node!;
            this.loadSearchSettings();
            this.setupRefresh(
                this.finalFocus,
                {
                    tree: true,
                    body: true,
                    goto: true,
                    documents: true,
                    buttons: true,
                    states: true,

                }
            );
            this.launchRefresh();
            return w_openFileResult; //
        } else {
            this.serverHasOpenedFile = false;
            this.serverOpenedFileName = "";
            this.serverOpenedNode = undefined;
            this.launchRefresh();
            console.log('Select Opened Leo File Error');
            return Promise.reject('Select Opened Leo File Error');
        }
    }

    /**
     * * Clear leointeg's last-opened & recently opened Leo files list
     */
    public clearRecentLeoFiles(): void {
        this._context.workspaceState.update(Constants.LAST_FILES_KEY, undefined);
        this._context.workspaceState.update(Constants.RECENT_FILES_KEY, undefined);
        vscode.window.showInformationMessage(Constants.USER_MESSAGES.CLEARED_RECENT);
    }

    /**
     * * Revert the contents of a Leo outline to last saved contents.
     * If unnamed file, calls anyways to let the real command print out message
     */
    public async revert(): Promise<unknown> {
        if (this.leoStates.leoOpenedFileName) {
            await this._isBusyTriggerSave(true, true);

            const w_result = await vscode.window.showInformationMessage(
                Constants.USER_MESSAGES.REVERT_PREVIOUS_VERSION +
                this.leoStates.leoOpenedFileName +
                '?',
                { modal: true },
                {
                    title: Constants.USER_MESSAGES.YES,
                    isCloseAffordance: false
                },
                {
                    title: Constants.USER_MESSAGES.NO,
                    isCloseAffordance: true
                },
            );
            if (!w_result || w_result.title === Constants.USER_MESSAGES.NO) {
                return;
            }

            const q_commandResult = this.nodeCommand({
                action: Constants.LEOBRIDGE.REVERT,
                node: undefined,
                refreshType: {
                    tree: true,
                    body: true,
                    goto: true,
                    documents: true,
                    buttons: true,
                    states: true,
                },
                finalFocus: Focus.NoChange, // use last

            });
            if (q_commandResult) {
                return q_commandResult;
            } else {
                return Promise.reject('Revert to saved version failed');
            }
        } else {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.CANNOT_REVERT);
        }

    }
    /**
    * * Close an opened Leo file
    * @returns the launchRefresh promise started after it's done closing the Leo document
    */
    public closeLeoFile(): Promise<boolean> {
        let w_removeLastFileName: string = '';
        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                if (!this.leoStates.fileOpenedReady) {
                    vscode.window.showInformationMessage(Constants.USER_MESSAGES.CLOSE_ERROR);
                    return Promise.reject(Constants.USER_MESSAGES.CLOSE_ERROR);
                }
                w_removeLastFileName = this.leoStates.leoOpenedFileName;
                return this.sendAction(
                    Constants.LEOBRIDGE.CLOSE_FILE,
                    { forced: false }
                );
            })
            .then((p_tryCloseResult) => {
                // Has a total member: closed file
                if (p_tryCloseResult.total || p_tryCloseResult.total === 0) {
                    this._removeLastFile(w_removeLastFileName);
                    if (p_tryCloseResult.total) {
                        // Still has opened Leo document(s)
                        this.loadSearchSettings();
                        this.setupRefresh(
                            Focus.Body,
                            {
                                tree: true,
                                body: true,
                                goto: true,
                                documents: true,
                                buttons: true,
                                states: true,
                            }
                        );
                    } else {
                        this.serverHasOpenedFile = false;
                        this.serverOpenedFileName = "";
                        this.serverOpenedNode = undefined;
                        // this._setupNoOpenedLeoDocument();
                    }
                    // Start refresh either way: opened/no opened is set in refresh.
                    this.launchRefresh();
                    return Promise.resolve(true);
                } else {
                    // No total member: did not close file
                    const q_askSaveChangesInfoMessage: Thenable<vscode.MessageItem | undefined> =
                        vscode.window.showInformationMessage(
                            Constants.USER_MESSAGES.SAVE_CHANGES +
                            ' ' +
                            this.leoStates.leoOpenedFileName +
                            ' ' +
                            Constants.USER_MESSAGES.BEFORE_CLOSING,
                            { modal: true },
                            ...Constants.ASK_SAVE_CHANGES_BUTTONS
                        );
                    return Promise.resolve(q_askSaveChangesInfoMessage)
                        .then((p_askSaveResult: vscode.MessageItem | undefined) => {
                            if (p_askSaveResult && p_askSaveResult.title === Constants.USER_MESSAGES.YES) {
                                // save and then force-close
                                let w_savePromise: Promise<LeoBridgePackage | undefined>;
                                if (this._isCurrentFileNamed()) {
                                    w_savePromise = this.sendAction(
                                        Constants.LEOBRIDGE.SAVE_FILE,
                                        { name: '' }
                                    );
                                } else {
                                    w_savePromise = this._leoFilesBrowser
                                        .getLeoFileUrl(true)
                                        .then((p_chosenLeoFile) => {
                                            if (p_chosenLeoFile.trim()) {
                                                return this.sendAction(
                                                    Constants.LEOBRIDGE.SAVE_FILE,
                                                    { name: p_chosenLeoFile.trim() }
                                                );
                                            } else {
                                                // Canceled
                                                return Promise.resolve(undefined);
                                            }
                                        });
                                }
                                return w_savePromise.then(
                                    (_p_packageAfterSave) => {
                                        return this.sendAction(
                                            Constants.LEOBRIDGE.CLOSE_FILE,
                                            { forced: true }
                                        );
                                    },
                                    () => {
                                        return Promise.reject('Save failed');
                                    }
                                );
                            } else if (p_askSaveResult && p_askSaveResult.title === Constants.USER_MESSAGES.NO) {
                                // Don't want to save so just force-close directly
                                return this.sendAction(
                                    Constants.LEOBRIDGE.CLOSE_FILE,
                                    { forced: true }
                                );
                            } else {
                                // Canceled dialog
                                return Promise.resolve(undefined);
                            }
                        })
                        .then((p_closeResult: LeoBridgePackage | undefined) => {
                            if (p_closeResult) {
                                // * back from CLOSE_FILE action, the last that can be performed (after saving if dirty or not)
                                this._removeLastFile(w_removeLastFileName);
                                if (p_closeResult && p_closeResult.total) {
                                    // Still has opened Leo document(s)
                                    this.loadSearchSettings();
                                    this.setupRefresh(
                                        Focus.Body,
                                        {
                                            tree: true,
                                            body: true,
                                            documents: true,
                                            buttons: true,
                                            states: true,
                                            goto: true
                                        }
                                    );
                                } else {
                                    this.serverHasOpenedFile = false;
                                    this.serverOpenedFileName = "";
                                    this.serverOpenedNode = undefined;
                                    // this._setupNoOpenedLeoDocument();
                                }
                                // * Refresh either way.
                                this.launchRefresh();
                                return Promise.resolve(true);
                            }
                            // Canceled
                            return Promise.resolve(false);
                        });
                }
            });
    }

    /**
     * * Creates a new untitled Leo document
     * * If not shown already, it also shows the outline, body and log panes along with leaving focus in the outline
     * @returns A promise that resolves with a textEditor of the new file
     */
    public async newLeoFile(): Promise<LeoBridgePackage> {
        await this._isBusyTriggerSave(true, true);
        await utils.setContext(Constants.CONTEXT_FLAGS.LEO_OPENING_FILE, true);
        const w_openFileResult = await this.sendAction(Constants.LEOBRIDGE.OPEN_FILE, { filename: "" });
        if (w_openFileResult.total) {
            this.serverHasOpenedFile = true;
            this.serverOpenedFileName = w_openFileResult.filename!;
            this.serverOpenedNode = w_openFileResult.node!;

            this.loadSearchSettings();

            this.showBodyIfClosed = true;
            this.showOutlineIfClosed = true;

            this.setupRefresh(
                Focus.NoChange,
                {
                    tree: true,
                    body: true,
                    goto: true,
                    documents: true,
                    buttons: true,
                    states: true,
                }
            );
            this.launchRefresh();
            setTimeout(() => {
                void utils.setContext(Constants.CONTEXT_FLAGS.LEO_OPENING_FILE, false);
            }, 60);
            return w_openFileResult;
        } else {
            this.serverHasOpenedFile = false;
            this.serverOpenedFileName = "";
            this.serverOpenedNode = undefined;
            this.launchRefresh();
            setTimeout(() => {
                void utils.setContext(Constants.CONTEXT_FLAGS.LEO_OPENING_FILE, false);
            }, 60);
            return Promise.reject('New Leo File Error');
        }
    }

    /**
     * * Shows an 'Open Leo File' dialog window and opens the chosen file
     * * If not shown already, it also shows the outline, body and log panes
     * @param p_leoFileUri optional uri for specifying a file, if missing, a dialog will open
     * @returns A promise that resolves with a LeoBridgePackage from the open file command
     */
    public openLeoFile(p_leoFileUri?: vscode.Uri): Promise<LeoBridgePackage | undefined> {
        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                if (p_leoFileUri && p_leoFileUri.scheme && p_leoFileUri.scheme.startsWith("leo")) {
                    p_leoFileUri = undefined; // Was used in the editor/title menu!
                }
                let q_openedFile: Promise<LeoBridgePackage | undefined>; // Promise for opening a file
                if (p_leoFileUri && p_leoFileUri.fsPath && p_leoFileUri.fsPath.trim()) {
                    const w_fixedFilePath: string = p_leoFileUri.fsPath.replace(/\\/g, '/');
                    void utils.setContext(Constants.CONTEXT_FLAGS.LEO_OPENING_FILE, true);
                    q_openedFile = this.sendAction(
                        Constants.LEOBRIDGE.OPEN_FILE,
                        { filename: w_fixedFilePath }
                    );
                } else {
                    q_openedFile = this._leoFilesBrowser.getLeoFileUrl().then(
                        (p_chosenLeoFile) => {
                            if (p_chosenLeoFile.trim()) {
                                void utils.setContext(Constants.CONTEXT_FLAGS.LEO_OPENING_FILE, true);
                                return this.sendAction(
                                    Constants.LEOBRIDGE.OPEN_FILE,
                                    { filename: p_chosenLeoFile }
                                );
                            } else {
                                return Promise.resolve(undefined);
                            }
                        },
                        (p_errorGetFile) => {
                            return Promise.reject(p_errorGetFile);
                        }
                    );
                }
                return q_openedFile;
            })
            .then(
                (p_openFileResult: LeoBridgePackage | undefined) => {
                    if (p_openFileResult) {
                        if (p_openFileResult.total) {
                            this.serverHasOpenedFile = true;
                            this.serverOpenedFileName = p_openFileResult.filename!;
                            this.serverOpenedNode = p_openFileResult.node!;
                            this._addRecentAndLastFile(this.serverOpenedFileName);

                            this.loadSearchSettings();

                            this.showBodyIfClosed = true;
                            this.showOutlineIfClosed = true;

                            this.setupRefresh(
                                Focus.Body,
                                {
                                    tree: true,
                                    body: true,
                                    documents: true,
                                    buttons: true,
                                    states: true,
                                    goto: true
                                }
                            );
                        } else {
                            this.serverHasOpenedFile = false;
                            this.serverOpenedFileName = "";
                            this.serverOpenedNode = undefined;
                        }
                        this.launchRefresh();
                        setTimeout(() => {
                            void utils.setContext(Constants.CONTEXT_FLAGS.LEO_OPENING_FILE, false);
                        }, 60);
                        return p_openFileResult;
                    } else {
                        setTimeout(() => {
                            void utils.setContext(Constants.CONTEXT_FLAGS.LEO_OPENING_FILE, false);
                        }, 60);
                        return Promise.resolve(undefined); // User cancelled chooser.
                    }
                },
                (p_errorOpen) => {
                    // TODO : IS REJECTION BEHAVIOR NECESSARY HERE TOO?
                    console.log('in .then not opened or already opened');
                    void utils.setContext(Constants.CONTEXT_FLAGS.LEO_OPENING_FILE, false);
                    return Promise.reject(p_errorOpen);
                }
            );
    }

    /**
     * * Import any File(s)
     * No URL passed from the command definition.
     * @param p_leoFileUri is offered for internal use only
     */
    public importAnyFile(p_leoFileUri?: vscode.Uri): Thenable<unknown> {
        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                let q_importFile: Promise<LeoBridgePackage | undefined>; // Promise for opening a file
                if (p_leoFileUri && p_leoFileUri.fsPath.trim()) {
                    const w_fixedFilePath: string = p_leoFileUri.fsPath.replace(/\\/g, '/');
                    // Array of a single filename
                    q_importFile = this.sendAction(
                        Constants.LEOBRIDGE.IMPORT_ANY_FILE,
                        { filenames: [w_fixedFilePath] }
                    );
                } else {
                    q_importFile = this._leoFilesBrowser.getImportFileUrls().then(
                        (p_chosenLeoFiles) => {
                            if (p_chosenLeoFiles.length) {
                                // Can be multiple files, so array of string is sent
                                return this.sendAction(
                                    Constants.LEOBRIDGE.IMPORT_ANY_FILE,
                                    { filenames: p_chosenLeoFiles }
                                );
                            } else {
                                return Promise.resolve(undefined);
                            }
                        },
                        (p_errorGetFile) => {
                            return Promise.reject(p_errorGetFile);
                        }
                    );
                }
                return q_importFile;
            })
            .then(
                (p_importFileResult: LeoBridgePackage | undefined) => {
                    if (p_importFileResult) {
                        this.setupRefresh(
                            Focus.NoChange,
                            {
                                tree: true,
                                body: true,
                                goto: true,
                                states: true,
                                documents: true,
                                buttons: true
                            }
                        );
                        return this.launchRefresh();
                    } else {
                        return Promise.resolve(undefined);
                    }
                },
                (p_errorImport) => {
                    console.log('Rejection for import file');
                    return Promise.reject(p_errorImport);
                }
            );
    }

    /**
     * * Export Outline
     * Export all headlines to an external file.
     */
    public exportHeadlines(_p_exportFileUri?: vscode.Uri): Thenable<unknown> {
        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
                    return this._leoFilesBrowser.getExportFileUrl(
                        "Export Headlines",
                        {
                            'Text files': ['txt'],
                            'All files': ['*'],
                        },
                    );
                } else {
                    vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                    return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                }
            })
            .then((p_chosenLeoFile) => {
                if (p_chosenLeoFile.trim()) {

                    const q_commandResult = this.nodeCommand({
                        action: Constants.LEOBRIDGE.EXPORT_HEADLINES,
                        node: undefined,
                        refreshType: { tree: true, states: true, documents: true },
                        finalFocus: Focus.NoChange, // use last
                        name: p_chosenLeoFile,
                    });
                    if (q_commandResult) {
                        return q_commandResult;
                    } else {
                        return Promise.reject('Export Headlines not added on command stack');
                    }
                } else {
                    // Canceled
                    return Promise.resolve(undefined);
                }
            });
    }

    /**
     * * Flatten Selected Outline
     * Export the selected outline to an external file.
     * The outline is represented in MORE format.
     */
    public flattenOutline(): Thenable<unknown> {

        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
                    return this._leoFilesBrowser.getExportFileUrl(
                        "Flatten Selected Outline",
                        {
                            'Text files': ['txt'],
                            'All files': ['*'],
                        },
                    );
                } else {
                    vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                    return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                }
            })
            .then((p_chosenLeoFile) => {
                if (p_chosenLeoFile.trim()) {

                    const q_commandResult = this.nodeCommand({
                        action: Constants.LEOBRIDGE.FLATTEN_OUTLINE,
                        node: undefined,
                        refreshType: { tree: true, states: true, documents: true },
                        finalFocus: Focus.NoChange, // use last
                        name: p_chosenLeoFile,
                    });
                    if (q_commandResult) {
                        return q_commandResult;
                    } else {
                        return Promise.reject('Flatten Selected Outline not added on command stack');
                    }
                } else {
                    // Canceled
                    return Promise.resolve(undefined);
                }
            });
    }

    /**
     * * Outline To CWEB
     */
    public outlineToCweb(): Thenable<unknown> {

        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
                    return this._leoFilesBrowser.getExportFileUrl(
                        "Outline To CWEB",
                        {
                            'CWEB files': ['w'],
                            'Text files': ['txt'],
                            'All files': ['*'],
                        },
                    );
                } else {
                    vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                    return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                }
            })
            .then((p_chosenLeoFile) => {
                if (p_chosenLeoFile.trim()) {

                    const q_commandResult = this.nodeCommand({
                        action: Constants.LEOBRIDGE.OUTLINE_TO_CWEB,
                        node: undefined,
                        refreshType: { tree: true, states: true, documents: true },
                        finalFocus: Focus.NoChange, // use last
                        name: p_chosenLeoFile,
                    });
                    if (q_commandResult) {
                        return q_commandResult;
                    } else {
                        return Promise.reject('Outline To CWEB not added on command stack');
                    }
                } else {
                    // Canceled
                    return Promise.resolve(undefined);
                }
            });
    }

    /**
     * * Outline To Noweb
     */
    public outlineToNoweb(): Thenable<unknown> {

        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
                    return this._leoFilesBrowser.getExportFileUrl(
                        "Outline To Noweb",
                        {
                            'Noweb files': ['nw'],
                            'Text files': ['txt'],
                            'All files': ['*'],
                        },
                    );
                } else {
                    vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                    return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                }
            })
            .then((p_chosenLeoFile) => {
                if (p_chosenLeoFile.trim()) {

                    const q_commandResult = this.nodeCommand({
                        action: Constants.LEOBRIDGE.OUTLINE_TO_NOWEB,
                        node: undefined,
                        refreshType: { tree: true, states: true, documents: true },
                        finalFocus: Focus.NoChange, // use last
                        name: p_chosenLeoFile,
                    });
                    if (q_commandResult) {
                        return q_commandResult;
                    } else {
                        return Promise.reject('Outline To Noweb not added on command stack');
                    }
                } else {
                    // Canceled
                    return Promise.resolve(undefined);
                }
            });
    }

    /**
     * * Remove Sentinels
     */
    public removeSentinels(p_leoFileUri?: vscode.Uri): Thenable<unknown> {
        // Convert one or more files, replacing the original files while removing any sentinels they contain.

        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                let q_importFiles: Promise<LeoBridgePackage | undefined>; // Promise for opening a file
                if (p_leoFileUri && p_leoFileUri.fsPath.trim()) {
                    const w_fixedFilePath: string = p_leoFileUri.fsPath.replace(/\\/g, '/');
                    q_importFiles = this.sendAction(
                        Constants.LEOBRIDGE.REMOVE_SENTINELS,
                        { names: [w_fixedFilePath] }
                    );
                } else {
                    q_importFiles = this._leoFilesBrowser.getImportFileUrls(
                        {
                            'Python files': ['py'],
                            'All files': ['*'],
                            'C/C++ files': ['c', 'cpp', 'h', 'hpp'],
                            'Java files': ['java'],
                            'Lua files': ['lua'],
                            'Pascal files': ['pas'],
                        },
                        false,
                        "Remove Sentinels"
                    ).then(
                        (p_chosenLeoFiles) => {
                            if (p_chosenLeoFiles.length) {
                                return this.sendAction(
                                    Constants.LEOBRIDGE.REMOVE_SENTINELS,
                                    { names: p_chosenLeoFiles }
                                );
                            } else {
                                return Promise.resolve(undefined);
                            }
                        },
                        (p_errorGetFile) => {
                            return Promise.reject(p_errorGetFile);
                        }
                    );
                }
                return q_importFiles;
            })
            .then(
                (p_importFileResult: LeoBridgePackage | undefined) => {
                    if (p_importFileResult) {
                        this.setupRefresh(
                            Focus.NoChange,
                            {
                                tree: true,
                                body: true,
                                goto: true,
                                states: true,
                                documents: true,
                                buttons: true
                            }
                        );
                        return this.launchRefresh();
                    } else {
                        return Promise.resolve(undefined);
                    }
                },
                (p_errorImport) => {
                    console.log('Rejection for Read a file into a single node file');
                    return Promise.reject(p_errorImport);
                }
            );

    }

    /**
     * * Weave
     * Simulate a literate-programming weave operation by writing the outline to a text file.
     */
    public weave(): Thenable<unknown> {

        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
                    return this._leoFilesBrowser.getExportFileUrl(
                        "Weave",
                        {
                            'Text files': ['txt'],
                            'All files': ['*'],
                        },
                    );
                } else {
                    vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                    return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                }
            })
            .then((p_chosenLeoFile) => {
                if (p_chosenLeoFile.trim()) {

                    const q_commandResult = this.nodeCommand({
                        action: Constants.LEOBRIDGE.WEAVE,
                        node: undefined,
                        refreshType: { tree: true, states: true, documents: true },
                        finalFocus: Focus.NoChange, // use last
                        name: p_chosenLeoFile,
                    });
                    if (q_commandResult) {
                        return q_commandResult;
                    } else {
                        return Promise.reject('Weave not added on command stack');
                    }
                } else {
                    // Canceled
                    return Promise.resolve(undefined);
                }
            });
    }

    /**
     * * Write file from node
     */
    public writeFileFromNode(): Thenable<unknown> {

        // * If node starts with @read-file-into-node, use the full path name in the headline.
        // * Otherwise, prompt for a file name.

        if (!this.leoStates.fileOpenedReady || !this.lastSelectedNode) {
            vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
            return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
        }

        const h = this.lastSelectedNode.headline.trimEnd();
        const tag = '@read-file-into-node';

        let fileName = '';
        if (h.startsWith(tag)) {
            fileName = h.substring(tag.length).trim();
        }

        let q_fileName: Thenable<string>;
        if (fileName) {
            q_fileName = Promise.resolve(fileName);
        } else {
            q_fileName = this._isBusyTriggerSave(true, true)
                .then((_p_saveResult) => {
                    if (this.leoStates.fileOpenedReady && this.lastSelectedNode) {
                        return this._leoFilesBrowser.getExportFileUrl(
                            "Write file from node",
                            {
                                'All files': ['*'],
                                'Python files': ['py'],
                                'Leo files': ['leo'],
                            },
                        );
                    } else {
                        vscode.window.showInformationMessage(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                        return Promise.reject(Constants.USER_MESSAGES.FILE_NOT_OPENED);
                    }
                });
        }

        return q_fileName.then((p_chosenLeoFile) => {
            if (p_chosenLeoFile.trim()) {

                const q_commandResult = this.nodeCommand({
                    action: Constants.LEOBRIDGE.WRITE_FILE_FROM_NODE,
                    node: undefined,
                    refreshType: { tree: true, states: true, documents: true },
                    finalFocus: Focus.NoChange, // use last
                    name: p_chosenLeoFile,
                });
                this.leoStates.leoOpenedFileName = p_chosenLeoFile.trim();
                // this._leoStatusBar.update(true, 0, true); // removed until proper API for knowing focus placement
                this._addRecentAndLastFile(p_chosenLeoFile.trim());
                if (q_commandResult) {
                    return q_commandResult;
                } else {
                    return Promise.reject('Write File From Node not added on command stack');
                }
            } else {
                // Canceled
                return Promise.resolve(undefined);
            }
        });
    }

    /**
     * * Read file from node
     */
    public readFileIntoNode(p_leoFileUri?: vscode.Uri): Thenable<unknown> {

        return this._isBusyTriggerSave(true, true)
            .then((_p_saveResult) => {
                let q_importFile: Promise<LeoBridgePackage | undefined>; // Promise for opening a file
                if (p_leoFileUri && p_leoFileUri.fsPath.trim()) {
                    const w_fixedFilePath: string = p_leoFileUri.fsPath.replace(/\\/g, '/');
                    q_importFile = this.sendAction(
                        Constants.LEOBRIDGE.READ_FILE_INTO_NODE,
                        { name: w_fixedFilePath }
                    );
                } else {
                    q_importFile = this._leoFilesBrowser.getImportFileUrls(
                        {
                            'All files': ['*'],
                            'Python files': ['py'],
                            'Leo files': ['leo'],
                        },
                        true,
                        "Read File Into Node"
                    ).then(
                        (p_chosenLeoFiles) => {
                            if (p_chosenLeoFiles.length) {
                                return this.sendAction(
                                    Constants.LEOBRIDGE.READ_FILE_INTO_NODE,
                                    { name: p_chosenLeoFiles[0] }
                                );
                            } else {
                                return Promise.resolve(undefined);
                            }
                        },
                        (p_errorGetFile) => {
                            return Promise.reject(p_errorGetFile);
                        }
                    );
                }
                return q_importFile;
            })
            .then(
                (p_importFileResult: LeoBridgePackage | undefined) => {
                    if (p_importFileResult) {
                        this.setupRefresh(
                            Focus.NoChange,
                            {
                                tree: true,
                                body: true,
                                goto: true,
                                states: true,
                                documents: true,
                                buttons: true
                            }
                        );
                        return this.launchRefresh();
                    } else {
                        return Promise.resolve(undefined);
                    }
                },
                (p_errorImport) => {
                    console.log('Rejection for Read a file into a single node file');
                    return Promise.reject(p_errorImport);
                }
            );

    }

    /**
     * * Invoke an '@button' click directly by index string. Used by '@buttons' treeview.
     * @param p_node the node of the at-buttons panel that was clicked
     * @returns the launchRefresh promise started after it's done running the 'atButton' command
     */
    public clickAtButton(p_node: LeoButtonNode): Promise<boolean> {
        return this._isBusyTriggerSave(false)
            .then((_p_saveResult) => {

                if (p_node.rclicks.length) {
                    // Has rclicks so show menu to choose
                    this._rclickSelected = [];

                    return this._handleRClicks(p_node.rclicks, p_node.button.name).then((p_picked) => {
                        if (
                            p_picked
                        ) {
                            // Check if only one in this._rclickSelected and is zero: normal press
                            if (this._rclickSelected.length === 1 && this._rclickSelected[0] === 0) {
                                // Normal button
                                return this.sendAction(
                                    Constants.LEOBRIDGE.CLICK_BUTTON,
                                    { index: p_node.button.index }
                                );
                            }
                            // If not decrement first one, and send this._rclickSelected as array of choices
                            this._rclickSelected[0] = this._rclickSelected[0] - 1;
                            return this.sendAction(
                                Constants.LEOBRIDGE.CLICK_BUTTON,
                                { index: p_node.button.index, rclick: this._rclickSelected }
                            );
                        }
                        // Escaped
                        return Promise.reject();
                    });


                } else {
                    // Normal button
                    return this.sendAction(
                        Constants.LEOBRIDGE.CLICK_BUTTON,
                        { index: p_node.button.index }
                    );
                }
            })
            .then((_p_clickButtonResult: LeoBridgePackage) => {
                return this.sendAction(Constants.LEOBRIDGE.DO_NOTHING);
            })
            .then((p_package) => {
                // Refresh and reveal selection
                this.setupRefresh(
                    Focus.NoChange,
                    {
                        tree: true,
                        body: true,
                        states: true,
                        buttons: true,
                        documents: true
                    },
                    p_package.node
                );
                this.launchRefresh();
                return Promise.resolve(true);
            }, (_p_error) => {
                // Pass to catch the rejection if escaped by the user
                return false;
            });
    }

    /**
     * * Show input window to select the @buttons's right-click item
     */
    private async _handleRClicks(p_rclicks: RClick[], topLevelName?: string): Promise<ChooseRClickItem> {
        const w_choices: ChooseRClickItem[] = [];
        let w_index = 0;
        if (topLevelName) {
            w_choices.push(
                { label: topLevelName, picked: true, alwaysShow: true, index: w_index++ }
            );
        }
        w_choices.push(
            ...p_rclicks.map((p_rclick): ChooseRClickItem => { return { label: p_rclick.name, index: w_index++, rclick: p_rclick }; })
        );

        const w_options: vscode.QuickPickOptions = {
            placeHolder: Constants.USER_MESSAGES.CHOOSE_BUTTON
        };

        const w_picked = await vscode.window.showQuickPick(w_choices, w_options);

        if (w_picked) {
            this._rclickSelected.push(w_picked.index);
            if (topLevelName && w_picked.index === 0) {
                return Promise.resolve(w_picked);
            }
            if (w_picked.rclick && w_picked.rclick.children && w_picked.rclick.children.length) {
                return this._handleRClicks(w_picked.rclick.children);
            } else {
                return Promise.resolve(w_picked);
            }
        }
        return Promise.reject();
    }

    /**
     * * Finds and goes to the script of an at-button. Used by '@buttons' treeview.
     * @param p_node the node of the at-buttons panel that was right-clicked
     * @returns the launchRefresh promise started after it's done finding the node
     */
    public async gotoScript(p_node: LeoButtonNode): Promise<any> {
        await this._isBusyTriggerSave(false);
        this.sendAction(
            Constants.LEOBRIDGE.GOTO_SCRIPT,
            { index: p_node.button.index }
        );

        const w_package = await this.sendAction(Constants.LEOBRIDGE.DO_NOTHING);

        // Refresh and reveal selection
        this.setupRefresh(
            Focus.Body,
            {
                tree: true,
                body: true,
                goto: true,
                states: true,
                documents: true,
                buttons: true
            },
            w_package.node
        );

        this.launchRefresh();
        return w_package;
    }

    /**
     * * Removes an '@button' from Leo's button dict, directly by index string. Used by '@buttons' treeview.
     * @param p_node the node of the at-buttons panel that was chosen to remove
     * @returns the launchRefresh promise started after it's done removing the button
     */
    public async removeAtButton(p_node: LeoButtonNode): Promise<any> {
        await this._isBusyTriggerSave(false);
        const w_package = await this.sendAction(
            Constants.LEOBRIDGE.REMOVE_BUTTON,
            { index: p_node.button.index }
        );
        this.setupRefresh(
            Focus.NoChange,
            {
                buttons: true
            }
        );
        this.launchRefresh();
        return w_package;
    }

    /**
     * * Reverts to a particular undo bead state
     */
    public async revertToUndo(p_undo: LeoUndoNode): Promise<any> {
        if (p_undo.contextValue !== Constants.CONTEXT_FLAGS.UNDO_BEAD) {
            return Promise.resolve();
        }
        let action = Constants.LEOBRIDGE.REDO;
        let repeat = p_undo.beadIndex;
        if (p_undo.beadIndex <= 0) {
            action = Constants.LEOBRIDGE.UNDO;
            repeat = (-p_undo.beadIndex) + 1;
        }
        const w_package = await this.sendAction(
            action,
            { repeat: repeat }
        );
        this.setupRefresh(
            Focus.Outline,
            {
                tree: true,
                body: true,
                documents: true,
                states: true,
                buttons: true,
            }
        );
        this.launchRefresh();
        return w_package;

    }

    /**
     * * highlights the current undo state without disturbing focus
     */
    private _setUndoSelection(p_node: LeoUndoNode): void {
        if (this._lastLeoUndos && this._lastLeoUndos.visible && !this._undoPaneReveal) {
            this._undoPaneReveal = this._lastLeoUndos.reveal(p_node, { select: true, focus: false }).then(
                () => {
                    this._undoPaneReveal = undefined;
                },
                (_p_error) => {
                    this._undoPaneReveal = undefined;
                    console.log('setUndoSelection could not reveal');
                }
            );
        }
    }

    /**
     * * StatusBar click handler
     * @returns Thenable from the statusBar click customizable behavior
     */
    public statusBarOnClick(): Thenable<unknown> {

        if (this._leoStatusBar) {
            return this.replaceClipboardWith(this._leoStatusBar.unlString);
        }
        return Promise.resolve(undefined);

        // this.showLogPane();
        // return Promise.resolve(true);

        /*
        if (this.leoStates.fileOpenedReady) {
            return this.minibuffer();
            // return this.switchLeoFile();
        } else {
            return vscode.commands.executeCommand(
                Constants.VSCODE_COMMANDS.QUICK_OPEN,
                Constants.GUI.QUICK_OPEN_LEO_COMMANDS
            );
        }
        */
    }

}
