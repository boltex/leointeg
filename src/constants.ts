export class Constants {
    public static LEO_FILE_TYPE_EXTENSION: string = "leo";
    public static LEO_URI_SCHEME: string = "leo";
    public static LEO_URI_SCHEME_HEADER: string = "leo:/";

    public static LEO_STATUSBAR_COLOR: string = "#fb7c47"; // TODO : Status bar color and text should be user settings

    public static LEO_DEFAULT_PYTHON: string = "python3";
    public static LEO_WIN32_PYTHON: string = "py";
    public static LEO_BRIDGE_SERVER_PATH: string = "/leobridgeserver.py";

    public static LEO_TCPIP_DEFAULT_PORT: number = 32125;
    public static LEO_TCPIP_DEFAULT_PROTOCOL: string = "ws://";
    public static LEO_TCPIP_DEFAULT_ADDRESS: string = "localhost";

    public static CONTEXT_FLAGS = {
        BRIDGE_READY: "leoBridgeReady",
        TREE_OPENED: "leoTreeOpened",
        SERVER_STARTED: "leoServerStarted",
        DISCONNECTED: "leoDisconnected",
        TREE_IN_EXPLORER: "treeInExplorer",
        SHOW_OPEN_ASIDE: "showOpenAside",
        SHOW_ARROWS: "showArrowsOnNodes",
        SHOW_ADD: "showAddOnNodes",
        SHOW_MARK: "showMarkOnNodes",
        SHOW_CLONE: "showCloneOnNodes",
        SHOW_COPY: "showCopyOnNodes",
        LEO_SELECTED: "leoObjectSelected",
        SELECTED_MARKED: "leoNodeMarked"
    };
}