import * as vscode from "vscode";

/**
 * * Text and numeric constants used throughout leoInteg
 */
export class Constants {

    public static PUBLISHER: string = "boltex";
    public static NAME: string = "leointeg";
    public static CONFIG_NAME: string = "leoIntegration";
    public static CONFIG_REFRESH_MATCH: string = "OnNodes"; // substring to distinguish 'on-hover' icon commands

    public static TREEVIEW_ID: string = Constants.CONFIG_NAME;
    public static TREEVIEW_EXPLORER_ID: string = Constants.CONFIG_NAME + "Explorer";

    public static DOCUMENTS_ID: string = "leoDocuments";
    public static DOCUMENTS_EXPLORER_ID: string = "leoDocumentsExplorer";

    public static BUTTONS_ID: string = "leoButtons";
    public static BUTTONS_EXPLORER_ID: string = "leoButtonsExplorer";

    public static VERSION_STATE_KEY: string = "leoIntegVersion";

    public static FILE_EXTENSION: string = "leo";
    public static URI_LEO_SCHEME: string = "leo";
    public static URI_FILE_SCHEME: string = "file";
    public static URI_SCHEME_HEADER: string = "leo:/";
    public static FILE_OPEN_FILTER_MESSAGE: string = "Leo Files";
    public static UNTITLED_FILE_NAME: string = "untitled";
    public static RECENT_FILES_KEY: string = "leoRecentFiles";
    public static LAST_FILES_KEY: string = "leoLastFiles";

    public static DEFAULT_PYTHON: string = "python3.7";
    public static WIN32_PYTHON: string = "py";
    public static SERVER_PATH: string = "/leobridgeserver.py";
    public static SERVER_STARTED_TOKEN: string = "LeoBridge started";
    public static TCPIP_DEFAULT_PROTOCOL: string = "ws://";

    public static ERROR_PACKAGE_ID: number = 0;
    public static STARTING_PACKAGE_ID: number = 1;
    public static STATUSBAR_DEBOUNCE_DELAY: number = 60;
    public static DOCUMENTS_DEBOUNCE_DELAY: number = 80;
    public static STATES_DEBOUNCE_DELAY: number = 100;

    /**
     * * Strings used in the workbench interface panels (not for messages or dialogs)
     */
    public static GUI = {
        ICON_LIGHT_DOCUMENT: "resources/light/document.svg",
        ICON_DARK_DOCUMENT: "resources/dark/document.svg",
        ICON_LIGHT_DOCUMENT_DIRTY: "resources/light/document-dirty.svg",
        ICON_DARK_DOCUMENT_DIRTY: "resources/dark/document-dirty.svg",
        ICON_LIGHT_BUTTON: "resources/light/button.svg",
        ICON_DARK_BUTTON: "resources/dark/button.svg",
        ICON_LIGHT_BUTTON_ADD: "resources/light/button-add.svg",
        ICON_DARK_BUTTON_ADD: "resources/dark/button-add.svg",
        ICON_LIGHT_PATH: "resources/light/box",
        ICON_DARK_PATH: "resources/dark/box",
        ICON_FILE_EXT: ".svg",
        STATUSBAR_INDICATOR: "$(keyboard) ",
        QUICK_OPEN_LEO_COMMANDS: ">leo: ",
        EXPLORER_TREEVIEW_PREFIX: "LEO ",
        TREEVIEW_TITLE: "OUTLINE",
        TREEVIEW_TITLE_NOT_CONNECTED: "NOT CONNECTED",
        TREEVIEW_TITLE_CONNECTED: "CONNECTED",
        TREEVIEW_TITLE_INTEGRATION: "INTEGRATION",
        BODY_TITLE: "LEO BODY",
        LOG_PANE_TITLE: "Leo Log Window",
        TERMINAL_PANE_TITLE: "LeoBridge Server",
        THEME_STATUSBAR: "statusBar.foreground"
    };

