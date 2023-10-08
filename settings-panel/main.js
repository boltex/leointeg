// @ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
// Send message to LeoInteg with vscode.postMessage({ keyNameEx1: someValue, ... });
// Receive messages from LeoInteg with window.addEventListener('message', event => { ... });
(function () {
    const cssColorRegex = /^(?:(#?)([0-9a-f]{3}|[0-9a-f]{6})|((?:rgb|hsl)a?)\((-?\d+%?)[,\s]+(-?\d+%?)[,\s]+(-?\d+%?)[,\s]*(-?[\d.]+%?)?\))$/i;

    // @ts-expect-error
    const vscode = acquireVsCodeApi();

    initializeAndWatchThemeColors();

    const toast = document.getElementById("saved-config-toast");
    const dirty = document.getElementById("dirty-config-toast");
    const resultingCommandEl = document.getElementById("resultingCommand");
    const leoPythonCommandEl = document.getElementById("leoPythonCommand");
    const leoEditorPathEl = document.getElementById("leoEditorPath");
    const connectionPortEl = document.getElementById("connectionPort");
    const limitUsersEl = document.getElementById("limitUsers");

    const oldState = vscode.getState();
    let currentCount = (oldState && oldState.count) || 0;
    if (currentCount) {
        vscode.postMessage({
            command: "getNewConfig"
        });
    }
    currentCount = currentCount + 1;
    vscode.setState({ count: currentCount });

    // Global variable config
    let frontConfig = {};
    let vscodeConfig = {};
    let vscodeFontConfig = {};
    let frontFontConfig = {};

    // @ts-expect-error
    vscodeConfig = window.leoConfig; // PRE SET BY leoSettingsWebview
    frontConfig = JSON.parse(JSON.stringify(vscodeConfig));
    // @ts-expect-error
    vscodeFontConfig = window.fontConfig; // PRE SET BY leoSettingsWebview
    frontFontConfig = JSON.parse(JSON.stringify(vscodeFontConfig));

    // @ts-expect-error
    let vscodePlatform = window.platform; // PRE SET BY leoSettingsWebview
    let _platform = JSON.parse(JSON.stringify(vscodePlatform));
    console.log("_platform", _platform);
    let _isWin32 = _platform === "win32";

    // Handle messages sent from the extension to the webview
    window.addEventListener("message", event => {
        const message = event.data; // The json data that the extension sent
        if (message.command && dirty && toast) {
            switch (message.command) {
                case "test":
                    break;
                case "newConfig":
                    vscodeConfig = message.config;
                    frontConfig = JSON.parse(JSON.stringify(message.config));
                    setControls();
                    applyResultingCommand();
                    break;
                case "vscodeConfig":
                    dirty.className = dirty.className.replace("show", "");
                    toast.className = "show";
                    setTimeout(function () {
                        toast.className = toast.className.replace("show", "");
                    }, 1500);
                    vscodeConfig = message.config; // next changes will be confronted to those settings
                    break;
                case "newFontConfig":
                    vscodeFontConfig = message.config;
                    frontFontConfig = JSON.parse(JSON.stringify(message.config));
                    setFontControls();
                    break;
                case "vscodeFontConfig":
                    vscodeFontConfig = message.config; // next changes will be confronted to those settings
                    break;
                case "newEditorPath":
                    const w_element = document.getElementById("leoEditorPath");
                    if (w_element) {
                        // @ts-expect-error
                        w_element.value = message.editorPath;
                        onInputChanged(w_element);
                    }
                    break;
                default:
                    break;
            }
        } else {
            console.log('got object without command:', message);
        }
    });

    function adjustLight(color, amount) {
        const cc = color + amount;
        const c = amount < 0 ? (cc < 0 ? 0 : cc) : cc > 255 ? 255 : cc;

        return Math.round(c);
    }

    function darken(color, percentage) {
        return lighten(color, -percentage);
    }

    function lighten(color, percentage) {
        const rgba = toRgba(color);
        if (rgba == null) { return color; }

        const [r, g, b, a] = rgba;
        const amount = (255 * percentage) / 100;
        return `rgba(${adjustLight(r, amount)}, ${adjustLight(g, amount)}, ${adjustLight(b, amount)}, ${a})`;
    }

    function opacity(color, percentage) {
        const rgba = toRgba(color);
        if (rgba == null) { return color; }

        const [r, g, b, a] = rgba;
        return `rgba(${r}, ${g}, ${b}, ${a * (percentage / 100)})`;
    }

    function toRgba(color) {
        color = color.trim();

        const result = cssColorRegex.exec(color);
        if (result == null) { return null; }

        if (result[1] === '#') {
            const hex = result[2];
            switch (hex.length) {
                case 3:
                    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), 1];
                case 6:
                    return [
                        parseInt(hex.substring(0, 2), 16),
                        parseInt(hex.substring(2, 4), 16),
                        parseInt(hex.substring(4, 6), 16),
                        1
                    ];
            }

            return null;
        }

        switch (result[3]) {
            case 'rgb':
                return [parseInt(result[4], 10), parseInt(result[5], 10), parseInt(result[6], 10), 1];
            case 'rgba':
                return [parseInt(result[4], 10), parseInt(result[5], 10), parseInt(result[6], 10), parseFloat(result[7])];
            default:
                return null;
        }
    }

    function initializeAndWatchThemeColors() {
        const onColorThemeChanged = () => {
            const body = document.body;
            const computedStyle = window.getComputedStyle(body);

            const bodyStyle = body.style;

            const font = computedStyle.getPropertyValue('--vscode-font-family').trim();
            if (font) {
                bodyStyle.setProperty('--font-family', font);
                bodyStyle.setProperty('--font-size', computedStyle.getPropertyValue('--vscode-font-size').trim());
                bodyStyle.setProperty('--font-weight', computedStyle.getPropertyValue('--vscode-font-weight').trim());
            } else {
                bodyStyle.setProperty(
                    '--font-family',
                    computedStyle.getPropertyValue('--vscode-editor-font-family').trim()
                );
                bodyStyle.setProperty('--font-size', computedStyle.getPropertyValue('--vscode-editor-font-size').trim());
                bodyStyle.setProperty(
                    '--font-weight',
                    computedStyle.getPropertyValue('--vscode-editor-font-weight').trim()
                );
            }

            let color = computedStyle.getPropertyValue('--vscode-editor-background').trim();
            bodyStyle.setProperty('--color-background', color);
            bodyStyle.setProperty('--color-background--lighten-05', lighten(color, 5));
            bodyStyle.setProperty('--color-background--darken-05', darken(color, 5));
            bodyStyle.setProperty('--color-background--lighten-075', lighten(color, 7.5));
            bodyStyle.setProperty('--color-background--darken-075', darken(color, 7.5));
            bodyStyle.setProperty('--color-background--lighten-15', lighten(color, 15));
            bodyStyle.setProperty('--color-background--darken-15', darken(color, 15));
            bodyStyle.setProperty('--color-background--lighten-30', lighten(color, 30));
            bodyStyle.setProperty('--color-background--darken-30', darken(color, 30));
            bodyStyle.setProperty('--color-background--lighten-50', lighten(color, 50));
            bodyStyle.setProperty('--color-background--darken-50', darken(color, 50));

            color = computedStyle.getPropertyValue('--vscode-button-background').trim();
            bodyStyle.setProperty('--color-button-background', color);
            bodyStyle.setProperty('--color-button-background--darken-30', darken(color, 30));

            color = computedStyle.getPropertyValue('--vscode-button-foreground').trim();
            bodyStyle.setProperty('--color-button-foreground', color);

            color = computedStyle.getPropertyValue('--vscode-editor-foreground').trim();
            if (!color) {
                color = computedStyle.getPropertyValue('--vscode-foreground').trim();
            }
            bodyStyle.setProperty('--color-foreground', color);
            bodyStyle.setProperty('--color-foreground--85', opacity(color, 85));
            bodyStyle.setProperty('--color-foreground--75', opacity(color, 75));
            bodyStyle.setProperty('--color-foreground--65', opacity(color, 65));
            bodyStyle.setProperty('--color-foreground--50', opacity(color, 50));

            color = computedStyle.getPropertyValue('--vscode-focusBorder').trim();
            bodyStyle.setProperty('--color-focus-border', color);

            color = computedStyle.getPropertyValue('--vscode-textLink-foreground').trim();
            bodyStyle.setProperty('--color-link-foreground', color);
            bodyStyle.setProperty('--color-link-foreground--darken-20', darken(color, 20));
            bodyStyle.setProperty('--color-link-foreground--lighten-20', lighten(color, 20));
        };

        const observer = new MutationObserver(onColorThemeChanged);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        onColorThemeChanged();
        return observer;
    }

    function listenAll(selector, name, listener) {
        const els = document.querySelectorAll(selector);
        for (const el of els) {
            el.addEventListener(name, listener, false);
        }
    }

    function chooseLeoEditorPath() {
        vscode.postMessage({
            command: "chooseLeoEditorPath"
        });
    }

    function onBind() {
        listenAll('input[type=checkbox][data-setting]', 'change', function (p_this) {
            return onInputChecked(p_this.target);
        });
        listenAll('input[type=text][data-setting], input:not([type])[data-setting]', 'blur', function (
            p_this
        ) {
            return onInputBlurred(p_this.target);
        });
        listenAll('input[type=text][data-setting], input:not([type])[data-setting]', 'focus', function (
            p_this
        ) {
            return onInputFocused(p_this.target);
        });
        listenAll('input[type=text][data-setting], input[type=number][data-setting]', 'input', function (
            p_this
        ) {
            return onInputChanged(p_this.target);
        });
        listenAll('select[data-setting]', 'change', function (p_this) {
            return onDropdownChanged(p_this.target);
        });
        listenAll('input[type=number][data-vscode]', 'input', function (
            p_this
        ) {
            return onVscodeInputChanged(p_this.target);
        });
    }
    function showDirtyAndApplyChange() {
        if (dirty) {
            dirty.className = "show";
        }
        applyChanges();
    }

    function onDropdownChanged(element) {
        if (element) {
            const w_value = element.options[element.selectedIndex].value;
            frontConfig[element.id] = w_value;
        }
        showDirtyAndApplyChange();
    }

    function onInputChecked(element) {
        frontConfig[element.id] = element.checked;
        setVisibility(frontConfig);
        showDirtyAndApplyChange();
    }
    function onInputBlurred(element) {
        // console.log('onInputBlurred', element);
    }
    function onInputFocused(element) {
        // console.log('onInputFocused', element);
    }

    function onInputChanged(element) {
        if (element.type === 'number' && Number(element.value) < Number(element.max) && Number(element.value) > Number(element.min)) {
            frontConfig[element.id] = Number(element.value);
            element.classList.remove("is-invalid");
            showDirtyAndApplyChange();
        } else if (element.type === 'number' && (Number(element.value) > Number(element.max) || Number(element.value) < Number(element.min))) {
            // make red
            element.classList.add("is-invalid");
        } else if (element.type === 'text' && (element.value.length > element.maxLength || (element.value.length < element.minLength && element.value.length !== 0))) {
            element.classList.add("is-invalid");
        } else if (element.type === 'text' && element.value.length <= element.maxLength) {
            element.classList.remove("is-invalid");
            frontConfig[element.id] = element.value;
            showDirtyAndApplyChange();
        }
        if (element.type === 'text' || element.type === 'number') {
            applyResultingCommand();
        }
    }

    function onVscodeInputChanged(element) {
        if (element.id === "zoomLevel") {
            frontFontConfig.zoomLevel = element.valueAsNumber;
        }
        if (element.id === "editorFontSize") {
            frontFontConfig.fontSize = element.valueAsNumber;
        }
        applyFontChanges();
    }

    function setFontControls() {
        if (frontFontConfig.zoomLevel || frontFontConfig.zoomLevel === 0) {
            const w_element = document.getElementById("zoomLevel");
            // @ts-expect-error
            w_element.valueAsNumber = Number(frontFontConfig.zoomLevel);
        } else {
            console.log('Error : vscode font setting "zoomLevel" is missing');
        }
        if (frontFontConfig.fontSize) {
            const w_element = document.getElementById("editorFontSize");
            // @ts-expect-error
            w_element.valueAsNumber = Number(frontFontConfig.fontSize);
        } else {
            console.log('Error : vscode font setting "fontSize" is missing');
        }
    }

    function setControls() {
        // 1- Set leointeg's own configuration settings
        for (const key in frontConfig) {
            if (frontConfig.hasOwnProperty(key)) {
                const w_element = document.getElementById(key);
                if (w_element && w_element.getAttribute('type') === 'checkbox') {
                    // @ts-expect-error
                    w_element.checked = frontConfig[key];
                } else if (w_element) {
                    // @ts-expect-error
                    w_element.value = frontConfig[key];
                } else {
                    console.log('ERROR : w_element', key, ' is ', w_element);
                }
            }
        }
    }

    function setVisibility(state) {
        for (const el of document.querySelectorAll('[data-visibility]')) {
            // @ts-expect-error
            el.classList.toggle('hidden', !evaluateStateExpression(el.dataset.visibility, state));
        }
    }
    function parseStateExpression(expression) {
        const [lhs, op, rhs] = expression.trim().split(/([=+!])/);
        return [lhs.trim(), op !== undefined ? op.trim() : '=', rhs !== undefined ? rhs.trim() : rhs];
    }

    function evaluateStateExpression(expression, changes) {
        let state = false;

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

    function getSettingValue(p_setting) {
        return frontConfig[p_setting];
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function resultingCommand() {

        if (resultingCommandEl && leoPythonCommandEl) {
            // @ts-expect-errorts
            let w_serverScriptPath = (leoEditorPathEl.value && leoEditorPathEl.value.trim()) ? leoEditorPathEl.value.trim() + "/leo/core" : "";
            if (!w_serverScriptPath.trim()) {
                resultingCommandEl.innerHTML = "Please set your Leo-Editor installation path";
                resultingCommandEl.style.opacity = "0.3";
                return;
            }

            let w_pythonPath = ""; // Command of child.spawn call
            let w_args = []; //  "\"" + w_serverScriptPath + "\"" // For on windows ??
            // @ts-expect-errorts
            let w_leoPythonCommand = leoPythonCommandEl.value ? leoPythonCommandEl.value : "";

            // @ts-expect-errorts
            let w_usingPort = connectionPortEl.value ? connectionPortEl.value : 32125;
            // @ts-expect-errorts
            let w_limitUsers = limitUsersEl.value ? limitUsersEl.value : 0;

            if (w_leoPythonCommand && w_leoPythonCommand.length) {
                // Start by running command (see executeCommand for multiple useful snippets)
                w_pythonPath = w_leoPythonCommand; // Set path
            } else {
                w_pythonPath = "python3";
                if (_isWin32) {
                    w_pythonPath = "py";
                }
            }

            if (_isWin32 && w_pythonPath === "py") {
                w_args.push("-3");
            }
            w_args.push(w_serverScriptPath.trim());


            if (w_limitUsers > 1 &&
                w_limitUsers < 256) {
                w_args.push("--limit");
                w_args.push(w_limitUsers.toString());
            }

            // Add port
            w_args.push("--port");
            w_args.push(w_usingPort.toString());

            resultingCommandEl.innerHTML = escapeHtml(w_pythonPath + " " + w_args.join(" ")).trim();
            resultingCommandEl.style.opacity = "1.0";

        }

    }

    function debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }

    var applyResultingCommand = debounce(
        function () {
            resultingCommand();
        },
        300
    );

    var applyChanges = debounce(
        function () {
            var w_changes = [];
            if (frontConfig) {
                for (var prop in frontConfig) {
                    if (Object.prototype.hasOwnProperty.call(frontConfig, prop)) {
                        if (frontConfig[prop] !== vscodeConfig[prop]) {
                            w_changes.push({ code: prop, value: frontConfig[prop] });
                        }
                    }
                }
            }
            if (w_changes.length) {
                // ok replace!
                vscodeConfig = frontConfig;
                frontConfig = JSON.parse(JSON.stringify(frontConfig));
                vscode.postMessage({
                    command: "config",
                    changes: w_changes
                });
            } else if (dirty) {
                // Still have to remove 'modified' popup
                dirty.className = dirty.className.replace("show", "");
            }
        },
        1500
    );

    var applyFontChanges = debounce(
        function () {
            vscode.postMessage({
                command: "fontConfig",
                changes: frontFontConfig
            });
        },
        800
    );

    // START
    const w_button = document.getElementById('chooseLeoEditorPath');
    if (w_button) {
        w_button.onclick = chooseLeoEditorPath;
    }
    setControls();
    setFontControls();
    setVisibility(frontConfig);
    onBind();
    setTimeout(applyResultingCommand, 100);

})();

