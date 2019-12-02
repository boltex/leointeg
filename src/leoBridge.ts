import * as vscode from "vscode";
import * as WebSocket from 'ws';
import { Constants } from "./constants";
import { LeoBridgePackage, LeoAction } from "./types";
import { LeoIntegration } from "./leoIntegration";

export class LeoBridge {
    // * Communications with Python
    public actionBusy: boolean = false;
    private leoBridgeSerialId: number = 0;
    private callStack: LeoAction[] = [];
    private readyPromise: Promise<LeoBridgePackage> | undefined;
    private hasbin = require('hasbin');
    private websocket: WebSocket | null = null;

    constructor(private context: vscode.ExtensionContext, private leoIntegration: LeoIntegration) { }

    public action(p_action: string, p_jsonParam: string, p_deferredPayload?: LeoBridgePackage, p_preventCall?: boolean): Promise<LeoBridgePackage> {
        // * Places an action to be made by leoBridge.py on top of a stack, to be resolved from the bottom
        return new Promise((resolve, reject) => {
            const w_action: LeoAction = {
                parameter: "{\"id\":" + (++this.leoBridgeSerialId) + ", \"action\": \"" + p_action + "\", \"param\":" + p_jsonParam + "}",
                deferredPayload: p_deferredPayload ? p_deferredPayload : undefined,
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
            if (w_bottomAction.deferredPayload) { // Used when the action already has a return value ready but is also waiting for python's side
                w_bottomAction.resolveFn(w_bottomAction.deferredPayload); // given back 'as is'
            } else {
                w_bottomAction.resolveFn(p_object);
            }
            this.actionBusy = false;
        } else {
            console.log("Error stack empty");
        }
    }

    private rejectActions(p_reason: string): void {
        // * Rejects all actions from the the stack
        while (this.callStack.length) {
            this.rejectAction(p_reason);
        }
    }
    private rejectAction(p_reason: string): void {
        // * Rejects an action from the bottom of the stack
        const w_bottomAction = this.callStack.shift();
        if (w_bottomAction) {
            w_bottomAction.rejectFn(p_reason);
        }
    }

    private callAction(): void {
        // * Sends an action from the bottom of the stack to leoBridge.py's process stdin
        if (this.callStack.length && !this.actionBusy) {
            this.actionBusy = true; // launch / resolve bottom one
            const w_action = this.callStack[0];
            this.send(w_action.parameter + "\n");
        }
    }

    private tryParseJSON(p_jsonStr: string) {
        try {
            var w_object = JSON.parse(p_jsonStr);
            // JSON.parse(null) returns null, and typeof null === "object", null is falsy, so this suffices:
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
        // * Process data that came out of leoBridge.py process stdout
        const w_parsedData = this.tryParseJSON(p_data);
        if (w_parsedData) {
            this.resolveBridgeReady(w_parsedData);
            this.callAction();
        } else { // unprocessed/unknown python output
            console.log("from python", p_data);
        }
    }

    public initLeoProcess(): Promise<LeoBridgePackage> {
        // * Spawn a websocket
        this.websocket = new WebSocket(Constants.LEO_TCPIP_DEFAULT_PROTOCOL +
            this.leoIntegration.config.connectionAddress +
            ":" + this.leoIntegration.config.connectionPort);
        // * Capture the python process output
        this.websocket.onmessage = (p_event) => {
            if (p_event.data) {
                this.processAnswer(p_event.data.toString());
            }
        };
        this.websocket.onerror = (p_event: WebSocket.ErrorEvent) => {
            console.log(`websocket error: ${p_event.message}`);
        };
        this.websocket.onclose = (p_event: WebSocket.CloseEvent) => {
            // * Disconnected from server
            console.log(`websocket closed, code: ${p_event.code}`);
            this.rejectAction(`websocket closed, code: ${p_event.code}`);
            // TODO : Implement a better connection error handling
            if (this.leoIntegration.leoBridgeReady) {
                this.leoIntegration.cancelConnect(`websocket closed, code: ${p_event.code}`);
            }
        };

        // * Start first with 'preventCall' set to true: no need to call anything for the first 'ready'
        this.readyPromise = this.action("", "", { id: 1 }, true);
        return this.readyPromise; // This promise will resolve when the started python process starts
    }

    private send(p_message: string): any {
        // * Send into the python process input
        if (this.readyPromise) {
            this.readyPromise.then(() => {  //  using '.then' to be buffered in case process isn't ready.
                if (this.websocket && this.websocket.OPEN) {
                    this.websocket.send(p_message); // p_message should be json
                }
            });
        }
    }

}