    /**
     * * Basic user messages strings for messages and dialogs
     */
    public static USER_MESSAGES = {
        SCRIPT_BUTTON: "Creates a button from selected node's script",
        SCRIPT_BUTTON_TOOLTIP:
            "The 'Script Button' button creates a new button.\n" +
            "Its name will be the headline of the presently selected node\n" +
            "Hitting this newly created button executes the button's script.\n" +
            "\n" +
            "For example, to run a script on any part of an outline:\n" +
            "\n" +
            "1.  Select the node containing a script. (Ex.: \"g.es(p.h)\")\n" +
            "2.  Press 'Script Button'. This will create a new button.\n" +
            "3.  Select a node on which you want to run the script.\n" +
            "4.  Press the *new* button.",
        SAVE_CHANGES: "Save changes to",
        BEFORE_CLOSING: "before closing?",
        CANCEL: "Cancel",
        OPEN_WITH_LEOINTEG: "Open this Leo file with LeoInteg?",
        OPEN_RECENT_FILE: "Open Recent Leo File",
        RIGHT_CLICK_TO_OPEN: "Right-click Leo files to open with LeoInteg",
        FILE_ALREADY_OPENED: "Leo file already opened",
        CHOOSE_OPENED_FILE: "Select an opened Leo File",
        FILE_NOT_OPENED: "No files opened.",
        STATUSBAR_TOOLTIP_ON: "Leo Key Bindings are in effect", // TODO : Add description of what happens if clicked
        STATUSBAR_TOOLTIP_OFF: "Leo Key Bindings off", // TODO : Add description of what happens if clicked
        PROMPT_EDIT_HEADLINE: "Edit Headline",
        PROMPT_INSERT_NODE: "Insert Node",
        DEFAULT_HEADLINE: "New Headline",
        START_SERVER_ERROR: "Error - Cannot start server: ",
        CONNECT_FAILED: "Leo Bridge Connection Failed",
        CONNECT_ERROR: "Leo Bridge Connection Error: Incorrect id",
        CONNECTED: "Connected",
        ALREADY_CONNECTED: "Already connected",
        DISCONNECTED: "Disconnected",
        CLOSE_ERROR: "Cannot close: No files opened.",
        YES: "Yes",
        NO: "No",
        YES_ALL: "Yes to all",
        NO_ALL: "No to all",
        MINIBUFFER_PROMPT: "Minibuffer Full Command",
        CHANGES_DETECTED: "Changes to external files were detected.",
        REFRESHED: " Nodes refreshed.", // with voluntary leading space
        IGNORED: " They were ignored.", // with voluntary leading space
        TOO_FAST: "leoInteg is busy! " // with voluntary trailing space
    };

    /**
     * * Choices offered when about to lose current changes to a Leo Document
     */
    public static ASK_SAVE_CHANGES_BUTTONS: vscode.MessageItem[] = [
        {
            title: Constants.USER_MESSAGES.YES,
            isCloseAffordance: false
        },
        {
            title: Constants.USER_MESSAGES.NO,
            isCloseAffordance: false
        },
        {
            title: Constants.USER_MESSAGES.CANCEL,
            isCloseAffordance: true
        }
    ];

    /**
     * * String for JSON configuration keys such as treeKeepFocus, defaultReloadIgnore, etc.
     */
    public static CONFIG_NAMES = {
        CHECK_FOR_CHANGE_EXTERNAL_FILES: "checkForChangeExternalFiles",
        DEFAULT_RELOAD_IGNORE: "defaultReloadIgnore",
        LEO_TREE_BROWSE: "leoTreeBrowse",
        TREE_KEEP_FOCUS: "treeKeepFocus",
        TREE_KEEP_FOCUS_WHEN_ASIDE: "treeKeepFocusWhenAside",
        STATUSBAR_STRING: "statusBarString",
        STATUSBAR_COLOR: "statusBarColor",
        TREE_IN_EXPLORER: "treeInExplorer",
        SHOW_OPEN_ASIDE: "showOpenAside",
        SHOW_EDIT: "showEditOnNodes",
        SHOW_ARROWS: "showArrowsOnNodes",
        SHOW_ADD: "showAddOnNodes",
        SHOW_MARK: "showMarkOnNodes",
        SHOW_CLONE: "showCloneOnNodes",
        SHOW_COPY: "showCopyOnNodes",
        INVERT_NODES: "invertNodeContrast",
        LEO_PYTHON_COMMAND: "leoPythonCommand",
        AUTO_START_SERVER: "startServerAutomatically",
        AUTO_CONNECT: "connectToServerAutomatically",
        IP_ADDRESS: "connectionAddress",
        IP_PORT: "connectionPort",
    };

