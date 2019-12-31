import * as vscode from "vscode";
import * as child from 'child_process';
import * as os from 'os';
import * as path from "path"; // TODO: Use this library to have reliable support for window-vs-linux file-paths
import { Constants } from "./constants";
import { LeoBridgePackage, RevealType, ArchivedPosition } from "./types";
import { LeoFiles } from "./leoFiles";
import { LeoNode } from "./leoNode";
import { LeoOutlineProvider } from "./leoOutline";
import { LeoBodyProvider } from "./leoBody";
import { LeoBridge } from "./leoBridge";
import { Config } from "./config";
import { DocumentManager } from "./eamodioEditorManager/documentManager";

export class LeoIntegration {
    // * Control Flags
    public fileOpenedReady: boolean = false;
    public leoBridgeReady: boolean = false;
    public leoIsConnecting: boolean = false;
    private leoBridgeReadyPromise: Promise<LeoBridgePackage> | undefined; // set when leoBridge has a leo controller ready
    private leoBridgeActionBusy: boolean = false;
    private leoCyclingBodies: boolean = false; // used when closing removed bodies: onActiveEditorChanged, onChangeEditorSelection

    // * Configuration Settings
    private isSettingConfig: boolean = false;
    public config: Config = {
        treeKeepFocus: true,
        treeKeepFocusWhenAside: false,
        treeInExplorer: true,
        showOpenAside: true,
        showArrowsOnNodes: false,
        showAddOnNodes: false,
        showMarkOnNodes: false,
        showCloneOnNodes: false,
        showCopyOnNodes: false,
        invertNodeContrast: false,
        bodyEditDelay: 500,
        leoPythonCommand: "",
        startServerAutomatically: true,
        connectToServerAutomatically: true,
        connectionAddress: Constants.LEO_TCPIP_DEFAULT_ADDRESS,
        connectionPort: Constants.LEO_TCPIP_DEFAULT_PORT
    };

    // * Icon Paths
    public icons: { light: string; dark: string; }[] = [];

    // * Leo Bridge Server Process
    private serverProcess: child.ChildProcess | undefined;

    // * File Browser for opening Leo Files
    private leoFiles: LeoFiles;

    // * LeoBridge
    public leoBridge: LeoBridge;

    // * Outline Pane
    public leoTreeDataProvider: LeoOutlineProvider;
    public leoTreeView: vscode.TreeView<LeoNode>;
    public leoTreeExplorerView: vscode.TreeView<LeoNode>;
    private lastSelectedLeoNode: LeoNode | undefined; // last selected node we got a hold of; leoTreeView.selection maybe newer and unprocessed

    // * Outline Pane redraw/refresh 'helper flags'
    public refreshSingleNodeFlag: boolean = false; // read/cleared by leoOutline, so getTreeItem should refresh or return as-is
    public revealSelectedNode: RevealType = RevealType.NoReveal; // to be read/cleared in arrayToLeoNodesArray, to check if any should self-select

