// @ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
// Send message to leointeg with vscode.postMessage({ keyNameEx1: someValue, ... });
// Receive messages from leointeg with window.addEventListener('message', event => { ... });
(function () {
    // @ts-expect-error
    const vscode = acquireVsCodeApi();

    let timer; // for debouncing sending the settings from this webview to leointeg
    let dirty = false; // all but nav input
    let navTextDirty = false;

    let firstTabElId = 'searchOptions'; // The first tabbable element used to be 'findText' before nav inputs
    let lastTabElId = 'searchBody';

    /**
     * * Flag for freezing the nav 'search as you type' headlines (concept from original nav plugin)
     * - Resets when switching to tag, or when clearing the input field.
     * - Sets when pressing Enter with non-empty input field && not tag mode.
     */
    let frozen = false;
    let w_freezeElement = document.getElementById("freeze");
    if (w_freezeElement) {
        w_freezeElement.style.display = 'none';
    }
    let navSearchTimer; // for debouncing the search-headline while typing if unfrozen

    // * LeoSearchSettings Type
    let searchSettings = {
        // Nav settings
        navText: '',
        showParents: true,
        isTag: false,
        searchOptions: 0,
        // Find/replace
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

    // * Search related controls (No nav inputs)
    let findReplaceInputIds = ['findText', 'replaceText'];
    let checkboxIds = [
        'wholeWord',
        'ignoreCase',
        'regExp',
        'markFinds',
        'markChanges',
        'searchHeadline',
        'searchBody',
    ];
    let radioIds = ['entireOutline', 'subOutlineOnly', 'nodeOnly', 'fileOnly'];

    function resetTagNav() {
        navSearchTimer = setTimeout(() => {
            if (navTextDirty) {
                navTextDirty = false;
                if (navSearchTimer) {
                    clearTimeout(navSearchTimer);
                }
                sendSearchConfig();
            }
            vscode.postMessage({ type: 'leoNavTextChange' });
        }, 250); // quarter second
    }

    function navTextChange() {
        // cancel timer, reset 'debounced' timer after checks, if still needed
        if (navSearchTimer) {
            clearTimeout(navSearchTimer);
        }

        // * Needed Checks
        if (searchSettings.navText.length === 0) {
            setFrozen(false);
            // if tagging but empty: SEND SEARCH LIST-ALL-TAGS COMMAND
            if (searchSettings.isTag) {
                resetTagNav();
            }

        }
        if (searchSettings.navText === "m" && !searchSettings.isTag) {
            // ! Easter Egg: calls 'marked-list', which list all marked nodes !
            navSearchTimer = setTimeout(() => {
                if (navTextDirty) {
                    navTextDirty = false;
                    if (navSearchTimer) {
                        clearTimeout(navSearchTimer);
                    }
                    sendSearchConfig();
                }
                vscode.postMessage({ type: 'leoNavMarkedList' });

            }, 40); // Shorter delay for this command
            return false;
        }

        // User changed text in nav text input
        if (frozen || searchSettings.navText.length < 3) {
            return; // dont even continue if not long enough or already frozen
        }

        // DEBOUNCE .25 to .5 seconds with navSearchTimer
        navSearchTimer = setTimeout(() => {
            if (navTextDirty) {
                navTextDirty = false;
                if (navSearchTimer) {
                    clearTimeout(navSearchTimer);
                }
                sendSearchConfig();
            }
            vscode.postMessage({ type: 'leoNavTextChange' });
        }, 400); // almost half second

    }

    function setSearchSetting(p_id) {
        if (checkboxIds.includes(p_id)) {
            toggleCheckbox(p_id);
        } else if (radioIds.includes(p_id)) {
            setRadio(p_id);
        }
    }

    function setFrozen(p_focus) {
        frozen = p_focus;
        w_freezeElement = document.getElementById("freeze");
        if (w_freezeElement) {
            if (frozen) {
                w_freezeElement.style.display = '';
            } else {
                w_freezeElement.style.display = 'none';
            }
        }
    }

    function setSettings(p_settings) {
        if (p_settings["navText"] || p_settings["navText"] === '') {

            // Nav controls
            // @ts-expect-error
            document.getElementById("navText").value = p_settings["navText"];
            searchSettings["navText"] = p_settings["navText"];

            // showParents
            // @ts-expect-error
            document.getElementById("showParents").checked = p_settings["showParents"];
            searchSettings["showParents"] = p_settings["showParents"];

            // isTag
            // @ts-expect-error
            document.getElementById("isTag").checked = p_settings["isTag"];
            searchSettings["isTag"] = p_settings["isTag"];
            handleIsTagSwitch(false);

            // searchOptions
            // @ts-expect-error
            document.getElementById("searchOptions").value = p_settings["searchOptions"];
            searchSettings["searchOptions"] = p_settings["searchOptions"];
        } else {
            // ! Not at least Leo 6.6 final : hide top elements !
            firstTabElId = 'findText';
            var elements = document.getElementsByClassName("nav-element");

            for (var i = 0; i < elements.length; i++) {
                // @ts-expect-error
                elements[i].style.display = "none";
            }
        }

        // When opening a Leo document, set default values of fields
        findReplaceInputIds.forEach((p_inputId) => {
            // @ts-expect-error
            document.getElementById(p_inputId).value = p_settings[p_inputId];
            searchSettings[p_inputId] = p_settings[p_inputId];
        });
        checkboxIds.forEach((p_inputId) => {
            // @ts-expect-error
            document.getElementById(p_inputId).checked = p_settings[p_inputId];
            searchSettings[p_inputId] = p_settings[p_inputId];
        });
        // @ts-expect-error
        document.getElementById(radioIds[p_settings['searchScope']]).checked = true;
        searchSettings.searchScope = p_settings['searchScope'];
    }

    function sendSearchConfig() {
        dirty = false; // clear dirty flag
        vscode.postMessage({ type: 'searchConfig', value: searchSettings });
    }

    function processChange() {
        clearTimeout(timer);
        dirty = true;
        timer = setTimeout(() => {
            sendSearchConfig();
        }, 300);
    }

    function toggleCheckbox(p_inputId) {
        let w_checkbox = document.getElementById(p_inputId);
        let w_setTo = true;
        // @ts-expect-error
        if (w_checkbox.checked) {
            w_setTo = false;
        }
        // @ts-expect-error
        w_checkbox.checked = w_setTo;
        searchSettings[p_inputId] = w_setTo;
        if (timer) {
            clearTimeout(timer);
        }
        sendSearchConfig();
    }

    function setRadio(p_inputId) {
        // @ts-expect-error
        document.getElementById(p_inputId).checked = true;
        searchSettings['searchScope'] = parseInt(
            // @ts-expect-error
            document.querySelector('input[name="searchScope"]:checked').value
        );
        if (timer) {
            clearTimeout(timer);
        }
        sendSearchConfig();
    }

    function checkKeyDown(p_event) {
        if (!p_event) {
            p_event = window.event;
        }
        var keyCode = p_event.code || p_event.key;

        // Detect CTRL+F
        if (p_event.ctrlKey && !p_event.shiftKey && p_event.keyCode === 70) {
            p_event.preventDefault();
            p_event.stopPropagation();
            focusOnField('findText');
            return;
        }

        // ? NEEDED ?
        /*
        // Detect F2
        if (!p_event.ctrlKey && !p_event.shiftKey && p_event.keyCode === 113) {
            p_event.preventDefault();
            p_event.stopPropagation();
            vscode.postMessage({ type: 'leoFindPrevious' });
            return;
        }
        // Detect F3
        if (!p_event.ctrlKey && !p_event.shiftKey && p_event.keyCode === 114) {
            p_event.preventDefault();
            p_event.stopPropagation();
            vscode.postMessage({ type: 'leoFindNext' });
            return;
        }
        // Detect Ctrl + =
        if (p_event.ctrlKey && !p_event.shiftKey && p_event.keyCode === 187) {
            p_event.preventDefault();
            p_event.stopPropagation();
            vscode.postMessage({ type: 'replace' });
            return;
        }
        // Detect Ctrl + -
        if (p_event.ctrlKey && !p_event.shiftKey && p_event.keyCode === 189) {
            p_event.preventDefault();
            p_event.stopPropagation();
            vscode.postMessage({ type: 'replaceThenFind' });
            return;
        }
        */

        if (keyCode === 'Tab') {
            var actEl = document.activeElement;
            var lastEl = document.getElementById(lastTabElId);

            if (p_event.shiftKey) {
                // shift + tab so if first got last
                var firstEl = document.getElementById(firstTabElId);
                if (lastEl && actEl === firstEl) {
                    p_event.preventDefault();
                    p_event.stopPropagation();
                    p_event.stopImmediatePropagation();
                    lastEl.focus();
                    return;
                }
            } else {
                // tab, so if last goto first
                if (actEl === lastEl) {
                    p_event.preventDefault();
                    p_event.stopPropagation();
                    p_event.stopImmediatePropagation();
                    focusOnField(firstTabElId);
                    return;
                }
            }
        }
    }

    function focusOnField(p_id) {
        const inputField = document.querySelector('#' + p_id);
        if (inputField) {
            // @ts-expect-error
            inputField.select();
            // TODO : TEST IF NEEDED TO PREVENT FLICKER ON FIRST TRY?
            setTimeout(() => {
                // @ts-expect-error
                inputField.select();
            }, 0);
        }
    }

    function getSettings() {
        // clear dirty, clear timer,
        if (dirty) {
            dirty = false;
            clearTimeout(timer);
            sendSearchConfig(); // just trigger send settings
        }
    }

    function handleIsTagSwitch(p_wasSet) {
        let w_input = document.getElementById('navText');
        let w_showParent = document.getElementById('showParents');
        let w_navSelect = document.getElementById('searchOptions');
        if (searchSettings.isTag) {

            if (w_input) {
                // @ts-expect-error
                w_input.placeholder = "<tag pattern here>";
                w_input.title = "Enter a tag name to list tagged nodes in the Goto pane&#013;Clear this field to list all tags used in this file";
            }

            // @ts-expect-error
            w_showParent.disabled = true;
            // @ts-expect-error
            w_navSelect.disabled = true;
            if (p_wasSet) {
                // if nav text is empty: show all tags
                setTimeout(() => {
                    clearTimeout(timer);
                    sendSearchConfig();
                    navTextChange();
                }, 100);
            }
        } else {
            if (w_input) {
                // @ts-expect-error
                w_input.placeholder = "<nav pattern here>";
                w_input.title = "Typing searches headlines interactively&#013;Enter freezes input and searches body text";
            }
            // @ts-expect-error
            w_showParent.disabled = false;
            // @ts-expect-error
            w_navSelect.disabled = false;
        }

    }

    // * Nav text input detection
    const w_navTextEl = document.getElementById('navText');
    if (w_navTextEl) {
        w_navTextEl.onkeypress = function (p_event) {
            if (!p_event) {
                // @ts-expect-error
                p_event = window.event;
            }
            var keyCode = p_event.code || p_event.key;
            if (keyCode === 'Enter') {
                if (searchSettings.navText.length === 0 && searchSettings.isTag) {
                    setFrozen(false);
                    resetTagNav();
                } else {
                    if (searchSettings.navText.length >= 3 || searchSettings.isTag) {
                        setFrozen(true);
                        if (navTextDirty) {
                            navTextDirty = false;
                            if (timer) {
                                clearTimeout(timer);
                            }
                            if (navSearchTimer) {
                                clearTimeout(navSearchTimer);
                            }
                            sendSearchConfig();
                        }
                        vscode.postMessage({ type: 'leoNavEnter' });
                    }
                    if (searchSettings.navText.length === 0) {
                        vscode.postMessage({ type: 'leoNavClear' });
                    }
                }

                return false;
            }
        };

        w_navTextEl.addEventListener('input', function (p_event) {
            // @ts-expect-error
            searchSettings.navText = this.value;
            navTextDirty = true;
            navTextChange(); // DEBOUNCE THIS! Don't process change too fast!
        });
    }

    const w_showParentsEl = document.getElementById('showParents');
    if (w_showParentsEl) {
        w_showParentsEl.addEventListener('change', function (p_event) {
            // @ts-expect-error
            searchSettings.showParents = this.checked;
            processChange();
        });
    }

    const w_isTagEl = document.getElementById('isTag');
    if (w_isTagEl) {
        w_isTagEl.addEventListener('change', function (p_event) {
            // @ts-expect-error
            let w_checked = this.checked;
            let w_wasSet = false;
            if (searchSettings.isTag !== w_checked) {
                setFrozen(false); // Switched tagging so reset freeze
                if (w_checked) {
                    w_wasSet = true;
                }
            }
            searchSettings.isTag = w_checked;
            // Set placeholder text
            processChange();
            handleIsTagSwitch(w_wasSet);
        });
    }

    // * Find & Replace controls change detection
    const w_searchOptionsEl = document.getElementById('searchOptions');
    if (w_searchOptionsEl) {
        w_searchOptionsEl.addEventListener('change', function (p_event) {
            // @ts-expect-error
            searchSettings.searchOptions = Number(this.value);
            processChange();
        });

    }

    findReplaceInputIds.forEach((p_inputId) => {
        const w_inputEl = document.getElementById(p_inputId);
        if (w_inputEl) {

            w_inputEl.onkeypress = function (p_event) {
                if (!p_event) {
                    // @ts-expect-error
                    p_event = window.event;
                }
                var keyCode = p_event.code || p_event.key;
                if (keyCode === 'Enter') {
                    if (timer) {
                        clearTimeout(timer);
                        sendSearchConfig();
                    }
                    vscode.postMessage({ type: 'leoFindNext' });
                    return false;
                }
            };
            w_inputEl.addEventListener('input', function (p_event) {
                // @ts-expect-error
                searchSettings[p_inputId] = this.value;
                processChange();
            });
        }
    });

    checkboxIds.forEach((p_inputId) => {
        const w_inputEl = document.getElementById(p_inputId);
        if (w_inputEl) {

            w_inputEl.addEventListener('change', function (p_event) {
                // @ts-expect-error
                searchSettings[p_inputId] = this.checked;
                processChange();
            });
        }
    });

    radioIds.forEach((p_inputId) => {
        const w_inputEl = document.getElementById(p_inputId);
        if (w_inputEl) {

            w_inputEl.addEventListener('change', function (p_event) {
                searchSettings['searchScope'] = parseInt(
                    // @ts-expect-error
                    document.querySelector('input[name="searchScope"]:checked').value
                );
                processChange();
            });
        }
    });

    const w_findTextsEl = document.getElementById('findText');
    if (w_findTextsEl) {
        w_findTextsEl.addEventListener('click', function () {
            // @ts-expect-error
            if (w_findTextsEl.value === "<find pattern here>") {
                // @ts-expect-error
                w_findTextsEl.select();
            }
        });
    }

    document.onkeydown = checkKeyDown;

    document.addEventListener('focusin', (event) => {
        vscode.postMessage({ type: 'gotFocus' });
    });
    document.addEventListener('focusout', (event) => {
        vscode.postMessage({ type: 'lostFocus' });
    });

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            // * Nav Tab Controls
            // Focus and select all text in 'nav' field
            case 'selectNav': {
                focusOnField('navText');
                if (message.text || message.text === "") {
                    // @ts-expect-error
                    document.getElementById("navText").value = message.text;
                    searchSettings["navText"] = message.text;
                    if (timer) {
                        clearTimeout(timer);
                    }
                    sendSearchConfig();
                }
                break;
            }
            // * Find Tab Controls
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

    vscode.postMessage({ type: 'refreshSearchConfig' });
})();
