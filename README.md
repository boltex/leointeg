# ![LeoEditor](resources/leoapp.png) Leo Editor Integration with Visual Studio Code

See Leo, the Literate Editor with Outline at: https://leoeditor.com/

![Screenshot](resources/animated-screenshot.gif)

## Requirements

- Leo installed
- Leo's path made available in \$PYTHONPATH environment variable

(See **Adding Leo to Your Path** in https://github.com/leo-editor/leo-editor/blob/master/INSTALL.TXT)

## Features

### _Features done so far:_

- Integration is done by communicating with a python script, it interacts with Leo via 'leoBridge'. (see https://leoeditor.com/leoBridge.html)

- A treeview of an actual outline of a Leo file. Can be integrated below the explorer view, or standalone in its own panel.

- An editor on the right side, acting as the body pane.

### _Intended Features:_

- Re-mapping of most of Leo's outline editing features through vscode and more, via leoBridge.

- Detection of focused element to toggle functionality to suit the interactions with the opened Leo file. (by re-maping shortcut keys to the shortcut keys of Leo.)

- 2 way synchronisation of leo's output files and vscode's explorer & 'normal mode' of operation.

- Error lookup, or breakpoints cycling with automatic go-to line in generated file's nodes and body position.

- File generating 'at' nodes that show their derived line number instead of the body-pane's line number (Also reproducing xcc-nodes behaviour)

## Extension Settings

Planned Settings :

- Option to either focus on body pane or keep focus in outline when a tree node is selected (May help for keyboard navigation)

- Number of milliseconds to wait when debouncing after body text modifications are detected (for performance tuning)

- Settings for communicating either locally, via stdIn/out, and remotely over tcp, through a REST api or websockets. (Communication consists of simple JSON data)

- Graphic-related settings such as light/dark theme and icon set selection

---

**Enjoy!**
