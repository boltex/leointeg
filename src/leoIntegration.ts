import * as vscode from "vscode";
import * as child from 'child_process';
import * as os from 'os';
import * as which from 'which';
import { Constants } from "./constants";
import { LeoBridgePackage, RevealType, ArchivedPosition } from "./types";
import { LeoFiles } from "./leoFiles";
import { LeoNode } from "./leoNode";
import { LeoOutlineProvider } from "./leoOutline";
import { LeoBodyProvider } from "./leoBody";
import { LeoBridge } from "./leoBridge";

export class LeoIntegration {
    // * Startup flags
    public fileOpenedReady: boolean = false;
    private leoBridgeReadyPromise: Promise<LeoBridgePackage> | undefined; // set when leoBridge has a leo controller ready

    // * Configuration Settings
    public treeKeepFocus: boolean;
    public treeKeepFocusWhenAside: boolean;
    public treeInExplorer: boolean;
    public showOpenAside: boolean;
    public bodyEditDelay: number;
    public leoServerCommand: string;
    public startServerAutomatically: boolean;
    public connectToServerAutomatically: boolean;

    // * Leo Bridge Server Process
    private process: child.ChildProcess | undefined;

    // * Browse
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

    private bodyTextDocumentSameUri: boolean = false; // Flag used when checking if clicking a node requires opening a body pane text editor
    private bodyMainSelectionColumn: vscode.ViewColumn | undefined;

    private leoTextDocumentNodesRef: { [gnx: string]: LeoNode } = {};

    // * Status Bar
    public leoStatusBarItem: vscode.StatusBarItem;
    public leoObjectSelected: boolean = false; // represents having focus on a leo body, as opposed to anything else
    public statusbarNormalColor = new vscode.ThemeColor("statusBar.foreground");  //"statusBar.foreground"
    private updateStatusBarTimeout: NodeJS.Timeout | undefined;

    // * Edit Headline Input Box
    private editHeadlineInputOptions: vscode.InputBoxOptions = {
        ignoreFocusOut: false, // clicking outside cancels the headline change
        value: "", // will be replaced live upon showing from the node's text
        valueSelection: undefined,
        prompt: 'Edit Headline'
    };

    // * Timing
    private bodyChangeTimeout: NodeJS.Timeout | undefined;
    private bodyChangeTimeoutSkipped: boolean = false; // Used for instant tree node refresh trick
    private lastbodyChangedRootRefreshedGnx: string = "";
    private bodyLastChangedDocument: vscode.TextDocument | undefined;

    constructor(private context: vscode.ExtensionContext) {
        // * Get configuration settings
        this.treeKeepFocus = vscode.workspace.getConfiguration('leoIntegration').get('treeKeepFocus', false);
        this.treeKeepFocusWhenAside = vscode.workspace.getConfiguration('leoIntegration').get('treeKeepFocusWhenAside', false);
        this.treeInExplorer = vscode.workspace.getConfiguration('leoIntegration').get('treeInExplorer', false);
        vscode.commands.executeCommand('setContext', 'treeInExplorer', this.treeInExplorer);
        this.showOpenAside = vscode.workspace.getConfiguration('leoIntegration').get('showOpenAside', true);
        vscode.commands.executeCommand('setContext', 'showOpenAside', this.showOpenAside);
        this.bodyEditDelay = vscode.workspace.getConfiguration('leoIntegration').get('bodyEditDelay', 500);
        this.leoServerCommand = vscode.workspace.getConfiguration('leoIntegration').get('leoServerCommand', "");
        this.startServerAutomatically = vscode.workspace.getConfiguration('leoIntegration').get('startServerAutomatically', false);
        this.connectToServerAutomatically = vscode.workspace.getConfiguration('leoIntegration').get('connectToServerAutomatically', false);

        // * File Browser
        this.leoFiles = new LeoFiles(context);

        // * Setup leoBridge
        this.leoBridge = new LeoBridge(context);

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
        this.leoTreeExplorerView.onDidChangeVisibility((p_event => this.onTreeViewVisibilityChanged(p_event, true)));  // * Trigger 'show tree in explorer view'

        // * Body Pane
        this.leoFileSystem = new LeoBodyProvider(this);
        this.bodyMainSelectionColumn = 1;

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
        vscode.window.onDidChangeActiveTextEditor(p_event => this.onActiveEditorChanged(p_event));
        vscode.window.onDidChangeTextEditorSelection(p_event => this.onChangeEditorSelection(p_event));
        vscode.window.onDidChangeTextEditorViewColumn(p_event => this.onChangeEditorViewColumn(p_event));
        vscode.window.onDidChangeVisibleTextEditors(p_event => this.onChangeVisibleEditors(p_event));
        vscode.window.onDidChangeWindowState(p_event => this.onChangeWindowState(p_event));

        vscode.workspace.onDidChangeTextDocument(p_event => this.onDocumentChanged(p_event));
        vscode.workspace.onDidSaveTextDocument(p_event => this.onDocumentSaved(p_event));
        vscode.workspace.onDidChangeConfiguration(p_event => this.onChangeConfiguration(p_event));

        // * Start server and / or connect to it (as specified in settings)
        this.startNetworkServices();
    }

