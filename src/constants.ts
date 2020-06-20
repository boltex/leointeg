/**
 * * Text and numeric constants used throughout leoInteg
 */
export class Constants {

    public static PUBLISHER: string = "boltex";
    public static NAME: string = "leointeg";
    public static CONFIG_SECTION = "leoIntegration";

    public static TREEVIEW_ID: string = Constants.CONFIG_SECTION;
    public static TREEVIEW_EXPLORER_ID: string = Constants.CONFIG_SECTION + "Explorer";
    public static VERSION_STATE_KEY: string = "leoIntegVersion";

    public static FILE_EXTENSION: string = "leo";
    public static URI_SCHEME: string = "leo";
    public static URI_SCHEME_HEADER: string = "leo:/";
    public static FILE_OPEN_FILTER_MESSAGE: string = "Leo Files";

    public static DEFAULT_PYTHON: string = "python3.7";
    public static WIN32_PYTHON: string = "py";
    public static SERVER_PATH: string = "/leobridgeserver.py";
    public static SERVER_STARTED_TOKEN: string = "LeoBridge started";

    public static TCPIP_DEFAULT_PORT: number = 32125;
    public static TCPIP_DEFAULT_PROTOCOL: string = "ws://";
    public static TCPIP_DEFAULT_ADDRESS: string = "localhost";

    public static ERROR_PACKAGE_ID: number = 0;
    public static STARTING_PACKAGE_ID: number = 1;
    public static STATUSBAR_DEBOUNCE_DELAY: number = 50;


    /**
     * * Strings used as language id (default is "leobody")
     * TODO : Add more languages strings for when directives such as @language are used throughout body panes
     */
    public static BODY_LANGUAGES = {
        default: "leobody"
    };

    /**
     * * Strings used in the workbench interface panels (not for messages or dialogs)
     */
    public static GUI = {
        ICON_LIGHT_PATH: "resources/light/box",
        ICON_DARK_PATH: "resources/dark/box",
        ICON_FILE_EXT: ".svg",
        STATUSBAR_DEFAULT_COLOR: "fb7c47",
        STATUSBAR_DEFAULT_STRING: "", // Strings like "Literate", "Leo", UTF-8 also supported: 🦁
        STATUSBAR_INDICATOR: "$(keyboard) ",
        QUICK_OPEN_LEO_COMMANDS: ">leo: ",
        EXPLORER_TREEVIEW_PREFIX: "LEO ",
        TREEVIEW_TITLE: "OUTLINE",
        TREEVIEW_TITLE_NOT_CONNECTED: "NOT CONNECTED",
        TREEVIEW_TITLE_CONNECTED: "CONNECTED",
        TREEVIEW_TITLE_INTEGRATION: "INTEGRATION",
        BODY_TITLE: "LEO BODY",
        LOG_PANE_TITLE: "Leo Log Window",
        THEME_STATUSBAR: "statusBar.foreground"
    };

    /**
     * * Basic user messages strings for messages and dialogs
     */
    public static USER_MESSAGES = {
        FILE_ALREADY_OPENED: "Leo file already opened",
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
        CHANGES_DETECTED: "Changes to external files were detected.",
        REFRESHED: " Nodes were refreshed from file.", // with leading space
        IGNORED: " They were ignored." // with leading space
    };

