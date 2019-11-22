import { initializeAndWatchThemeColors } from './theme';
import { debounce } from "debounce";

interface VsCodeApi {
    postMessage(msg: {}): void;
    setState(state: {}): void;
    getState(): { [key: string]: any };
}

declare function acquireVsCodeApi(): VsCodeApi;


// This script will be run within the webview itself
(function () {
    console.log("init tests");
    const vscode = acquireVsCodeApi();
    initializeAndWatchThemeColors();

    const oldState = vscode.getState();
    console.log("oldState: ", oldState);

    const toast = document.getElementById("saved-config-toast");

    //  * TEST *  ********  ********  ********  ********  ********  ********
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

    //  * SETUP *  ********  ********  ********  ********  ********  ********
    // Global variable config
    let frontConfig: { [key: string]: any } = {};
    let vscodeConfig: { [key: string]: any } = {};

    vscodeConfig = (window as any).leoConfig; // ! PRE SET BY leoSettingsWebview
    frontConfig = JSON.parse(JSON.stringify(vscodeConfig));

    // Handle messages sent from the extension to the webview
    window.addEventListener("message", event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case "test":
                console.log("got test message");
                break;

            case "config":
                console.log('got new config, set controls!', message.config);
                frontConfig = message.config;
                setControls();
                break;

            default:
                console.log("got message: ", message.command);
        }
    });

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
        frontConfig[element.id] = element.checked;
        setVisibility(frontConfig);
        applyChanges();
    }
    function onInputBlurred(element: HTMLInputElement) {
        // console.log('onInputBlurred', element);
    }
    function onInputFocused(element: HTMLInputElement) {
        // console.log('onInputFocused', element);
    }
    function onInputChanged(element: HTMLInputElement) {
        // console.log('onInputChanged', element);
        applyChanges();
    }

    function setControls(): void {
        for (const key in frontConfig) {
            if (frontConfig.hasOwnProperty(key)) {
                const w_element = document.getElementById(key);
                if (w_element && w_element.getAttribute('type') === 'checkbox') {
                    (w_element as HTMLInputElement).checked = frontConfig[key];
                } else if (w_element) {
                    (w_element as HTMLInputElement).value = frontConfig[key];
                } else {
                    console.log('WHAT ? w_element', key, ' is ', w_element);
                }
            }
        }
    }

    function setVisibility(state: { [key: string]: string | boolean }) {
        for (const el of document.querySelectorAll<HTMLElement>('[data-visibility]')) {
            el.classList.toggle('hidden', !evaluateStateExpression(el.dataset.visibility!, state));
        }
    }
    function parseStateExpression(expression: string): [string, string, string | boolean | undefined] {
        const [lhs, op, rhs] = expression.trim().split(/([=+!])/);
        return [lhs.trim(), op !== undefined ? op.trim() : '=', rhs !== undefined ? rhs.trim() : rhs];
    }

    function evaluateStateExpression(expression: string, changes: { [key: string]: string | boolean }): boolean {
        let state = false;
        console.log('evaluating ', expression);

        for (const expr of expression.trim().split('&')) {
            const [lhs, op, rhs] = parseStateExpression(expr);

            switch (op) {
                case '=': {
                    // Equals
                    let value = changes[lhs];
                    if (value === undefined) {
                        value = getSettingValue(lhs) || false;
                    }
                    state = rhs !== undefined ? rhs === String(value) : Boolean(value);
                    break;
                }
                case '!': {
                    // Not equals
                    let value = changes[lhs];
                    if (value === undefined) {
                        value = getSettingValue(lhs) || false;
                    }
                    state = rhs !== undefined ? rhs !== String(value) : !value;
                    break;
                }
                case '+': {
                    // Contains
                    if (rhs !== undefined) {
                        const setting = getSettingValue(lhs);
                        state = setting !== undefined ? setting.includes(rhs.toString()) : false;
                    }
                    break;
                }
            }

            if (!state) { break; }
        }
        return state;
    }

    function getSettingValue(p_setting: string): any {
        return frontConfig[p_setting];
    }

    var applyChanges = debounce(function () {
        console.log('Sending config changes to be debounced, and then applied ');
        if (frontConfig) {

            for (var prop in frontConfig) {
                if (Object.prototype.hasOwnProperty.call(frontConfig, prop)) {
                    console.log(prop);

                }
            }

        }
        toast!.className = "show";
        setTimeout(function () { toast!.className = toast!.className.replace("show", ""); }, 1500);
    }, 1500);

    //  * START *  ********  ********  ********  ********  ********  ********
    console.log('Starting index.ts');
    setControls();
    setVisibility(frontConfig);
    onBind();

})();