    private startNetworkServices(): void {
        // * (via settings) Start a server and / or also connect automatically to a server upon extension activation
        if (this.startServerAutomatically) {
            let w_pythonPath = "";
            const w_serverScriptPath = this.context.extensionPath + Constants.LEO_BRIDGE_SERVER_PATH;
            if (this.leoServerCommand && this.leoServerCommand.length) {
                // start by running command (see executeCommand for multiple useful snippets)
                console.log('Starting server with command: ' + this.leoServerCommand);
                // set path
                w_pythonPath = this.leoServerCommand;
            } else {
                w_pythonPath = Constants.LEO_DEFAULT_PYTHON;

                let platform = os.platform();
                if (platform === "win32") {
                    w_pythonPath = Constants.LEO_WIN32_PYTHON;
                }
                console.log('Launch with default command : ' + w_pythonPath + " " + w_serverScriptPath);
                vscode.window.showInformationMessage('Launch with default command : ' + w_pythonPath + " " + w_serverScriptPath);
            }
            // * Spawn a python child process for a leobridge server
            this.process = child.spawn(w_pythonPath, [
                "\"" + w_serverScriptPath + "\""
            ]);
            // * Capture the python process output
            this.process.stdout.on("data", (data: string) => {
                data.toString().split("\n").forEach(p_line => {
                    p_line = p_line.trim();
                    if (p_line) { // * std out process line by line: json shouldn't have line breaks
                        console.log("leoBridge: ", p_line);
                    }
                });
            });
            // * Capture other python process outputs
            this.process.stderr.on("data", (data: string) => {
                console.log(`stderr: ${data}`);
            });
            this.process.on("close", (code: any) => {
                console.log(`leoBridge exited with code ${code}`);
                this.process = undefined;
            });

        }
        // * (via settings) Connect to Leo Bridge server automatically
        if (this.connectToServerAutomatically) {
            let w_startTimeout = 0;
            if (this.startServerAutomatically) {
                // * also had to start server, wait a bit or check if really started
                console.log('waiting 2 seconds');
                w_startTimeout = 2000;
            }
            // * finally connect
            setTimeout(() => {
                console.log('connecting...');
                this.connect();
            }, w_startTimeout);
        }
    }

    private setOutlineTitle(): void { // * Available soon, see enable-proposed-api https://code.visualstudio.com/updates/v1_39#_treeview-message-api
        // this.leoTreeView.title = "test"; // "NOT CONNECTED", "CONNECTED", "LEO: OUTLINE"
        // this.leoTreeExplorerView.title = "test"; // "NOT CONNECTED", "CONNECTED", "LEO: OUTLINE"
    }

