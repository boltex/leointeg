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
        searchScope: 0 // 0 is entire outline (1: sub-outline, 2: node only)
    };

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            // Focus and select all text in 'find' field
            case 'selectFind':
                {
                    focusOnField('findText');
                    break;
                }
            // Focus and select all text in 'replace' field
            case 'selectReplace':
                {
                    focusOnField('replaceText');
                    break;
                }
            case 'getSettings':
                {
                    getSettings();
                    break;
                }
            case 'setSettings':
                {
                    setSettings(message.value);
                    break;
                }
            case 'setFindEverywhereOption':
                {
                    setRadio('entireOutline');
                    console.log('setFindEverywhereOption');
                    break;
                }
            case 'setFindNodeOnlyOption':
                {
                    setRadio('nodeOnly');
                    console.log('setFindNodeOnlyOption');
                    break;
                }
            case 'setFindSuboutlineOnlyOption':
                {
                    setRadio('subOutlineOnly');
                    console.log('setFindSuboutlineOnlyOption');
                    break;
                }
            case 'toggleFindIgnoreCaseOption':
                {
                    toggleCheckbox('ignoreCase');
                    console.log('toggleFindIgnoreCaseOption');
                    break;
                }
            case 'toggleFindMarkChangesOption':
                {
                    toggleCheckbox('markChanges');
                    console.log('toggleFindMarkChangesOption');
                    break;
                }
            case 'toggleFindMarkFindsOption':
                {
                    toggleCheckbox('markFinds');
                    console.log('toggleFindMarkFindsOption');
                    break;
                }
            case 'toggleFindRegexpOption':
                {
                    toggleCheckbox('regExp');
                    console.log('toggleFindRegexpOption');
                    break;
                }
            case 'toggleFindWordOption':
                {
                    toggleCheckbox('wholeWord');
                    console.log('toggleFindWordOption');
                    break;
                }
        }
    });

    let inputIds = ["findText", "replaceText"];
    let checkboxIds = [
        "wholeWord",
        "ignoreCase",
        "regExp",
        "markFinds",
        "markChanges",
        "searchHeadline",
        "searchBody"
    ];
    let radioIds = [
        "entireOutline",
        "subOutlineOnly",
        "nodeOnly"
    ];

    /**
     * @param {any} p_settings
     */
    function setSettings(p_settings) {
        // When opening a Leo document, set default values of fields
        inputIds.forEach(p_inputId => {
            //@ts-expect-error
            document.getElementById(p_inputId).value = p_settings[p_inputId];
            searchSettings[p_inputId] = p_settings[p_inputId];
        })
        checkboxIds.forEach(p_inputId => {
            //@ts-expect-error
            document.getElementById(p_inputId).checked = p_settings[p_inputId];
            searchSettings[p_inputId] = p_settings[p_inputId];
        })
        //@ts-expect-error
        document.getElementById(radioIds[p_settings["searchScope"]]).checked = true;
        searchSettings.searchScope = p_settings["searchScope"];
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

    inputIds.forEach(p_inputId => {
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
        }
        document.getElementById(p_inputId).addEventListener("input", function (p_event) {
            //@ts-expect-error
            searchSettings[p_inputId] = this.value;
            processChange();
        })
    });
    checkboxIds.forEach(p_inputId => {
        document.getElementById(p_inputId).addEventListener("change", function (p_event) {
            //@ts-expect-error
            searchSettings[p_inputId] = this.checked;
            processChange();
        })

    });
    radioIds.forEach(p_inputId => {
        document.getElementById(p_inputId).addEventListener("change", function (p_event) {
            //@ts-expect-error
            searchSettings["searchScope"] = parseInt(document.querySelector('input[name="searchScope"]:checked').value);
            processChange();
        })
    });

    /**
     * @param {string} p_inputId
     */
    function toggleCheckbox(p_inputId) {
        let w_checkbox = document.getElementById(p_inputId)
        //@ts-expect-error
        if (w_checkbox.checked) {
            //@ts-expect-error
            w_checkbox.checked = false;
        } else {
            //@ts-expect-error
            w_checkbox.checked = true;
        }
    }

    /**
     * @param {string} p_inputId
     */
    function setRadio(p_inputId) {
        //@ts-expect-error
        document.getElementById(p_inputId).checked = true;
    }

    /**
     *
     * @param {KeyboardEvent} p_event
     */
    function checkKeyPress(p_event) {
        //@ts-expect-error
        if (!p_event) p_event = window.event;
        if (p_event.keyCode == 70 && p_event.ctrlKey) {
            p_event.preventDefault();
            p_event.stopPropagation();
            p_event.stopImmediatePropagation();
            focusOnField('findText');
        };
    }

    // TODO : CHECK FOR ALT+CTRL+SHORTCUTS FOR TOGGLES AND RADIOS
    // document.addEventListener ("keydown", function (zEvent) {
    //     if (zEvent.ctrlKey  &&  zEvent.altKey  &&  zEvent.key === "e") {  // case sensitive
    //         // DO YOUR STUFF HERE
    //     }
    // } );

    document.onkeydown = checkKeyPress;

    /**
     * @param {string} p_id
     */
    function focusOnField(p_id) {
        const inputField = document.querySelector('#' + p_id);
        //@ts-expect-error
        inputField.select();
    }

    function getSettings() {
        // clear dirty, clear timer,
        if (dirty) {
            dirty = false
            clearTimeout(timer);
            sendSearchConfig(); // just trigger send settings
        }
    }

}());


