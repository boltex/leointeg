import * as vscode from "vscode";

/**
 * * Text and numeric constants used throughout leoInteg
 */
export class Constants {

    public static PUBLISHER: string = "boltex";
    public static NAME: string = "leointeg";
    public static CONFIG_NAME: string = "leoIntegration";
    public static CONFIG_WORKBENCH_ENABLED_PREVIEW: string = "workbench.editor.enablePreview";
    public static CONFIG_REFRESH_MATCH: string = "OnNodes"; // substring to distinguish 'on-hover' icon commands

    public static TREEVIEW_ID: string = Constants.CONFIG_NAME;
    public static TREEVIEW_EXPLORER_ID: string = Constants.CONFIG_NAME + "Explorer";

    public static DOCUMENTS_ID: string = "leoDocuments";
    public static DOCUMENTS_EXPLORER_ID: string = "leoDocumentsExplorer";

    public static BUTTONS_ID: string = "leoButtons";
    public static BUTTONS_EXPLORER_ID: string = "leoButtonsExplorer";

    public static FIND_ID: string = "leoFindPanel";
    public static FIND_EXPLORER_ID: string = "leoFindPanelExplorer";

    public static GOTO_ID: string = "leoGotoPanel";
    public static GOTO_EXPLORER_ID: string = "leoGotoPanelExplorer";

    public static VERSION_STATE_KEY: string = "leoIntegVersion";

    public static FILE_EXTENSION: string = "leo";
    public static JS_FILE_EXTENSION: string = "leojs";

    public static LEO_LANGUAGE_PREFIX: string = "leobody."; // all lowercase
    public static URI_LEO_SCHEME: string = "leo";
    public static URI_FILE_SCHEME: string = "file";
    public static URI_SCHEME_HEADER: string = "leo:/";
    public static FILE_OPEN_FILTER_MESSAGE: string = "Leo Files";
    public static UNTITLED_FILE_NAME: string = "untitled";
    public static RECENT_FILES_KEY: string = "leoRecentFiles";
    public static LAST_FILES_KEY: string = "leoLastFiles";

    public static DEFAULT_PYTHON: string = "python3";
    public static WIN32_PYTHON: string = "py";
    public static SERVER_NAME: string = "/leoserver.py";
    public static LEO_ID_NAME: string = ".leoID.txt";
    public static SERVER_PATH: string = "/leo/core";
    public static CONFIG_PATH: string = "/leo/config";
    public static SERVER_STARTED_TOKEN: string = "LeoBridge started";
    public static TCPIP_DEFAULT_PROTOCOL: string = "ws://";

    public static ERROR_PACKAGE_ID: number = 0;
    public static STARTING_PACKAGE_ID: number = 1;
    public static STATUSBAR_DEBOUNCE_DELAY: number = 60;
    public static DOCUMENTS_DEBOUNCE_DELAY: number = 80;
    public static BUTTONS_DEBOUNCE_DELAY: number = 80;
    public static REFRESH_ALL_DEBOUNCE_DELAY: number = 333;
    public static STATES_DEBOUNCE_DELAY: number = 100;
    public static BODY_STATES_DEBOUNCE_DELAY: number = 200;
    public static GOTO_DEBOUNCE_DELAY: number = 50;

    public static LOG_ALERT_COLOR: string = 'red';

    /**
     * * Find panel controls ids
     */
    public static FIND_INPUTS_IDS = {
        FIND_TEXT: "findText",
        REPLACE_TEXT: "replaceText",
        ENTIRE_OUTLINE: "entireOutline",
        FILE_ONLY: "fileOnly",
        NODE_ONLY: "nodeOnly",
        SUBOUTLINE_ONLY: "subOutlineOnly",
        IGNORE_CASE: "ignoreCase",
        MARK_CHANGES: "markChanges",
        MARK_FINDS: "markFinds",
        REG_EXP: "regExp",
        WHOLE_WORD: "wholeWord",
        SEARCH_BODY: "searchBody",
        SEARCH_HEADLINE: "searchHeadline"
    };

