import * as vscode from "vscode";
import * as WebSocket from 'ws';
import { Constants } from "./constants";
import { LeoBridgePackage, LeoAction } from "./types";

export class LeoBridge {
    // * Communications with Python
    public actionBusy: boolean = false;
    private leoBridgeSerialId: number = 0;
    private callStack: LeoAction[] = [];
    private readyPromise: Promise<LeoBridgePackage> | undefined;
    private hasbin = require('hasbin');
    private websocket: WebSocket | null = null;

    constructor(private context: vscode.ExtensionContext) { }

    public action(p_action: string, p_jsonParam: string, p_deferedPayload?: LeoBridgePackage, p_preventCall?: boolean): Promise<LeoBridgePackage> {
        // * Places an action to be made by leoBridge.py on top of a stack, to be resolved from the bottom
        return new Promise((resolve, reject) => {
            const w_action: LeoAction = {
                parameter: "{\"id\":" + (++this.leoBridgeSerialId) + ", \"action\": \"" + p_action + "\", \"param\":" + p_jsonParam + "}",
                deferedPayload: p_deferedPayload ? p_deferedPayload : undefined,
                resolveFn: resolve,
                rejectFn: reject
            };

            this.callStack.push(w_action);
            if (!p_preventCall) {
                this.callAction();
            }
        });
    }

    private resolveBridgeReady(p_object: string) {
        // * Resolves promises with the answers from an action that was done by leoBridge.py
        let w_bottomAction = this.callStack.shift();

        if (w_bottomAction) {
            if (w_bottomAction.deferedPayload) { // Used when the action already has a return value ready but is also waiting for python's side
                w_bottomAction.resolveFn(w_bottomAction.deferedPayload); // given back 'as is'
            } else {
                w_bottomAction.resolveFn(p_object);
            }
            this.actionBusy = false;
        } else {
            console.log("Error stack empty");
        }
    }

    private callAction(): void {
        // * Sends an action from the bottom of the stack to leoBridge.py's process stdin
        if (this.callStack.length && !this.actionBusy) {
            this.actionBusy = true; // launch / resolve bottom one
            const w_action = this.callStack[0];
            this.stdin(w_action.parameter + "\n");
        }
    }

    private tryParseJSON(p_jsonStr: string) {
        try {
            var w_object = JSON.parse(p_jsonStr);
            // JSON.parse(null) returns null, and typeof null === "object", null is falsey, so this suffices:
            if (w_object && typeof w_object === "object") {
                return w_object;
            }
        }
        catch (e) {
            console.log('json was invalid: ' + p_jsonStr);
        }
        return false;
    }

    private processAnswer(p_data: string): void {
        // * Process data that came out of leoBridge.py's process stdout

        const w_parsedData = this.tryParseJSON(p_data);

        if (w_parsedData) {
            this.resolveBridgeReady(w_parsedData);
            this.callAction();
        } else { // unprocessed/unknown python output
            console.log("from python", p_data);
        }
    }

    private findBestPythonString(): string {
        // * Used if starting server ourself...

        let w_paths = ["python3", "py", "python"];
        let w_foundPath = "";
        w_paths.forEach(p_path => {
            if (this.hasbin.sync(p_path) && !w_foundPath) {
                w_foundPath = p_path;
            }
        });
        return w_foundPath;
    }

    public initLeoProcess(): Promise<LeoBridgePackage> {
        const w_socketProtocol = vscode.workspace.getConfiguration('leoIntegration').get('connectionProtocol', Constants.LEO_TCPIP_DEFAULT_PROTOCOL); // 'ws://'
        const w_socketAdress = vscode.workspace.getConfiguration('leoIntegration').get('connectionAdress', Constants.LEO_TCPIP_DEFAULT_ADRESS); // 'ws://'
        const w_socketPort = vscode.workspace.getConfiguration('leoIntegration').get('connectionPort', Constants.LEO_TCPIP_DEFAULT_PORT); // 32125

        // * Spawn a websocket
        this.websocket = new WebSocket(w_socketProtocol + w_socketAdress + ":" + w_socketPort);
        // * Capture the python process output
        this.websocket.onmessage = (p_event) => {
            if (p_event.data) {
                this.processAnswer(p_event.data.toString());
            }
        };
        // * Capture other python process outputs
        this.websocket.onerror = (p_event) => {
            console.log(`websocket error: ${p_event.message}`);
        };
        this.websocket.onclose = (p_event) => {
            console.log(`websocket closed, code: ${p_event.code}`);
        };
        // * Start first with 'preventCall' set to true: no need to call anything for the first 'ready'
        this.readyPromise = this.action("", "", { id: 1 }, true);
        return this.readyPromise; // This promise will resolve when the started python process starts
    }

    private stdin(p_message: string): any {
        // * Send into the python process input
        if (this.readyPromise) {
            this.readyPromise.then(() => {  //  using '.then' to be buffered in case process isn't ready.
                if (this.websocket && this.websocket.OPEN) {
                    this.websocket.send(p_message); // p_message should be json
                }
            });
        }
    }

    public killLeoBridge(): void {
        console.log("sending kill command");
        this.stdin("exit\n"); // 'exit' should kill the python script
    }
}