    /**
     * * Configuration Defaults used in config.ts
     * Used when setting itself and getting parameters from vscode
     */
    public static CONFIG_DEFAULTS = {
        CHECK_FOR_CHANGE_EXTERNAL_FILES: "none",  // Used in leoBridge scrip,
        DEFAULT_RELOAD_IGNORE: "none", // Used in leoBridge scrip,
        LEO_TREE_BROWSE: true,
        TREE_KEEP_FOCUS: true,
        TREE_KEEP_FOCUS_WHEN_ASIDE: false,
        STATUSBAR_STRING: "", // Strings like "Literate", "Leo", UTF-8 also supported: \u{1F981}
        STATUSBAR_COLOR: "fb7c47",
        TREE_IN_EXPLORER: true,
        SHOW_OPEN_ASIDE: true,
        SHOW_EDIT: true,
        SHOW_ARROWS: false,
        SHOW_ADD: false,
        SHOW_MARK: false,
        SHOW_CLONE: false,
        SHOW_COPY: false,
        INVERT_NODES: false,
        LEO_PYTHON_COMMAND: "",
        AUTO_START_SERVER: false,
        AUTO_CONNECT: false,
        IP_ADDRESS: "localhost",
        IP_PORT: 32125
    };

    /**
     * * Used in 'when' clauses, set with vscode.commands.executeCommand("setContext",...)
     */
    public static CONTEXT_FLAGS = {
        // Main flags for connection and opened file
        BRIDGE_READY: "leoBridgeReady", // Connected to leoBridge
        TREE_OPENED: "leoTreeOpened", // At least one Leo file opened
        TREE_TITLED: "leoTreeTitled", // Tree is a Leo file and not a new untitled document
        SERVER_STARTED: "leoServerStarted", // Auto-start or manually started
        // 'states' flags for currently opened tree view
        LEO_CHANGED: "leoChanged",
        LEO_CAN_UNDO: "leoCanUndo",
        LEO_CAN_REDO: "leoCanRedo",
        LEO_CAN_DEMOTE: "leoCanDemote",
        LEO_CAN_PROMOTE: "leoCanPromote",
        LEO_CAN_DEHOIST: "leoCanDehoist",
        // 'states' flags about current selection, for visibility and commands availability
        SELECTED_MARKED: "leoMarked", // no need for unmarked here, use !leoMarked
        SELECTED_CLONE: "leoCloned",
        SELECTED_DIRTY: "leoDirty",
        SELECTED_EMPTY: "leoEmpty",
        SELECTED_CHILD: "leoChild", // Has children
        SELECTED_ATFILE: "LeoAtFile", // Can be refreshed
        SELECTED_ROOT: "leoRoot", // ! Not given by Leo: Computed by leoInteg/vscode instead
        // Statusbar Flag 'keybindings in effect'
        LEO_SELECTED: "leoObjectSelected", // keybindings "On": Outline or body has focus
        // Context Flags for 'when' clauses, used concatenated, for each outline node
        NODE_MARKED: "leoNodeMarked",  // Selected node is marked
        NODE_UNMARKED: "leoNodeUnmarked", // Selected node is unmarked (Needed for regexp)
        NODE_ATFILE: "leoNodeAtFile", // Selected node is an @file or @clean, etc...
        NODE_CLONED: "leoNodeCloned",
        NODE_ROOT: "leoNodeRoot",
        NODE_NOT_ROOT: "leoNodeNotRoot",
        // Flags for Leo documents tree view icons and hover node command buttons
        DOCUMENT_SELECTED_TITLED: "leoDocumentSelectedTitled",
        DOCUMENT_TITLED: "leoDocumentTitled",
        DOCUMENT_SELECTED_UNTITLED: "leoDocumentSelectedUntitled",
        DOCUMENT_UNTITLED: "leoDocumentUntitled",
        // Flags that match specific LeoInteg config settings
        LEO_TREE_BROWSE: Constants.CONFIG_NAMES.LEO_TREE_BROWSE, // Leo outline also in the explorer view
        TREE_IN_EXPLORER: Constants.CONFIG_NAMES.TREE_IN_EXPLORER, // Leo outline also in the explorer view
        SHOW_OPEN_ASIDE: Constants.CONFIG_NAMES.SHOW_OPEN_ASIDE,   // Show 'open aside' in context menu
        SHOW_EDIT: Constants.CONFIG_NAMES.SHOW_EDIT,              // Hover Icons on outline nodes
        SHOW_ARROWS: Constants.CONFIG_NAMES.SHOW_ARROWS,           // Hover Icons on outline nodes
        SHOW_ADD: Constants.CONFIG_NAMES.SHOW_ADD,                 // Hover Icons on outline nodes
        SHOW_MARK: Constants.CONFIG_NAMES.SHOW_MARK,               // Hover Icons on outline nodes
        SHOW_CLONE: Constants.CONFIG_NAMES.SHOW_CLONE,             // Hover Icons on outline nodes
        SHOW_COPY: Constants.CONFIG_NAMES.SHOW_COPY,               // Hover Icons on outline nodes
        AUTO_START_SERVER: Constants.CONFIG_NAMES.AUTO_START_SERVER,   // Used at startup
        AUTO_CONNECT: Constants.CONFIG_NAMES.AUTO_CONNECT              // Used at startup
    };