    /**
     * * Strings used in the workbench interface panels (not for messages or dialogs)
     */
    public static GUI = {

        ICON_LIGHT_PARENT: "resources/light/parent.svg",
        ICON_DARK_PARENT: "resources/dark/parent.svg",
        ICON_LIGHT_NODE: "resources/light/node.svg",
        ICON_DARK_NODE: "resources/dark/node.svg",
        ICON_LIGHT_BODY: "resources/light/body.svg",
        ICON_DARK_BODY: "resources/dark/body.svg",
        ICON_LIGHT_TAG: "resources/light/tag.svg",
        ICON_DARK_TAG: "resources/dark/tag.svg",

        ICON_LIGHT_DOCUMENT: "resources/light/document.svg",
        ICON_DARK_DOCUMENT: "resources/dark/document.svg",
        ICON_LIGHT_DOCUMENT_DIRTY: "resources/light/document-dirty.svg",
        ICON_DARK_DOCUMENT_DIRTY: "resources/dark/document-dirty.svg",

        ICON_LIGHT_BUTTON: "resources/light/button.svg",
        ICON_DARK_BUTTON: "resources/dark/button.svg",
        ICON_LIGHT_BUTTON_RCLICK: "resources/light/button-rclick.svg",
        ICON_DARK_BUTTON_RCLICK: "resources/dark/button-rclick.svg",
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
        SCRIPT_BUTTON: "from selected node",
        SCRIPT_BUTTON_TOOLTIP:
            "Creates a new button with the presently selected node.\n" +
            "For example, to run a script on any part of an outline:\n" +
            "\n" +
            "1.  Select the node containing a script. e.g. \"g.es(p.h)\"\n" +
            "2.  Press 'Script Button' to create a new button.\n" +
            "3.  Select another node on which to run the script.\n" +
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
        TITLE_GOTO_GLOBAL_LINE: "Goto global line",
        PLACEHOLDER_GOTO_GLOBAL_LINE: "#",
        PROMPT_GOTO_GLOBAL_LINE: "Line number",

        TITLE_TAG_CHILDREN: "Tag Children",
        TITLE_REMOVE_TAG: "Remove Tag",
        TITLE_TAG_NODE: "Tag Node",
        PLACEHOLDER_TAG: "<tag>",
        PROMPT_TAG: "Enter a tag name",

        TITLE_FIND_TAG: "Find Tag",
        PLACEHOLDER_CLONE_FIND_TAG: "<tag>",
        PROMPT_CLONE_FIND_TAG: "Enter a tag name",
        START_SERVER_ERROR: "Error - Cannot start server: ",
        CONNECT_FAILED: "Leo Server Connection Failed",
        CONNECT_ERROR: "Leo Server Connection Error: Incorrect id",
        CONNECTED: "Connected",
        ALREADY_CONNECTED: "Already connected",
        DISCONNECTED: "Disconnected",
        CLEARED_RECENT: "Cleared recent files list",
        CLOSE_ERROR: "Cannot close: No files opened.",
        LEO_PATH_MISSING: "Leo Editor Path Setting Missing",
        CANNOT_FIND_SERVER_SCRIPT: "Cannot find server script",
        YES: "Yes",
        NO: "No",
        YES_ALL: "Yes to all",
        NO_ALL: "No to all",
        CHOOSE_BUTTON: "Choose @button or @rclick",
        MINIBUFFER_PROMPT: "Minibuffer Full Command",
        CHANGES_DETECTED: "Changes to external files were detected.",
        REFRESHED: " Nodes refreshed.", // with leading space
        IGNORED: " They were ignored.", // with leading space
        TOO_FAST: "leoInteg is busy! ", // with trailing space
        MINIMUM_VERSION: "Please update: Leo 6.6 required for command: ",
        UNKNOWN_LANGUAGE_NOT_SUPPORTED: "Language not yet supported.",
        LANGUAGE_NOT_SUPPORTED: " language not yet supported." // with leading space
    };

    /**
     * * Possible import file types
     */
    public static IMPORT_FILE_TYPES: { [name: string]: string[]; } = {
        "All files": ["*"],
        "C/C++ files": ["c", "cpp", "h", "hpp"],
        "FreeMind files": ["mm.html"],
        "Java files": ["java"],
        "JavaScript files": ["js"],
        // "JSON files": ["json"],
        "Mindjet files": ["csv"],
        "MORE files": ["MORE"],
        "Lua files": ["lua"],
        "Pascal files": ["pas"],
        "Python files": ["py"],
        "Text files": ["txt"],
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
     * * Strings used in 'at-button' panel display in LeoButtonNode
     */
    public static BUTTON_STRINGS = {
        NULL_WIDGET: "nullButtonWidget",
        SCRIPT_BUTTON: "script-button",
        ADD_BUTTON: "leoButtonAdd",
        NORMAL_BUTTON: "leoButtonNode"
    };

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

        SHOW_EDITION_BODY: "showEditionOnBody",
        SHOW_CLIPBOARD_BODY: "showClipboardOnBody",
        SHOW_PROMOTE_BODY: "showPromoteOnBody",
        SHOW_EXECUTE_BODY: "showExecuteOnBody",
        SHOW_EXTRACT_BODY: "showExtractOnBody",
        SHOW_IMPORT_BODY: "showImportOnBody",
        SHOW_REFRESH_BODY: "showRefreshOnBody",
        SHOW_HOIST_BODY: "showHoistOnBody",
        SHOW_MARK_BODY: "showMarkOnBody",
        SHOW_SORT_BODY: "showSortOnBody",

        INVERT_NODES: "invertNodeContrast",
        LEO_EDITOR_PATH: "leoEditorPath",
        LEO_PYTHON_COMMAND: "leoPythonCommand",
        AUTO_START_SERVER: "startServerAutomatically",
        AUTO_CONNECT: "connectToServerAutomatically",
        IP_ADDRESS: "connectionAddress",
        IP_PORT: "connectionPort",

        SET_DETACHED: "setDetached",
        LIMIT_USERS: "limitUsers"
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

        SHOW_EDITION_BODY: true,
        SHOW_CLIPBOARD_BODY: true,
        SHOW_PROMOTE_BODY: true,
        SHOW_EXECUTE_BODY: true,
        SHOW_EXTRACT_BODY: true,
        SHOW_IMPORT_BODY: true,
        SHOW_REFRESH_BODY: true,
        SHOW_HOIST_BODY: true,
        SHOW_MARK_BODY: true,
        SHOW_SORT_BODY: true,

        INVERT_NODES: false,
        LEO_PYTHON_COMMAND: "",
        LEO_EDITOR_PATH: "",
        AUTO_START_SERVER: false,
        AUTO_CONNECT: false,
        IP_ADDRESS: "localhost",
        IP_LOOPBACK: "127.0.0.1",
        IP_PORT: 32125,

        SET_DETACHED: true,
        LIMIT_USERS: 1
    };

