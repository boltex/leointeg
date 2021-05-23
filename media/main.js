//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
// Send message to leoInteg with vscode.postMessage({ keyNameEx1: someValue, ... });
// Receive messages from leoInteg with window.addEventListener('message', event => { ... });
(function () {
    //@ts-expect-error
    const vscode = acquireVsCodeApi();

    // const oldState = vscode.getState() || { colors: [] };

    // /** @type {Array<{ value: string }>} */
    // let colors = oldState.colors;

    // updateColorList(colors);

    // document.querySelector('.add-color-button').addEventListener('click', () => {
    //     addColor();
    // });

    /** @type {{
        wholeWord: boolean;
        ignoreCase: boolean;
        regExp: boolean;
        markFinds: boolean;
        markChanges: boolean;
        searchHeadline: boolean;
        searchBody: boolean;
        searchScope: number;
    }} */
    let searchSettings = {
        wholeWord: false,
        ignoreCase: true,
        regExp: false,
        markFinds: false,
        markChanges: false,
        searchHeadline: true,
        searchBody: true,
        searchScope: 0 // 0 is entire outline (1: sub-outline, 2: node only)
    };

    document.getElementById('find').onkeypress = function (e) {
        //@ts-expect-error
        if (!e) e = window.event;
        var keyCode = e.code || e.key;
        if (keyCode == 'Enter') {
            // TODO : MAYBE ALWAYS PASS CONFIG ALONG??
            vscode.postMessage({ type: 'leoFindNext' });
            return false;
        }
    }
    document.getElementById('replace').onkeypress = function (e) {
        //@ts-expect-error
        if (!e) e = window.event;
        var keyCode = e.code || e.key;
        if (keyCode == 'Enter') {
            // TODO : MAYBE ALWAYS PASS CONFIG ALONG??
            vscode.postMessage({ type: 'leoFindNext' });
            return false;
        }
    }

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            // case 'addColor':
            //     {
            //         addColor();
            //         break;
            //     }
            // case 'clearColors':
            //     {
            //         colors = [];
            //         updateColorList(colors);
            //         break;
            //     }

            // Focus and select all text in 'find' field
            case 'selectFindField':
                {
                    focusOnField('find');
                    break;
                }
            // Focus and select all text in 'replace' field
            case 'selectReplaceField':
                {
                    focusOnField('replace');
                    break;
                }
        }
    });

    /**
     * @param {string} p_id
     */
    function focusOnField(p_id) {
        const inputField = document.querySelector('.' + p_id);
        //@ts-expect-error
        inputField.select();
    }

    function getSettings() {
        return {
            wholeWord: false,
            ignoreCase: true,
            regExp: false,
            markFinds: false,
            markChanges: false,
            searchHeadline: true,
            searchBody: true,
            searchScope: 0 // 0 is entire outline (1: sub-outline, 2: node only)
        }
    }

    function setSettings(p_settings) {
        // Set values of fields and controls sor search settings
        console.log('SET SETTINGS');

    }


    /**
     * @param {Array<{ value: string }>} colors
     */
    // function updateColorList(colors) {
    //     const ul = document.querySelector('.color-list');
    //     ul.textContent = '';
    //     for (const color of colors) {
    //         const li = document.createElement('li');
    //         li.className = 'color-entry';

    //         const colorPreview = document.createElement('div');
    //         colorPreview.className = 'color-preview';
    //         colorPreview.style.backgroundColor = `#${color.value}`;
    //         colorPreview.addEventListener('click', () => {
    //             onColorClicked(color.value);
    //         });
    //         li.appendChild(colorPreview);

    //         const input = document.createElement('input');
    //         input.className = 'color-input';
    //         input.type = 'text';
    //         input.value = color.value;
    //         input.addEventListener('change', (e) => {
    //             //@ts-expect-error
    //             const value = e.target.value;
    //             if (!value) {
    //                 // Treat empty value as delete
    //                 colors.splice(colors.indexOf(color), 1);
    //             } else {
    //                 color.value = value;
    //             }
    //             updateColorList(colors);
    //         });
    //         li.appendChild(input);

    //         ul.appendChild(li);
    //     }

    //     // Update the saved state
    //     vscode.setState({ colors: colors });
    // }

    /**
     * @param {string} color
     */
    // function onColorClicked(color) {
    //     vscode.postMessage({ type: 'colorSelected', value: color });
    // }

    /**
     * @returns string
     */
    // function getNewCalicoColor() {
    //     const colors = ['020202', 'f1eeee', 'a85b20', 'daab70', 'efcb99'];
    //     return colors[Math.floor(Math.random() * colors.length)];
    // }

    // function addColor() {
    //     colors.push({ value: getNewCalicoColor() });
    //     updateColorList(colors);
    // }
}());


