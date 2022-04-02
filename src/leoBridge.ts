import * as vscode from "vscode";
import * as WebSocket from 'ws';
import { Constants } from "./constants";
import { LeoBridgePackage, LeoAction } from "./types";
import { LeoIntegration } from "./leoIntegration";
import { LeoAsync } from "./leoAsync";

/**
 * * Handles communication with the leobridgeserver.py python script via websockets
 * This implements a bridge-facing action stack, (push on top, remove bottom)
 * 'actions' get sent to Leo, and resolve a promise with the result when the answer comes back.
 * This 'stack' concept is similar to the 'CommandStack' class used for vscode's user interactions.
 */
export class LeoBridge {

    private _callStack: LeoAction[] = [];
    private _actionBusy: boolean = false; // Action was started from the bottom, but has yet to resolve

    private _leoBridgeSerialId: number = 0;
    private _readyPromise: Promise<LeoBridgePackage> | undefined;

    private _websocket: WebSocket | null = null;
    private _leoAsync: LeoAsync;

    private _updateWarningShown: number = 0; // timestamp in seconds

    private _receivedTotal: number = 0; // Websocket message received total

    // TODO : #10 @boltex See if this can help with anaconda/miniconda issues
    // private _hasbin = require('hasbin');

    constructor(
        private _context: vscode.ExtensionContext,
        private _leoIntegration: LeoIntegration
    ) {
        this._leoAsync = new LeoAsync(_context, _leoIntegration);
    }

    /**
     * * Places an action on top of a stack, to be resolved from the bottom
     * @param p_action Command string to be performed by Leo via leobridgeserver.py
     * @param p_jsonParam Optional JSON parameter for the specified action
     * @param p_deferredPayload Used to build this._readyPromise that resolves itself at startup
     * @param p_preventCall Flag for special action used to build this._readyPromise that resolves itself at startup
     * @returns a Promise that will contain the JSON package answered back by leobridgeserver.py
     */
    public action(p_action: string, p_jsonParam = "null", p_deferredPayload?: LeoBridgePackage, p_preventCall?: boolean): Promise<LeoBridgePackage> {
        return new Promise((p_resolve, p_reject) => {
            const w_action: LeoAction = {
                parameter: this._buildActionParameter(p_action, p_jsonParam),
                deferredPayload: p_deferredPayload ? p_deferredPayload : undefined,
                resolveFn: p_resolve,
                rejectFn: p_reject
            };

            this._callStack.push(w_action);
            if (!p_preventCall) {
                this._callAction();
            }
        });
    }

    /**
     * * Busy state of the leoBridge's command stack
     * @returns true if leoBridge's command stack still has unresolved actions
     */
    public isBusy(): boolean {
        return this._actionBusy || !!this._callStack.length;
    }

