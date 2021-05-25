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

    function sendSearchConfig() {
        dirty = false; // clear dirty flag
        console.log(searchSettings);
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
            searchSettings["searchScope"] = document.querySelector('input[name="searchScope"]:checked').value;
            processChange();
        })
    });

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

    document.onkeydown = checkKeyPress;

    /**
     * @param {string} p_id
     */
    function focusOnField(p_id) {
        const inputField = document.querySelector('#' + p_id);
        //@ts-expect-error
        inputField.select();
    }

    function setSettings(p_settings) {
        // When opening a Leo document, set default values of fields
        console.log('SET SETTINGS');



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


