//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
// Send message to leoInteg with vscode.postMessage({ keyNameEx1: someValue, ... });
// Receive messages from leoInteg with window.addEventListener('message', event => { ... });
(function () {
    //@ts-expect-error
    const vscode = acquireVsCodeApi();

    // * LeoSearchSettings Type
    let searchSettings = {
        findText: '',
        replaceText: '',
        wholeWord: false,
        ignoreCase: true,
        regExp: false,
        markFinds: false,
        markChanges: false,
        searchHeadline: true,
        searchBody: true,
        searchScope: 0, // 0 is entire outline (1: sub-outline, 2: node only)
    };

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            // Focus and select all text in 'find' field
            case 'selectFind': {
                focusOnField('findText');
                break;
            }
            // Focus and select all text in 'replace' field
            case 'selectReplace': {
                focusOnField('replaceText');
                break;
            }
            case 'getSettings': {
                getSettings();
                break;
            }
            case 'setSettings': {
                setSettings(message.value);
                break;
            }
            case 'setSearchSetting': {
                setSearchSetting(message.id);
                break;
            }
        }
    });

    let inputIds = ['findText', 'replaceText'];
    let checkboxIds = [
        'wholeWord',
        'ignoreCase',
        'regExp',
        'markFinds',
        'markChanges',
        'searchHeadline',
        'searchBody',
    ];
    let radioIds = ['entireOutline', 'subOutlineOnly', 'nodeOnly'];

    /**
     * @param {string} p_id
     */
    function setSearchSetting(p_id) {
        if (checkboxIds.includes(p_id)) {
            toggleCheckbox(p_id);
        } else if (radioIds.includes(p_id)) {
            setRadio(p_id);
        }
    }

    /**
     * @param {any} p_settings
     */
    function setSettings(p_settings) {
        // When opening a Leo document, set default values of fields
        inputIds.forEach((p_inputId) => {
            //@ts-expect-error
            document.getElementById(p_inputId).value = p_settings[p_inputId];
            searchSettings[p_inputId] = p_settings[p_inputId];
        });
        checkboxIds.forEach((p_inputId) => {
            //@ts-expect-error
            document.getElementById(p_inputId).checked = p_settings[p_inputId];
            searchSettings[p_inputId] = p_settings[p_inputId];
        });
        //@ts-expect-error
        document.getElementById(radioIds[p_settings['searchScope']]).checked = true;
        searchSettings.searchScope = p_settings['searchScope'];
    }

    function sendSearchConfig() {
        dirty = false; // clear dirty flag
        vscode.postMessage({ type: 'searchConfig', value: searchSettings });
    }

    let timer; // for debouncing sending the settings from this webview to leointeg
    let dirty = false;
    function processChange() {
        clearTimeout(timer);
        dirty = true;
        timer = setTimeout(() => {
            sendSearchConfig();
        }, 300);
    }

    inputIds.forEach((p_inputId) => {
        document.getElementById(p_inputId).onkeypress = function (p_event) {
            //@ts-expect-error
            if (!p_event) p_event = window.event;
            var keyCode = p_event.code || p_event.key;
            if (keyCode == 'Enter') {
                if (timer) {
                    clearTimeout(timer);
                    sendSearchConfig();
                }
                vscode.postMessage({ type: 'leoFindNext' });
                return false;
            }
        };
        document.getElementById(p_inputId).addEventListener('input', function (p_event) {
            //@ts-expect-error
            searchSettings[p_inputId] = this.value;
            processChange();
        });
    });
    checkboxIds.forEach((p_inputId) => {
        document.getElementById(p_inputId).addEventListener('change', function (p_event) {
            //@ts-expect-error
            searchSettings[p_inputId] = this.checked;
            processChange();
        });
    });
    radioIds.forEach((p_inputId) => {
        document.getElementById(p_inputId).addEventListener('change', function (p_event) {
            searchSettings['searchScope'] = parseInt(
                //@ts-expect-error
                document.querySelector('input[name="searchScope"]:checked').value
            );
            processChange();
        });
    });

    /**
     * @param {string} p_inputId
     */
    function toggleCheckbox(p_inputId) {
        let w_checkbox = document.getElementById(p_inputId);
        let w_setTo = true;
        //@ts-expect-error
        if (w_checkbox.checked) {
            w_setTo = false;
        }
        //@ts-expect-error
        w_checkbox.checked = w_setTo;
        searchSettings[p_inputId] = w_setTo;
        if (timer) {
            clearTimeout(timer);
        }
        sendSearchConfig();
    }

    /**
     * @param {string} p_inputId
     */
    function setRadio(p_inputId) {
        //@ts-expect-error
        document.getElementById(p_inputId).checked = true;
        searchSettings['searchScope'] = parseInt(
            //@ts-expect-error
            document.querySelector('input[name="searchScope"]:checked').value
        );
        if (timer) {
            clearTimeout(timer);
        }
        sendSearchConfig();
    }

    /**
     *
     * @param {KeyboardEvent} p_event
     */
    function checkKeyDown(p_event) {
        //@ts-expect-error
        if (!p_event) p_event = window.event;
        var keyCode = p_event.code || p_event.key;

        console.log('got keycode:', keyCode);

        if (keyCode === 'F2') {
            p_event.preventDefault();
            p_event.stopPropagation();
            p_event.stopImmediatePropagation();
            vscode.postMessage({ type: 'leoFindPrevious' });
            return;
        }
        if (keyCode === 'F3') {
            p_event.preventDefault();
            p_event.stopPropagation();
            p_event.stopImmediatePropagation();
            vscode.postMessage({ type: 'leoFindNext' });
            return;
        }

        if ((keyCode === 'f' || keyCode === 'KeyF') && p_event.ctrlKey) {
            p_event.preventDefault();
            p_event.stopPropagation();
            p_event.stopImmediatePropagation();
            focusOnField('findText');
            return;
        }
        if ((keyCode === 't' || keyCode === 'KeyT') && p_event.ctrlKey) {
            p_event.preventDefault();
            p_event.stopPropagation();
            p_event.stopImmediatePropagation();
            vscode.postMessage({ type: 'focusOnTree' });
            return;
        }
        if ((keyCode === '=' || keyCode === 'Equal') && p_event.ctrlKey) {
            p_event.preventDefault();
            p_event.stopPropagation();
            p_event.stopImmediatePropagation();
            vscode.postMessage({ type: 'replace' });
            return;
        }
        if ((keyCode === '-' || keyCode === 'Minus') && p_event.ctrlKey) {
            p_event.preventDefault();
            p_event.stopPropagation();
            p_event.stopImmediatePropagation();
            vscode.postMessage({ type: 'replaceThenFind' });
            return;
        }

        if (keyCode === 'Tab') {
            var actEl = document.activeElement;
            if (p_event.shiftKey) {
                var firstEl = document.getElementById('findText');
                if (actEl === firstEl) {
                    p_event.preventDefault();
                    p_event.stopPropagation();
                    p_event.stopImmediatePropagation();
                    document.getElementById('searchBody').focus();
                    return;
                }
            } else {
                var lastEl = document.getElementById('searchBody');
                if (actEl === lastEl) {
                    p_event.preventDefault();
                    p_event.stopPropagation();
                    p_event.stopImmediatePropagation();
                    focusOnField('findText');
                    return;
                }
            }
        }

        if (p_event.ctrlKey && p_event.altKey) {
            switch (keyCode) {
                case 'w':
                case 'KeyW':
                    toggleCheckbox('wholeWord');
                    return;
                case 'i':
                case 'KeyI':
                    toggleCheckbox('ignoreCase');
                    return;
                case 'x':
                case 'KeyX':
                    toggleCheckbox('regExp');
                    return;
                case 'f':
                case 'KeyF':
                    toggleCheckbox('markFinds');
                    return;
                case 'c':
                case 'KeyC':
                    toggleCheckbox('markChanges');
                    return;
                case 'h':
                case 'KeyH':
                    toggleCheckbox('searchHeadline');
                    return;
                case 'b':
                case 'KeyB':
                    toggleCheckbox('searchBody');
                    return;
                case 'e':
                case 'KeyE':
                    setRadio('entireOutline');
                    return;
                case 's':
                case 'KeyS':
                    setRadio('subOutlineOnly');
                    return;
                case 'n':
                case 'KeyN':
                    setRadio('nodeOnly');
                    return;
                default:
                    break;
            }
        }
    }

    // TODO :  CAPTURE FOCUS IN OVERALL PANEL AND SET CONTEXT-VAR OF 'FOCUSED PANEL'

    // TODO : ALSO CYCLE TABS !!
    // TODO : ALSO CAPTURE CTRL+T TO FOCUS OUT OF HERE

    // TODO : CHECK FOR ALT+CTRL+SHORTCUTS FOR TOGGLES AND RADIOS
    // document.addEventListener ("keydown", function (zEvent) {
    //     if (zEvent.ctrlKey  &&  zEvent.altKey  &&  zEvent.key === "e") {  // case sensitive
    //         // DO YOUR STUFF HERE
    //     }
    // } );

    document.onkeydown = checkKeyDown;

    /**
     * @param {string} p_id
     */
    function focusOnField(p_id) {
        const inputField = document.querySelector('#' + p_id);
        //@ts-expect-error
        inputField.select();
        // TODO : TEST IF NEEDED TO PREVENT FLICKER ON FIRST TRY?
        setTimeout(() => {
            //@ts-expect-error
            inputField.select();
        }, 0);
    }

    function getSettings() {
        // clear dirty, clear timer,
        if (dirty) {
            dirty = false;
            clearTimeout(timer);
            sendSearchConfig(); // just trigger send settings
        }
    }

    // FINISH STARTUP
    vscode.postMessage({ type: 'refreshSearchConfig' });
})();
