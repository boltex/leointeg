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
     * * Strings used in the interface itself
     */
    public static GUI = {
        ICON_LIGHT_PATH: "resources/light/box",
        ICON_DARK_PATH: "resources/dark/box",
        ICON_FILE_EXT: ".svg",
        STATUSBAR_DEFAULT_COLOR: "fb7c47",
        STATUSBAR_DEFAULT_STRING: "", // TODO: Maybe other strings as default: 🦁, "Literate", "Leo" ?
        STATUSBAR_INDICATOR: "$(keyboard) ",
        QUICK_OPEN_LEO_COMMANDS: ">leo: ",
        EXPLORER_TREEVIEW_PREFIX: "LEO ",
        TREEVIEW_TITLE: "OUTLINE",
        TREEVIEW_TITLE_NOT_CONNECTED: "NOT CONNECTED",
        TREEVIEW_TITLE_CONNECTED: "CONNECTED",
        BODY_TITLE: "LEO BODY",
        LOG_PANE_TITLE: "Leo Log Window",
        THEME_STATUSBAR: "statusBar.foreground"
    };

    /**
     * * Basic user messages strings for messages and dialogs
     */
    public static USER_MESSAGES = {
        FILE_ALREADY_OPENED: "Leo file already opened",
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
        BODY_EDIT_DELAY: "bodyEditDelay",
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
        BRIDGE_READY: "leoBridgeReady",
        TREE_OPENED: "leoTreeOpened",
        SERVER_STARTED: "leoServerStarted",
        DISCONNECTED: "leoDisconnected",
        TREE_IN_EXPLORER: Constants.CONFIGURATION.TREE_IN_EXPLORER,
        SHOW_OPEN_ASIDE: Constants.CONFIGURATION.SHOW_OPEN_ASIDE,
        SHOW_ARROWS: Constants.CONFIGURATION.SHOW_ARROWS,
        SHOW_ADD: Constants.CONFIGURATION.SHOW_ADD,
        SHOW_MARK: Constants.CONFIGURATION.SHOW_MARK,
        SHOW_CLONE: Constants.CONFIGURATION.SHOW_CLONE,
        SHOW_COPY: Constants.CONFIGURATION.SHOW_COPY,
        LEO_SELECTED: "leoObjectSelected", // TODO : Maybe unneeded if 'xxxFromOutline' commands are used
        SELECTED_MARKED: "leoNodeMarked",
        SELECTED_UNMARKED: "leoNodeUnmarked",
        SELECTED_ATFILE: "leoNodeAtFile"
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
        OPEN_FILE: "openFile", // TODO : Support multiple simultaneous opened files
        CLOSE_FILE: "closeFile", // TODO : Implement & support multiple simultaneous files
        SAVE_FILE: "saveFile", // TODO : Specify which file when supporting multiple simultaneous files
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
        // TODO : More commands to implement
        HOIST_PNODE: "hoistPNode",
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
        // * Outline selection
        SELECT_NODE: "selectTreeNode",
        OPEN_ASIDE: "openAside",
        // * Leo Operations
        UNDO: "undo", // From command Palette
        UNDO_FO: "undoFromOutline", // from button, return focus on OUTLINE
        REDO: "redo", // From command Palette
        REDO_FO: "redoFromOutline", // from button, return focus on OUTLINE
        EXECUTE: "executeScriptSelection", // TODO : detect focused panel for command-palette to return focus where appropriate
        SHOW_BODY: "showBody",
        SHOW_LOG: "showLogPane",
        SAVE_FILE: "saveLeoFile",  // TODO : detect focused panel for command-palette to return focus where appropriate
        SORT_CHILDREN: "sortChildrenSelection",  // TODO : detect focused panel for command-palette to return focus where appropriate
        SORT_SIBLING: "sortSiblingsSelection",  // TODO : detect focused panel for command-palette to return focus where appropriate
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
        // TODO : detect focused panel for command-palette to return to outline when appropriate
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
        // TODO : detect focused panel for command-palette to return to outline when appropriate
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
        CLOSE_FILE: "closeLeoFile",
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