    /**
     * * Used in 'when' clauses, set with vscode.commands.executeCommand("setContext",...)
     */
    public static CONTEXT_FLAGS = {
        // Main flags for connection and opened file
        STARTUP_FINISHED: "leoStartupFinished", // Initial extension finished auto-server-start-connect
        CONNECTING: "leoConnecting", // Initial extension finished auto-server-start-connect
        BRIDGE_READY: "leoBridgeReady", // Connected to leoBridge
        TREE_OPENED: "leoTreeOpened", // At least one Leo file opened
        TREE_TITLED: "leoTreeTitled", // Tree is a Leo file and not a new untitled document
        SERVER_STARTED: "leoServerStarted", // Auto-start or manually started
        LEOID_MISSING: "leoIDMissing", // To be used as flag for #248
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
        SELECTED_ATFILE: "leoAtFile", // Can be refreshed
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
        LEO_TREE_BROWSE: Constants.CONFIG_NAMES.LEO_TREE_BROWSE, // Force ar'jan's suggestion of Leo's tree behavior override
        TREE_IN_EXPLORER: Constants.CONFIG_NAMES.TREE_IN_EXPLORER, // Leo outline also in the explorer view
        SHOW_OPEN_ASIDE: Constants.CONFIG_NAMES.SHOW_OPEN_ASIDE,   // Show 'open aside' in context menu
        SHOW_EDIT: Constants.CONFIG_NAMES.SHOW_EDIT,              // Hover Icons on outline nodes
        SHOW_ARROWS: Constants.CONFIG_NAMES.SHOW_ARROWS,           // Hover Icons on outline nodes
        SHOW_ADD: Constants.CONFIG_NAMES.SHOW_ADD,                 // Hover Icons on outline nodes
        SHOW_MARK: Constants.CONFIG_NAMES.SHOW_MARK,               // Hover Icons on outline nodes
        SHOW_CLONE: Constants.CONFIG_NAMES.SHOW_CLONE,             // Hover Icons on outline nodes
        SHOW_COPY: Constants.CONFIG_NAMES.SHOW_COPY,               // Hover Icons on outline nodes
        AUTO_START_SERVER: Constants.CONFIG_NAMES.AUTO_START_SERVER,   // Used at startup
        AUTO_CONNECT: Constants.CONFIG_NAMES.AUTO_CONNECT,             // Used at startup

        SHOW_EDITION_BODY: Constants.CONFIG_NAMES.SHOW_EDITION_BODY,
        SHOW_CLIPBOARD_BODY: Constants.CONFIG_NAMES.SHOW_CLIPBOARD_BODY,
        SHOW_PROMOTE_BODY: Constants.CONFIG_NAMES.SHOW_PROMOTE_BODY,
        SHOW_EXECUTE_BODY: Constants.CONFIG_NAMES.SHOW_EXECUTE_BODY,
        SHOW_EXTRACT_BODY: Constants.CONFIG_NAMES.SHOW_EXTRACT_BODY,
        SHOW_IMPORT_BODY: Constants.CONFIG_NAMES.SHOW_IMPORT_BODY,
        SHOW_REFRESH_BODY: Constants.CONFIG_NAMES.SHOW_REFRESH_BODY,
        SHOW_HOIST_BODY: Constants.CONFIG_NAMES.SHOW_HOIST_BODY,
        SHOW_MARK_BODY: Constants.CONFIG_NAMES.SHOW_MARK_BODY,
        SHOW_SORT_BODY: Constants.CONFIG_NAMES.SHOW_SORT_BODY

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
        ASYNC_REFRESH: "refresh",
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
        OK: "ok"
    };

    /**
     * * Table for converting Leo languages names for the currently opened body pane
     * Used in showBody method of leoIntegration.ts
     */
    public static LANGUAGE_CODES: { [key: string]: string | undefined } = {
        cplusplus: 'cpp',
        md: 'markdown',
        rest: 'restructuredtext',
        rst: 'restructuredtext'
    };