    /**
     * * Command strings to be used with vscode.commands.executeCommand
     * See https://code.visualstudio.com/api/extension-guides/command#programmatically-executing-a-command
     */
    public static VSCODE_COMMANDS = {
        SET_CONTEXT: "setContext",
        CLOSE_ACTIVE_EDITOR: "workbench.action.closeActiveEditor",
        QUICK_OPEN: "workbench.action.quickOpen"
    };

    /**
     * * Actions that can be invoked by Leo through leobridge
     */
    public static ASYNC_ACTIONS = {
        ASYNC_LOG: "log",
        ASYNC_ASK: "ask",
        ASYNC_WARN: "warn",
        ASYNC_INFO: "info",
        ASYNC_INTERVAL: "interval"
    };

    /**
     * * When async action was ASYNC_INFO
     */
    public static ASYNC_INFO_MESSAGE_CODES = {
        ASYNC_REFRESHED: "refreshed",
        ASYNC_IGNORED: "ignored"
    };

    /**
     * * runAskYesNoDialog or runAskOkDialog result codes, used when async action requires a response
     */
    public static ASYNC_ASK_RETURN_CODES = {
        YES: "yes",
        NO: "no",
        YES_ALL: "yes-all",
        NO_ALL: "no-all",
        OK: '"ok"' // Quotes in string as a 'JSON parameter'
    };

