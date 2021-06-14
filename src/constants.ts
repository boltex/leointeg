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

    public static VERSION_STATE_KEY: string = "leoIntegVersion";

    public static FILE_EXTENSION: string = "leo";
    public static URI_LEO_SCHEME: string = "leo";
    public static URI_FILE_SCHEME: string = "file";
    public static URI_SCHEME_HEADER: string = "leo:/";
    public static FILE_OPEN_FILTER_MESSAGE: string = "Leo Files";
    public static UNTITLED_FILE_NAME: string = "untitled";
    public static RECENT_FILES_KEY: string = "leoRecentFiles";
    public static LAST_FILES_KEY: string = "leoLastFiles";

    public static DEFAULT_PYTHON: string = "python3";
    public static WIN32_PYTHON: string = "py";
    public static OLD_SERVER_NAME: string = "/leobridgeserver.py";
    public static SERVER_NAME: string = "/leoserver.py";
    public static SERVER_STARTED_TOKEN: string = "LeoBridge started";
    public static TCPIP_DEFAULT_PROTOCOL: string = "ws://";

    public static ERROR_PACKAGE_ID: number = 0;
    public static STARTING_PACKAGE_ID: number = 1;
    public static STATUSBAR_DEBOUNCE_DELAY: number = 60;
    public static DOCUMENTS_DEBOUNCE_DELAY: number = 80;
    public static STATES_DEBOUNCE_DELAY: number = 100;

    /**
     * * Find panel controls ids
     */
    public static FIND_INPUTS_IDS = {
        FIND_TEXT: "findText",
        REPLACE_TEXT: "replaceText",
        ENTIRE_OUTLINE: "entireOutline",
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
        TITLE_GOTO_GLOBAL_LINE: "Goto global line",
        PLACEHOLDER_GOTO_GLOBAL_LINE: "#",
        PROMPT_GOTO_GLOBAL_LINE: "Line number",
        START_SERVER_ERROR: "Error - Cannot start server: ",
        CONNECT_FAILED: "Leo Bridge Connection Failed",
        CONNECT_ERROR: "Leo Bridge Connection Error: Incorrect id",
        CONNECTED: "Connected",
        ALREADY_CONNECTED: "Already connected",
        DISCONNECTED: "Disconnected",
        CLEARED_RECENT: "Cleared recent files list",
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
        INVERT_NODES: "invertNodeContrast",
        LEO_EDITOR_PATH: "leoEditorPath",
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
        LEO_EDITOR_PATH: "",
        AUTO_START_SERVER: false,
        AUTO_CONNECT: false,
        IP_ADDRESS: "localhost",
        IP_LOOPBACK: "127.0.0.1",
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
     * * Table for converting Leo languages names for the currently opened body pane
     * Used in showBody method of leoIntegration.ts
     */
    public static LANGUAGE_CODES: { [key: string]: string | undefined } = {
        cplusplus: 'cpp',
        md: 'markdown'
    };

    /**
     * * Commands for leobridgeserver.py
     */
    public static LEOBRIDGE = {
        TEST: "!test",
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
        CONTRACT_ALL: "contractAllHeadlines", // * Direct Leo Command
        GET_STATES: "!get_ui_states", // "getStates",
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
        CLICK_BUTTON: "!click_button", // "clickButton",
        // * Goto operations
        PAGE_UP: "!page_up", // "pageUp",
        PAGE_DOWN: "!page_down", // "pageDown",
        GOTO_FIRST_VISIBLE: "goToFirstVisibleNode", // * Direct Leo Command
        GOTO_LAST_VISIBLE: "goToLastVisibleNode", // * Direct Leo Command
        GOTO_LAST_SIBLING: "goToLastSibling", // * Direct Leo Command
        GOTO_NEXT_VISIBLE: "selectVisNext", // * Direct Leo Command
        GOTO_PREV_VISIBLE: "selectVisBack", // * Direct Leo Command
        GOTO_NEXT_MARKED: "goToNextMarkedHeadline", // * Direct Leo Command
        GOTO_NEXT_CLONE: "goToNextClone", // * Direct Leo Command
        CONTRACT_OR_GO_LEFT: "contractNodeOrGoToParent", // * Direct Leo Command
        EXPAND_AND_GO_RIGHT: "expandNodeAndGoToFirstChild", // * Direct Leo Command
        // * Leo Operations
        MARK_PNODE: "!mark_node", // "markPNode",
        UNMARK_PNODE: "!unmark_node", // "unmarkPNode",
        COPY_PNODE: "copyOutline", // * Direct Leo Command
        CUT_PNODE: "!cut_node", // "cutPNode",
        PASTE_PNODE: "pasteOutline", // * Direct Leo Command
        PASTE_CLONE_PNODE: "pasteOutlineRetainingClones", // * Direct Leo Command
        DELETE_PNODE: "!delete_node", // "deletePNode",
        MOVE_PNODE_DOWN: "moveOutlineDown", // * Direct Leo Command
        MOVE_PNODE_LEFT: "moveOutlineLeft", // * Direct Leo Command
        MOVE_PNODE_RIGHT: "moveOutlineRight", // * Direct Leo Command
        MOVE_PNODE_UP: "moveOutlineUp", // * Direct Leo Command
        INSERT_PNODE: "!insert_node", // "insertPNode",
        INSERT_NAMED_PNODE: "!insert_named_node", // "insertNamedPNode",
        CLONE_PNODE: "!clone_node", // "clonePNode",
        PROMOTE_PNODE: "promote", // * Direct Leo Command
        DEMOTE_PNODE: "demote", // * Direct Leo Command
        REFRESH_FROM_DISK_PNODE: "refreshFromDisk", // * Direct Leo Command
        SORT_CHILDREN: "sortChildren", // * Direct Leo Command
        SORT_SIBLINGS: "sortSiblings", // * Direct Leo Command
        UNDO: "!undo",
        REDO: "!redo",
        EXECUTE_SCRIPT: "executeScript", // * Direct Leo Command
        HOIST_PNODE: "hoist", // * Direct Leo Command
        DEHOIST: "dehoist", // * Direct Leo Command
        EXTRACT: "extract", // * Direct Leo Command
        EXTRACT_NAMES: "extractNames", // * Direct Leo Command
        COPY_MARKED: "copyMarked", // * Direct Leo Command
        DIFF_MARKED_NODES: "deleteMarked", // * Direct Leo Command
        MARK_CHANGED_ITEMS: "markChangedHeadlines", // * Direct Leo Command
        MARK_SUBHEADS: "markSubheads", // * Direct Leo Command
        UNMARK_ALL: "unmarkAll", // * Direct Leo Command
        CLONE_MARKED_NODES: "cloneMarked", // * Direct Leo Command
        DELETE_MARKED_NODES: "deleteMarked", // * Direct Leo Command
        MOVE_MARKED_NODES: "moveMarked", // * Direct Leo Command
        GIT_DIFF: "gitDiff", // * Direct Leo Command
        GET_FOCUS: "!get_focus",
        GET_SEARCH_SETTINGS: "!get_search_settings",
        SET_SEARCH_SETTINGS: "!set_search_settings",
        START_SEARCH: "!start_search",
        FIND_ALL: "!find_all",
        FIND_NEXT: "!find_next",
        FIND_PREVIOUS: "!find_previous",
        REPLACE: "!replace",
        REPLACE_THEN_FIND: "!replace_then_find",
        REPLACE_ALL: "!replace_all",
        GOTO_GLOBAL_LINE: "!goto_global_line",
        CLONE_FIND_ALL: "!clone_find_all",
        CLONE_FIND_ALL_FLATTENED: "!clone_find_all_flattened",
        CLONE_FIND_MARKED: "cloneFindAllMarked", // * Direct Leo Command
        CLONE_FIND_FLATTENED_MARKED: "cloneFindAllFlattenedMarked" // * Direct Leo Command
    };

    /**
     * * All commands this expansion exposes (in package.json, contributes > commands)
     */
    public static COMMANDS = {
        SHOW_WELCOME: Constants.NAME + ".showWelcomePage", // Always available: not in the commandPalette section of package.json
        SHOW_SETTINGS: Constants.NAME + ".showSettingsPage", // Always available: not in the commandPalette section of package.json
        // * LeoBridge
        CHOOSE_LEO_FOLDER: Constants.NAME + ".chooseLeoFolder",
        START_SERVER: Constants.NAME + ".startServer",
        CONNECT: Constants.NAME + ".connectToServer",
        SET_OPENED_FILE: Constants.NAME + ".setOpenedFile",
        OPEN_FILE: Constants.NAME + ".openLeoFile", // sets focus on BODY
        CLEAR_RECENT_FILES: Constants.NAME + ".clearRecentFiles",
        IMPORT_ANY_FILE: Constants.NAME + ".importAnyFile",
        RECENT_FILES: Constants.NAME + ".recentLeoFiles", // shows recent Leo files, opens one on selection
        SWITCH_FILE: Constants.NAME + ".switchLeoFile",
        NEW_FILE: Constants.NAME + ".newLeoFile",
        SAVE_FILE: Constants.NAME + ".saveLeoFile",
        SAVE_FILE_FO: Constants.NAME + ".saveLeoFileFromOutline",
        SAVE_AS_FILE: Constants.NAME + ".saveAsLeoFile",
        CLOSE_FILE: Constants.NAME + ".closeLeoFile",
        CLICK_BUTTON: Constants.NAME + ".clickButton",
        REMOVE_BUTTON: Constants.NAME + ".removeButton",
        MINIBUFFER: Constants.NAME + ".minibuffer",
        GIT_DIFF: Constants.NAME + ".gitDiff", // TODO : Test & Fix this Proof of concept leoCommand
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
        NEXT_NODE: Constants.NAME + ".next",
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
        START_SEARCH: Constants.NAME + ".startSearch",
        FIND_ALL: Constants.NAME + ".findAll",
        FIND_NEXT: Constants.NAME + ".findNext",
        FIND_NEXT_FO: Constants.NAME + ".findNextFromOutline",
        FIND_PREVIOUS: Constants.NAME + ".findPrevious",
        FIND_PREVIOUS_FO: Constants.NAME + ".findPreviousFromOutline",
        REPLACE: Constants.NAME + ".replace",
        REPLACE_FO: Constants.NAME + ".replaceFromOutline",
        REPLACE_THEN_FIND: Constants.NAME + ".replaceThenFind",
        REPLACE_THEN_FIND_FO: Constants.NAME + ".replaceThenFindFromOutline",
        REPLACE_ALL: Constants.NAME + ".replaceAll",
        CLONE_FIND_ALL: Constants.NAME + ".cloneFindAll",
        CLONE_FIND_ALL_FLATTENED: Constants.NAME + ".cloneFindAllFlattened",
        CLONE_FIND_MARKED: Constants.NAME + ".cloneFindMarked",
        CLONE_FIND_FLATTENED_MARKED: Constants.NAME + ".cloneFindFlattenedMarked",
        GOTO_GLOBAL_LINE: Constants.NAME + ".gotoGlobalLine",
        SET_FIND_EVERYWHERE_OPTION: Constants.NAME + ".setFindEverywhereOption",
        SET_FIND_NODE_ONLY_OPTION: Constants.NAME + ".setFindNodeOnlyOption",
        SET_FIND_SUBOUTLINE_ONLY_OPTION: Constants.NAME + ".setFindSuboutlineOnlyOption",
        TOGGLE_FIND_IGNORE_CASE_OPTION: Constants.NAME + ".toggleFindIgnoreCaseOption",
        TOGGLE_FIND_MARK_CHANGES_OPTION: Constants.NAME + ".toggleFindMarkChangesOption",
        TOGGLE_FIND_MARK_FINDS_OPTION: Constants.NAME + ".toggleFindMarkFindsOption",
        TOGGLE_FIND_REGEXP_OPTION: Constants.NAME + ".toggleFindRegexpOption",
        TOGGLE_FIND_WORD_OPTION: Constants.NAME + ".toggleFindWordOption",
        TOGGLE_FIND_SEARCH_BODY_OPTION: Constants.NAME + ".toggleFindSearchBodyOption",
        TOGGLE_FIND_SEARCH_HEADLINE_OPTION: Constants.NAME + ".toggleFindSearchHeadlineOption",
    };

    /**
     * * Overridden 'good' minibuffer commands
     */
    public static MINIBUFFER_OVERRIDDEN_COMMANDS: { [key: string]: string } = {
        "import-file": Constants.COMMANDS.IMPORT_ANY_FILE,
        "redo": Constants.COMMANDS.REDO,
        "undo": Constants.COMMANDS.UNDO,
        "clone-find-all": Constants.COMMANDS.CLONE_FIND_ALL,
        "clone-find-all-flattened": Constants.COMMANDS.CLONE_FIND_ALL_FLATTENED
    };

}