    /**
     * * Commands for leobridgeserver.py
     * A Command is a string, which is either:
     *  - The name of public method in leoserver.py, prefixed with '!'.
     *  - The name of a Leo command, prefixed with '-'
     *  - The name of a method of a Leo class, without prefix.
     */
    public static LEOBRIDGE = {
        TEST: "!test",
        DO_NOTHING: "!do_nothing",
        GET_VERSION: "!get_version",
        GET_LEOID: "!get_leoid",
        SET_LEOID: "!set_leoid",
        // * Server Commands
        GET_COMMANDS: "!get_all_leo_commands", // "getCommands",
        APPLY_CONFIG: "!set_config", // "applyConfig",
        ASK_RESULT: "!set_ask_result", // "askResult",
        // * GUI
        GET_ALL_GNX: "!get_all_gnx", // "getAllGnx",
        GET_BODY_LENGTH: "!get_body_length", // "getBodyLength",
        GET_BODY_STATES: "!get_body_states", // "getBodyStates",
        GET_BODY: "!get_body", // "getBody",
        GET_PARENT: "!get_parent", // "getParent",
        GET_CHILDREN: "!get_children", // "getChildren",
        SET_SELECTED_NODE: "!set_current_position", // "setSelectedNode",
        SET_BODY: "!set_body", // "setBody",
        SET_SELECTION: "!set_selection", // "setSelection",
        SET_HEADLINE: "!set_headline", // "setNewHeadline",
        EXPAND_NODE: "!expand_node", // "expandNode",
        COLLAPSE_NODE: "!contract_node", // "collapseNode",
        CONTRACT_ALL: "contractAllHeadlines",
        GET_STATES: "!get_ui_states", // "getStates",
        GET_UA: "!get_ua",
        SET_UA_MEMBER: "!set_ua_member",
        SET_UA: "!set_ua",
        // * Leo Documents
        GET_OPENED_FILES: "!get_all_open_commanders", //"getOpenedFiles",
        SET_OPENED_FILE: "!set_opened_file", // "setOpenedFile",
        OPEN_FILE: "!open_file", // "openFile",
        IMPORT_ANY_FILE: "!import_any_file", // "importAnyFile",
        OPEN_FILES: "!open_files", //  "openFiles",
        CLOSE_FILE: "!close_file", // "closeFile",
        SAVE_FILE: "!save_file", // "saveFile",
        // * @-Buttons
        GET_BUTTONS: "!get_buttons", // "getButtons",
        REMOVE_BUTTON: "!remove_button", // "removeButton",
        GOTO_SCRIPT: "!goto_script", // "goto Script command",
        CLICK_BUTTON: "!click_button", // "clickButton",
        // * Goto operations
        PAGE_UP: "!page_up", // "pageUp",
        PAGE_DOWN: "!page_down", // "pageDown",
        SCROLL_TOP: "!scroll_top", // Utility function
        SCROLL_BOTTOM: "!scroll_bottom", // Utility function
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
        MARK_PNODE: "!mark_node", // "markPNode",
        UNMARK_PNODE: "!unmark_node", // "unmarkPNode",

        //COPY_PNODE: "copyOutline",
        COPY_PNODE: "!copy_node",

        CUT_PNODE: "!cut_node", // "cutPNode",

        // PASTE_PNODE: "pasteOutline",
        PASTE_PNODE: "!paste_node",

        // PASTE_CLONE_PNODE: "pasteOutlineRetainingClones",
        PASTE_CLONE_PNODE: "!paste_as_clone_node",

        DELETE_PNODE: "!delete_node", // "deletePNode",
        MOVE_PNODE_DOWN: "moveOutlineDown",
        MOVE_PNODE_LEFT: "moveOutlineLeft",
        MOVE_PNODE_RIGHT: "moveOutlineRight",
        MOVE_PNODE_UP: "moveOutlineUp",
        INSERT_PNODE: "!insert_node", // "insertPNode",
        INSERT_NAMED_PNODE: "!insert_named_node", // "insertNamedPNode",
        INSERT_CHILD_PNODE: "!insert_child_node",
        INSERT_CHILD_NAMED_PNODE: "!insert_child_named_node",
        CLONE_PNODE: "!clone_node", // "clonePNode",
        PROMOTE_PNODE: "promote",
        DEMOTE_PNODE: "demote",
        REFRESH_FROM_DISK_PNODE: "refreshFromDisk",
        WRITE_AT_FILE_NODES: '-write-at-file-nodes',
        WRITE_DIRTY_AT_FILE_NODES: '-write-dirty-at-file-nodes',
        SORT_CHILDREN: "sortChildren",
        SORT_SIBLINGS: "sortSiblings",
        UNDO: "!undo",
        REDO: "!redo",
        EXECUTE_SCRIPT: "executeScript",
        HOIST_PNODE: "hoist",
        DEHOIST: "dehoist",
        EXTRACT: "extract",
        EXTRACT_NAMES: "extractSectionNames",
        COPY_MARKED: "copyMarked",
        DIFF_MARKED_NODES: "-diff-marked-nodes",
        MARK_CHANGED_ITEMS: "markChangedHeadlines",
        MARK_SUBHEADS: "markSubheads",
        UNMARK_ALL: "unmarkAll",
        CLONE_MARKED_NODES: "cloneMarked",
        DELETE_MARKED_NODES: "deleteMarked",
        MOVE_MARKED_NODES: "moveMarked",
        GIT_DIFF: "gitDiff",
        GET_FOCUS: "!get_focus",

        GET_GOTO_PANEL: "!get_goto_panel", // To fill up panel when changing leo documents

        NAV_HEADLINE_SEARCH: "!nav_headline_search",
        NAV_SEARCH: "!nav_search",

        FIND_QUICK_TIMELINE: "!find_quick_timeline",
        FIND_QUICK_CHANGED: "!find_quick_changed",
        FIND_QUICK_HISTORY: "!find_quick_history",
        FIND_QUICK_MARKED: "!find_quick_marked",
        GOTO_NAV_ENTRY: "!goto_nav_entry",

        GET_SEARCH_SETTINGS: "!get_search_settings",
        SET_SEARCH_SETTINGS: "!set_search_settings",
        START_SEARCH: "!start_search",
        FIND_ALL: "!find_all",
        FIND_NEXT: "!find_next",
        FIND_PREVIOUS: "!find_previous",
        FIND_VAR: "!find_var",
        FIND_DEF: "!find_def",
        REPLACE: "!replace",
        REPLACE_THEN_FIND: "!replace_then_find",
        REPLACE_ALL: "!replace_all",
        GOTO_GLOBAL_LINE: "!goto_global_line",
        TAG_CHILDREN: "!tag_children",
        TAG_NODE: "!tag_node",
        REMOVE_TAG: "!remove_tag",
        REMOVE_TAGS: "!remove_tags",
        CLONE_FIND_TAG: "!clone_find_tag",
        CLONE_FIND_ALL: "!clone_find_all",
        CLONE_FIND_ALL_FLATTENED: "!clone_find_all_flattened",
        CLONE_FIND_MARKED: "!clone_find_all_marked",
        CLONE_FIND_FLATTENED_MARKED: "!clone_find_all_flattened_marked",
        GOTO_PREV_HISTORY: "goToPrevHistory",
        GOTO_NEXT_HISTORY: "goToNextHistory"
    };