    // * Body Pane
    public leoFileSystem: LeoBodyProvider; // as per https://code.visualstudio.com/api/extension-guides/virtual-documents#file-system-api
    private bodyUri: vscode.Uri = vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER);
    private bodyTextDocument: vscode.TextDocument | undefined;
    private documentManager: DocumentManager;

    private bodyTextDocumentSameUri: boolean = false; // Flag used when checking if clicking a node requires opening a body pane text editor
    private bodyMainSelectionColumn: vscode.ViewColumn | undefined;
    private forceBodyFocus: boolean = false; // Flag used to force focus in body when next 'showing' of this body occurs (after edit headline if already selected)

    // * Body pane dictionary of GNX, linking to leoNodes
    // * Used when showing a body text, to force selection of node when editor tabs are switched
    // * Note: Kept up to date in the apToLeoNode function, as nodes from python are received and decoded.
    private leoTextDocumentNodesRef: { [gnx: string]: LeoNode } = {}; // Node dictionary

    // * Status Bar
    public leoStatusBarItem: vscode.StatusBarItem;
    public leoObjectSelected: boolean = false; // represents having focus on a leo body, as opposed to anything else
    public statusbarNormalColor = new vscode.ThemeColor("statusBar.foreground");  // "statusBar.foreground"
    private updateStatusBarTimeout: NodeJS.Timeout | undefined;

    // * Edit Headline Input Box
    private editHeadlineInputOptions: vscode.InputBoxOptions = {
        ignoreFocusOut: false, // clicking outside cancels the headline change
        value: "", // will be replaced live upon showing from the node's text
        valueSelection: undefined,
        prompt: 'Edit Headline'
    };
    // * Insert Node Headline Input Box
    private newHeadlineInputOptions: vscode.InputBoxOptions = {
        ignoreFocusOut: true, // clicking outside cancels the headline change
        value: "", // will be replaced live upon showing from the node's text
        valueSelection: undefined,
        prompt: 'New Node\'s Headline'
    };

    // * Timing
    private bodyChangeTimeout: NodeJS.Timeout | undefined;
    private bodyChangeTimeoutSkipped: boolean = false; // Used for instant tree node refresh trick
    private lastBodyChangedRootRefreshedGnx: string = "";
    private bodyLastChangedDocument: vscode.TextDocument | undefined;

    constructor(public context: vscode.ExtensionContext) {
        // * Get configuration settings
        this.getLeoIntegSettings();

        // * Build Icon filename paths
        this.icons = Array(16)
            .fill("")
            .map((_, p_index) => {
                return {
                    light: this.context.asAbsolutePath('resources/light/box' + ("0" + p_index).slice(-2) + '.svg'),
                    dark: this.context.asAbsolutePath('resources/dark/box' + ("0" + p_index).slice(-2) + '.svg')
                };
            });

        // * File Browser
        this.leoFiles = new LeoFiles(context);

        // * Setup leoBridge
        this.leoBridge = new LeoBridge(context, this);

        // * Same data provider for both outline trees, Leo view and Explorer view
        this.leoTreeDataProvider = new LeoOutlineProvider(this);

        // * Leo view outline panes
        this.leoTreeView = vscode.window.createTreeView("leoIntegration", { showCollapseAll: true, treeDataProvider: this.leoTreeDataProvider });
        this.leoTreeView.onDidChangeSelection((p_event => this.onTreeViewChangedSelection(p_event)));
        this.leoTreeView.onDidExpandElement((p_event => this.onTreeViewExpandedElement(p_event)));
        this.leoTreeView.onDidCollapseElement((p_event => this.onTreeViewCollapsedElement(p_event)));
        this.leoTreeView.onDidChangeVisibility((p_event => this.onTreeViewVisibilityChanged(p_event, false))); // * Trigger 'show tree in Leo's view'

        // * Explorer view outline pane
        this.leoTreeExplorerView = vscode.window.createTreeView("leoIntegrationExplorer", { showCollapseAll: true, treeDataProvider: this.leoTreeDataProvider });
        this.leoTreeExplorerView.onDidChangeSelection((p_event => this.onTreeViewChangedSelection(p_event)));
        this.leoTreeExplorerView.onDidExpandElement((p_event => this.onTreeViewExpandedElement(p_event)));
        this.leoTreeExplorerView.onDidCollapseElement((p_event => this.onTreeViewCollapsedElement(p_event)));
        this.leoTreeExplorerView.onDidChangeVisibility((p_event => this.onTreeViewVisibilityChanged(p_event, true))); // * Trigger 'show tree in explorer view'

        // * Body Pane
        this.leoFileSystem = new LeoBodyProvider(this);
        this.bodyMainSelectionColumn = 1;
        // set workbench.editor.closeOnFileDelete to true

        // * DocumentManager
        this.documentManager = new DocumentManager(this.context);

        // * Status bar
        // Keyboard Shortcut "Reminder/Flag" to signify keyboard shortcuts are altered in leo mode
        this.leoStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        this.leoStatusBarItem.color = Constants.LEO_STATUSBAR_COLOR;
        this.leoStatusBarItem.command = "leointeg.test"; // just call test function for now
        this.leoStatusBarItem.text = `$(keyboard) Literate `;
        this.leoStatusBarItem.tooltip = "Leo Key Bindings are in effect";
        context.subscriptions.push(this.leoStatusBarItem);
        this.leoStatusBarItem.hide();

        // * React to change in active panel/text editor to toggle Leo Mode Shortcuts and behavior
        /**
         * An [event](#Event) which fires when the [active editor](#window.activeTextEditor)
         * has changed. *Note* that the event also fires when the active editor changes
         * to `undefined`.
         */
        vscode.window.onDidChangeActiveTextEditor(p_event => this.onActiveEditorChanged(p_event)); // TODO : handle deleted bodies
        // * other events
        vscode.window.onDidChangeTextEditorSelection(p_event => this.onChangeEditorSelection(p_event));
        vscode.window.onDidChangeTextEditorViewColumn(p_event => this.onChangeEditorViewColumn(p_event)); // TODO : handle deleted bodies
        vscode.window.onDidChangeVisibleTextEditors(p_event => this.onChangeVisibleEditors(p_event)); // TODO : handle deleted bodies
        vscode.window.onDidChangeWindowState(p_event => this.onChangeWindowState(p_event));

        // * React when typing and changing body pane
        vscode.workspace.onDidChangeTextDocument(p_event => this.onDocumentChanged(p_event));
        vscode.workspace.onDidSaveTextDocument(p_event => this.onDocumentSaved(p_event));

        // * React to configuration settings events
        vscode.workspace.onDidChangeConfiguration(p_event => this.onChangeConfiguration(p_event));

        // * Start server and / or connect to it (as specified in settings)
        this.startNetworkServices();
    }

    private startNetworkServices(): void {
        // * (via settings) Start a server (and also connect automatically to a server upon extension activation)
        // * See 'executeCommand' from https://github.com/yhirose/vscode-filtertext/blob/master/src/extension.ts
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
        // * Get command from settings or best command for the current OS
        let w_pythonPath = "";
        const w_serverScriptPath = this.context.extensionPath + Constants.LEO_BRIDGE_SERVER_PATH;
        const w_platform: string = os.platform();
        if (this.config.leoPythonCommand && this.config.leoPythonCommand.length) {
            // start by running command (see executeCommand for multiple useful snippets)
            console.log('Starting server with command: ' + this.config.leoPythonCommand);
            // set path
            w_pythonPath = this.config.leoPythonCommand;
        } else {
            w_pythonPath = Constants.LEO_DEFAULT_PYTHON;

            if (w_platform === "win32") {
                w_pythonPath = Constants.LEO_WIN32_PYTHON;
            }
            console.log('Launch with default command : ' +
                w_pythonPath + ((w_platform === "win32" && w_pythonPath === "py") ? " -3 " : "") +
                " " + w_serverScriptPath);
        }

        console.log('Creating a promise for starting a server...');

        const w_serverStartPromise = new Promise((resolve, reject) => {
            // * Spawn a python child process for a leoBridge server
            let w_args: string[] = []; //  "\"" + w_serverScriptPath + "\"" // For on windows ??
            if (os.platform() === "win32" && w_pythonPath === "py") {
                w_args.push("-3");
            }
            w_args.push(w_serverScriptPath);
            this.serverProcess = child.spawn(w_pythonPath, w_args);
            // * Capture the python process output
            this.serverProcess.stdout.on("data", (data: string) => {
                data.toString().split("\n").forEach(p_line => {
                    p_line = p_line.trim();
                    if (p_line) { // * std out process line by line: json shouldn't have line breaks
                        if (p_line.startsWith('LeoBridge started')) {
                            resolve(p_line); // * Server confirmed started
                        }
                        console.log("leoBridge: ", p_line); // Output message anyways
                    }
                });
            });
            // * Capture other python process outputs
            this.serverProcess.stderr.on("data", (data: string) => {
                console.log(`stderr: ${data}`);
                vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
                this.serverProcess = undefined;
                reject(`stderr: ${data}`);
            });
            this.serverProcess.on("close", (code: any) => {
                console.log(`leoBridge exited with code ${code}`);
                vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SERVER_STARTED, false);
                this.serverProcess = undefined;
                reject(`leoBridge exited with code ${code}`);
            });
        });
        // * Setup reactions to w_serverStartPromise resolution or rejection
        w_serverStartPromise.then((p_message) => {
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SERVER_STARTED, true); // server started
            if (this.config.connectToServerAutomatically) {
                console.log('auto connect...');
                this.connect();
            }
        }, (p_reason) => {
            vscode.window.showErrorMessage('Error - Cannot start Server: ' + p_reason);
        });
    }

    private setTreeViewTitle(): void { // * Available soon, see enable-proposed-api https://code.visualstudio.com/updates/v1_39#_treeview-message-api
        // // Set/Change outline pane title
        // this.leoTreeView.title = "test"; // "NOT CONNECTED", "CONNECTED", "LEO: OUTLINE"
        // this.leoTreeExplorerView.title = "test"; // "NOT CONNECTED", "CONNECTED", "LEO: OUTLINE"
    }

    public connect(): void {
        // this 'ready' promise starts undefined, so debounce by returning if not undefined
        if (this.leoBridgeReady || this.leoIsConnecting) {
            console.log('Already connected');
            return;
        }
        this.leoIsConnecting = true;
        this.leoBridgeReadyPromise = this.leoBridge.initLeoProcess();
        this.leoBridgeReadyPromise.then((p_package) => {
            this.leoIsConnecting = false;
            if (p_package.id !== 1) {
                this.cancelConnect("Leo Bridge Connection Error: Incorrect id");
            } else {
                this.leoBridgeReady = true;
                vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.BRIDGE_READY, true);
                if (!this.config.connectToServerAutomatically) {
                    vscode.window.showInformationMessage(`Connected`);
                }
            }
        },
            (p_reason) => {
                this.cancelConnect("Leo Bridge Connection Failed");
            });
    }

    public cancelConnect(p_message?: string): void {
        // * Also called from leoBridge.ts when its websocket reports disconnection
        if (this.leoBridgeReady) {
            // * Real disconnect error
            vscode.window.showErrorMessage(p_message ? p_message : "Disconnected");
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.DISCONNECTED, true);
        } else {
            // * Simple failed to connect
            vscode.window.showInformationMessage(p_message ? p_message : "Disconnected");
        }

        vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.TREE_OPENED, false);
        this.fileOpenedReady = false;

        vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.BRIDGE_READY, false);
        this.leoBridgeReady = false;

        this.leoIsConnecting = false;
        this.leoBridgeReadyPromise = undefined;
        this.leoObjectSelected = false;
        this.updateStatusBar();

        this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect);
    }

    public reveal(p_leoNode: LeoNode, p_options?: { select?: boolean, focus?: boolean, expand?: boolean | number }): Thenable<void> {
        if (this.leoTreeView.visible) {
            return this.leoTreeView.reveal(p_leoNode, p_options);
        }
        if (this.leoTreeExplorerView.visible && this.config.treeInExplorer) {
            return this.leoTreeExplorerView.reveal(p_leoNode, p_options);
        }
        return Promise.resolve();
    }

    private onTreeViewChangedSelection(p_event: vscode.TreeViewSelectionChangeEvent<LeoNode>): void {
        // * We capture and act upon the the 'select node' command, so this event is redundant for now
        //console.log("treeViewChangedSelection, selection length:", p_event.selection.length);
    }
    private onTreeViewExpandedElement(p_event: vscode.TreeViewExpansionEvent<LeoNode>): void {
        this.leoBridge.action("expandNode", p_event.element.apJson).then(() => {
            //console.log('back from expand');
        });
    }
    private onTreeViewCollapsedElement(p_event: vscode.TreeViewExpansionEvent<LeoNode>): void {
        this.leoBridge.action("collapseNode", p_event.element.apJson).then(() => {
            //console.log('back from collapse');
        });
    }

    private onTreeViewVisibilityChanged(p_event: vscode.TreeViewVisibilityChangeEvent, p_explorerView: boolean): void {
        if (p_event.visible && this.lastSelectedLeoNode) {
            this.leoTreeDataProvider.refreshTreeRoot(RevealType.NoReveal); // TODO: test if really needed, along with timeout (0) "getSelectedNode"
            setTimeout(() => {
                this.leoBridge.action("getSelectedNode", "{}").then(
                    (p_answer: LeoBridgePackage) => {
                        this.reveal(this.apToLeoNode(p_answer.node), { select: true, focus: true });
                    }
                );
            }, 0);
        }
    }

    private onActiveEditorChanged(p_event: vscode.TextEditor | undefined): void {
        if (this.leoCyclingBodies) {
            // Active Editor might change during 'delete expired gnx'
            return;
        }
        this.triggerBodySave(); // Save in case edits were pending
        // selecting another editor of the same window by the tab
        // * Status flag check
        if (!p_event && this.leoObjectSelected) {
            this.leoObjectSelected = false; // no editor!
            this.updateStatusBarDebounced();
            return;
        }
        // * Close and return  if deleted, or reveal in outline tree if needed
        if (p_event && p_event.document.uri.scheme === Constants.LEO_URI_SCHEME) {
            const w_editorGnx: string = p_event.document.uri.fsPath.substr(1);
            // If already deleted and not closed: just close it and return!
            if (!this.leoFileSystem.gnxValid(w_editorGnx)) {
                vscode.commands.executeCommand('workbench.action.closeActiveEditor')
                    .then(() => {
                        console.log('got back from "closeActiveEditor" EDITOR HAD CHANGED TO A DELETED GNX!');
                    });
                return;
            }
            const w_node: LeoNode | undefined = this.leoTextDocumentNodesRef[w_editorGnx];
            if (w_node && this.lastSelectedLeoNode) {
                // select node in tree
                // console.log("FORCED SELECTED NODE onActiveEditorChanged ");
                // ! This is the DELETE BUG
                // * setSelectedNode now returns what it could select, if anything

                this.leoBridge.action("setSelectedNode", w_node.apJson).then((p_answer: LeoBridgePackage) => {
                    const p_selectedNode = this.apToLeoNode(p_answer.node);
                    this.lastSelectedLeoNode = p_selectedNode;
                    this.reveal(p_selectedNode, { select: true, focus: false });
                });

                // this.leoBridge.action("setSelectedNode", w_node.apJson).then(() => {
                //     this.lastSelectedLeoNode = w_node;
                //     this.reveal(w_node, { select: true, focus: false });
                // });
            }
        }
        // * Status flag check
        if (vscode.window.activeTextEditor) {
            if (vscode.window.activeTextEditor.document.uri.scheme === Constants.LEO_URI_SCHEME) {
                if (!this.leoObjectSelected) {
                    // console.log("editor changed to : leo! SET STATUS!");
                    this.leoObjectSelected = true;
                    this.updateStatusBar();
                    return;
                }
            } else {
                // console.log("editor changed to : other, no status!");
                if (this.leoObjectSelected) {
                    this.leoObjectSelected = false;
                    this.updateStatusBar();
                    return;
                }
            }
        }
    }

    private onChangeEditorSelection(p_event: vscode.TextEditorSelectionChangeEvent): void {
        if (this.leoCyclingBodies) {
            // Active Editor might change during 'delete expired gnx'
            return;
        }
        // * Status flag check
        if (vscode.window.activeTextEditor) {
            // Yes an editor is active, just check if its leo scheme
            if (p_event.textEditor.document.uri.scheme === Constants.LEO_URI_SCHEME && vscode.window.activeTextEditor.document.uri.scheme === Constants.LEO_URI_SCHEME) {
                if (!this.leoObjectSelected) {
                    this.leoObjectSelected = true;
                    this.updateStatusBarDebounced();
                    return;
                }
            } else {
                if (this.leoObjectSelected) {
                    this.leoObjectSelected = false;
                    this.updateStatusBarDebounced();
                    return;
                }
            }
        } else {
            // No editor even active
            if (this.leoObjectSelected) {
                this.leoObjectSelected = false;
                this.updateStatusBarDebounced();
                return;
            }
        }
    }

    private onChangeEditorViewColumn(p_event: vscode.TextEditorViewColumnChangeEvent): void {
        // * This trigger when shifting editors through closing/inserting editors or closing columns
        // * No effect when dragging editor tabs: it just closes and reopens in other column, see 'onChangeVisibleEditors'
    }

    private onChangeVisibleEditors(p_event: vscode.TextEditor[]): void {
        // * Triggers when a different text editor in any column, either tab or body, is focused
        // * This is also what triggers after drag and drop, see onChangeEditorViewColumn

        // console.log('testing delete? onDidChangeVisibleTextEditors:', p_event.length);

    }

    private onChangeWindowState(p_event: vscode.WindowState): void {
        // * Triggers when a vscode window have gained or lost focus
    }

    private onDocumentSaved(p_event: vscode.TextDocument): void {
        // * Edited and saved the document, does it on any document in editor
    }

    private onDocumentChanged(p_event: vscode.TextDocumentChangeEvent): void {
        // * Edited the document: debounce/check if it was leo body and actual changes
        // * ".length" check necessary, see https://github.com/microsoft/vscode/issues/50344
        if (p_event.document.uri.scheme === Constants.LEO_URI_SCHEME && p_event.contentChanges.length) {

            if (this.bodyLastChangedDocument && (p_event.document.uri.fsPath !== this.bodyLastChangedDocument.uri.fsPath)) {
                // console.log('Switched Node while waiting edit debounce!');
                this.triggerBodySave(true); //Set p_forcedRefresh flag, this will also have cleared timeout
            }

            // * Instant tree node refresh trick: If icon should change then do it now, but only if there was no document edits pending
            if (!this.bodyChangeTimeout && !this.bodyChangeTimeoutSkipped) {
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
            let w_delay = this.config.bodyEditDelay; // debounce by restarting the timeout
            if (this.bodyChangeTimeout) {
                clearTimeout(this.bodyChangeTimeout);
            }
            this.bodyLastChangedDocument = p_event.document; // setup trigger
            this.bodyChangeTimeout = setTimeout(() => {
                this.triggerBodySave(); // no .then for clearing timer, done in trigger instead
            }, w_delay);
        }
    }

    private triggerBodySave(p_forcedRefresh?: boolean): Thenable<boolean> {
        // * Clear possible timeout if triggered by event from other than 'onDocumentChanged'
        if (this.bodyChangeTimeout) {
            clearTimeout(this.bodyChangeTimeout);
        }
        this.bodyChangeTimeout = undefined; // make falsy
        // * Send body to Leo
        if (this.bodyLastChangedDocument) {
            const w_document = this.bodyLastChangedDocument; // backup
            this.bodyLastChangedDocument = undefined; // make falsy
            if (this.lastBodyChangedRootRefreshedGnx !== w_document.uri.fsPath.substr(1)) {
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
            if (this.lastSelectedLeoNode && (w_param.gnx === this.lastSelectedLeoNode.gnx)) {
                if (!this.lastSelectedLeoNode.dirty || (this.lastSelectedLeoNode.hasBody === !w_param.body.length)) {
                    w_needsRefresh = true;
                    this.lastSelectedLeoNode.dirty = true;
                    this.lastSelectedLeoNode.hasBody = !!w_param.body.length;
                }
            }
            // * Maybe it was an 'aside' body pane, if so, force a full refresh
            if (this.lastSelectedLeoNode && (w_param.gnx !== this.lastSelectedLeoNode.gnx)) {
                w_needsRefresh = true;
            }
            // * Perform refresh if needed
            if (p_forceRefreshTree || (w_needsRefresh && this.lastSelectedLeoNode)) {
                // console.log(p_forceRefreshTree ? 'force refresh' : 'needed refresh');
                // * Refresh root because of need to dirty parent if in derived file
                this.leoTreeDataProvider.refreshTreeRoot(RevealType.NoReveal); // No focus this.leoTreeDataProvider.refreshTreeRoot
                this.lastBodyChangedRootRefreshedGnx = w_param.gnx;
            }
            this.bodyChangeTimeoutSkipped = false;
            return this.leoBridge.action("setBody", JSON.stringify(w_param)).then(p_result => {
                // console.log('Back from setBody to leo');
                return p_document.save();
                // return Promise.resolve(true);
            });
        } else {
            return Promise.resolve(false);
        }
    }

    public setLeoIntegSettings(p_changes: { code: string, value: any }[]): Promise<void> {
        // also returns as a promise in case additional procedures need to be run on completion
        this.isSettingConfig = true;
        const w_promises: Thenable<void>[] = [];
        const w_vscodeConfig = vscode.workspace.getConfiguration('leoIntegration');

        p_changes.forEach(change => {
            if (w_vscodeConfig.inspect(change.code)!.defaultValue === change.value) {
                // set as undefined - same as default
                w_promises.push(w_vscodeConfig.update(change.code, undefined, true));
                // console.log('clearing ', change.code, 'to undefined');
            } else {
                // set as value which is not default
                w_promises.push(w_vscodeConfig.update(change.code, change.value, true));
                // console.log('setting ', change.code, 'to ', change.value);
            }
        });

        return Promise.all(w_promises).then(
            () => {
                // console.log('ALL DONE!');
                this.isSettingConfig = false;
                this.getLeoIntegSettings();
            }
        );
    }

    private getLeoIntegSettings(): void {
        if (this.isSettingConfig) {
            return; // * Currently setting config, wait until its done all, and this will be called automatically
        } else {
            // * Graphic and theme settings
            this.config.invertNodeContrast = vscode.workspace.getConfiguration('leoIntegration').get('invertNodeContrast', false);
            // * Interface elements visibility
            this.config.treeInExplorer = vscode.workspace.getConfiguration('leoIntegration').get('treeInExplorer', true);
            this.config.showOpenAside = vscode.workspace.getConfiguration('leoIntegration').get('showOpenAside', true);
            this.config.showArrowsOnNodes = vscode.workspace.getConfiguration('leoIntegration').get('showArrowsOnNodes', false);
            this.config.showAddOnNodes = vscode.workspace.getConfiguration('leoIntegration').get('showAddOnNodes', false);
            this.config.showMarkOnNodes = vscode.workspace.getConfiguration('leoIntegration').get('showMarkOnNodes', false);
            this.config.showCloneOnNodes = vscode.workspace.getConfiguration('leoIntegration').get('showCloneOnNodes', false);
            this.config.showCopyOnNodes = vscode.workspace.getConfiguration('leoIntegration').get('showCopyOnNodes', false);
            // * Interface settings
            this.config.treeKeepFocus = vscode.workspace.getConfiguration('leoIntegration').get('treeKeepFocus', true);
            this.config.treeKeepFocusWhenAside = vscode.workspace.getConfiguration('leoIntegration').get('treeKeepFocusWhenAside', false);
            this.config.bodyEditDelay = vscode.workspace.getConfiguration('leoIntegration').get('bodyEditDelay', 500);
            // * Server and connection automation
            this.config.leoPythonCommand = vscode.workspace.getConfiguration('leoIntegration').get('leoPythonCommand', "");
            this.config.startServerAutomatically = vscode.workspace.getConfiguration('leoIntegration').get('startServerAutomatically', true);
            this.config.connectToServerAutomatically = vscode.workspace.getConfiguration('leoIntegration').get('connectToServerAutomatically', true);
            this.config.connectionAddress = vscode.workspace.getConfiguration('leoIntegration').get('connectionAddress', Constants.LEO_TCPIP_DEFAULT_ADDRESS); // 'ws://'
            this.config.connectionPort = vscode.workspace.getConfiguration('leoIntegration').get('connectionPort', Constants.LEO_TCPIP_DEFAULT_PORT); // 32125
            // * Set context for tree items visibility that are based on config options
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.TREE_IN_EXPLORER, this.config.treeInExplorer);
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SHOW_OPEN_ASIDE, this.config.showOpenAside);
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SHOW_ARROWS, this.config.showArrowsOnNodes);
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SHOW_ADD, this.config.showAddOnNodes);
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SHOW_MARK, this.config.showMarkOnNodes);
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SHOW_CLONE, this.config.showCloneOnNodes);
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SHOW_COPY, this.config.showCopyOnNodes);
        }
    }

    private onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {
        if (p_event.affectsConfiguration('leoIntegration')) {
            // console.log('Detected Change of vscode config in leoIntegration !');
            this.getLeoIntegSettings();
        }
    }

    private updateStatusBarDebounced(): void {
        if (this.updateStatusBarTimeout) {
            clearTimeout(this.updateStatusBarTimeout);
        }
        this.updateStatusBarTimeout = setTimeout(() => {
            this.updateStatusBar();
        }, 200);
    }

    private updateStatusBar(): void {
        if (this.updateStatusBarTimeout) { // Can be called directly, so clear timer if any
            clearTimeout(this.updateStatusBarTimeout);
        }
        vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.LEO_SELECTED, !!this.leoObjectSelected);

        if (this.leoObjectSelected && this.fileOpenedReady) { // * Also check in constructor for statusBar properties (the createStatusBarItem call itself)
            this.leoStatusBarItem.color = Constants.LEO_STATUSBAR_COLOR;
            this.leoStatusBarItem.tooltip = "Leo Key Bindings are in effect";
            // this.leoStatusBarItem.text = `$(keyboard) Literate `;
            // this.leoStatusBarItem.show();
        } else {
            this.leoStatusBarItem.color = this.statusbarNormalColor;
            this.leoStatusBarItem.tooltip = "Leo Key Bindings off";
            // this.leoStatusBarItem.hide();
        }
    }

    public apToLeoNode(p_ap: ArchivedPosition): LeoNode {
        let w_collapse: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
        if (p_ap.hasChildren) {
            w_collapse = p_ap.expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
        }
        const w_leoNode = new LeoNode(
            p_ap.headline, p_ap.gnx, w_collapse, JSON.stringify(p_ap), !!p_ap.cloned, !!p_ap.dirty, !!p_ap.marked, !!p_ap.hasBody, this
        );
        if (this.leoTextDocumentNodesRef[w_leoNode.gnx]) {
            this.leoTextDocumentNodesRef[w_leoNode.gnx] = w_leoNode;
        }
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
            if (this.revealSelectedNode && w_apData.selected) { // * revealSelectedNode flag: Reveal, select and focus or even show body pane!
                const w_selectFlag = this.revealSelectedNode >= RevealType.RevealSelect; // at least RevealSelect
                let w_focusFlag = this.revealSelectedNode >= RevealType.RevealSelectFocus;  // at least RevealSelectFocus
                if (this.revealSelectedNode === RevealType.RevealSelectShowBody) {
                    w_focusFlag = false;
                }
                const w_showBodyFlag = this.revealSelectedNode >= RevealType.RevealSelectFocusShowBody; // at least RevealSelectFocusShowBody
                this.revealSelectedNode = RevealType.NoReveal; // ok reset
                if (!this.lastSelectedLeoNode && this.revealSelectedNode < RevealType.RevealSelectFocusShowBody) { // very first time
                    this.lastSelectedLeoNode = w_leoNode;
                }
                setTimeout(() => {
                    // don't use this.treeKeepFocus
                    this.reveal(w_leoNode, { select: w_selectFlag, focus: w_focusFlag })
                        .then(() => {
                            if (w_showBodyFlag) {
                                this.selectTreeNode(w_leoNode);
                            }
                        });
                }, 0);
            }
            w_leoNodesArray.push(w_leoNode);
        }
        return w_leoNodesArray;
    }

    private locateOpenedBody(p_gnx: string): boolean {
        this.bodyTextDocumentSameUri = false;
        // * Only gets to visible editors, not every tab per editor
        // TODO : fix with newer vscode API
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (p_textEditor.document.uri.fsPath.substr(1) === p_gnx) {
                this.bodyTextDocumentSameUri = true;
                this.bodyMainSelectionColumn = p_textEditor.viewColumn;
                this.bodyTextDocument = p_textEditor.document;
            }
        });
        return !!this.bodyTextDocumentSameUri;
    }

    public selectTreeNode(p_node: LeoNode): Thenable<boolean> {
        // * User has selected a node via mouse click or 'enter' keypress in the outline
        let w_apJsonString: string = "";
        w_apJsonString = w_apJsonString + p_node.apJson + " ";
        w_apJsonString = w_apJsonString.trim();
        // console.log("Clicked on : ", p_node.label, w_apJsonString);

        // TODO / FIX THIS : WHY TF DOES THIS MAKE THE STATUS BAR INDICATOR FLASH BACK WHITE?
        // ! this.leoObjectSelected = true;
        // ! this.updateStatusBar();

        // TODO : Save and restore selection, along with cursor position, from selection object saved in each node (or gnx array)

        // * First check if having already this exact node selected
        if (p_node === this.lastSelectedLeoNode) {
            // same so just find and reopen
            this.locateOpenedBody(p_node.gnx);
            return this.showSelectedBodyDocument();
        }

        // * Get a promise to set selected node in Leo via leoBridge
        this.leoBridge.action("setSelectedNode", p_node.apJson).then(() => {
            // console.log('Back from setSelectedNode in Leo');
            // Place other functionality pending upon node selection here if needed
        });

        // * don't wait for promise to resolve a selection because there's no tree structure change
        this.triggerBodySave(); // trigger event to save previous document if timer to save if already started for another document

        this.lastSelectedLeoNode = p_node; // kept mostly in order to do refreshes if it changes, as opposed to a full tree refresh
        vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SELECTED_MARKED, this.lastSelectedLeoNode.marked);

        if (this.bodyTextDocument && !this.bodyTextDocument.isClosed) {

            // locateOpenedBody checks if already opened and visible,
            // locateOpenedBody also sets bodyTextDocumentSameUri, bodyMainSelectionColumn, bodyTextDocument
            this.locateOpenedBody(p_node.gnx);
            // * Save body to leo for the bodyTextDocument, then check if already opened, if not save and rename to clear undo buffer
            return this.bodySaveDocument(this.bodyTextDocument).then(p_result => {
                if (this.bodyTextDocument) { // have to re-test inside .then, oh well

                    if (this.bodyTextDocumentSameUri) {
                        this.bodyUri = vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_node.gnx);
                        return this.showSelectedBodyDocument(); // already opened in a column so just tell vscode to show it
                    } else {
                        return this.bodyTextDocument.save().then((p_result) => {
                            const w_edit = new vscode.WorkspaceEdit();
                            w_edit.renameFile(
                                this.bodyUri,
                                vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_node.gnx),
                                { overwrite: true, ignoreIfExists: true }
                            );
                            // * Rename file operation to clear undo buffer
                            return vscode.workspace.applyEdit(w_edit).then(p_result => {
                                this.bodyUri = vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_node.gnx);
                                return this.showSelectedBodyDocument();
                            });
                        });
                    }

                } else {
                    return Promise.resolve(true);
                }

            });

        } else {
            this.bodyUri = vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_node.gnx);
            return this.showSelectedBodyDocument();
        }
    }

    public showSelectedBodyDocument(): Thenable<boolean> {
        // * Make sure not to open unnecessary TextEditors
        return vscode.workspace.openTextDocument(this.bodyUri).then(p_document => {
            if (this.lastSelectedLeoNode) {
                // set entry of leoNodes Ref : leoTextDocumentNodesRef
                // (used when showing a body text, to force selection of node when editor tabs are switched)
                this.leoTextDocumentNodesRef[p_document.uri.fsPath.substr(1)] = this.lastSelectedLeoNode;
            }
            this.bodyTextDocument = p_document;

            vscode.window.visibleTextEditors.forEach(p_textEditor => {
                if (p_textEditor.document.uri.fsPath === p_document.uri.fsPath) {
                    // console.log('new selection found last second!: ', p_textEditor.viewColumn);
                    this.bodyMainSelectionColumn = p_textEditor.viewColumn;
                    this.bodyTextDocument = p_textEditor.document;
                }
            });
            const w_keepFocus = this.forceBodyFocus ? false : this.config.treeKeepFocus;
            if (this.forceBodyFocus) {
                this.forceBodyFocus = false; // Reset this single-use flag
            }
            return vscode.window.showTextDocument(this.bodyTextDocument, {
                viewColumn: this.bodyMainSelectionColumn ? this.bodyMainSelectionColumn : 1,
                preserveFocus: w_keepFocus, // an optional flag that when true will stop the editor from taking focus
                preview: false // should text document be in preview only? set false for fully opened
                // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
            }).then(w_bodyEditor => {
                // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
                // other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
                return Promise.resolve(true);
            });
        });
    }

    public showBodyDocumentAside(p_node: LeoNode): Thenable<boolean> {
        // * Trigger event to save previous document just in in case (if timer to save is already started for another document)
        this.triggerBodySave();
        return vscode.workspace.openTextDocument(vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_node.gnx)).then(p_document => {
            if (!this.config.treeKeepFocusWhenAside) {
                this.leoBridge.action("setSelectedNode", p_node.apJson).then((p_answer: LeoBridgePackage) => {
                    const p_selectedNode = this.apToLeoNode(p_answer.node);
                    this.leoTextDocumentNodesRef[p_node.gnx] = p_selectedNode;
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
    }

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

    private leoBridgeActionAndRefresh(p_action: string, p_node: LeoNode, p_revealType?: RevealType | undefined): Promise<LeoBridgePackage> {
        return this.leoBridge.action(p_action, p_node.apJson).then(p_package => {
            this.leoTreeDataProvider.refreshTreeRoot(p_revealType); // refresh all, needed to get clones to refresh too!
            return Promise.resolve(p_package);
        });
    }

    // * Leo Commands accessible via mouse clicks and right-click menu entries for single nodes
    public editHeadline(p_node: LeoNode, p_isSelectedNode?: boolean) {
        if (this.leoBridgeActionBusy) {
            // * Debounce by waiting for command to resolve, and also initiate refresh, before accepting other 'leo commands'
            console.log('Too fast! editHeadline');
        } else {
            if (!p_isSelectedNode && p_node === this.lastSelectedLeoNode) {
                p_isSelectedNode = true;
            }
            this.leoBridgeActionBusy = true;
            this.editHeadlineInputOptions.value = p_node.label; // preset input pop up
            vscode.window.showInputBox(this.editHeadlineInputOptions)
                .then(
                    p_newHeadline => {
                        if (p_newHeadline) {
                            p_node.label = p_newHeadline; // ! When labels change, ids will change and that selection and expansion state cannot be kept stable anymore.
                            this.leoBridge.action("setNewHeadline", "{\"node\":" + p_node.apJson + ", \"headline\": \"" + p_newHeadline + "\"}"
                            ).then(
                                (p_answer: LeoBridgePackage) => {
                                    if (p_isSelectedNode) {
                                        this.forceBodyFocus = true;
                                    }
                                    // ! p_revealSelection flag needed because we voluntarily refreshed the automatic ID
                                    this.leoTreeDataProvider.refreshTreeRoot(p_isSelectedNode ? RevealType.RevealSelect : RevealType.RevealSelectFocus); // refresh all, needed to get clones to refresh too!
                                    // focus on body pane
                                    // if (p_isSelectedNode) {
                                    //     this.focusBodyIfVisible(p_node.gnx);
                                    // }
                                    this.leoBridgeActionBusy = false;
                                }
                            );
                        } else {
                            if (p_isSelectedNode) {
                                this.focusBodyIfVisible(p_node.gnx);
                            }
                            this.leoBridgeActionBusy = false;
                        }
                    }
                );
        }
    }
    public mark(p_node: LeoNode): void {
        if (this.leoBridgeActionBusy) {
            // * Debounce by waiting for command to resolve, and also initiate refresh, before accepting other 'leo commands'
            console.log('Too fast! mark');
        } else {
            this.leoBridgeActionBusy = true;
            this.leoBridgeActionAndRefresh("markPNode", p_node)
                .then(() => {
                    this.leoBridgeActionBusy = false;
                });
            // don't wait for promise to resolve for setting context
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SELECTED_MARKED, true);
        }
    }
    public unmark(p_node: LeoNode): void {
        if (this.leoBridgeActionBusy) {
            // * Debounce by waiting for command to resolve, and also initiate refresh, before accepting other 'leo commands'
            console.log('Too fast! unmark');
        } else {
            this.leoBridgeActionBusy = true;
            this.leoBridgeActionAndRefresh("unmarkPNode", p_node)
                .then(() => {
                    this.leoBridgeActionBusy = false;
                });
            // don't wait for promise to resolve for setting context
            vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.SELECTED_MARKED, false);
        }
    }
    public copyNode(p_node: LeoNode): void {
        this.leoBridgeActionAndRefresh("copyPNode", p_node);
    }
    public cutNode(p_node: LeoNode): void {
        // TODO : Set up like delete to close body panes
        this.leoBridgeActionAndRefresh("cutPNode", p_node);
    }
    public pasteNode(p_node: LeoNode): void {
        this.leoBridgeActionAndRefresh("pastePNode", p_node);
    }
    public pasteNodeAsClone(p_node: LeoNode): void {
        this.leoBridgeActionAndRefresh("pasteAsClonePNode", p_node);
    }
    public delete(p_node: LeoNode): void {
        // * Delete node and close bodies of deleted nodes
        if (this.leoBridgeActionBusy) {
            // * Debounce by waiting for command to resolve, and also initiate refresh, before accepting other 'leo commands'
            console.log('Too fast! delete');
        } else {
            this.leoBridgeActionBusy = true;
            this.leoCyclingBodies = true;
            // start by finishing any pending edits by triggering body save
            this.triggerBodySave()
                .then(p_saveResult => {
                    return this.leoBridge.action("deletePNode", p_node.apJson);
                })
                .then(p_package => {
                    // console.log('Back from delete, after closing unneeded bodies, we should reveal node: ', p_package.node.headline);
                    // this.bodyUri = vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_package.node.gnx); // ! don't showSelectedBodyDocument yet
                    return this.leoFileSystem.getExpiredGnxList();
                })
                .then(p_expiredList => {
                    p_expiredList.forEach(p_expiredGnx => {
                        // console.log('expired list item gnx: ', p_expiredGnx);
                        vscode.workspace.fs.delete(vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_expiredGnx));
                    });
                    // console.log('done calling delete on all expired gnx still opened');
                    return this.documentManager.closeExpired(p_expiredList);
                })
                .then(p_docResult => {
                    // console.log('Back from doc manager', p_docResult);
                    // With any remaining opened text editors watched:
                    return this.leoFileSystem.getRemainingWatchedGnxList();
                })
                .then((p_remainingGnxList) => {
                    // console.log('Back from get remaining Gnx List', p_remainingGnxList);
                    let w_located: boolean | string = false;
                    p_remainingGnxList.forEach(p_remainingGnx => {
                        if (!w_located && this.locateOpenedBody(p_remainingGnx)) {
                            w_located = p_remainingGnx;
                        }
                    });
                    return Promise.resolve(w_located);
                })
                .then(p_locatedResult => {
                    // console.log('Back from locate (false if not found):', p_locatedResult);
                    // * If this.lastSelectedLeoNode is undefined it will be set by arrayToLeoNodesArray when refreshing tree root
                    this.leoCyclingBodies = false;
                    this.leoBridgeActionBusy = false;
                    this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelectFocusShowBody); // ! finish by refreshing the tree and selecting the node
                });
        }

    }
    public moveOutlineDown(p_node: LeoNode): void {
        this.leoBridgeActionAndRefresh("movePNodeDown", p_node);
    }
    public moveOutlineLeft(p_node: LeoNode): void {
        this.leoBridgeActionAndRefresh("movePNodeLeft", p_node);
    }
    public moveOutlineRight(p_node: LeoNode): void {
        this.leoBridgeActionAndRefresh("movePNodeRight", p_node);
    }
    public moveOutlineUp(p_node: LeoNode): void {
        this.leoBridgeActionAndRefresh("movePNodeUp", p_node);
    }
    public insertNode(p_node: LeoNode): void {
        if (this.leoBridgeActionBusy) {
            // * Debounce by waiting for command to resolve, and also initiate refresh, before accepting other 'leo commands'
            console.log('Too fast! insert');
        } else {
            this.leoBridgeActionBusy = true;
            this.leoBridge.action("insertPNode", p_node.apJson).then(p_package => {
                this.leoFileSystem.addGnx(p_package.node.gnx);
                this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelectShowBody); // refresh all, needed to get clones to refresh too!

                this.newHeadlineInputOptions.value = p_package.node.headline; // preset input pop up
                vscode.window.showInputBox(this.newHeadlineInputOptions)
                    .then(
                        p_newHeadline => {
                            if (p_newHeadline) {
                                p_node.label = p_newHeadline; // ! When labels change, ids will change and that selection and expansion state cannot be kept stable anymore.
                                this.leoBridge.action("setNewHeadline", "{\"node\":" + JSON.stringify(p_package.node) + ", \"headline\": \"" + p_newHeadline + "\"}"
                                ).then(
                                    (p_answer: LeoBridgePackage) => {
                                        this.forceBodyFocus = true;
                                        // ! p_revealSelection flag needed because we voluntarily refreshed the automatic ID
                                        this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect); // refresh all, needed to get clones to refresh too!
                                        this.leoBridgeActionBusy = false;
                                    }
                                );
                            } else {
                                this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect); // refresh all, needed to get clones to refresh too!
                                this.focusBodyIfVisible(p_node.gnx);
                                this.leoBridgeActionBusy = false;
                            }
                        }
                    );
            });
        }
    }
    public cloneNode(p_node: LeoNode): void {
        this.leoBridgeActionAndRefresh("clonePNode", p_node);
    }
    public promote(p_node: LeoNode): void {
        this.leoBridgeActionAndRefresh("promotePNode", p_node);
    }
    public demote(p_node: LeoNode): void {
        this.leoBridgeActionAndRefresh("demotePNode", p_node);
    }
    // * Leo Commands accessible via the command palette or keyboard shortcuts applied to the currently selected node
    public editSelectedHeadline() {
        if (this.lastSelectedLeoNode) {
            this.editHeadline(this.lastSelectedLeoNode, true);
        }
    }
    public markSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.mark(this.lastSelectedLeoNode);
        }
    }
    public unmarkSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.unmark(this.lastSelectedLeoNode);
        }
    }
    public copyNodeSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.copyNode(this.lastSelectedLeoNode);
        }
    }
    public cutNodeSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.cutNode(this.lastSelectedLeoNode);
        }
    }
    public pasteNodeAtSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.pasteNode(this.lastSelectedLeoNode);
        }
    }
    public pasteNodeAsCloneAtSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.pasteNodeAsClone(this.lastSelectedLeoNode);
        }
    }
    public deleteSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.delete(this.lastSelectedLeoNode);
        }
    }
    public moveOutlineDownSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.moveOutlineDown(this.lastSelectedLeoNode);
        }
    }
    public moveOutlineLeftSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.moveOutlineLeft(this.lastSelectedLeoNode);
        }
    }
    public moveOutlineRightSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.moveOutlineRight(this.lastSelectedLeoNode);
        }
    }
    public moveOutlineUpSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.moveOutlineUp(this.lastSelectedLeoNode);
        }
    }
    public insertNodeSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.insertNode(this.lastSelectedLeoNode);
        }
    }
    public cloneNodeSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.cloneNode(this.lastSelectedLeoNode);
        }
    }
    public promoteSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.promote(this.lastSelectedLeoNode);
        }
    }
    public demoteSelection(): void {
        if (this.lastSelectedLeoNode) {
            this.demote(this.lastSelectedLeoNode);
        }
    }

    // * Critical Leo Bridge Actions
    public undo(): void {
        vscode.window.showInformationMessage(`TODO: undo last operation`); // temp placeholder
    }
    public executeScript(): void {
        vscode.window.showInformationMessage(`TODO: executeScript`); // temp placeholder
    }
    public saveLeoFile(): void {
        vscode.window.showInformationMessage(`TODO: saveLeoFile : Try to save Leo File`); // temp placeholder
    }
    public closeLeoFile(): void {
        if (this.fileOpenedReady) {
            vscode.window.showInformationMessage(`TODO: close leo file`); // temp placeholder
        } else {
            console.log('Error: Cannot close. No Files Opened.');
        }
    }

    public openLeoFile(): void {
        if (this.fileOpenedReady) {
            vscode.window.showInformationMessage("leo file already opened!");
            return;
        }
        this.leoFiles.getLeoFileUrl()
            .then(p_chosenLeoFile => {
                return this.leoBridge.action("openFile", '"' + p_chosenLeoFile + '"');
            }, p_reason => {
                // console.log('canceled', p_reason); // File Open is Canceled - Ignore
                return Promise.reject(p_reason);
            })
            .then((p_result: LeoBridgePackage) => {
                // TODO : Validate p_result
                // * Start body pane system
                this.context.subscriptions.push(vscode.workspace.registerFileSystemProvider(Constants.LEO_URI_SCHEME, this.leoFileSystem, { isCaseSensitive: true }));
                // * Startup flag
                this.fileOpenedReady = true;
                // * First valid redraw of tree
                this.leoTreeDataProvider.refreshTreeRoot(RevealType.RevealSelect); // p_revealSelection flag set
                // * set body URI for body filesystem
                this.bodyUri = vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_result.node.gnx);
                // * First StatusBar appearance
                this.updateStatusBar();
                this.leoStatusBarItem.show();
                // * First Body appearance
                return this.leoFileSystem.refreshPossibleGnxList();
            })
            .then(p_list => {
                return vscode.commands.executeCommand('setContext', Constants.CONTEXT_FLAGS.TREE_OPENED, true);
            })
            .then(p_result => {
                return this.showSelectedBodyDocument();
            });
    }

    public test(): void {
        if (this.fileOpenedReady) {
            console.log("sending test 'getSelectedNode'");
            // * if no parameter required, still send "{}"
            this.leoBridge.action("getSelectedNode", "{}")
                .then((p_answer: LeoBridgePackage) => {
                    console.log('Test got Back from getSelectedNode, now revealing :', p_answer.node.headline);
                    return Promise.resolve(this.reveal(this.apToLeoNode(p_answer.node), { select: true, focus: true }));
                })
                .then(() => {
                    console.log("...now testing documentManager ");
                    return this.documentManager.countOpen();
                })
                .then(p_docResult => {
                    console.log('Back from doc manager', p_docResult);
                });
        } else {
            vscode.window.showInformationMessage("Click the folder icon on the Leo Outline sidebar to open a Leo file");
        }
    }
}