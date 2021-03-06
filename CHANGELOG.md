# Change Log

## 0.1.14

- Rewrite of the leobridgeserver.py to be made compatible with the standards in leoserver.py from Leo.
- Added option for specifying server file and path. Defaults to the internal leobridgeserver.py server.
- Fixed cursor position and selection bugs.
- Fixed automatic server startup and connection bugs.
- Added Search functionality along with a 'find' panel.
- Added goto global line and other clone-find related commands from Leo's 'Search' menu.
- Added import-file(s) command - an alias of the import-any-file command form Leo.
- Temporary fix for some minibuffer commands to override the widgets interactions (ex. clone-find-all, etc.)
- Undo and redo icons are now faded out instead of disappearing when unavailable - to help with button shifting when clicking rapidly.
- Many other small bugfixes.

## 0.1.13

- Added support for precise focus placement, focus switch between tree/body.
- Made the extension more aware of the current selection state, to have strictly relevant buttons visible shown only.
- Made the 'edit headline' hover icon removable, in order to enable 'Tab' keybinding to go from tree to body directly.
- Added commands and keybindings for 'goto' operations 'hoist/dehoist' [#25](https://github.com/boltex/leointeg/issues/25) and other commands. [#30](https://github.com/boltex/leointeg/issues/30)
- Added support for Leo-Style outline navigation. [#43](https://github.com/boltex/leointeg/issues/43) Has to be enabled with an option in the config settings: "Use Leo Tree Browsing" which makes the arrow keys, pgUp/pgDn, home/end move the selection instead of a cursor when focus is on Leo's outline.
- Implemented @buttons in it's own panel, visible where the already existing 'outline' and 'opened leo documents' panels reside.
- Added (basic) unknown attributes support as hover tooltip and small description on node headlines.
- Added a 'leoBridge Server Terminal Panel' to gather output of the leoBridge stdOut pipe. It's displayed among the 'output panels', along with the standard 'leo log window', when the server is started by leoInteg. (either with the auto-start config setting, or by calling the 'start server' command via buttons or the command-palette.)
- Syntax coloring and Snippets are now enabled for those languages : C, C++, CSS, HTML, Java, Javascript, json, Markdown, PHP, Python, Rust and Typescript. They are taken from the default extension for that language, or if non-existent, from the most popular extension for that language
- Recent files are now remembered and restored upon re-opening vscode.
- Leo files can be opened from the explorer pane directly.
- Added 'minibuffer' feature with the usual alt-x command from Leo.
- Added cursor position, selected range and scrolling position to be captured and restored when navigating the outline. [#39](https://github.com/boltex/leointeg/issues/39) This allows for commands that use the currently selected text, [#61](https://github.com/boltex/leointeg/issues/61) such as run script and extract/extract name, etc.
- Redid the body display and switching logic to support new vscode API features. (vscode now does not block 'undo' operations between file-rename operations, which were used to switch body pane content.)

## 0.1.12

- Added support for multiple opened files along with the 'new', 'Close', 'Save-As' commands.
- Improved the icons and commands, which are visible, or invisible depending on context.
- Added 'tree view' listing the opened Leo documents which is available in the Leo view, and the explorer view.
- Added basic leonine syntax coloring. (No specific \@languages yet)
- Added selection support to the 'Execute-Script' command.

## 0.1.11

- Fixed undo operation for the _insert_ and _rename_ commands (Some other commands may still need fixes to their 'undo' support)
- Fixed crashing when editing body pane under Leo 6.2.

## 0.1.10

- Added more [welcome content](https://code.visualstudio.com/api/extension-guides/tree-view#welcome-content) in outlines panes that have not yet opened a tree for starting a server, connecting to it, and added content to help with automation settings.
- Changed the starting default configuration setting for starting and connecting to the leoBridge server script to false.
- Made starting and connecting to the leoBridge server script easier to access in the interface, and in the welcome/settings webview.
- Added new CONTRIBUTING.md markdown file for running the development version of the leoInteg extension.
- Closes [#44](https://github.com/boltex/leointeg/issues/44)

## 0.1.9

- Added new compilation configuration (server, extension, or both) to help debugging.
- Support async output from leoBridge, for log pane and other events.
- External file change detection with modal dialogs matching Leo's gui dialogs.
- Added config options to bypass derived files change detection dialogs with defaults, allowing automatic synchronization of derived files in both directions.
- Added support for redo, refresh from disk and many any other core Leo commands and operations.
- Added support for rapid outline edition command entry, including 'insert node' command **`Ctrl+I`** and for replacing focus on relevant elements to mimic actual Leo interface workflow.
- Added [welcome content](https://code.visualstudio.com/api/extension-guides/tree-view#welcome-content) in outlines panes that have not yet opened a tree to help with connecting and opening
- Replaced body-editor content transfer logic and removed the related option in the expansion's settings. The body is sent to Leo when appropriate without need of a timed delay.
- _REMOVED FEATURE_ Rolled back 'multi-body' feature for simultaneous body panes from different gnx. Body panes from the same gnx are still available.

## 0.1.8

- Extension now built with webpack. [As recommended by vsCode's extension guidelines](https://code.visualstudio.com/api/working-with-extensions/bundling-extension#using-webpack)
- Added a 'Welcome Screen' webview (also compiled by webpack from html, scss and ts files) to show a greeting with basic info, and provide an easy way to change the configuration settings.
- Added commands accessible via either tree menu, context menu, and 'standard' Leo keyboard shortcuts:
  - Insert, delete
  - Cut/Copy/Paste/Clone/Paste as clone
  - Move, promote, demote node operations
  - Mark, unmark, sort children, sort siblings and undo

## 0.1.7

- Changed main mode of communication from stdin/out to tcp/ip websockets.
- Made a standalone 'Leo Server' python script.

## 0.1.6

- Major 'Browsing' update before adding outline editing and file saving & derivation (Thanks for testing!)
- Refactored and simplified communication between vscode and leoBridge.
- Stabilized browsing with multiple simultaneous body panes.
- Added Leo Outline into explorer view.
- Supports new command to open a node on the side from the context menu.
- Multiple configuration options: Open Settings with CTRL+',' type 'leo', or look for 'leo integration' in extensions.

_Note: Headline and body edition does not affect the Leo file yet._

## 0.1.5

- Stabilized tree browsing, along with headline and body editing.

## 0.1.4

- Major Refactor to streamline codebase; Eliminated code duplication.
- Complete rewrite after going trying out most of what is possible with both vscode and leo APIs.
- New body pane system that prevents corrupting undos across different positions: It uses the node's actual gnx instead of a generic "body" string as a file path for the custom filesystem.

## 0.1.3

- This version creates a body panel via a custom filesystem: 'leo'. It only has a file, "leo:/body", the body of the currently selected node.

_Note: This editable body panel does not affect Leo file yet._

## 0.1.2

- Prototype Goal Achieved!
- Browsing Now shows body text too, just like browsing in Leo without editing body nor headlines. (read only for now)

## 0.1.1

- Leo File Opening.
- Basic outline browsing, along with the recognizable node icons.

## 0.0.1

- Initial basic skeleton of this extension. Press F5 to view icon and test the startup of the extension!
- Implemented [leoBridge](https://leoeditor.com/leoBridge.html) interaction.

![LeoEditor](resources/leoapp96px.png)
