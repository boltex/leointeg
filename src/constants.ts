export class Constants {

    public static PUBLISHER: string = "boltex";
    public static NAME: string = "leointeg";
    public static CONFIGURATION_SECTION = "leoIntegration";

    public static TREEVIEW_ID: string = Constants.CONFIGURATION_SECTION;
    public static TREEVIEW_EXPLORER_ID: string = Constants.CONFIGURATION_SECTION + "Explorer";
    public static VERSION_STATE_KEY: string = "leoIntegVersion";

    public static FILE_TYPE_EXTENSION: string = "leo";
    public static URI_SCHEME: string = "leo";
    public static URI_SCHEME_HEADER: string = "leo:/";
    public static FILE_OPEN_FILTER_MESSAGE: string = "Leo Files";

    public static DEFAULT_PYTHON: string = "python3";
    public static WIN32_PYTHON: string = "py";
    public static SERVER_PATH: string = "/leobridgeserver.py";
    public static SERVER_STARTED_TOKEN: string = "LeoBridge started";

    public static TCPIP_DEFAULT_PORT: number = 32125;
    public static TCPIP_DEFAULT_PROTOCOL: string = "ws://";
    public static TCPIP_DEFAULT_ADDRESS: string = "localhost";

    public static INTERFACE = {
        ICON_LIGHT_PATH: "resources/light/box",
        ICON_DARK_PATH: "resources/dark/box",
        ICON_FILE_EXT: ".svg",
        STATUSBAR_DEFAULT_COLOR: "fb7c47",
        STATUSBAR_DEFAULT_STRING: "Literate", // 🦁
        STATUSBAR_INDICATOR: "$(keyboard) ",
        QUICK_OPEN_LEO_COMMANDS: ">leo: ",
        EXPLORER_TREEVIEW_PREFIX: "LEO ",
        TREEVIEW_TITLE: "OUTLINE",
        TREEVIEW_TITLE_NOT_CONNECTED: "NOT CONNECTED",
        TREEVIEW_TITLE_CONNECTED: "CONNECTED",
        LOG_PANE_TITLE: "Leo Log Window",
        THEME_STATUSBAR: "statusBar.foreground"
    };

    public static USER_MESSAGES = {
        FILE_ALREADY_OPENED: "Leo file already opened",
        STATUSBAR_TOOLTIP_ON: "Leo Key Bindings are in effect", // TODO : Add description of what happens if clicked
        STATUSBAR_TOOLTIP_OFF: "Leo Key Bindings off", // TODO : Add description of what happens if clicked
        PROMPT_EDIT_HEADLINE: "Edit Headline",
        PROMPT_INSERT_NODE: "Insert Node",
        DEFAULT_HEADLINE: "New Headline",
        START_SERVER_ERROR: "Error - Cannot start Server: ",
        CONNECT_FAILED: "Leo Bridge Connection Failed",
        CONNECT_ERROR: "Leo Bridge Connection Error: Incorrect id",
        CONNECTED: "Connected",
        ALREADY_CONNECTED: "Already Connected",
        DISCONNECTED: "Disconnected",
        CLOSE_ERROR: "Cannot close. No Files Opened."
    };

    public static CONFIGURATION = {
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
        LEO_SELECTED: "leoObjectSelected",
        SELECTED_MARKED: "leoNodeMarked",
        SELECTED_UNMARKED: "leoNode"
    };

    public static LEOBRIDGE_ACTIONS = {
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
        OPEN_FILE: "openFile",
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
        HEADLINE_PNODE: "",
        UNDO: "undo",
        REDO: "redo",
        SORT_CHILDREN: "sortChildrenPNode",
        SORT_SIBLINGS: "sortSiblingsPNode",
        EXECUTE_SCRIPT: "executeScript"
    };

    public static VSCODE_COMMANDS = {
        SET_CONTEXT: "setContext",
        CLOSE_ACTIVE_EDITOR: "workbench.action.closeActiveEditor",
        QUICK_OPEN: "workbench.action.quickOpen"
    };

    public static LEOINTEG_COMMANDS = {
        SHOW_WELCOME: "showWelcomePage",
        SHOW_SETTINGS: "showSettingsPage",
        // * LeoBridge
        START_SERVER: "startServer",
        CONNECT: "connectToServer",
        OPEN_FILE: "openLeoFile",
        CLOSE_FILE: "closeLeoFile",
        // * Outline selection
        SELECT_NODE: "selectTreeNode",
        OPEN_ASIDE: "openAside",
        // * Leo Operations
        UNDO: "undo",
        REDO: "redo",
        EXECUTE: "executeScriptSelection",
        SHOW_LOG: "showLogPane",
        SAVE_FILE: "saveLeoFile",
        SORT_CHILDREN: "sortChildrenSelection",
        SORT_SIBLING: "sortSiblingsSelection",
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
        MARK_SELECTION: "markSelection",
        UNMARK_SELECTION: "unmarkSelection",
        COPY_SELECTION: "copyNodeSelection",
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
        CLONE_SELECTION: "cloneNodeSelection",
        PROMOTE_SELECTION: "promoteSelection",
        DEMOTE_SELECTION: "demoteSelection"
    };
}