    /**
     * * String for JSON configuration keys such as treeKeepFocus, defaultReloadIgnore, etc.
     */
    public static CONFIGURATION = {
        CHECK_FOR_CHANGE_EXTERNAL_FILES: "checkForChangeExternalFiles",
        DEFAULT_RELOAD_IGNORE: "defaultReloadIgnore",
        TREE_KEEP_FOCUS: "treeKeepFocus",
        TREE_KEEP_FOCUS_WHEN_ASIDE: "treeKeepFocusWhenAside",
        STATUSBAR_STRING: "statusBarString",
        STATUSBAR_COLOR: "statusBarColor",
        TREE_IN_EXPLORER: "treeInExplorer",
        SHOW_OPEN_ASIDE: "showOpenAside",
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
     * * Used in 'when' clauses, set with vscode.commands.executeCommand("setContext",...)
     */
    public static CONTEXT_FLAGS = {
        BRIDGE_READY: "leoBridgeReady", // Connected to leoBridge
        TREE_OPENED: "leoTreeOpened", // At least one Leo file opened
        SERVER_STARTED: "leoServerStarted", // Auto_start or manually started
        // Flags about current selection
        LEO_SELECTED: "leoObjectSelected", // keybindings "On": Outline or body has focus
        SELECTED_MARKED: "leoNodeMarked",  // Selected node is marked
        SELECTED_UNMARKED: "leoNodeUnmarked", // Selected node is unmarked
        SELECTED_ATFILE: "leoNodeAtFile", // Selected node is an @file or @clean, etc...
        // Flags that match specific LeoInteg config settings
        TREE_IN_EXPLORER: Constants.CONFIGURATION.TREE_IN_EXPLORER, // Leo outline also in the explorer view
        SHOW_OPEN_ASIDE: Constants.CONFIGURATION.SHOW_OPEN_ASIDE,   // Show 'open aside' in context menu
        SHOW_ARROWS: Constants.CONFIGURATION.SHOW_ARROWS,           // Hover Icons on outline nodes
        SHOW_ADD: Constants.CONFIGURATION.SHOW_ADD,                 // Hover Icons on outline nodes
        SHOW_MARK: Constants.CONFIGURATION.SHOW_MARK,               // Hover Icons on outline nodes
        SHOW_CLONE: Constants.CONFIGURATION.SHOW_CLONE,             // Hover Icons on outline nodes
        SHOW_COPY: Constants.CONFIGURATION.SHOW_COPY,               // Hover Icons on outline nodes
        AUTO_START_SERVER: Constants.CONFIGURATION.AUTO_START_SERVER,   // Used at startup
        AUTO_CONNECT: Constants.CONFIGURATION.AUTO_CONNECT              // Used at startup
    };

    /**
     * * Actions that can be invoked by Leo through leobridge
     */
    public static ASYNC_ACTIONS = {
        ASYNC_LOG: "log",
        ASYNC_ASK: "ask",
        ASYNC_WARN: "warn",
        ASYNC_INFO: "info",
        // ASYNC_CHOOSE_SAVE: "saveFileDialog", // TODO : Example for reproducing UI calls (see TODO in leoAsync.ts)
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
        GET_BODY: "getBody",
        GET_PNODE: "getPNode",
        GET_PARENT: "getParent",
        GET_CHILDREN: "getChildren",
        GET_SELECTED_NODE: "getSelectedNode",
        SET_SELECTED_NODE: "setSelectedNode",
        SET_BODY: "setBody",
        SET_HEADLINE: "setNewHeadline",
        EXPAND_NODE: "expandNode",
        COLLAPSE_NODE: "collapseNode",
        CONTRACT_ALL: "contractAll",
        OPEN_FILE: "openFile", // TODO : #13 @boltex Support multiple simultaneous opened files
        CLOSE_FILE: "closeFile", // TODO : #13 @boltex Implement & support multiple simultaneous files
        SAVE_FILE: "saveFile", // TODO : #13 @boltex Specify which file when supporting multiple simultaneous files
        // * Leo Operations
        MARK_PNODE: "markPNode",
        UNMARK_PNODE: "unmarkPNode",
        COPY_PNODE: "copyPNode",
        CUT_PNODE: "cutPNode",
        PASTE_PNODE: "pastePNode",
        PASTE_CLONE_PNODE: "pasteAsClonePNode",
        DELETE_PNODE: "deletePNode",
        MOVE_PNODE_DOWN: "movePNodeDown",
        MOVE_PNODE_LEFT: "movePNodeLeft",
        MOVE_PNODE_RIGHT: "movePNodeRight",
        MOVE_PNODE_UP: "movePNodeUp",
        INSERT_PNODE: "insertPNode",
        INSERT_NAMED_PNODE: "insertNamedPNode",
        CLONE_PNODE: "clonePNode",
        PROMOTE_PNODE: "promotePNode",
        DEMOTE_PNODE: "demotePNode",
        REFRESH_FROM_DISK_PNODE: "refreshFromDiskPNode",
        SORT_CHILDREN: "sortChildrenPNode",
        SORT_SIBLINGS: "sortSiblingsPNode",
        UNDO: "undo",
        REDO: "redo",
        EXECUTE_SCRIPT: "executeScript",
        GET_STATES: "getStates", // #18 @boltex
        // TODO : More commands to implement #15, #23, #24, #25 @boltex
        HOIST_PNODE: "hoistPNode", // #25 @boltex
        DEHOIST: "deHoist", // #25 @boltex
        CLONE_FIND_ALL: "cloneFindAll", // #24 @boltex
        CLONE_FIND_ALL_FLATTENED: "cloneFindAllFlattened", // #24 @boltex
        CLONE_FIND_MARKED: "cloneFindMarked", // #24 @boltex
        CLONE_FIND_FLATTENED_MARKED: "cloneFindFlattenedMarked", // #24 @boltex
        EXTRACT: "extract", // #15 @boltex
        EXTRACT_NAMES: "extractNames", // #15 @boltex
        COPY_MARKED: "copyMarked", // #23 @boltex
        DIFF_MARKED_NODES: "diffMarkedNodes", // #23 @boltex
        GOTO_NEXT_MARKED: "gotoNextMarked", // #23 @boltex
        MARK_CHANGED_ITEMS: "markChangedItems", // #23 @boltex
        MARK_SUBHEADS: "markSubheads", // #23 @boltex
        UNMARK_ALL: "unmarkAll", // #23 @boltex
        CLONE_MARKED_NODES: "cloneMarkedNodes", // #23 @boltex
        DELETE_MARKED_NODES: "deleteMarkedNodes", // #23 @boltex
        MOVE_MARKED_NODES: "moveMarkedNodes" // #23 @boltex
    };

    /**
     * * Command strings to be used with vscode.commands.executeCommand
     */
    public static VSCODE_COMMANDS = {
        SET_CONTEXT: "setContext",
        CLOSE_ACTIVE_EDITOR: "workbench.action.closeActiveEditor",
        QUICK_OPEN: "workbench.action.quickOpen"
    };

    /**
     * * All commands this expansion exposes (in package.json, contributes > commands)
     */
    public static COMMANDS = {
        SHOW_WELCOME: "showWelcomePage", // Always available: not in the commandPalette section of package.json
        SHOW_SETTINGS: "showSettingsPage", // Always available: not in the commandPalette section of package.json
        // * LeoBridge
        START_SERVER: "startServer",
        CONNECT: "connectToServer",
        OPEN_FILE: "openLeoFile", // sets focus on BODY
        NEW_FILE: "newLeoFile",
        SAVE_FILE: "saveLeoFile", // TODO : #34 @boltex detect focused panel for command-palette to return focus where appropriate
        SAVE_AS_FILE: "saveAsLeoFile",
        CLOSE_FILE: "closeLeoFile",
        // * Outline selection
        SELECT_NODE: "selectTreeNode",
        OPEN_ASIDE: "openAside",
        // * Leo Operations
        UNDO: "undo", // From command Palette
        UNDO_FO: "undoFromOutline", // from button, return focus on OUTLINE
        REDO: "redo", // From command Palette
        REDO_FO: "redoFromOutline", // from button, return focus on OUTLINE
        EXECUTE: "executeScriptSelection", // TODO : #34 @boltex detect focused panel for command-palette to return focus where appropriate
        SHOW_BODY: "showBody",
        SHOW_LOG: "showLogPane",
        SORT_CHILDREN: "sortChildrenSelection", // TODO : #34 @boltex detect focused panel for command-palette to return focus where appropriate
        SORT_SIBLING: "sortSiblingsSelection", // TODO : #34 @boltex detect focused panel for command-palette to return focus where appropriate
        CONTRACT_ALL: "contractAll", // From command Palette
        CONTRACT_ALL_FO: "contractAllFromOutline", // from button, return focus on OUTLINE
        // * Commands from tree panel buttons or context: focus on OUTLINE
        MARK: "mark",
        UNMARK: "unmark",
        COPY: "copyNode",
        CUT: "cutNode",
        PASTE: "pasteNode",
        PASTE_CLONE: "pasteNodeAsClone",
        DELETE: "delete",
        HEADLINE: "editHeadline",
        MOVE_DOWN: "moveOutlineDown",
        MOVE_LEFT: "moveOutlineLeft",
        MOVE_RIGHT: "moveOutlineRight",
        MOVE_UP: "moveOutlineUp",
        INSERT: "insertNode",
        CLONE: "cloneNode",
        PROMOTE: "promote",
        DEMOTE: "demote",
        REFRESH_FROM_DISK: "refreshFromDisk",
        // * Commands from keyboard, while focus on BODY (command-palette returns to BODY for now)
        MARK_SELECTION: "markSelection",
        UNMARK_SELECTION: "unmarkSelection",
        COPY_SELECTION: "copyNodeSelection", // Nothing to refresh/focus so no "FO" version
        CUT_SELECTION: "cutNodeSelection",
        PASTE_SELECTION: "pasteNodeAtSelection",
        PASTE_CLONE_SELECTION: "pasteNodeAsCloneAtSelection",
        DELETE_SELECTION: "deleteSelection",
        HEADLINE_SELECTION: "editSelectedHeadline",
        MOVE_DOWN_SELECTION: "moveOutlineDownSelection",
        MOVE_LEFT_SELECTION: "moveOutlineLeftSelection",
        MOVE_RIGHT_SELECTION: "moveOutlineRightSelection",
        MOVE_UP_SELECTION: "moveOutlineUpSelection",
        INSERT_SELECTION: "insertNodeSelection",
        INSERT_SELECTION_INTERRUPT: "insertNodeSelectionInterrupt", // Headline input box can be interrupted with another insert
        CLONE_SELECTION: "cloneNodeSelection",
        PROMOTE_SELECTION: "promoteSelection",
        DEMOTE_SELECTION: "demoteSelection",
        REFRESH_FROM_DISK_SELECTION: "refreshFromDiskSelection",
        // * Commands from keyboard, while focus on OUTLINE
        MARK_SELECTION_FO: "markSelectionFromOutline",
        UNMARK_SELECTION_FO: "unmarkSelectionFromOutline",
        // COPY_SELECTION Nothing to refresh/focus for "copy a node" so no entry here
        CUT_SELECTION_FO: "cutNodeSelectionFromOutline",
        PASTE_SELECTION_FO: "pasteNodeAtSelectionFromOutline",
        PASTE_CLONE_SELECTION_FO: "pasteNodeAsCloneAtSelectionFromOutline",
        DELETE_SELECTION_FO: "deleteSelectionFromOutline",
        HEADLINE_SELECTION_FO: "editSelectedHeadlineFromOutline",
        MOVE_DOWN_SELECTION_FO: "moveOutlineDownSelectionFromOutline",
        MOVE_LEFT_SELECTION_FO: "moveOutlineLeftSelectionFromOutline",
        MOVE_RIGHT_SELECTION_FO: "moveOutlineRightSelectionFromOutline",
        MOVE_UP_SELECTION_FO: "moveOutlineUpSelectionFromOutline",
        INSERT_SELECTION_FO: "insertNodeSelectionFromOutline",
        CLONE_SELECTION_FO: "cloneNodeSelectionFromOutline",
        PROMOTE_SELECTION_FO: "promoteSelectionFromOutline",
        DEMOTE_SELECTION_FO: "demoteSelectionFromOutline",
        REFRESH_FROM_DISK_SELECTION_FO: "refreshFromDiskSelectionFromOutline",
        // * - - - - - - - - - - - - - - - not implemented yet
        HOIST: "hoistNode",
        HOIST_SELECTION: "hoistSelection",
        DEHOIST: "deHoist",
        CLONE_FIND_ALL: "cloneFindAll",
        CLONE_FIND_ALL_FLATTENED: "cloneFindAllFlattened",
        CLONE_FIND_MARKED: "cloneFindMarked",
        CLONE_FIND_FLATTENED_MARKED: "cloneFindFlattenedMarked",
        EXTRACT: "extract",
        EXTRACT_NAMES: "extractNames",
        COPY_MARKED: "copyMarked",
        DIFF_MARKED_NODES: "diffMarkedNodes",
        GOTO_NEXT_MARKED: "gotoNextMarked",
        MARK_CHANGED_ITEMS: "markChangedItems",
        MARK_SUBHEADS: "markSubheads",
        UNMARK_ALL: "unmarkAll",
        CLONE_MARKED_NODES: "cloneMarkedNodes",
        DELETE_MARKED_NODES: "deleteMarkedNodes",
        MOVE_MARKED_NODES: "moveMarkedNodes"
    };
}