    /**
     * * Commands for leobridgeserver.py
     */
    public static LEOBRIDGE = {
        APPLY_CONFIG: "applyConfig",
        ASK_RESULT: "askResult",
        GET_ALL_GNX: "getAllGnx",
        GET_BODY_LENGTH: "getBodyLength",
        GET_BODY_STATES: "getBodyStates",
        GET_BODY: "getBody",
        GET_PNODE: "getPNode",
        GET_PARENT: "getParent",
        GET_CHILDREN: "getChildren",
        GET_SELECTED_NODE: "getSelectedNode",
        SET_SELECTED_NODE: "setSelectedNode",
        SET_BODY: "setBody",
        SET_SELECTION: "setSelection",
        SET_HEADLINE: "setNewHeadline",
        EXPAND_NODE: "expandNode",
        COLLAPSE_NODE: "collapseNode",
        CONTRACT_ALL: "contractAllHeadlines",
        GET_OPENED_FILES: "getOpenedFiles",
        SET_OPENED_FILE: "setOpenedFile",
        OPEN_FILE: "openFile",
        OPEN_FILES: "openFiles", // Sends an array of paths instead: for opening many files at once
        CLOSE_FILE: "closeFile",
        SAVE_FILE: "saveFile",
        SAVE_CLOSE_FILE: "saveCloseFile", // Save and close current document
        GET_BUTTONS: "getButtons",
        REMOVE_BUTTON: "removeButton",
        CLICK_BUTTON: "clickButton",
        GET_COMMANDS: "getCommands", // ask leoBridge for the list of known commands, (starting with text string)
        GIT_DIFF: "gitDiff", // TODO : Proof of concept leoCommand
        // * Goto operations
        PAGE_UP: "pageUp",
        PAGE_DOWN: "pageDown",
        GOTO_FIRST_VISIBLE: "goToFirstVisibleNode",
        GOTO_LAST_VISIBLE: "goToLastVisibleNode",
        GOTO_LAST_SIBLING: "goToLastSibling",
        GOTO_NEXT_VISIBLE: "selectVisNext",
        GOTO_PREV_VISIBLE: "selectVisBack",
        GOTO_NEXT_MARKED: "goToNextMarkedHeadline",
        GOTO_NEXT_CLONE: "goToNextClone",
        CONTRACT_OR_GO_LEFT: "contractNodeOrGoToParent",
        EXPAND_AND_GO_RIGHT: "expandNodeAndGoToFirstChild",
        // * Leo Operations
        MARK_PNODE: "markPNode",
        UNMARK_PNODE: "unmarkPNode",
        COPY_PNODE: "copyOutline", // was overridden as "copyPNode"
        CUT_PNODE: "cutPNode",
        PASTE_PNODE: "pasteOutline", // was overridden as "pastePNode"
        PASTE_CLONE_PNODE: "pasteOutlineRetainingClones", // was overridden as "pasteAsClonePNode"
        DELETE_PNODE: "deletePNode",
        MOVE_PNODE_DOWN: "moveOutlineDown", // was overridden as "movePNodeDown"
        MOVE_PNODE_LEFT: "moveOutlineLeft", // was overridden as "movePNodeLeft"
        MOVE_PNODE_RIGHT: "moveOutlineRight", // was overridden as "movePNodeRight"
        MOVE_PNODE_UP: "moveOutlineUp", // was overridden as "movePNodeUp"
        INSERT_PNODE: "insertPNode",
        INSERT_NAMED_PNODE: "insertNamedPNode",
        CLONE_PNODE: "clonePNode",
        PROMOTE_PNODE: "promote", // was overridden as "promotePNode"
        DEMOTE_PNODE: "demote", // was overridden as "demotePNode"
        REFRESH_FROM_DISK_PNODE: "refreshFromDisk", // was overridden as "refreshFromDiskPNode"
        SORT_CHILDREN: "sortChildren", // was overridden as "sortChildrenPNode"
        SORT_SIBLINGS: "sortSiblings", // was overridden as "sortSiblingsPNode"
        UNDO: "undo",
        REDO: "redo",
        EXECUTE_SCRIPT: "executeScriptPackage",
        GET_STATES: "getStates",
        HOIST_PNODE: "hoist",
        DEHOIST: "dehoist",
        // TODO : @boltex More commands to implement #15, #23, #24
        CLONE_FIND_ALL: "cloneFindAll", // #24 @boltex
        CLONE_FIND_ALL_FLATTENED: "cloneFindAllFlattened", // #24 @boltex
        CLONE_FIND_MARKED: "cloneFindMarked", // #24 @boltex
        CLONE_FIND_FLATTENED_MARKED: "cloneFindFlattenedMarked", // #24 @boltex
        EXTRACT: "extract", // #15 @boltex
        EXTRACT_NAMES: "extractNames", // #15 @boltex
        COPY_MARKED: "copyMarked", // #23 @boltex
        DIFF_MARKED_NODES: "diffMarkedNodes", // #23 @boltex
        MARK_CHANGED_ITEMS: "markChangedItems", // #23 @boltex
        MARK_SUBHEADS: "markSubheads", // #23 @boltex
        UNMARK_ALL: "unmarkAll", // TODO : #23 @boltex
        CLONE_MARKED_NODES: "cloneMarkedNodes", // #23 @boltex
        DELETE_MARKED_NODES: "deleteMarkedNodes", // #23 @boltex
        MOVE_MARKED_NODES: "moveMarkedNodes" // #23 @boltex
    };

