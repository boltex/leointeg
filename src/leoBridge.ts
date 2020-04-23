import * as vscode from "vscode";
import * as WebSocket from 'ws';
import { Constants } from "./constants";
import { LeoBridgePackage, LeoAction } from "./types";
import { LeoIntegration } from "./leoIntegration";
import { LeoAsync } from "./leoAsync";

export class LeoBridge {
    // * Handles communication with the leobridgeserver.py python script via websockets

    public actionBusy: boolean = false;

    private _leoBridgeSerialId: number = 0;
    private _callStack: LeoAction[] = [];
    private _readyPromise: Promise<LeoBridgePackage> | undefined;

    // private _hasbin = require('hasbin'); // TODO : See if this can help with anaconda/miniconda issues
    private _websocket: WebSocket | null = null;
    private _leoAsync: LeoAsync;

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {
        this._leoAsync = new LeoAsync(_context, _leoIntegration, this);
    }

    public action(p_action: string, p_jsonParam = "null", p_deferredPayload?: LeoBridgePackage, p_preventCall?: boolean): Promise<LeoBridgePackage> {
        // * Places an action to be made by leoBridge.py on top of a stack, to be resolved from the bottom
        return new Promise((resolve, reject) => {
            const w_action: LeoAction = {
                parameter: this._buildActionParameter(p_action, p_jsonParam),
                deferredPayload: p_deferredPayload ? p_deferredPayload : undefined,
                resolveFn: resolve,
                rejectFn: reject
            };

            this._callStack.push(w_action);
            if (!p_preventCall) {
                this._callAction();
            }
        });
    }

    private _asyncAction(w_parsedData: any): void {
        // * actions invoked by Leo that can be called asynchronously at any time
        if (w_parsedData && w_parsedData.async && (typeof w_parsedData.async === "string")) {
            switch (w_parsedData.async) {
                case Constants.ASYNC_ACTIONS.ASYNC_LOG: {
                    this._leoAsync.log(w_parsedData.log);
                    break;
                }
                case Constants.ASYNC_ACTIONS.ASYNC_ASK: {
                    this._leoAsync.showAskModalDialog(w_parsedData);
                    break;
                }
                case Constants.ASYNC_ACTIONS.ASYNC_WARN: {
                    this._leoAsync.showWarnModalMessage(w_parsedData);
                    break;
                }
                case Constants.ASYNC_ACTIONS.ASYNC_INFO: {
                    this._leoAsync.showChangesDetectedInfoMessage(w_parsedData);
                    break;
                }
                case Constants.ASYNC_ACTIONS.ASYNC_INTERVAL: {
                    console.log("interval ", w_parsedData); // 'ping' interval for debugging
                    break;
                }
                default: {
                    console.error("[leoIntegration] Unknown async action ", w_parsedData);
                    break;
                }
            }
        } else {
            console.error("[leoIntegration] Unknown async command from leoBridge");
        }
    }

    private _buildActionParameter(p_action: string, p_jsonParam?: string): string {
        // * Build JSON string for action parameter to the leoBridge
        return "{\"id\":" + (++this._leoBridgeSerialId) + // no quotes, serial id is a number
            ", \"action\": \"" + p_action +  // action is string so surround with quotes
            "\", \"param\":" + p_jsonParam +  // param is already json, no need for added quotes
            "}";
    }

    private _resolveBridgeReady(p_object: string) {
        // * Resolves promises with the answers from an action that was done by leoBridge.py
        let w_bottomAction = this._callStack.shift();
        if (w_bottomAction) {
            if (w_bottomAction.deferredPayload) { // Used when the action already has a return value ready but is also waiting for python's side
                w_bottomAction.resolveFn(w_bottomAction.deferredPayload); // given back 'as is'
            } else {
                w_bottomAction.resolveFn(p_object);
            }
            this.actionBusy = false;
        } else {
            console.error("[leoBridge] Error stack empty");
        }
    }

    private _rejectActions(p_reason: string): void {
        // * Rejects all actions from the the stack
        while (this._callStack.length) {
            this._rejectAction(p_reason);
        }
    }
    private _rejectAction(p_reason: string): void {
        // * Rejects an action from the bottom of the stack
        const w_bottomAction = this._callStack.shift();
        if (w_bottomAction) {
            w_bottomAction.rejectFn(p_reason);
        }
    }

    private _callAction(): void {
        // * Sends an action from the bottom of the stack to leoBridge.py process stdin
        if (this._callStack.length && !this.actionBusy) {
            this.actionBusy = true; // launch / resolve bottom one
            const w_action = this._callStack[0];
            this._send(w_action.parameter + "\n");
        }
    }

    private _tryParseJSON(p_jsonStr: string): boolean | any {
        // * JSON.parse encased in a Try/Catch block
        try {
            var w_object = JSON.parse(p_jsonStr);
            // JSON.parse(null) returns null, and typeof null === "object", null is falsy, so this suffices:
            if (w_object && typeof w_object === "object") {
                return w_object;
            }
        }
        catch (e) {
            console.error('[leoBridge] json was invalid: ' + p_jsonStr);
        }
        return false;
    }

    private _processAnswer(p_data: string): void {
        // * Process data that came out of leoBridge.py process stdout
        const w_parsedData = this._tryParseJSON(p_data);
        if (w_parsedData && w_parsedData.id) {
            this._resolveBridgeReady(w_parsedData);
            this._callAction();
        } else if (w_parsedData && w_parsedData.async) {
            // * Check for async messages such as log pane entries or other
            this._asyncAction(w_parsedData);
            // this._leoIntegration.async(w_parsedData);
        } else {
            // unprocessed/unknown python output
            console.error("[leoBridge] unprocessed/unknown json received: ", p_data);
        }
    }

    public initLeoProcess(): Promise<LeoBridgePackage> {
        // * Spawn a websocket
        this._websocket = new WebSocket(Constants.TCPIP_DEFAULT_PROTOCOL +
            this._leoIntegration.config.connectionAddress +
            ":" + this._leoIntegration.config.connectionPort);
        // * Capture the python process output
        this._websocket.onmessage = (p_event) => {
            if (p_event.data) {
                this._processAnswer(p_event.data.toString());
            }
        };
        this._websocket.onerror = (p_event: WebSocket.ErrorEvent) => {
            console.log(`websocket error: ${p_event.message}`);
        };
        this._websocket.onclose = (p_event: WebSocket.CloseEvent) => {
            // * Disconnected from server
            console.log(`websocket closed, code: ${p_event.code}`);
            this._rejectAction(`websocket closed, code: ${p_event.code}`);
            // TODO : Implement a better connection error handling
            if (this._leoIntegration.leoBridgeReady) {
                this._leoIntegration.cancelConnect(`websocket closed, code: ${p_event.code}`);
            }
        };

        // * Start first with 'preventCall' set to true: no need to call anything for the first 'ready'
        this._readyPromise = this.action("", "", { id: 1 }, true);
        return this._readyPromise; // This promise will resolve when the started python process starts
    }

    private _send(p_message: string): any {
        // * Send into the python process input
        if (this._readyPromise) {
            this._readyPromise.then(() => { // using '.then' that was surely resolved already: to be buffered in case process isn't ready.
                if (this._websocket && this._websocket.OPEN) {
                    this._websocket.send(p_message); // p_message should be json
                }
            });
        }
    }
}