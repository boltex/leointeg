import { initializeAndWatchThemeColors } from './theme';

interface VsCodeApi {
    postMessage(msg: {}): void;
    setState(state: {}): void;
    getState(): { [key: string]: any };
}

declare function acquireVsCodeApi(): VsCodeApi;

function testWebview() {
    console.log("dude in index.js");
    console.log((window as any).leoConfig);
}
testWebview();

// This script will be run within the webview itself
(function () {
    console.log("init tests");
    const vscode = acquireVsCodeApi();
    initializeAndWatchThemeColors();

    const oldState = vscode.getState();
    console.log("oldState: ", oldState);

    //  ********  ********  ********  ********  ********  ********  ********
    //  * TEST *  ********  ********  ********  ********  ********  ********
    //  ********  ********  ********  ********  ********  ********  ********
    const counter = document.getElementById("lines-of-code-counter");
    let currentCount: number = (oldState && oldState.count) || 0;
    if (counter) {

        counter.textContent = currentCount.toString();

        setInterval(() => {
            counter.textContent = (currentCount++).toString();

            // Update state
            vscode.setState({ count: currentCount });

            // Alert the extension when the cat introduces a bug
            if (Math.random() < Math.min(0.001 * currentCount, 0.05)) {
                // Send a message back to the extension
                vscode.postMessage({
                    command: "alert",
                    text: "🐛  on line " + currentCount
                });
            }
        }, 300);
    }

    //  *********  ********  ********  ********  ********  ********  ********
    //  * SETUP *  ********  ********  ********  ********  ********  ********
    //  *********  ********  ********  ********  ********  ********  ********
    // Handle messages sent from the extension to the webview
    window.addEventListener("message", event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case "test":
                console.log("got test message");
                break;

            case "config":
                console.log('got new config, set controls!', message.config);
                break;

            default:
                console.log("got message: ", message.command);
        }
    });

    //  ************  ********  ********  ********  ********  ********  ********
    //  * ONCHANGE *  ********  ********  ********  ********  ********  ********
    //  ************  ********  ********  ********  ********  ********  ********
    function listenAll(selector: string, name: string, listener: EventListener) {
        const els = (document.querySelectorAll(selector) as unknown) as Element[];
        for (const el of els) {
            el.addEventListener(name, listener, false);
        }
    }

    function onBind() {
        listenAll('input[type=checkbox][data-setting]', 'change', function (this: HTMLInputElement) {
            return onInputChecked(this);
        });
        listenAll('input[type=text][data-setting], input:not([type])[data-setting]', 'blur', function (
            this: HTMLInputElement
        ) {
            return onInputBlurred(this);
        });
        listenAll('input[type=text][data-setting], input:not([type])[data-setting]', 'focus', function (
            this: HTMLInputElement
        ) {
            return onInputFocused(this);
        });
        listenAll('input[type=text][data-setting], input:not([type])[data-setting]', 'input', function (
            this: HTMLInputElement
        ) {
            return onInputChanged(this);
        });
    }

    function onInputChecked(element: HTMLInputElement) {
        console.log('onInputChecked', element);
    }
    function onInputBlurred(element: HTMLInputElement) {
        console.log('onInputBlurred', element);
    }
    function onInputFocused(element: HTMLInputElement) {
        console.log('onInputFocused', element);
    }
    function onInputChanged(element: HTMLInputElement) {
        console.log('onInputChanged', element);
    }

    console.log('Starting onBind !');

    onBind();



})();