    // * This 'executeCommand' functions is taken from https://github.com/yhirose/vscode-filtertext/blob/master/src/extension.ts
    private executeCommand(name: string, args: string[], inputText: string, options: any): Promise<string> {
        let config = (vscode.workspace.getConfiguration('filterText') as any);
        let platform = os.platform();
        let bashPath: string | null = null;
        if (platform === 'win32' && config.invokeViaBash.windows === true) {
            bashPath = config.bashPath.windows; // config.bashPath.windows default to "C:/cygwin/bin/bash.exe"
        }
        return new Promise((resolve, reject) => {
            let run = (path: string, args: any, resolve: (value?: string | PromiseLike<string> | undefined) => void) => {
                let filter = child.spawn(path, args, options);

                if (inputText.length > 0) {
                    filter.stdin.write(inputText);
                }
                filter.stdin.end();

                let filteredText = '';
                let errorText = '';
                filter.stdout.on('data', function (data) {
                    filteredText += data;
                });

                filter.stderr.on('data', function (data) {
                    errorText += data;
                });
                filter.on('close', function (code: number, signal: string) {
                    if (filteredText === '' && code !== 0 && errorText !== '') { // Only reject and show error when stdout got nothing, exit status indicate failure, and stderr got something.  E.g. grep with no match will have failure status, but no error message or output, shouldn't show error here.
                        reject("Command exits (status: " + code + ") with error message:\n" + errorText);
                    } else {
                        resolve(filteredText);
                    }
                });
            };
            if (bashPath === null) {
                which(name, (err, path) => {
                    if (err) {
                        reject('Invalid command is entered.');
                        return;
                    } if (path) {
                        run(path, args, resolve);
                    } else {
                        reject('No Path.');
                    }
                });
            } else {
                let prependArgs;
                let cwd = options['cwd'];
                // invoke bash with "-l" (--login) option.  This is needed for Cygwin where the Cygwin's C:/cygwin/bin path may exist in PATH only after --login.
                if (cwd !== null) {
                    prependArgs = ['-lc', 'cd "$1"; shift; "$@"', 'bash', cwd, name]; // set current working directory after bash's --login (-l)
                }
                else {
                    prependArgs = ['-lc', '"$@"', 'bash', name]; // 'bash' at "$0" is the program name for stderr messages' labels.
                }
                run(bashPath, prependArgs.concat(args), resolve);
            }
        });
    }

    public connect(): void {
        // this 'ready' promise starts undefined, so debounce by returning if not undefined
        if (this.leoBridgeReadyPromise) {
            return;
        }
        this.leoBridgeReadyPromise = this.leoBridge.initLeoProcess();
        this.leoBridgeReadyPromise.then((p_package) => {
            if (p_package.id !== 1) {
                console.error("Leo Bridge Connection Error: Incorrect id");
            } else {
                vscode.commands.executeCommand('setContext', 'leoBridgeReady', true);
                vscode.window.showInformationMessage(`Connected`);
            }
        });
    }

