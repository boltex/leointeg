// * Standalone config interface file (all other structures defined in types.d.ts)

export interface Config {
    treeKeepFocus: boolean;
    treeKeepFocusWhenAside: boolean;
    treeInExplorer: boolean;
    showOpenAside: boolean;
    showArrowsOnNodes: boolean;
    showAddOnNodes: boolean;
    showMarkOnNodes: boolean;
    showCloneOnNodes: boolean;
    showCopyOnNodes: boolean;
    invertNodeContrast: boolean;
    bodyEditDelay: number;
    leoPythonCommand: string;
    startServerAutomatically: boolean;
    connectToServerAutomatically: boolean;
    connectionAddress: string;
    connectionPort: number;
}