    /**
     * * All commands this expansion exposes (in package.json, contributes > commands)
     * * And those not exposed in package.json, like 'gotoNav' which can only be invoked from mouse action
     */
    public static COMMANDS = {
        // * Access to the Settings/Welcome Webview
        SHOW_WELCOME: Constants.NAME + ".showWelcomePage", // Always available: not in the commandPalette section of package.json
        SHOW_SETTINGS: Constants.NAME + ".showSettingsPage", // Always available: not in the commandPalette section of package.json
        STATUS_BAR: Constants.NAME + ".statusBar", // Status Bar Click Command
        // * LeoBridge
        CHOOSE_LEO_FOLDER: Constants.NAME + ".chooseLeoFolder",
        START_SERVER: Constants.NAME + ".startServer",
        STOP_SERVER: Constants.NAME + ".stopServer",
        CONNECT: Constants.NAME + ".connectToServer",
        SET_LEOID: Constants.NAME + ".setLeoID",
        SET_OPENED_FILE: Constants.NAME + ".setOpenedFile",
        OPEN_FILE: Constants.NAME + ".openLeoFile", // sets focus on BODY
        CLEAR_RECENT_FILES: Constants.NAME + ".clearRecentFiles",
        IMPORT_ANY_FILE: Constants.NAME + ".importAnyFile",
        RECENT_FILES: Constants.NAME + ".recentLeoFiles", // shows recent Leo files, opens one on selection
        SWITCH_FILE: Constants.NAME + ".switchLeoFile",
        NEW_FILE: Constants.NAME + ".newLeoFile",
        SAVE_FILE: Constants.NAME + ".saveLeoFile",
        // SAVE_DISABLED: Constants.NAME + ".saveLeoFileDisabled", // Disabled - nop
        SAVE_FILE_FO: Constants.NAME + ".saveLeoFileFromOutline",
        SAVE_AS_FILE: Constants.NAME + ".saveAsLeoFile",
        SAVE_AS_LEOJS: Constants.NAME + ".saveAsLeoJsFile",
        CLOSE_FILE: Constants.NAME + ".closeLeoFile",
        CLICK_BUTTON: Constants.NAME + ".clickButton",
        REMOVE_BUTTON: Constants.NAME + ".removeButton",
        GOTO_SCRIPT: Constants.NAME + ".gotoScript",
        MINIBUFFER: Constants.NAME + ".minibuffer",
        GIT_DIFF: Constants.NAME + ".gitDiff",
        // * Outline selection
        SELECT_NODE: Constants.NAME + ".selectTreeNode",
        OPEN_ASIDE: Constants.NAME + ".openAside",
        // * Goto operations that always finish with focus in outline
        PAGE_UP: Constants.NAME + ".pageUp",
        PAGE_DOWN: Constants.NAME + ".pageDown",
        SCROLL_TOP: Constants.NAME + ".scrollTop",
        SCROLL_BOTTOM: Constants.NAME + ".scrollBottom",
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
        UNDO_DISABLED: Constants.NAME + ".undoDisabled", // Disabled - nop
        REDO: Constants.NAME + ".redo", // From command Palette
        REDO_FO: Constants.NAME + ".redoFromOutline", // from button, return focus on OUTLINE
        REDO_DISABLED: Constants.NAME + ".redoDisabled", // Disabled - nop
        EXECUTE: Constants.NAME + ".executeScript",
        SHOW_BODY: Constants.NAME + ".showBody",
        SHOW_OUTLINE: Constants.NAME + ".showOutline",
        SHOW_LOG: Constants.NAME + ".showLogPane",
        SORT_CHILDREN: Constants.NAME + ".sortChildrenSelection",
        SORT_CHILDREN_FO: Constants.NAME + ".sortChildrenSelectionFromOutline",
        SORT_SIBLING: Constants.NAME + ".sortSiblingsSelection",
        SORT_SIBLING_FO: Constants.NAME + ".sortSiblingsSelectionFromOutline",
        CONTRACT_ALL: Constants.NAME + ".contractAll", // From command Palette
        CONTRACT_ALL_FO: Constants.NAME + ".contractAllFromOutline", // from button, return focus on OUTLINE
        PREV_NODE: Constants.NAME + ".prev",
        PREV_NODE_FO: Constants.NAME + ".prevFromOutline",
        PREV_NODE_DISABLED: Constants.NAME + ".prevDisabled",
        NEXT_NODE: Constants.NAME + ".next",
        NEXT_NODE_FO: Constants.NAME + ".nextFromOutline",
        NEXT_NODE_DISABLED: Constants.NAME + ".nextDisabled",
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
        INSERT_CHILD: Constants.NAME + ".insertChildNode",
        CLONE: Constants.NAME + ".cloneNode",
        PROMOTE: Constants.NAME + ".promote",
        DEMOTE: Constants.NAME + ".demote",
        REFRESH_FROM_DISK: Constants.NAME + ".refreshFromDisk",
        WRITE_AT_FILE_NODES: Constants.NAME + ".writeAtFileNodes",
        WRITE_AT_FILE_NODES_FO: Constants.NAME + ".writeAtFileNodesFromOutline",
        WRITE_DIRTY_AT_FILE_NODES: Constants.NAME + ".writeDirtyAtFileNodes",
        WRITE_DIRTY_AT_FILE_NODES_FO: Constants.NAME + ".writeDirtyAtFileNodesFromOutline",
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
        INSERT_CHILD_SELECTION: Constants.NAME + ".insertChildNodeSelection", // Can be interrupted
        INSERT_CHILD_SELECTION_INTERRUPT: Constants.NAME + ".insertChildNodeSelectionInterrupt", // Can be interrupted
        CLONE_SELECTION: Constants.NAME + ".cloneNodeSelection",
        PROMOTE_SELECTION: Constants.NAME + ".promoteSelection",
        DEMOTE_SELECTION: Constants.NAME + ".demoteSelection",
        REFRESH_FROM_DISK_SELECTION: Constants.NAME + ".refreshFromDiskSelection",
        // * Commands from keyboard, while focus on OUTLINE
        MARK_SELECTION_FO: Constants.NAME + ".markSelectionFromOutline",
        UNMARK_SELECTION_FO: Constants.NAME + ".unmarkSelectionFromOutline",
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
        INSERT_CHILD_SELECTION_FO: Constants.NAME + ".insertChildNodeSelectionFromOutline",
        CLONE_SELECTION_FO: Constants.NAME + ".cloneNodeSelectionFromOutline",
        PROMOTE_SELECTION_FO: Constants.NAME + ".promoteSelectionFromOutline",
        DEMOTE_SELECTION_FO: Constants.NAME + ".demoteSelectionFromOutline",
        REFRESH_FROM_DISK_SELECTION_FO: Constants.NAME + ".refreshFromDiskSelectionFromOutline",
        HOIST: Constants.NAME + ".hoistNode",
        HOIST_SELECTION: Constants.NAME + ".hoistSelection",
        HOIST_SELECTION_FO: Constants.NAME + ".hoistSelectionFromOutline",
        DEHOIST: Constants.NAME + ".deHoist",
        DEHOIST_FO: Constants.NAME + ".deHoistFromOutline",
        EXTRACT: Constants.NAME + ".extract",
        EXTRACT_NAMES: Constants.NAME + ".extractNames",
        COPY_MARKED: Constants.NAME + ".copyMarked",
        DIFF_MARKED_NODES: Constants.NAME + ".diffMarkedNodes",
        MARK_CHANGED_ITEMS: Constants.NAME + ".markChangedItems",
        MARK_SUBHEADS: Constants.NAME + ".markSubheads",
        UNMARK_ALL: Constants.NAME + ".unmarkAll",
        CLONE_MARKED_NODES: Constants.NAME + ".cloneMarkedNodes",
        DELETE_MARKED_NODES: Constants.NAME + ".deleteMarkedNodes",
        MOVE_MARKED_NODES: Constants.NAME + ".moveMarkedNodes",

        FIND_QUICK: Constants.NAME + ".findQuick",
        FIND_QUICK_SELECTED: Constants.NAME + ".findQuickSelected",
        FIND_QUICK_TIMELINE: Constants.NAME + ".findQuickTimeline",
        FIND_QUICK_CHANGED: Constants.NAME + ".findQuickChanged",
        FIND_QUICK_HISTORY: Constants.NAME + ".history",
        FIND_QUICK_MARKED: Constants.NAME + ".markedList",
        FIND_QUICK_GO_ANYWHERE: Constants.NAME + ".goAnywhere",
        GOTO_NAV_ENTRY: Constants.NAME + ".gotoNav",

        START_SEARCH: Constants.NAME + ".startSearch",
        FIND_ALL: Constants.NAME + ".findAll",
        FIND_NEXT: Constants.NAME + ".findNext",
        FIND_NEXT_FO: Constants.NAME + ".findNextFromOutline",
        FIND_PREVIOUS: Constants.NAME + ".findPrevious",
        FIND_PREVIOUS_FO: Constants.NAME + ".findPreviousFromOutline",
        FIND_VAR: Constants.NAME + ".findVar",
        FIND_DEF: Constants.NAME + ".findDef",
        REPLACE: Constants.NAME + ".replace",
        REPLACE_FO: Constants.NAME + ".replaceFromOutline",
        REPLACE_THEN_FIND: Constants.NAME + ".replaceThenFind",
        REPLACE_THEN_FIND_FO: Constants.NAME + ".replaceThenFindFromOutline",
        REPLACE_ALL: Constants.NAME + ".replaceAll",

        CLONE_FIND_ALL: Constants.NAME + ".cloneFindAll",
        CLONE_FIND_ALL_FLATTENED: Constants.NAME + ".cloneFindAllFlattened",
        CLONE_FIND_TAG: Constants.NAME + ".cloneFindTag",
        CLONE_FIND_MARKED: Constants.NAME + ".cloneFindMarked",
        CLONE_FIND_FLATTENED_MARKED: Constants.NAME + ".cloneFindFlattenedMarked",

        GOTO_GLOBAL_LINE: Constants.NAME + ".gotoGlobalLine",
        TAG_CHILDREN: Constants.NAME + ".tagChildren",
        TAG_NODE: Constants.NAME + ".tagNode",
        REMOVE_TAG: Constants.NAME + ".removeTag",
        REMOVE_TAGS: Constants.NAME + ".removeTags",
        SET_FIND_EVERYWHERE_OPTION: Constants.NAME + ".setFindEverywhereOption",
        SET_FIND_NODE_ONLY_OPTION: Constants.NAME + ".setFindNodeOnlyOption",
        SET_FIND_FILE_ONLY_OPTION: Constants.NAME + ".setFindFileOnlyOption",
        SET_FIND_SUBOUTLINE_ONLY_OPTION: Constants.NAME + ".setFindSuboutlineOnlyOption",
        TOGGLE_FIND_IGNORE_CASE_OPTION: Constants.NAME + ".toggleFindIgnoreCaseOption",
        TOGGLE_FIND_MARK_CHANGES_OPTION: Constants.NAME + ".toggleFindMarkChangesOption",
        TOGGLE_FIND_MARK_FINDS_OPTION: Constants.NAME + ".toggleFindMarkFindsOption",
        TOGGLE_FIND_REGEXP_OPTION: Constants.NAME + ".toggleFindRegexpOption",
        TOGGLE_FIND_WORD_OPTION: Constants.NAME + ".toggleFindWordOption",
        TOGGLE_FIND_SEARCH_BODY_OPTION: Constants.NAME + ".toggleFindSearchBodyOption",
        TOGGLE_FIND_SEARCH_HEADLINE_OPTION: Constants.NAME + ".toggleFindSearchHeadlineOption",
        SET_ENABLE_PREVIEW: Constants.NAME + ".setEnablePreview",
        CLEAR_CLOSE_EMPTY_GROUPS: Constants.NAME + ".clearCloseEmptyGroups",
        SET_CLOSE_ON_FILE_DELETE: Constants.NAME + ".setCloseOnFileDelete",
    };

