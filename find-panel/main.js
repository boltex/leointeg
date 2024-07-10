// @ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
// Send message to leointeg with vscode.postMessage({ keyNameEx1: someValue, ... });
// Receive messages from leointeg with window.addEventListener('message', event => { ... });
(function () {
    // @ts-expect-error
    const vscode = acquireVsCodeApi();

    let timer; // for debouncing sending the settings from this webview to LeoInteg
    let dirty = false; // all but nav input
    let navTextDirty = false;

    let activeTab = 'tab2'; // Initial active tab
    let firstFindTabElId = 'findText';
    let lastFindTabElId = 'searchBody';
    let firstNavTabElId = 'searchOptions';
    let lastNavTabElId = 'navText';
    let lastGotoContent = [];
    let lastSelectedGotoItem;

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

    const gotoPaneContainer = document.getElementById('gotopane');

    // TODO CHECK IF NEEDED ?
    // document.body.addEventListener('mousedown', () => {
    //     if (!gotoPaneContainer) {
    //         return;
    //     }
    //     // remove selected class
    //     if (lastSelectedGotoItem) {
    //         lastSelectedGotoItem.classList.remove('selected');
    //         lastSelectedGotoItem = undefined;
    //     }
    // });

    function clickedGotoItem(event) {
        if (!gotoPaneContainer) {
            return;
        }
        // remove selected class first
        if (lastSelectedGotoItem) {
            lastSelectedGotoItem.classList.remove('selected');
        }
        event.target.classList.add('selected');
        lastSelectedGotoItem = event.target;
        event.stopPropagation();
        // CALL GOTO COMMAND!
        vscode.postMessage({ type: 'gotoCommand', value: event.target.dataset.order });
    }

    function fillGotoPane(p_gotoContent) {
        lastGotoContent = p_gotoContent;
        if (!gotoPaneContainer) {
            return;
        }
        let i = 0;
        if (lastSelectedGotoItem) {
            lastSelectedGotoItem.classList.remove('selected');
            lastSelectedGotoItem = undefined;
        }
        while (gotoPaneContainer && gotoPaneContainer.firstChild) {
            gotoPaneContainer.removeChild(gotoPaneContainer.firstChild);
        }
        let hasParent = false;
        for (const gotoItem of p_gotoContent) {
            const smallerDiv = document.createElement('div');
            smallerDiv.dataset.order = i.toString();
            smallerDiv.className = 'goto-item ' + gotoItem.entryType;
            smallerDiv.textContent = gotoItem.label;
            // smallerDiv.title = gotoItem.tooltip; // TOOLTIPS CANNOT BE STYLED!
            smallerDiv.setAttribute('tabindex', '0');
            if (gotoItem.entryType === 'parent') {
                hasParent = true;
            }
            smallerDiv.addEventListener('mousedown', clickedGotoItem);
            gotoPaneContainer.appendChild(smallerDiv);
            i = i + 1;
        }
        gotoPaneContainer.classList.remove('show-parents');
        if (hasParent) {
            gotoPaneContainer.classList.add('show-parents');
        }
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

        // When opening a Leo document, set default values of fields
        findReplaceInputIds.forEach((p_inputId) => {
            // @ts-expect-error
            document.getElementById(p_inputId).value = p_settings[p_inputId] === '<find pattern here>' ? '' : p_settings[p_inputId];
            searchSettings[p_inputId] = p_settings[p_inputId] === '<find pattern here>' ? '' : p_settings[p_inputId];
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
        const keyCode = p_event.code || p_event.key;

        // Detect CTRL+F
        if (p_event.ctrlKey && !p_event.shiftKey && p_event.keyCode === 70) {
            p_event.preventDefault();
            p_event.stopPropagation();
            // focusOnField('findText');
            activateTab('tab2');

            return;
        }
        // Detect CTRL+SHIFT+F
        if (p_event.ctrlKey && p_event.shiftKey && p_event.keyCode === 70) {
            p_event.preventDefault();
            p_event.stopPropagation();
            // focusOnField('navText');
            activateTab('tab3');

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

        const actEl = document.activeElement;
        if (keyCode === 'Tab') {
            let lastEl;
            let firstEl;
            let selectedNavEl;
            if (activeTab === 'tab2') {
                // find panel
                lastEl = document.getElementById(lastFindTabElId);
                firstEl = document.getElementById(firstFindTabElId);
            } else if (activeTab === 'tab3' && !lastGotoContent.length) {
                // nav panel regular
                lastEl = document.getElementById(lastNavTabElId);
                firstEl = document.getElementById(firstNavTabElId);
            } else if (activeTab === 'tab3' && lastGotoContent.length && gotoPaneContainer) {
                // nav panel WITH nav results.
                lastEl = document.getElementById(lastNavTabElId);
                firstEl = document.getElementById(firstNavTabElId);
                selectedNavEl = gotoPaneContainer?.children[0]; // default

                if (lastSelectedGotoItem) {
                    selectedNavEl = lastSelectedGotoItem;
                }

                if (actEl?.classList.contains('goto-item')) {
                    p_event.preventDefault();
                    p_event.stopPropagation();
                    p_event.stopImmediatePropagation();
                    if (p_event.shiftKey) {
                        lastEl = document.getElementById(lastNavTabElId);
                        if (lastEl) {
                            lastEl.focus();
                        }
                    } else {
                        if (firstEl) {
                            firstEl.focus();
                        }
                    }
                    return;
                }

            }

            if (p_event.shiftKey) {
                if (selectedNavEl && actEl === firstEl) {
                    p_event.preventDefault();
                    p_event.stopPropagation();
                    p_event.stopImmediatePropagation();
                    if (lastSelectedGotoItem) {
                        lastSelectedGotoItem.classList.remove('selected');
                    }
                    selectedNavEl.focus();
                    selectedNavEl.classList.add('selected');
                    lastSelectedGotoItem = selectedNavEl;
                    return;
                }
                // shift + tab so if first got last
                if (lastEl && actEl === firstEl) {
                    p_event.preventDefault();
                    p_event.stopPropagation();
                    p_event.stopImmediatePropagation();
                    lastEl.focus();
                    return;
                }
            } else {
                if (selectedNavEl && actEl === lastEl) {
                    p_event.preventDefault();
                    p_event.stopPropagation();
                    p_event.stopImmediatePropagation();
                    if (lastSelectedGotoItem) {
                        lastSelectedGotoItem.classList.remove('selected');
                    }
                    selectedNavEl.focus();
                    selectedNavEl.classList.add('selected');
                    lastSelectedGotoItem = selectedNavEl;
                    return;
                }
                // tab, so if last goto first
                if (firstEl && actEl === lastEl) {
                    p_event.preventDefault();
                    p_event.stopPropagation();
                    p_event.stopImmediatePropagation();
                    firstEl.focus();
                    return;
                }
            }
        }

        if (activeTab === 'tab3' && lastGotoContent.length && actEl && gotoPaneContainer && (actEl === gotoPaneContainer || gotoPaneContainer.contains(actEl))) {
            navKeyHandler(p_event);
        }

    }

    function navKeyHandler(p_event) {
        // Handles up/down home/end pgUp/pgDown
        // for GOTO PANE navigation under the nav input
        // if(gotoPaneContainer){
        //     gotoPaneContainer
        // }
        if (!p_event) {
            p_event = window.event;
        }
        const keyCode = p_event.code || p_event.key;

        let code = -1;
        switch (keyCode) {
            case 'ArrowUp':
                code = 0;
                break;
            case 'ArrowDown':
                code = 1;
                break;
            case 'PageUp':
                code = 2;
                break;
            case 'PageDown':
                code = 3;
                break;
            case 'Home':
                code = 2;
                break;
            case 'End':
                code = 3;
                break;
            case 'Enter':
                const actEl = document.activeElement;
                if (actEl && actEl.classList.contains('goto-item')) {
                    p_event.preventDefault();
                    p_event.stopPropagation();
                    p_event.stopImmediatePropagation();
                    if (!gotoPaneContainer) {
                        return;
                    }
                    // remove selected class first
                    if (lastSelectedGotoItem) {
                        lastSelectedGotoItem.classList.remove('selected');
                    }
                    actEl.classList.add('selected');
                    lastSelectedGotoItem = actEl;
                    // CALL GOTO COMMAND!
                    // @ts-expect-error
                    vscode.postMessage({ type: 'gotoCommand', value: actEl.dataset.order });
                    return;
                }
                break;

            default:
                break;
        }
        if (code >= 0) {
            p_event.preventDefault();
            p_event.stopPropagation();
            p_event.stopImmediatePropagation();
            vscode.postMessage({ type: 'navigateNavEntry', value: code });
        }
    }

    function throttle(func, limit) {
        let inThrottle;
        let lastFunc;
        let lastRan;
        return function () {
            const context = this;
            const args = arguments;
            if (!inThrottle) {
                func.apply(context, args);
                lastRan = Date.now();
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                    if (lastFunc) {
                        lastFunc.apply(context, args);
                        lastRan = Date.now();
                        lastFunc = null;
                    }
                }, limit);
            } else {
                lastFunc = func;
            }
        }
    }

    // TODO : USE THIS EXAMPLE INSTEAD OF CALLING LEOINTEG TO SWITCH RIGHT AWAY ! ! 
    // Example usage
    const throttledFunction = throttle(function () {
        console.log('Function called!');
    }, 1000); // The function will be called at most once every 1000ms (1 second)


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
                w_input.title = "Enter a tag name to list tagged nodes in the Goto pane\nClear this field to list all tags used in this file";
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
                w_input.title = "Typing searches headlines interactively\nEnter freezes input and searches body text";
            }
            // @ts-expect-error
            w_showParent.disabled = false;
            // @ts-expect-error
            w_navSelect.disabled = false;
        }

    }

    // * Nav text input detection
    const w_navTextEl = document.getElementById('navText');
    function navEnter() {
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
    }

    if (w_navTextEl) {
        w_navTextEl.onkeypress = function (p_event) {
            if (!p_event) {
                // @ts-expect-error
                p_event = window.event;
            }
            const keyCode = p_event.code || p_event.key;
            if (keyCode === 'Enter') {
                navEnter();
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
                const keyCode = p_event.code || p_event.key;
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

    document.onkeydown = checkKeyDown;

    const tabs = document.querySelectorAll('.tab-item');
    const contents = document.querySelectorAll('.tab-content');

    function showTab(newTab) {
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Add active class to the new tab and content
        // @ts-expect-error
        document.querySelector(`[data-tab="${newTab}"]`).classList.add('active');
        // @ts-expect-error
        document.getElementById(newTab).classList.add('active');

        // Update the active tab state
        activeTab = newTab;
    }

    function activateTab(newTab, replace) {
        showTab(newTab);
        setTimeout(() => {
            if (activeTab === 'tab2') {
                if (replace) {
                    focusOnField('replaceText');
                } else {
                    focusOnField('findText');
                }
            } else if (activeTab === 'tab3') {
                focusOnField('navText');
            }
        }, 0);
    };

    function revealNavEntry(p_index, p_preserveFocus) {
        if (!p_preserveFocus) {
            showTab('tab3');
        }
        if (lastSelectedGotoItem) {
            lastSelectedGotoItem.classList.remove('selected');
            lastSelectedGotoItem = undefined;
        }
        setTimeout(() => {
            if (!gotoPaneContainer) {
                return;
            }
            const children = gotoPaneContainer.children;
            if (children && children.length && children.length > p_index) {
                lastSelectedGotoItem = gotoPaneContainer.children[p_index];
                lastSelectedGotoItem.classList.add('selected');
                // Will have effect only if visible
                lastSelectedGotoItem.scrollIntoView({ behavior: "instant", block: "nearest" });
                // @ts-expect-error
                if (lastSelectedGotoItem && lastSelectedGotoItem.focus && !p_preserveFocus) {
                    // @ts-expect-error
                    lastSelectedGotoItem.focus();
                }
            }
        }, 0);
    }

    tabs.forEach(tab => {
        tab.addEventListener('mousedown', (event) => {
            // @ts-expect-error
            const newTab = tab.dataset.tab;
            if (newTab !== activeTab) {
                activateTab(newTab);
                event.preventDefault();
                event.stopPropagation();
            }
        });
    });

    document.addEventListener('focusin', (event) => {
        vscode.postMessage({ type: 'gotFocus' });
    });

    document.addEventListener('focusout', (event) => {
        vscode.postMessage({ type: 'lostFocus' });
    });

    const body = document.body;
    const topShadow = document.getElementById("top-shadow");
    let scrolled = false;
    body.addEventListener('scroll', function (event) {
        if (!topShadow) {
            return;
        }
        if (body.scrollTop) {
            if (!scrolled) {
                topShadow.classList.add('scrolled');
                scrolled = true;
            }
        } else {
            if (scrolled) {
                topShadow.classList.remove('scrolled');
                scrolled = false;
            }
        }
    });

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            // * Nav Tab Controls
            // Focus and select all text in 'nav' field
            case 'selectNav': {
                // focusOnField('navText');
                activateTab('tab3');

                if (message.text) {
                    // @ts-expect-error
                    document.getElementById("navText").value = message.text;
                    searchSettings["navText"] = message.text;
                    if (timer) {
                        clearTimeout(timer);
                    }
                    sendSearchConfig();
                    if (message.forceEnter) {
                        navEnter();
                    }
                }
                break;
            }
            case 'showGoto': {
                showTab('tab3');
                break;
            }
            case 'revealNavEntry': {
                revealNavEntry(message.value, message.preserveFocus);
                break;
            }
            // * Find Tab Controls
            // Focus and select all text in 'find' field
            case 'selectFind': {
                //focusOnField('findText');
                activateTab('tab2');
                break;
            }
            // Focus and select all text in 'replace' field
            case 'selectReplace': {
                //focusOnField('replaceText');
                activateTab('tab2', true);
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
            case 'refreshGoto': {
                fillGotoPane(message.gotoContent);
                break;
            }
        }
    });

    vscode.postMessage({ type: 'refreshSearchConfig' });
})();