    public reveal(p_leoNode: LeoNode, p_options?: { select?: boolean, focus?: boolean, expand?: boolean | number }): void {
        if (this.leoTreeView.visible) {
            this.leoTreeView.reveal(p_leoNode, p_options);
        }
        if (this.leoTreeExplorerView.visible && this.treeInExplorer) {
            this.leoTreeExplorerView.reveal(p_leoNode, p_options);
        }
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
        this.triggerBodySave(); // Save in case edits were pending
        // selecting another editor of the same window by the tab
        // * Status flag check
        if (!p_event && this.leoObjectSelected) {
            this.leoObjectSelected = false; // no editor!
            this.updateStatusBar();
            return;
        }
        // * Reveal if needed
        if (p_event && p_event.document.uri.scheme === Constants.LEO_URI_SCHEME) {
            const w_node: LeoNode | undefined = this.leoTextDocumentNodesRef[p_event.document.uri.fsPath.substr(1)];
            if (w_node && this.lastSelectedLeoNode) {
                // select node in tree
                this.leoBridge.action("setSelectedNode", w_node.apJson).then(() => {
                    this.reveal(w_node, { select: true, focus: false });
                });
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
        // * Status flag check
        if (vscode.window.activeTextEditor) {
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
            let w_delay = this.bodyEditDelay; // debounce by restarting the timeout
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
            if (this.lastbodyChangedRootRefreshedGnx !== w_document.uri.fsPath.substr(1)) {
                p_forcedRefresh = true;
            }
            return this.bodySaveDocument(w_document, p_forcedRefresh);
        } else {
            return Promise.resolve(true);
        }
    }

    public bodySaveDocument(p_document: vscode.TextDocument, p_forceRefreshTree?: boolean): Thenable<boolean> {
        // * Sets new body text of currently selected node on leo's side
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
                this.lastbodyChangedRootRefreshedGnx = w_param.gnx;
            }
            this.bodyChangeTimeoutSkipped = false;
            return this.leoBridge.action("setBody", JSON.stringify(w_param)).then(p_result => {
                // console.log('Back from setBody to leo');
                return Promise.resolve(true);
            });
        } else {
            return Promise.resolve(false);
        }
    }

    private getLeoIntegSettings(): void {
        this.treeKeepFocus = vscode.workspace.getConfiguration('leoIntegration').get('treeKeepFocus', false);
        this.treeKeepFocusWhenAside = vscode.workspace.getConfiguration('leoIntegration').get('treeKeepFocusWhenAside', false);
        this.treeInExplorer = vscode.workspace.getConfiguration('leoIntegration').get('treeInExplorer', false);
        vscode.commands.executeCommand('setContext', 'treeInExplorer', this.treeInExplorer);
        this.showOpenAside = vscode.workspace.getConfiguration('leoIntegration').get('showOpenAside', true);
        vscode.commands.executeCommand('setContext', 'showOpenAside', this.showOpenAside);
        this.bodyEditDelay = vscode.workspace.getConfiguration('leoIntegration').get('bodyEditDelay', 500);
        this.leoServerCommand = vscode.workspace.getConfiguration('leoIntegration').get('leoServerCommand', "");
        this.startServerAutomatically = vscode.workspace.getConfiguration('leoIntegration').get('startServerAutomatically', false);
        this.connectToServerAutomatically = vscode.workspace.getConfiguration('leoIntegration').get('connectToServerAutomatically', false);
    }

    private onChangeConfiguration(p_event: vscode.ConfigurationChangeEvent): void {
        if (p_event.affectsConfiguration('leoIntegration')) {
            this.getLeoIntegSettings();
        }
    }

    private updateStatusBarDebounced(): void {
        if (this.updateStatusBarTimeout) {
            clearTimeout(this.updateStatusBarTimeout);
        }
        this.updateStatusBarTimeout = setTimeout(() => {
            this.updateStatusBar();
        }, 100);
    }