    /**
     * * All commands this expansion exposes (in package.json, contributes > commands)
     */
    public static COMMANDS = {
        SHOW_WELCOME: Constants.NAME + ".showWelcomePage", // Always available: not in the commandPalette section of package.json
        SHOW_SETTINGS: Constants.NAME + ".showSettingsPage", // Always available: not in the commandPalette section of package.json
        // * LeoBridge
        START_SERVER: Constants.NAME + ".startServer",
        CONNECT: Constants.NAME + ".connectToServer",
        SET_OPENED_FILE: Constants.NAME + ".setOpenedFile",
        OPEN_FILE: Constants.NAME + ".openLeoFile", // sets focus on BODY
        RECENT_FILES: Constants.NAME + ".recentLeoFiles", // shows recent Leo files, opens one on selection
        SWITCH_FILE: Constants.NAME + ".switchLeoFile",
        NEW_FILE: Constants.NAME + ".newLeoFile",
        SAVE_FILE: Constants.NAME + ".saveLeoFile", // TODO : add to #34 @boltex detect focused panel for command-palette to return focus where appropriate
        SAVE_FILE_FO: Constants.NAME + ".saveLeoFileFromOutline", // TODO : add to #34 @boltex detect focused panel for command-palette to return focus where appropriate
        SAVE_AS_FILE: Constants.NAME + ".saveAsLeoFile",
        CLOSE_FILE: Constants.NAME + ".closeLeoFile",
        CLICK_BUTTON: Constants.NAME + ".clickButton",
        REMOVE_BUTTON: Constants.NAME + ".removeButton",
        MINIBUFFER: Constants.NAME + ".minibuffer",
        GIT_DIFF: Constants.NAME + ".gitDiff", // TODO : Proof of concept leoCommand
        // * Outline selection
        SELECT_NODE: Constants.NAME + ".selectTreeNode",
        OPEN_ASIDE: Constants.NAME + ".openAside",
        // * Goto operations that always finish with focus in outline
        PAGE_UP: Constants.NAME + ".pageUp",
        PAGE_DOWN: Constants.NAME + ".pageDown",
        GOTO_FIRST_VISIBLE: Constants.NAME + ".gotoFirstVisible",
        GOTO_LAST_VISIBLE: Constants.NAME + ".gotoLastVisible",
        GOTO_LAST_SIBLING: Constants.NAME + ".gotoLastSibling",
        GOTO_NEXT_VISIBLE: Constants.NAME + ".gotoNextVisible",
        GOTO_PREV_VISIBLE: Constants.NAME + ".gotoPrevVisible",
        GOTO_NEXT_MARKED: Constants.NAME + ".gotoNextMarked",
        GOTO_NEXT_CLONE: Constants.NAME + ".gotoNextClone",
        GOTO_NEXT_CLONE_SELECTION: Constants.NAME + ".gotoNextCloneSelection",
        GOTO_NEXT_CLONE_SELECTION_FO: Constants.NAME + ".gotoNextCloneSelectionFromOutline",
        CONTRACT_OR_GO_LEFT: Constants.NAME + ".contractOrGoLeft",
        EXPAND_AND_GO_RIGHT: Constants.NAME + ".expandAndGoRight",
        // * Leo Operations
        UNDO: Constants.NAME + ".undo", // From command Palette
        UNDO_FO: Constants.NAME + ".undoFromOutline", // from button, return focus on OUTLINE
        REDO: Constants.NAME + ".redo", // From command Palette
        REDO_FO: Constants.NAME + ".redoFromOutline", // from button, return focus on OUTLINE
        EXECUTE: Constants.NAME + ".executeScriptSelection", // TODO : add to #34 @boltex detect focused panel for command-palette to return focus where appropriate
        SHOW_BODY: Constants.NAME + ".showBody",
        SHOW_OUTLINE: Constants.NAME + ".showOutline",
        SHOW_LOG: Constants.NAME + ".showLogPane",
        SORT_CHILDREN: Constants.NAME + ".sortChildrenSelection", // TODO : add to #34 @boltex detect focused panel for command-palette to return focus where appropriate
        SORT_SIBLING: Constants.NAME + ".sortSiblingsSelection",
        SORT_SIBLING_FO: Constants.NAME + ".sortSiblingsSelectionFromOutline",
        CONTRACT_ALL: Constants.NAME + ".contractAll", // From command Palette
        CONTRACT_ALL_FO: Constants.NAME + ".contractAllFromOutline", // from button, return focus on OUTLINE
        // * Commands from tree panel buttons or context: focus on OUTLINE
        MARK: Constants.NAME + ".mark",
        UNMARK: Constants.NAME + ".unmark",
        COPY: Constants.NAME + ".copyNode",
        CUT: Constants.NAME + ".cutNode",
        PASTE: Constants.NAME + ".pasteNode",
        PASTE_CLONE: Constants.NAME + ".pasteNodeAsClone",
        DELETE: Constants.NAME + ".delete",
        HEADLINE: Constants.NAME + ".editHeadline",
        MOVE_DOWN: Constants.NAME + ".moveOutlineDown",
        MOVE_LEFT: Constants.NAME + ".moveOutlineLeft",
        MOVE_RIGHT: Constants.NAME + ".moveOutlineRight",
        MOVE_UP: Constants.NAME + ".moveOutlineUp",
        INSERT: Constants.NAME + ".insertNode",
        CLONE: Constants.NAME + ".cloneNode",
        PROMOTE: Constants.NAME + ".promote",
        DEMOTE: Constants.NAME + ".demote",
        REFRESH_FROM_DISK: Constants.NAME + ".refreshFromDisk",
        // * Commands from keyboard, while focus on BODY (command-palette returns to BODY for now)
        MARK_SELECTION: Constants.NAME + ".markSelection",
        UNMARK_SELECTION: Constants.NAME + ".unmarkSelection",
        COPY_SELECTION: Constants.NAME + ".copyNodeSelection", // Nothing to refresh/focus so no "FO" version
        CUT_SELECTION: Constants.NAME + ".cutNodeSelection",
        PASTE_SELECTION: Constants.NAME + ".pasteNodeAtSelection",
        PASTE_CLONE_SELECTION: Constants.NAME + ".pasteNodeAsCloneAtSelection",
        DELETE_SELECTION: Constants.NAME + ".deleteSelection",
        HEADLINE_SELECTION: Constants.NAME + ".editSelectedHeadline",
        MOVE_DOWN_SELECTION: Constants.NAME + ".moveOutlineDownSelection",
        MOVE_LEFT_SELECTION: Constants.NAME + ".moveOutlineLeftSelection",
        MOVE_RIGHT_SELECTION: Constants.NAME + ".moveOutlineRightSelection",
        MOVE_UP_SELECTION: Constants.NAME + ".moveOutlineUpSelection",
        INSERT_SELECTION: Constants.NAME + ".insertNodeSelection", // Can be interrupted
        INSERT_SELECTION_INTERRUPT: Constants.NAME + ".insertNodeSelectionInterrupt", // Interrupted version
        CLONE_SELECTION: Constants.NAME + ".cloneNodeSelection",
        PROMOTE_SELECTION: Constants.NAME + ".promoteSelection",
        DEMOTE_SELECTION: Constants.NAME + ".demoteSelection",
        REFRESH_FROM_DISK_SELECTION: Constants.NAME + ".refreshFromDiskSelection",
        // * Commands from keyboard, while focus on OUTLINE
        MARK_SELECTION_FO: Constants.NAME + ".markSelectionFromOutline",
        UNMARK_SELECTION_FO: Constants.NAME + ".unmarkSelectionFromOutline",
        // COPY_SELECTION Nothing to refresh/focus for "copy a node" so no "FO" version
        CUT_SELECTION_FO: Constants.NAME + ".cutNodeSelectionFromOutline",
        PASTE_SELECTION_FO: Constants.NAME + ".pasteNodeAtSelectionFromOutline",
        PASTE_CLONE_SELECTION_FO: Constants.NAME + ".pasteNodeAsCloneAtSelectionFromOutline",
        DELETE_SELECTION_FO: Constants.NAME + ".deleteSelectionFromOutline",
        HEADLINE_SELECTION_FO: Constants.NAME + ".editSelectedHeadlineFromOutline",
        MOVE_DOWN_SELECTION_FO: Constants.NAME + ".moveOutlineDownSelectionFromOutline",
        MOVE_LEFT_SELECTION_FO: Constants.NAME + ".moveOutlineLeftSelectionFromOutline",
        MOVE_RIGHT_SELECTION_FO: Constants.NAME + ".moveOutlineRightSelectionFromOutline",
        MOVE_UP_SELECTION_FO: Constants.NAME + ".moveOutlineUpSelectionFromOutline",
        INSERT_SELECTION_FO: Constants.NAME + ".insertNodeSelectionFromOutline",
        CLONE_SELECTION_FO: Constants.NAME + ".cloneNodeSelectionFromOutline",
        PROMOTE_SELECTION_FO: Constants.NAME + ".promoteSelectionFromOutline",
        DEMOTE_SELECTION_FO: Constants.NAME + ".demoteSelectionFromOutline",
        REFRESH_FROM_DISK_SELECTION_FO: Constants.NAME + ".refreshFromDiskSelectionFromOutline",
        HOIST: Constants.NAME + ".hoistNode",
        HOIST_SELECTION: Constants.NAME + ".hoistSelection",
        HOIST_SELECTION_FO: Constants.NAME + ".hoistSelectionFromOutline",
        DEHOIST: Constants.NAME + ".deHoist",
        DEHOIST_FO: Constants.NAME + ".deHoistFromOutline",
        // * - - - - - - - - - - - - - - - not implemented yet
        CLONE_FIND_ALL: Constants.NAME + ".cloneFindAll",
        CLONE_FIND_ALL_FLATTENED: Constants.NAME + ".cloneFindAllFlattened",
        CLONE_FIND_MARKED: Constants.NAME + ".cloneFindMarked",
        CLONE_FIND_FLATTENED_MARKED: Constants.NAME + ".cloneFindFlattenedMarked",
        EXTRACT: Constants.NAME + ".extract",
        EXTRACT_NAMES: Constants.NAME + ".extractNames",
        COPY_MARKED: Constants.NAME + ".copyMarked",
        DIFF_MARKED_NODES: Constants.NAME + ".diffMarkedNodes",
        MARK_CHANGED_ITEMS: Constants.NAME + ".markChangedItems",
        MARK_SUBHEADS: Constants.NAME + ".markSubheads",
        UNMARK_ALL: Constants.NAME + ".unmarkAll",
        CLONE_MARKED_NODES: Constants.NAME + ".cloneMarkedNodes",
        DELETE_MARKED_NODES: Constants.NAME + ".deleteMarkedNodes",
        MOVE_MARKED_NODES: Constants.NAME + ".moveMarkedNodes"
    };

}
