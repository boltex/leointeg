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

    public static UNDOS_ID: string = "leoUndos";
    public static UNDOS_EXPLORER_ID: string = "leoUndosExplorer";

    public static VERSION_STATE_KEY: string = "leoIntegVersion";

    public static FILE_EXTENSION: string = "leo";
    public static DB_FILE_EXTENSION: string = "db";
    public static JS_FILE_EXTENSION: string = "leojs";

    public static LEO_LANGUAGE_PREFIX: string = "leobody."; // all lowercase
    public static LEO_WRAP_SUFFIX: string = ".wrap"; // all lowercase.

    public static URI_LEO_SCHEME: string = "leointeg";
    public static URI_LEO_DETACHED_SCHEME: string = "leointegDetached";
    public static URI_FILE_SCHEME: string = "file";
    public static URI_UNTITLED_SCHEME: string = 'untitled';
    public static OUTPUT_CHANNEL_LANGUAGE: string = 'Log';
    public static URI_SCHEME_HEADER: string = "leointeg:/";
    public static URI_SCHEME_DETACHED_HEADER: string = "leointegDetached:/";
    public static FILE_OPEN_FILTER_MESSAGE: string = "Leo Files";
    public static UNTITLED_FILE_NAME: string = "untitled";
    public static RECENT_FILES_KEY: string = "leoRecentFiles";
    public static LAST_FILES_KEY: string = "leoLastFiles";
    public static LAST_ACTIVE_FILE_KEY: string = "leoLastActiveFile";

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
    public static CLEANUP_DEBOUNCE_DELAY: number = 40;
    public static DETACHED_LANGUAGE_DELAY: number = 300;
    public static DOCUMENTS_DEBOUNCE_DELAY: number = 80;
    public static BUTTONS_DEBOUNCE_DELAY: number = 80;
    public static UNDOS_DEBOUNCE_DELAY: number = 180;
    public static UNDOS_REVEAL_DEBOUNCE_DELAY: number = 50;
    public static REFRESH_DEBOUNCE_DELAY: number = 50;
    public static STATES_DEBOUNCE_DELAY: number = 100;
    public static UNL_DEBOUNCE_DELAY: number = 150;
    public static BODY_STATES_DEBOUNCE_DELAY: number = 120;
    public static OUTLINE_DESC_DEBOUNCE_DELAY: number = 250;
    public static GOTO_DEBOUNCE_DELAY: number = 50;

    public static LOG_ALERT_COLOR: string = 'red';

    /**
     * Supported Languages
     */
    public static LANGUAGES = [
        "plain",
        "julia",
        "batch",
        "shell",
        "python",
        "javascript",
        "typescript",
        "c",
        "cpp",
        "css",
        "fortran",
        "fortran90",
        "html",
        "java",
        "json",
        "markdown",
        "php",
        "restructuredtext",
        "rust",
        "xml",
    ];

    /**
     * * Minimal Leo Editor and Leo server versions
     */
    public static MIN_SERVER_VERSION_NUMBER = {
        major: 1,
        minor: 0,
        patch: 12,
    };

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

        ICON_LIGHT_UNDO_ACTIVE: "resources/light/undo.svg",
        ICON_DARK_UNDO_ACTIVE: "resources/dark/undo.svg",
        ICON_LIGHT_UNDO: "resources/dark/undo.svg",
        ICON_DARK_UNDO: "resources/light/undo.svg",
        ICON_LIGHT_REDO_ACTIVE: "resources/light/redo.svg",
        ICON_DARK_REDO_ACTIVE: "resources/dark/redo.svg",
        ICON_LIGHT_REDO: "resources/dark/redo.svg",
        ICON_DARK_REDO: "resources/light/redo.svg",

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
        STATUSBAR_INDICATOR: "$(link) ", // With trailing space
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
     * * Basic user messages strings: for messages and dialogs
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
        REVERT_PREVIOUS_VERSION: "Revert to previous version of ", // Trailing space intended
        CANNOT_REVERT: "Can not revert unnamed file.",
        CANCEL: "Cancel",
        OPEN_WITH_LEOINTEG: "Open this Leo file with LeoInteg?",
        OPEN_RECENT_FILE: "Open Recent Leo File",
        RIGHT_CLICK_TO_OPEN: "Right-click Leo files to open with LeoInteg",
        FILE_ALREADY_OPENED: "Leo file already opened",
        CHOOSE_OPENED_FILE: "Select an opened Leo File",
        FILE_NOT_OPENED: "No files opened.",
        STATUSBAR_TOOLTIP_UNL: "Click to copy UNL to clipboard",
        STATUSBAR_TOOLTIP_ON: "Leo Key Bindings are in effect", // TODO : Add description of what happens if clicked
        STATUSBAR_TOOLTIP_OFF: "Leo Key Bindings off", // TODO : Add description of what happens if clicked
        PROMPT_EDIT_HEADLINE: "Edit Headline",
        PROMPT_INSERT_NODE: "Insert Node",
        PROMPT_INSERT_CHILD: "Insert Child",
        DEFAULT_HEADLINE: "New Headline",
        TITLE_GOTO_GLOBAL_LINE: "Goto global line",
        PLACEHOLDER_GOTO_GLOBAL_LINE: "#",
        PROMPT_GOTO_GLOBAL_LINE: "Line number",

        REPLACE_TITLE: "Replace with",
        REPLACE_PROMPT: "Type text to replace with and press enter.",
        REPLACE_PLACEHOLDER: "Replace pattern here",

        SEARCH_TITLE: "Search for",
        SEARCH_PROMPT: "Type text to search for and press enter.",
        SEARCH_PLACEHOLDER: "Find pattern here",

        INT_SEARCH_TITLE: "Search",
        INT_SEARCH_PROMPT: "'Enter' to search",
        INT_SEARCH_BACKWARD: " Backward", // Leading space intended
        INT_SEARCH_REGEXP: "Regexp ", // Trailing space intended
        INT_SEARCH_WORD: "Word ", // Trailing space intended

        SEARCH_NOT_FOUND: "Not found",
        FIND_PATTERN_HERE: "<find pattern here>",

        TAGS_CHARACTERS_ERROR: "Cannot add tags containing any of these characters: &|^-",
        NO_TAGS_ON_NODE: "No tags on node: ", // Trailing space intended

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
        SEARCH_POSITION_BY_HEADLINE: "Search positions by headline",
        MINIBUFFER_PROMPT: "Minibuffer Full Command",
        SELECT_CHAPTER_PROMPT: "Select chapter",
        SET_UA_NAME_TITLE: "Set ua",
        SET_UA_NAME_PLACEHOLDER: "Attribute Name",
        SET_UA_NAME_PROMPT: "Set unknown attribute name",
        SET_UA_VAL_TITLE: "Set ua to",
        SET_UA_VAL_PLACEHOLDER: "Attribute Value",
        SET_UA_VAL_PROMPT: "Set unknown attribute value",
        CHANGES_DETECTED: "Changes to external files were detected.",
        REFRESHED: " Nodes refreshed.", // with leading space
        IGNORED: " They were ignored.", // with leading space
        TOO_FAST: "leoInteg is busy! ", // with trailing space
        MINIMUM_LEO_VERSION_STRING: "Please update your Leo Installation: Leo 6.8.5 is recommended.",
        UNKNOWN_LANGUAGE_NOT_SUPPORTED: "Language coloring not yet supported.",
        LANGUAGE_NOT_SUPPORTED: " language coloring not yet supported.", // with leading space
        MINIBUFFER_BUTTON_START: "@button-",
        MINIBUFFER_RCLICK_START: "@rclick-",
        MINIBUFFER_SCRIPT_BUTTON: "script-button",
        MINIBUFFER_DEL_SCRIPT_BUTTON: "delete-script-",
        MINIBUFFER_DEL_BUTTON_START: "delete-@button-",
        MINIBUFFER_COMMAND_START: "@command-",
        MINIBUFFER_USER_DEFINED: "$(run) User defined command.",
        MINIBUFFER_BUTTON: "$(run) @button",
        MINIBUFFER_RCLICK: "$(chevron-right) @rclick",
        MINIBUFFER_COMMAND: "$(zap) @command",
        MINIBUFFER_BAD_COMMAND: "$(error) Not Available",
        MINIBUFFER_HISTORY_LABEL: "Minibuffer History",
        MINIBUFFER_HISTORY_DESC: "Choose from last run commands...",

        BODY_WRAP_RECOMMEND: "'leobody' wordWrap settings are recommended (some currently missing)",
        BODY_WRAP_SET: "'leobody' wordWrap settings were set",
        FIX_IT: "Fix it",
        ENABLE_PREVIEW_SET: "'Enable Preview' setting was set",
        ENABLE_PREVIEW_RECOMMEND: "'Enable Preview' setting is recommended (currently disabled)",
        CLOSE_EMPTY_CLEARED: "'Close Empty Groups' setting was cleared",
        CLOSE_EMPTY_RECOMMEND: "'Close Empty Groups' setting is NOT recommended!",
    };

    /**
     * * Possible import file types
     */
    public static IMPORT_FILE_TYPES: { [name: string]: string[]; } = {
        "All files": ["*"],

        // * Offer any file instead of restricting to some file types
        // "C/C++ files": ["c", "cpp", "h", "hpp"],
        // "FreeMind files": ["mm.html"],
        // "Java files": ["java"],
        // "JavaScript files": ["js"],
        // "Mindjet files": ["csv"],
        // "MORE files": ["MORE"],
        // "Lua files": ["lua"],
        // "Pascal files": ["pas"],
        // "Python files": ["py"],
        // "Text files": ["txt"],

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
        ASK_FOR_EXIT_CONFIRMATION_IF_DIRTY: "askForExitConfirmationIfDirty",

        COLLAPSE_ALL_SHORTCUT: "collapseAllShortcut",
        ACTIVITY_VIEW_SHORTCUT: "activityViewShortcut",
        GO_ANYWHERE_SHORTCUT: "goAnywhereShortcut",

        TREE_IN_EXPLORER: "treeInExplorer",

        SHOW_FILE_ON_OUTLINE: "showFileOnOutline",
        SHOW_HOIST_DEHOIST_ON_OUTLINE: "showHoistDehoistOnOutline",
        SHOW_PREV_NEXT_ON_OUTLINE: "showPrevNextOnOutline",
        SHOW_PROMOTE_DEMOTE_ON_OUTLINE: "showPromoteDemoteOnOutline",
        SHOW_RECENT_FILES_ON_OUTLINE: "showRecentFilesOnOutline",
        SHOW_SETTINGS_ON_OUTLINE: "showSettingsOnOutline",
        SHOW_SHOW_LOG_ON_OUTLINE: "showShowLogOnOutline",
        SHOW_UNDO_REDO_ON_OUTLINE: "showUndoRedoOnOutline",

        SHOW_EDIT: "showEditOnNodes",
        SHOW_ADD: "showAddOnNodes",
        SHOW_MARK: "showMarkOnNodes",
        SHOW_CLONE: "showCloneOnNodes",
        SHOW_COPY: "showCopyOnNodes",
        SHOW_BRANCH_OUTLINE: "showBranchInOutlineTitle",
        SHOW_UNL_ON_STATUSBAR: "showUnlOnStatusBar",

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
        ASK_FOR_EXIT_CONFIRMATION_IF_DIRTY: true,

        COLLAPSE_ALL_SHORTCUT: true,
        ACTIVITY_VIEW_SHORTCUT: true,
        GO_ANYWHERE_SHORTCUT: true,

        SHOW_UNL_ON_STATUSBAR: true,
        TREE_IN_EXPLORER: true,

        SHOW_FILE_ON_OUTLINE: true,
        SHOW_HOIST_DEHOIST_ON_OUTLINE: true,
        SHOW_PREV_NEXT_ON_OUTLINE: true,
        SHOW_PROMOTE_DEMOTE_ON_OUTLINE: true,
        SHOW_RECENT_FILES_ON_OUTLINE: false,
        SHOW_SETTINGS_ON_OUTLINE: false,
        SHOW_SHOW_LOG_ON_OUTLINE: false,
        SHOW_UNDO_REDO_ON_OUTLINE: true,

        SHOW_EDIT: true,
        SHOW_ARROWS: false,
        SHOW_ADD: false,
        SHOW_MARK: false,
        SHOW_CLONE: false,
        SHOW_COPY: false,
        SHOW_BRANCH_OUTLINE: false,

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

    public static MINIBUFFER_QUICK_PICK: vscode.QuickPickItem = {
        label: Constants.USER_MESSAGES.MINIBUFFER_HISTORY_LABEL,
        description: Constants.USER_MESSAGES.MINIBUFFER_HISTORY_DESC,
        iconPath: new vscode.ThemeIcon("history")
    };

    /**
     * * Used in 'when' clauses, set with vscode.commands.executeCommand("setContext",...)
     */
    public static CONTEXT_FLAGS = {
        // Main flags for connection and opened file
        STARTUP_FINISHED: "leoStartupFinished", // Initial extension finished auto-server-start-connect
        LEO_OPENING_FILE: "leoOpeningFile",
        STARTING_SERVER: "leoStartingServer",
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
        LEO_CAN_BACK: "leoCanGoBack",
        LEO_CAN_NEXT: "leoCanGoNext",
        LEO_CAN_DEMOTE: "leoCanDemote",
        LEO_CAN_PROMOTE: "leoCanPromote",
        LEO_CAN_DEHOIST: "leoCanDehoist",
        LEO_CAN_HOIST: "leoCanHoist", // isNotRoot equivalent
        LEO_IN_CHAPTER: "leoInChapter",
        LEO_TOP_HOIST_CHAPTER: "leoTopHoistChapter",
        LEO_EDIT_HEADLINE: "leoEditHeadline",

        // 'states' flags about current selection, for visibility and commands availability
        SELECTED_MARKED: "leoMarked", // no need for unmarked here, use !leoMarked
        SELECTED_CLONE: "leoCloned",
        SELECTED_DIRTY: "leoDirty",
        SELECTED_EMPTY: "leoEmpty",
        SELECTED_CHILD: "leoChild", // Has children
        SELECTED_ATFILE: "leoAtFile", // Can be refreshed

        // Outline nodes: text Flags for 'when' clauses. Used as concatenated strings.
        NODE_MARKED: "leoNodeMarked",  // Selected node is marked
        NODE_UNMARKED: "leoNodeUnmarked", // Selected node is unmarked (Needed for regexp)
        NODE_ATFILE: "leoNodeAtFile", // Selected node is an @file or @clean, etc...
        NODE_CLONED: "leoNodeCloned",
        NODE_ROOT: "leoNodeRoot",
        NODE_NOT_ROOT: "leoNodeNotRoot",
        NODE_TAGS: "leoNodeTags",

        // Flags for undo nodes
        UNDO_BEAD: "leoUndoNode",
        NOT_UNDO_BEAD: "leoNoUndoNode",

        // Flags for Leo documents tree view icons and hover node command buttons
        DOCUMENT_SELECTED_TITLED: "leoDocumentSelectedTitled",
        DOCUMENT_TITLED: "leoDocumentTitled",
        DOCUMENT_SELECTED_UNTITLED: "leoDocumentSelectedUntitled",
        DOCUMENT_UNTITLED: "leoDocumentUntitled",

        // Flags for focus context
        FOCUS_FIND: "leoFindFocus",

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
     * * Commands for leoserver.py
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
        GET_UNL: "!get_unl",
        HANDLE_UNL: "!handle_unl",
        // * Server Commands
        GET_COMMANDS: "!get_all_leo_commands", // "getCommands",
        APPLY_CONFIG: "!set_config", // "applyConfig",
        ASK_RESULT: "!set_ask_result", // "askResult",
        // * GUI
        GET_IS_VALID: "!get_is_valid",
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
        GET_UNDOS: "!get_undos",
        GET_UA: "!get_ua",
        SET_UA_MEMBER: "!set_ua_member",
        SET_UA: "!set_ua",
        // * Leo Documents
        GET_OPENED_FILES: "!get_all_open_commanders", //"getOpenedFiles",
        SET_OPENED_FILE: "!set_opened_file", // "setOpenedFile",
        GET_BRANCH: "!get_branch",
        OPEN_FILE: "!open_file", // "openFile",
        OPEN_FILES: "!open_files", //  "openFiles",
        CLOSE_FILE: "!close_file", // "closeFile",
        REVERT: "-revert",
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
        GOTO_FIRST_SIBLING: "goToFirstSibling",
        GOTO_LAST_SIBLING: "goToLastSibling",
        GOTO_NEXT_VISIBLE: "selectVisNext",
        GOTO_PREV_VISIBLE: "selectVisBack",
        GOTO_NEXT_MARKED: "goToNextMarkedHeadline",
        GOTO_NEXT_CLONE: "goToNextClone",
        CONTRACT_OR_GO_LEFT: "contractNodeOrGoToParent",
        EXPAND_AND_GO_RIGHT: "expandNodeAndGoToFirstChild",

        // * Import Export Operations
        IMPORT_ANY_FILE: "!import_any_file", // "importAnyFile",
        READ_FILE_INTO_NODE: "!read_file_into_node",
        EXPORT_HEADLINES: "!export_headlines",
        FLATTEN_OUTLINE: "!flatten_outline",
        OUTLINE_TO_CWEB: "!outline_to_cweb",
        OUTLINE_TO_NOWEB: "!outline_to_noweb",
        REMOVE_SENTINELS: "!remove_sentinels",
        WEAVE: "!weave",
        WRITE_FILE_FROM_NODE: "!write_file_from_node",

        // * Leo Operations, setters and getters
        MARK_PNODE: "!mark_node", // "markPNode",
        UNMARK_PNODE: "!unmark_node", // "unmarkPNode",
        COPY_PNODE: "!copy_node",
        COPY_PNODE_AS_JSON: "!copy_node_as_json",
        CUT_PNODE: "!cut_node", // "cutPNode",
        PASTE_PNODE: "!paste_node",
        PASTE_CLONE_PNODE: "!paste_as_clone_node",
        PASTE_AS_TEMPLATE: "!paste_as_template",
        DELETE_PNODE: "!delete_node", // "deletePNode",
        MOVE_PNODE_DOWN: "moveOutlineDown",
        MOVE_PNODE_LEFT: "moveOutlineLeft",
        MOVE_PNODE_RIGHT: "moveOutlineRight",
        MOVE_PNODE_UP: "moveOutlineUp",
        INSERT_PNODE: "!insert_node", // "insertPNode",
        INSERT_NAMED_PNODE: "!insert_named_node", // "insertNamedPNode",
        INSERT_CHILD_PNODE: "!insert_child_node",
        INSERT_CHILD_NAMED_PNODE: "!insert_child_named_node",
        INSERT_FILE_NODE: "!insert_file_node", // "insertFileNode",
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
        CHAPTER_NEXT: "-chapter-next",
        CHAPTER_BACK: "-chapter-back",
        CHAPTER_MAIN: "!chapter_main",
        CHAPTER_SELECT: "!chapter_select",
        GET_CHAPTERS: "!get_chapters",
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
        GOTO_LINE_IN_LEO_OUTLINE: "!goto_line_in_leo_outline",
        GET_FOCUS: "!get_focus",

        GET_GOTO_PANEL: "!get_goto_panel", // To fill up panel when changing leo documents

        NAV_HEADLINE_SEARCH: "!nav_headline_search",
        NAV_SEARCH: "!nav_search",
        NAV_CLEAR: "!nav_clear",

        FIND_QUICK_TIMELINE: "!find_quick_timeline",
        FIND_QUICK_CHANGED: "!find_quick_changed",
        FIND_QUICK_HISTORY: "!find_quick_history",
        FIND_QUICK_MARKED: "!find_quick_marked",
        GOTO_NAV_ENTRY: "!goto_nav_entry",

        GET_ALL_POSITIONS: "!get_all_positions",
        GET_POSITION_DATA: "!get_position_data",
        GET_SEARCH_SETTINGS: "!get_search_settings",
        SET_SEARCH_SETTINGS: "!set_search_settings",
        INTERACTIVE_SEARCH: "!interactive_search",

        FIND_ALL: "!find_all",
        FIND_NEXT: "!find_next",
        FIND_PREVIOUS: "!find_previous",
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
        CLONE_FIND_PARENTS: "-clone-find-parents",

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
        HANDLE_UNL: Constants.NAME + ".handleUnl",
        SHORT_GNX_UNL_TO_CLIPBOARD: Constants.NAME + ".shortGnxUnlToClipboard",
        FULL_GNX_UNL_TO_CLIPBOARD: Constants.NAME + ".fullGnxUnlToClipboard",
        SHORT_LEGACY_UNL_TO_CLIPBOARD: Constants.NAME + "shortLegacyUnlToClipboard",
        FULL_LEGACY_UNL_TO_CLIPBOARD: Constants.NAME + "fullLegacyUnlToClipboard",
        SET_OPENED_FILE: Constants.NAME + ".setOpenedFile",
        OPEN_FILE: Constants.NAME + ".openLeoFile", // sets focus on BODY
        CLEAR_RECENT_FILES: Constants.NAME + ".clearRecentFiles",
        RECENT_FILES: Constants.NAME + ".recentLeoFiles", // shows recent Leo files, opens one on selection
        SWITCH_FILE: Constants.NAME + ".switchLeoFile",
        NEW_FILE: Constants.NAME + ".newLeoFile",
        SAVE_FILE: Constants.NAME + ".saveLeoFile",
        SAVE_FILE_FO: Constants.NAME + ".saveLeoFileFromOutline",
        SAVE_AS_FILE: Constants.NAME + ".saveAsLeoFile",
        SAVE_AS_LEOJS: Constants.NAME + ".saveAsLeoJsFile",
        CLOSE_FILE: Constants.NAME + ".closeLeoFile",
        REVERT_TO_SAVED: Constants.NAME + ".revert",
        CLICK_BUTTON: Constants.NAME + ".clickButton",
        REMOVE_BUTTON: Constants.NAME + ".removeButton",
        GOTO_SCRIPT: Constants.NAME + ".gotoScript",
        MINIBUFFER: Constants.NAME + ".minibuffer",
        GIT_DIFF: Constants.NAME + ".gitDiff",
        GOTO_LINE_IN_LEO_OUTLINE: Constants.NAME + ".gotoLineInLeoOutline",
        IMPORT_INTO_LEO_OUTLINE: Constants.NAME + ".importIntoLeoOutline",
        TAB_CYCLE_NEXT: Constants.NAME + ".tabCycleNext",
        // * Outline selection
        SELECT_NODE: Constants.NAME + ".selectTreeNode",
        OPEN_ASIDE: Constants.NAME + ".openAside", // Opens aside a body pane locked to this gnx & commander.
        // * Goto operations that always finish with focus in outline
        PAGE_UP: Constants.NAME + ".pageUp",
        PAGE_DOWN: Constants.NAME + ".pageDown",
        SCROLL_TOP: Constants.NAME + ".scrollTop",
        SCROLL_BOTTOM: Constants.NAME + ".scrollBottom",
        GOTO_FIRST_VISIBLE: Constants.NAME + ".gotoFirstVisible",
        GOTO_LAST_VISIBLE: Constants.NAME + ".gotoLastVisible",
        GOTO_FIRST_SIBLING: Constants.NAME + ".gotoFirstSibling",
        GOTO_LAST_SIBLING: Constants.NAME + ".gotoLastSibling",
        GOTO_NEXT_VISIBLE: Constants.NAME + ".gotoNextVisible",
        GOTO_PREV_VISIBLE: Constants.NAME + ".gotoPrevVisible",
        GOTO_NEXT_MARKED: Constants.NAME + ".gotoNextMarked",
        GOTO_NEXT_CLONE: Constants.NAME + ".gotoNextClone",
        GOTO_NEXT_CLONE_SELECTION: Constants.NAME + ".gotoNextCloneSelection",
        GOTO_NEXT_CLONE_SELECTION_FO: Constants.NAME + ".gotoNextCloneSelectionFromOutline",
        CONTRACT_OR_GO_LEFT: Constants.NAME + ".contractOrGoLeft",
        EXPAND_AND_GO_RIGHT: Constants.NAME + ".expandAndGoRight",
        // * Import Export Commands
        IMPORT_ANY_FILE: Constants.NAME + ".importAnyFile",
        READ_FILE_INTO_NODE: Constants.NAME + ".readFileIntoNode",
        EXPORT_HEADLINES: Constants.NAME + ".exportHeadlines",
        FLATTEN_OUTLINE: Constants.NAME + ".flattenOutline",
        OUTLINE_TO_CWEB: Constants.NAME + ".outlineToCweb",
        OUTLINE_TO_NOWEB: Constants.NAME + ".outlineToNoweb",
        REMOVE_SENTINELS: Constants.NAME + ".removeSentinels",
        WEAVE: Constants.NAME + ".weave",
        WRITE_FILE_FROM_NODE: Constants.NAME + ".writeFileFromNode",
        // * Leo Operations
        UNDO: Constants.NAME + ".undo", // From command Palette
        UNDO_FO: Constants.NAME + ".undoFromOutline", // from button, return focus on OUTLINE
        REDO: Constants.NAME + ".redo", // From command Palette
        REDO_FO: Constants.NAME + ".redoFromOutline", // from button, return focus on OUTLINE
        REVERT_TO_UNDO: Constants.NAME + ".revertToUndo",
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
        NEXT_NODE: Constants.NAME + ".next",
        NEXT_NODE_FO: Constants.NAME + ".nextFromOutline",
        // * Commands from tree panel buttons or context: focus on OUTLINE
        MARK: Constants.NAME + ".mark",
        UNMARK: Constants.NAME + ".unmark",
        COPY: Constants.NAME + ".copyNode",
        COPY_AS_JSON: Constants.NAME + ".copyNodeAsJson",
        COPY_GNX: Constants.NAME + ".copyGnx", // Not exposed in commands, only for minibuffer override
        CUT: Constants.NAME + ".cutNode",
        PASTE: Constants.NAME + ".pasteNode",
        PASTE_CLONE: Constants.NAME + ".pasteNodeAsClone",
        PASTE_AS_TEMPLATE: Constants.NAME + ".pasteAsTemplate",
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
        SET_UA: Constants.NAME + ".setUa",
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
        HOIST: Constants.NAME + ".hoistNode",
        HOIST_SELECTION: Constants.NAME + ".hoistSelection",
        HOIST_SELECTION_FO: Constants.NAME + ".hoistSelectionFromOutline",
        DEHOIST: Constants.NAME + ".deHoist",
        DEHOIST_FO: Constants.NAME + ".deHoistFromOutline",
        CHAPTER_NEXT: Constants.NAME + ".chapterNext",
        CHAPTER_BACK: Constants.NAME + ".chapterBack",
        CHAPTER_MAIN: Constants.NAME + ".chapterMain",
        CHAPTER_SELECT: Constants.NAME + ".chapterSelect",
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

        GOTO_NAV_PREV: Constants.NAME + ".gotoNavPrev",
        GOTO_NAV_NEXT: Constants.NAME + ".gotoNavNext",
        GOTO_NAV_FIRST: Constants.NAME + ".gotoNavFirst",
        GOTO_NAV_LAST: Constants.NAME + ".gotoNavLast",

        START_SEARCH: Constants.NAME + ".startSearch",
        SEARCH_BACKWARD: Constants.NAME + ".searchBackward",
        RE_SEARCH: Constants.NAME + ".reSearch",
        RE_SEARCH_BACKWARD: Constants.NAME + ".reSearchBackward",
        WORD_SEARCH: Constants.NAME + ".wordSearch",
        WORD_SEARCH_BACKWARD: Constants.NAME + ".wordSearchBackward",

        FIND_ALL: Constants.NAME + ".findAll",
        FIND_NEXT: Constants.NAME + ".findNext",
        FIND_NEXT_FO: Constants.NAME + ".findNextFromOutline",
        FIND_PREVIOUS: Constants.NAME + ".findPrevious",
        FIND_PREVIOUS_FO: Constants.NAME + ".findPreviousFromOutline",
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
        CLONE_FIND_PARENTS: Constants.NAME + ".cloneFindParents",

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
        SET_BODY_WRAP_SETTINGS: Constants.NAME + ".setBodyWrapSettings",
        SET_ENABLE_PREVIEW: Constants.NAME + ".setEnablePreview",
        CLEAR_CLOSE_EMPTY_GROUPS: Constants.NAME + ".clearCloseEmptyGroups",
    };

    public static addMinibufferCommands: { label: string, detail: string }[] = [
        { "label": "close-window", "detail": "Close the Leo window, prompting to save it if it has been changed." },

        { "label": "find-quick", "detail": "Opens the Nav tab." },
        { "label": "find-quick-selected", "detail": "Opens the Nav tab with the selected text as the search string." },

        { "label": "focus-to-body", "detail": "Put the keyboard focus in Leo's body pane." },
        { "label": "focus-to-find", "detail": "Put the keyboard focus in Leo's find input." },
        { "label": "focus-to-log", "detail": "Reveals Leo's log pane." },
        { "label": "focus-to-nav", "detail": "Put the keyboard focus in Leo's nav search input." },
        { "label": "focus-to-tree", "detail": "Put the keyboard focus in Leo's body pane." },

        { "label": "find-quick-timeline", "detail": "Lists all nodes in reversed gnx order, newest to oldest." },
        { "label": "find-quick-changed", "detail": "Lists all nodes that are changed (aka \"dirty\") since last save." },
        { "label": "history", "detail": "Lists nodes from c.nodeHistory." },
        { "label": "marked-list", "detail": "List all marked nodes." },

        { "label": "remove-tag", "detail": "Prompt for a tag to remove on selected node" },
        { "label": "remove-all-tags", "detail": "Remove all tags on selected node" },

        { "label": "export-headlines", "detail": "Export all headlines to an external file." },

        { "label": "flatten-outline", "detail": "Export the selected outline to an external file. The outline is represented in MORE format." },

        { "label": "outline-to-cweb", "detail": "Export the selected outline to an external file. The outline is represented in CWEB format." },
        { "label": "outline-to-noweb", "detail": "Export the selected outline to an external file. The outline is represented in noweb format." },
        { "label": "remove-sentinels", "detail": "Import one or more files, removing any sentinels." },
        { "label": "weave", "detail": "Simulate a literate-programming weave operation by writing the outline to a text file." },

        { "label": "read-file-into-node", "detail": "Read a file into a single node." },
        { "label": "write-file-from-node", "detail": "If node starts with @read-file-into-node, use the full path name in the headline. Otherwise, prompt for a file name." },

    ];

    public static unsupportedMinibufferCommands: string[] = [
        'read-outline-only', // Seems buggy in Leo. Not present until fixed or deprecated in Leo. (removed in Leo 6.7.5)
        'restart-leo', // added to bad list for leoserver 1.0.6. (Can be removed in next leointeg version)
        'write-edited-recent-files'
    ];

    /**
     * * Overridden 'good' minibuffer commands
     */
    public static MINIBUFFER_OVERRIDDEN_COMMANDS: { [key: string]: string } = {

        "close-window": Constants.COMMANDS.CLOSE_FILE,

        "find-quick": Constants.COMMANDS.FIND_QUICK,
        "find-quick-selected": Constants.COMMANDS.FIND_QUICK,

        "focus-to-body": Constants.COMMANDS.SHOW_BODY,
        "focus-to-find": Constants.COMMANDS.START_SEARCH,
        "focus-to-log": Constants.COMMANDS.SHOW_LOG,
        "focus-to-nav": Constants.COMMANDS.FIND_QUICK,
        "focus-to-tree": Constants.COMMANDS.SHOW_OUTLINE,

        "find-quick-timeline": Constants.COMMANDS.FIND_QUICK_TIMELINE,
        "find-quick-changed": Constants.COMMANDS.FIND_QUICK_CHANGED,
        "history": Constants.COMMANDS.FIND_QUICK_HISTORY,
        "marked-list": Constants.COMMANDS.FIND_QUICK_MARKED,

        "goto-global-line": Constants.COMMANDS.GOTO_GLOBAL_LINE,

        "goto-prev-history-node": Constants.COMMANDS.PREV_NODE_FO,
        "goto-next-history-node": Constants.COMMANDS.NEXT_NODE_FO,

        "chapter-select": Constants.COMMANDS.CHAPTER_SELECT,
        "copy-node": Constants.COMMANDS.COPY_SELECTION,
        "copy-node-as-json": Constants.COMMANDS.COPY_AS_JSON,
        "copy-gnx": Constants.COMMANDS.COPY_GNX,
        "cut-node": Constants.COMMANDS.CUT_SELECTION,
        "paste-node": Constants.COMMANDS.PASTE_SELECTION_FO,
        "paste-retaining-clones": Constants.COMMANDS.PASTE_CLONE_SELECTION_FO,
        "paste-as-template": Constants.COMMANDS.PASTE_AS_TEMPLATE,

        "tag-children": Constants.COMMANDS.TAG_CHILDREN,
        "tag-node": Constants.COMMANDS.TAG_NODE,
        "remove-tag": Constants.COMMANDS.REMOVE_TAG,
        "remove-all-tags": Constants.COMMANDS.REMOVE_TAGS,
        "clone-find-tag": Constants.COMMANDS.CLONE_FIND_TAG,
        "import-file": Constants.COMMANDS.IMPORT_ANY_FILE,
        "redo": Constants.COMMANDS.REDO,
        "undo": Constants.COMMANDS.UNDO,
        "clone-find-all": Constants.COMMANDS.CLONE_FIND_ALL,
        "clone-find-all-flattened": Constants.COMMANDS.CLONE_FIND_ALL_FLATTENED,

        'import-MORE-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-free-mind-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-legacy-external-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-mind-jet-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-tabbed-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-todo-text-files': Constants.COMMANDS.IMPORT_ANY_FILE,
        'import-zim-folder': Constants.COMMANDS.IMPORT_ANY_FILE,

        'export-headlines': Constants.COMMANDS.EXPORT_HEADLINES,
        'flatten-outline': Constants.COMMANDS.FLATTEN_OUTLINE,
        'outline-to-cweb': Constants.COMMANDS.OUTLINE_TO_CWEB,
        'outline-to-noweb': Constants.COMMANDS.OUTLINE_TO_NOWEB,
        'remove-sentinels': Constants.COMMANDS.REMOVE_SENTINELS,
        'weave': Constants.COMMANDS.WEAVE,

        'read-file-into-node': Constants.COMMANDS.READ_FILE_INTO_NODE,
        'write-file-from-node': Constants.COMMANDS.WRITE_FILE_FROM_NODE,

        'file-new': Constants.COMMANDS.NEW_FILE,
        'file-open-by-name': Constants.COMMANDS.OPEN_FILE,
        'revert': Constants.COMMANDS.REVERT_TO_SAVED,
        'new': Constants.COMMANDS.NEW_FILE,
        'open-outline': Constants.COMMANDS.OPEN_FILE,
        'file-save': Constants.COMMANDS.SAVE_FILE,
        'file-save-as': Constants.COMMANDS.SAVE_AS_FILE,
        'file-save-as-leojs': Constants.COMMANDS.SAVE_AS_LEOJS,
        'file-save-as-zipped': Constants.COMMANDS.SAVE_AS_FILE,
        'file-save-as-db': Constants.COMMANDS.SAVE_AS_FILE,
        'file-save-by-name': Constants.COMMANDS.SAVE_AS_FILE,
        'file-save-to': Constants.COMMANDS.SAVE_AS_FILE,
        'save': Constants.COMMANDS.SAVE_FILE,
        'save-as': Constants.COMMANDS.SAVE_AS_FILE,
        'save-file': Constants.COMMANDS.SAVE_FILE,
        'save-file-as': Constants.COMMANDS.SAVE_AS_FILE,
        'save-file-as-leojs': Constants.COMMANDS.SAVE_AS_LEOJS,
        'save-file-as-zipped': Constants.COMMANDS.SAVE_AS_FILE,
        'save-file-as-db': Constants.COMMANDS.SAVE_AS_FILE,
        'save-file-by-name': Constants.COMMANDS.SAVE_AS_FILE,
        'save-file-to': Constants.COMMANDS.SAVE_AS_FILE,
        'save-to': Constants.COMMANDS.SAVE_AS_FILE,

        'set-ua': Constants.COMMANDS.SET_UA,

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

        'search-forward': Constants.COMMANDS.START_SEARCH, // In Leo also, this is like ctrl+F.
        'search-backward': Constants.COMMANDS.SEARCH_BACKWARD,
        're-search': Constants.COMMANDS.RE_SEARCH,
        're-search-forward': Constants.COMMANDS.RE_SEARCH,
        're-search-backward': Constants.COMMANDS.RE_SEARCH_BACKWARD,
        'word-search': Constants.COMMANDS.WORD_SEARCH,
        'word-search-forward': Constants.COMMANDS.WORD_SEARCH,
        'word-search-backward': Constants.COMMANDS.WORD_SEARCH_BACKWARD,

        'find-var': Constants.COMMANDS.FIND_DEF, // find-var overriden with find-def just in case.
        'find-def': Constants.COMMANDS.FIND_DEF,
        'replace': Constants.COMMANDS.REPLACE,
        'replace-all': Constants.COMMANDS.REPLACE_ALL,
        'change-all': Constants.COMMANDS.REPLACE_ALL,
        'change-then-find': Constants.COMMANDS.REPLACE_THEN_FIND,
        'replace-then-find': Constants.COMMANDS.REPLACE_THEN_FIND,
        'show-find-options': Constants.COMMANDS.START_SEARCH,

        'set-find-everywhere': Constants.COMMANDS.SET_FIND_EVERYWHERE_OPTION,
        'set-find-node-only': Constants.COMMANDS.SET_FIND_NODE_ONLY_OPTION,
        'set-find-file-only': Constants.COMMANDS.SET_FIND_FILE_ONLY_OPTION,
        'set-find-suboutline-only': Constants.COMMANDS.SET_FIND_SUBOUTLINE_ONLY_OPTION,
        'toggle-find-ignore-case-option': Constants.COMMANDS.TOGGLE_FIND_IGNORE_CASE_OPTION,
        'toggle-find-in-body-option': Constants.COMMANDS.TOGGLE_FIND_SEARCH_BODY_OPTION,
        'toggle-find-in-headline-option': Constants.COMMANDS.TOGGLE_FIND_SEARCH_HEADLINE_OPTION,
        'toggle-find-mark-changes-option': Constants.COMMANDS.TOGGLE_FIND_MARK_CHANGES_OPTION,
        'toggle-find-mark-finds-option': Constants.COMMANDS.TOGGLE_FIND_MARK_FINDS_OPTION,
        'toggle-find-regex-option': Constants.COMMANDS.TOGGLE_FIND_REGEXP_OPTION,
        'toggle-find-word-option': Constants.COMMANDS.TOGGLE_FIND_WORD_OPTION,

    };

}