    private updateStatusBar(): void {
        if (this.updateStatusBarTimeout) { // Can be called directly, so clear timer if any
            clearTimeout(this.updateStatusBarTimeout);
        }
        vscode.commands.executeCommand('setContext', 'leoObjectSelected', this.leoObjectSelected);

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
        let w_collaps: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
        if (p_ap.hasChildren) {
            w_collaps = p_ap.expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
        }
        const w_leoNode = new LeoNode(
            p_ap.headline, p_ap.gnx, w_collaps, JSON.stringify(p_ap), !!p_ap.cloned, !!p_ap.dirty, !!p_ap.marked, !!p_ap.hasBody
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

    public selectTreeNode(p_node: LeoNode): void {
        // * User has selected a node in the outline
        // TODO : Save and restore selection, along with cursor position, from selection object saved in each node (or gnx array)
        const w_isAlreadySelected: boolean = (p_node === (this.lastSelectedLeoNode ? this.lastSelectedLeoNode : ""));
        if (w_isAlreadySelected) {
            // same so just find and reopen
            this.bodyTextDocumentSameUri = false;
            vscode.window.visibleTextEditors.forEach(p_textEditor => {
                if (p_textEditor.document.uri.fsPath.substr(1) === p_node.gnx) {
                    this.bodyTextDocumentSameUri = true;
                    this.bodyMainSelectionColumn = p_textEditor.viewColumn;
                    this.bodyTextDocument = p_textEditor.document;
                }
            });
            this.showSelectedBodyDocument();
            return;
        }

        this.leoBridge.action("setSelectedNode", p_node.apJson).then(() => {
            // console.log('Back from setSelectedNode in Leo');
        });
        // * don't wait for setSelectedNode promise to resolve

        this.triggerBodySave(); // trigger event to save previous document if timer to save if already started for another document

        this.lastSelectedLeoNode = p_node; // kept mostly in order to do refreshes if it changes, as opposed to a full tree refresh

        if (this.bodyTextDocument && !this.bodyTextDocument.isClosed) {

            this.bodyTextDocumentSameUri = false;
            vscode.window.visibleTextEditors.forEach(p_textEditor => {
                if (p_textEditor.document.uri.fsPath.substr(1) === p_node.gnx) {
                    // console.log('new selection found: ', p_textEditor.viewColumn, "was set on ", this.bodyMainSelectionColumn);
                    this.bodyTextDocumentSameUri = true;
                    this.bodyMainSelectionColumn = p_textEditor.viewColumn;
                    this.bodyTextDocument = p_textEditor.document;
                }
            });
            // * Save body to leo for the bodyTextDocument, then check if already opened, if not save and rename to clear undo buffer
            this.bodySaveDocument(this.bodyTextDocument).then(p_result => {
                if (this.bodyTextDocument) { // have to re-test inside .then, oh well

                    if (this.bodyTextDocumentSameUri) {
                        this.bodyUri = vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_node.gnx);
                        this.showSelectedBodyDocument(); // already opened in a column so just tell vscode to show it
                    } else {
                        this.bodyTextDocument.save().then((p_result) => {
                            const w_edit = new vscode.WorkspaceEdit();
                            w_edit.renameFile(
                                this.bodyUri,
                                vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_node.gnx),
                                { overwrite: true, ignoreIfExists: true }
                            );
                            // ! Rename file operation to clear undo buffer
                            vscode.workspace.applyEdit(w_edit).then(p_result => {
                                this.bodyUri = vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_node.gnx);
                                this.showSelectedBodyDocument();
                            });
                        });
                    }

                }

            });

        } else {
            this.bodyUri = vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_node.gnx);
            this.showSelectedBodyDocument();
        }
    }

    public showSelectedBodyDocument(): Thenable<boolean> {
        // * Make sure not to open unnecessary TextEditors
        return vscode.workspace.openTextDocument(this.bodyUri).then(p_document => {
            if (this.lastSelectedLeoNode) {
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

            return vscode.window.showTextDocument(this.bodyTextDocument, {
                viewColumn: this.bodyMainSelectionColumn ? this.bodyMainSelectionColumn : 1,
                preserveFocus: this.treeKeepFocus, // an optional flag that when true will stop the editor from taking focus
                preview: false // should text document be in preview only? set false for fully opened
                // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
            }).then(w_bodyEditor => {
                // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
                // other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
                return (true);
            });
        });
    }

    public showBodyDocumentAside(p_node: LeoNode): Thenable<boolean> {
        // * Trigger event to save previous document just in in case (if timer to save is already started for another document)
        this.triggerBodySave();
        return vscode.workspace.openTextDocument(vscode.Uri.parse(Constants.LEO_URI_SCHEME_HEADER + p_node.gnx)).then(p_document => {
            this.leoTextDocumentNodesRef[p_node.gnx] = p_node;
            if (!this.treeKeepFocusWhenAside) {
                this.leoBridge.action("setSelectedNode", p_node.apJson).then(() => {
                    this.reveal(p_node, { select: true, focus: false });
                });
            }
            return vscode.window.showTextDocument(p_document, {
                viewColumn: vscode.ViewColumn.Beside,
                preserveFocus: this.treeKeepFocusWhenAside, // an optional flag that when true will stop the editor from taking focus
                preview: true // should text document be in preview only? set false for fully opened
                // selection: new Range( new Position(0,0), new Position(0,0) ) // TODO : Set scroll position of node if known / or top
            }).then(w_bodyEditor => {
                // w_bodyEditor.options.lineNumbers = OFFSET ; // TODO : if position is in an derived file node show relative position
                // other possible interactions: revealRange / setDecorations / visibleRanges / options.cursorStyle / options.lineNumbers
                return (true);
            });
        });
    }

    public editHeadline(p_node: LeoNode) {
        this.editHeadlineInputOptions.value = p_node.label; // preset input pop up
        vscode.window.showInputBox(this.editHeadlineInputOptions)
            .then(
                p_newHeadline => {
                    if (p_newHeadline) {
                        p_node.label = p_newHeadline; //! When labels change, ids will change and that selection and expansion state cannot be kept stable anymore.
                        this.leoBridge.action("setNewHeadline", "{\"node\":" + p_node.apJson + ", \"headline\": \"" + p_newHeadline + "\"}"
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
        vscode.window.showInformationMessage(`mark on ${p_node.label}.`); // temp placeholder
    }

    public unmark(p_node: LeoNode): void {
        vscode.window.showInformationMessage(`unmark on ${p_node.label}.`); // temp placeholder
    }

    public copyNode(p_node: LeoNode): void {
        vscode.window.showInformationMessage(`copyNode on ${p_node.label}.`); // temp placeholder
    }

    public cutNode(p_node: LeoNode): void {
        vscode.window.showInformationMessage(`cutNode on ${p_node.label}.`); // temp placeholder
    }

    public pasteNode(p_node: LeoNode): void {
        vscode.window.showInformationMessage(`pasteNode on ${p_node.label}.`); // temp placeholder
    }

    public pasteNodeAsClone(p_node: LeoNode): void {
        vscode.window.showInformationMessage(`pasteNodeAsClone on ${p_node.label}.`); // temp placeholder
    }

    public delete(p_node: LeoNode): void {
        vscode.window.showInformationMessage(`delete on ${p_node.label}.`); // temp placeholder
    }

    public closeLeoFile(): void {
        vscode.window.showInformationMessage(`close leo file`); // temp placeholder
    }

    public openLeoFile(): void {
        if (this.fileOpenedReady) {
            vscode.window.showInformationMessage("leo file already opened!");
            return;
        }
        this.leoFiles.getLeoFileUrl()
            .then(p_chosenLeoFile => {

                this.leoBridge.action("openFile", '"' + p_chosenLeoFile + '"')
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
                        this.showSelectedBodyDocument().then(p_result => {
                            vscode.commands.executeCommand('setContext', 'leoTreeOpened', true);
                        });
                        // * First StatusBar appearance
                        this.updateStatusBar();
                        this.leoStatusBarItem.show();
                    });

            });
    }

    public test(): void {
        if (this.fileOpenedReady) {
            console.log("sending test 'getSelectedNode'");
            // this.leoBridge.action("getSelectedNode", "{}").then(
            this.leoBridge.action("getSelectedNode", "{\"testparam\":\"hello test parameter\"}").then(
                (p_answer: LeoBridgePackage) => {
                    console.log('Test got Back from getSelectedNode, now revealing :', p_answer.node.headline);
                    this.reveal(this.apToLeoNode(p_answer.node), { select: true, focus: true });
                }
            );
        } else {
            vscode.window.showInformationMessage("Click the folder icon on the Leo Outline sidebar to open a Leo file");
        }
    }
}