    public static addMinibufferCommands: { label: string, detail: string }[] = [
        { "label": "find-quick", "detail": "Opens the Nav tab." },
        { "label": "find-quick-selected", "detail": "Opens the Nav tab with the selected text as the search string." },
        { "label": "focus-to-nav", "detail": "Puts focus in Nav tab." },
        { "label": "find-quick-timeline", "detail": "Lists all nodes in reversed gnx order, newest to oldest." },
        { "label": "find-quick-changed", "detail": "Lists all nodes that are changed (aka \"dirty\") since last save." },
        { "label": "history", "detail": "Lists nodes from c.nodeHistory." },
        { "label": "marked-list", "detail": "List all marked nodes." },
    ];

    /**
     * * Overridden 'good' minibuffer commands
     */
    public static MINIBUFFER_OVERRIDDEN_COMMANDS: { [key: string]: string } = {
        "find-quick": Constants.COMMANDS.FIND_QUICK,
        "find-quick-selected": Constants.COMMANDS.FIND_QUICK,
        "focus-to-nav": Constants.COMMANDS.FIND_QUICK,
        "find-quick-timeline": Constants.COMMANDS.FIND_QUICK_TIMELINE,
        "find-quick-changed": Constants.COMMANDS.FIND_QUICK_CHANGED,
        "history": Constants.COMMANDS.FIND_QUICK_HISTORY,
        "marked-list": Constants.COMMANDS.FIND_QUICK_MARKED,

        "tag-children": Constants.COMMANDS.TAG_CHILDREN,
        "clone-find-tag": Constants.COMMANDS.CLONE_FIND_TAG,
        "import-file": Constants.COMMANDS.IMPORT_ANY_FILE,
        "redo": Constants.COMMANDS.REDO,
        "undo": Constants.COMMANDS.UNDO,
        "clone-find-all": Constants.COMMANDS.CLONE_FIND_ALL,
        "clone-find-all-flattened": Constants.COMMANDS.CLONE_FIND_ALL_FLATTENED,

        'import-MORE-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-free-mind-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-jupyter-notebook': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-legacy-external-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-mind-jet-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-tabbed-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-todo-text-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-zim-folder': Constants.COMMANDS.IMPORT_ANY_FILE,

        'file-new': Constants.COMMANDS.NEW_FILE,
        'file-open-by-name': Constants.COMMANDS.OPEN_FILE,
        'new': Constants.COMMANDS.NEW_FILE,
        'open-outline': Constants.COMMANDS.OPEN_FILE,
        'file-save': Constants.COMMANDS.SAVE_FILE,
        'file-save-as': Constants.COMMANDS.SAVE_AS_FILE,
        'file-save-as-leojs': Constants.COMMANDS.SAVE_AS_LEOJS,
        'file-save-as-unzipped': Constants.COMMANDS.SAVE_AS_FILE,
        'file-save-by-name': Constants.COMMANDS.SAVE_AS_FILE,
        'file-save-to': Constants.COMMANDS.SAVE_AS_FILE,
        'save': Constants.COMMANDS.SAVE_FILE,
        'save-as': Constants.COMMANDS.SAVE_AS_FILE,
        'save-file': Constants.COMMANDS.SAVE_FILE,
        'save-file-as': Constants.COMMANDS.SAVE_AS_FILE,
        'save-file-as-leojs': Constants.COMMANDS.SAVE_AS_LEOJS,
        'save-file-as-unzipped': Constants.COMMANDS.SAVE_AS_FILE,
        'save-file-by-name': Constants.COMMANDS.SAVE_AS_FILE,
        'save-file-to': Constants.COMMANDS.SAVE_AS_FILE,
        'save-to': Constants.COMMANDS.SAVE_AS_FILE,

        'clone-find-all-flattened-marked': Constants.COMMANDS.CLONE_FIND_FLATTENED_MARKED,
        'clone-find-all-marked': Constants.COMMANDS.CLONE_FIND_MARKED,

        'clone-marked-nodes': Constants.COMMANDS.CLONE_MARKED_NODES,

        'cfa': Constants.COMMANDS.CLONE_FIND_ALL,
        'cfam': Constants.COMMANDS.CLONE_FIND_MARKED,
        'cff': Constants.COMMANDS.CLONE_FIND_ALL_FLATTENED,
        'cffm': Constants.COMMANDS.CLONE_FIND_FLATTENED_MARKED,
        'cft': Constants.COMMANDS.CLONE_FIND_TAG,

        'git-diff': Constants.COMMANDS.GIT_DIFF,
        'gd': Constants.COMMANDS.GIT_DIFF,

        'find-tab-open': Constants.COMMANDS.START_SEARCH,
        'find-clone-all': Constants.COMMANDS.CLONE_FIND_ALL,
        'find-clone-all-flattened': Constants.COMMANDS.CLONE_FIND_ALL_FLATTENED,
        'find-clone-tag': Constants.COMMANDS.CLONE_FIND_TAG,
        'find-all': Constants.COMMANDS.FIND_ALL,
        'start-search': Constants.COMMANDS.START_SEARCH,
        'find-next': Constants.COMMANDS.FIND_NEXT,
        'find-prev': Constants.COMMANDS.FIND_PREVIOUS,
        'search-backward': Constants.COMMANDS.FIND_NEXT,
        'search-forward': Constants.COMMANDS.FIND_PREVIOUS,
        'find-var': Constants.COMMANDS.FIND_VAR,
        'find-def': Constants.COMMANDS.FIND_DEF,
        'replace': Constants.COMMANDS.REPLACE,
        'replace-all': Constants.COMMANDS.REPLACE_ALL,
        'change-all': Constants.COMMANDS.REPLACE_ALL,
        'change-then-find': Constants.COMMANDS.REPLACE_THEN_FIND,
        'replace-then-find': Constants.COMMANDS.REPLACE_THEN_FIND,
        'show-find-options': Constants.COMMANDS.START_SEARCH,
        'toggle-find-ignore-case-option': Constants.COMMANDS.TOGGLE_FIND_IGNORE_CASE_OPTION,
        'toggle-find-in-body-option': Constants.COMMANDS.TOGGLE_FIND_SEARCH_BODY_OPTION,
        'toggle-find-in-headline-option': Constants.COMMANDS.TOGGLE_FIND_SEARCH_HEADLINE_OPTION,
        'toggle-find-mark-changes-option': Constants.COMMANDS.TOGGLE_FIND_MARK_CHANGES_OPTION,
        'toggle-find-mark-finds-option': Constants.COMMANDS.TOGGLE_FIND_MARK_FINDS_OPTION,
        'toggle-find-regex-option': Constants.COMMANDS.TOGGLE_FIND_REGEXP_OPTION,
        'toggle-find-word-option': Constants.COMMANDS.TOGGLE_FIND_WORD_OPTION,

        'goto-next-history-node': Constants.COMMANDS.PREV_NODE,
        'goto-prev-history-node': Constants.COMMANDS.NEXT_NODE,


    };

}