    /**
     * * Actions invoked by Leo that can be called asynchronously at any time
     * @param w_parsedData that contains an 'async' string member,
     * that was parsed from a _websocket.onmessage package
     */
    private _asyncAction(w_parsedData: any): void {
        if (w_parsedData && w_parsedData.async && (typeof w_parsedData.async === "string")) {
            switch (w_parsedData.async) {
                case Constants.ASYNC_ACTIONS.ASYNC_LOG: {
                    this._leoAsync.log(w_parsedData.log, w_parsedData.color);
                    break;
                }
                case Constants.ASYNC_ACTIONS.ASYNC_REFRESH: {
                    this._leoAsync.refresh(w_parsedData);
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

    /**
     * * Build JSON string for action parameter to the leoBridge
     * @param p_action Action string to be invoked as command by Leo in the leobridgeserver.py script
     * @param p_jsonParam Optional JSON string to be added as a 'param' to the action sent to Leo
     * @returns the JSON string built from the action string and the parameters
     */
    private _buildActionParameter(p_action: string, p_jsonParam?: string): string {
        return "{\"id\":" + (++this._leoBridgeSerialId) + // no quotes, serial id is a number, pre incremented
            ", \"action\": \"" + p_action +  // action is string so surround with quotes
            "\", \"param\":" + p_jsonParam +  // param is already json, no need for added quotes
            "}";
    }

    /**
     * * Resolves promises with the answers from an action that was finished
     * @param p_object Parsed data that was given as the answer by the Leo command that finished
     */
    private _resolveBridgeReady(p_object: any): void {
        let w_bottomAction = this._callStack.shift();
        if (w_bottomAction) {
            if (w_bottomAction.deferredPayload) {
                // Used when the action already has a return value ready but is also waiting for python's side
                // We check if it's really the initial first, then replace the id and pass the results.
                if (w_bottomAction.deferredPayload.id === Constants.STARTING_PACKAGE_ID) {
                    p_object.id = Constants.STARTING_PACKAGE_ID;
                }
                w_bottomAction.resolveFn(p_object); // given back with id=1 !
            } else {
                w_bottomAction.resolveFn(p_object);
            }
            this._actionBusy = false;
        } else {
            console.error("[leoBridge] Error stack empty");
        }
    }

    /**
     * * Rejects an action from the bottom of the stack
     * @param p_reason Given rejection 'reason'
     */
    private _rejectAction(p_reason: string): void {
        const w_bottomAction = this._callStack.shift();
        if (w_bottomAction) {
            w_bottomAction.rejectFn(p_reason);
        }
    }

    /**
     * * Sends an action from the bottom of the stack
     */
    private _callAction(): void {
        if (this._callStack.length && !this._actionBusy) {
            this._actionBusy = true; // launch / resolve bottom one
            const w_action = this._callStack[0];
            this._send(w_action.parameter + "\n");
        }
    }

    /**
     * * JSON.parse encased in a Try/Catch block
     * @param p_jsonStr The JSON string to be parsed
     * @returns The resulting object or 'false' if unsuccessful
     */
    private _tryParseJSON(p_jsonStr: string): boolean | any {
        try {
            var w_object = JSON.parse(p_jsonStr);
            // JSON.parse(null) returns null, and typeof null === "object", null is falsy, so this suffices:
            if (w_object && typeof w_object === "object") {
                return w_object;
            }
        }
        catch (e) {
            console.error('[leoBridge] JSON was invalid: ' + p_jsonStr);
        }
        return false;
    }

    /**
     * * Process data that came from the Leo process
     * @param p_data given JSON data
     */
    private _processAnswer(p_data: string): void {
        const w_parsedData = this._tryParseJSON(p_data);
        // Check for ServerError

        if (w_parsedData && w_parsedData['ServerError']) {
            const w_serverError: string = w_parsedData['ServerError'];
            // action not found
            let w_position = w_serverError.indexOf("action not found");
            if (w_position >= 0) {
                let w_action = w_serverError.substring(w_position + 16);
                // Show update suggestion if not already shown
                let w_timeStampSec = Math.floor(Date.now() / 1000);
                if (this._updateWarningShown + 5 < w_timeStampSec) {
                    this._updateWarningShown = w_timeStampSec;
                    vscode.window.showErrorMessage(Constants.USER_MESSAGES.MINIMUM_VERSION + w_action);
                }
            }
        }

        if (w_parsedData && (w_parsedData.id === 0 || w_parsedData.id)) {
            this._resolveBridgeReady(w_parsedData);
            this._callAction();
        } else if (w_parsedData && w_parsedData.async) {
            // * Check for async messages such as log pane entries or other
            this._asyncAction(w_parsedData);
        } else {
            // unprocessed/unknown python output
            console.error("[leoBridge] Unprocessed or unknown JSON received: ", p_data);
        }
    }

    /**
     * * Create a websocket connection to a Leo server
     * @param p_port optional port number to override config port
     * @returns A promise for a LeoBridgePackage object containing only an 'id' member of 1 that will resolve when the 'leoBridge' is established
     */
    public initLeoProcess(p_port?: number): Promise<LeoBridgePackage> {
        this._websocket = new WebSocket(
            Constants.TCPIP_DEFAULT_PROTOCOL +
            this._leoIntegration.config.connectionAddress +
            ":" +
            (p_port ? p_port : this._leoIntegration.config.connectionPort)
        );
        // * Capture the python process output
        this._websocket.onmessage = (p_event) => {
            this._receivedTotal++;
            if (p_event.data) {
                this._processAnswer(p_event.data.toString());
            }
        };
        this._websocket.onerror = (p_event: WebSocket.ErrorEvent) => {
            console.error(`Websocket error: ${p_event.message}`);
        };
        this._websocket.onclose = (p_event: WebSocket.CloseEvent) => {
            // * Disconnected from server
            // console.log(`Websocket closed, code: ${p_event.code}`);
            if (!this._leoIntegration.activated) {
                return;
            }
            this._rejectAction(`Websocket closed, code: ${p_event.code}`);
            // TODO : Implement a better connection error handling
            if (this._leoIntegration.leoStates.leoBridgeReady) {
                this._leoIntegration.cancelConnect(`Websocket closed, code: ${p_event.code}`);
            }
        };
        // * Start first with 'preventCall' set to true: no need to call anything for the first 'ready'
        this._readyPromise = this.action("", "", { id: Constants.STARTING_PACKAGE_ID }, true);
        return this._readyPromise; // This promise will resolve when the started python process starts
    }

    /**
     * * Closes the websocket connection
     */
    public closeLeoProcess(): void {
        if (this._websocket) {
            this._websocket.close(1001, "Quitting LeoInteg");
            // console.log('websocket closed');
        } else {
            // console.warn('LeoInteg websocket close called without websocket active');
        }
    }

    /**
     * * Send into the python process input
     * @param p_data JSON Message string to be sent to leobridgeserver.py
     */
    private _send(p_data: string): void {
        if (this._readyPromise) {
            this._readyPromise.then(() => { // using '.then' that was surely resolved already: to be buffered in case process isn't ready.
                if (this._websocket && this._websocket.OPEN) {
                    this._websocket.send(p_data); // p_message should be json
                }
            });
        }
    }

}
